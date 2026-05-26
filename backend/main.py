from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from datetime import datetime
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    logger.error("DATABASE_URL not configured")
    DATABASE_URL = "postgresql://postgres:xxxxx@roundhouse.proxy.rlwy.net:5432/railway"

app = FastAPI(
    title="ATLAS Betting API",
    description="Picking calcistico intelligente",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database
def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logger.error(f"DB Error: {e}")
        return None

# Flag per non ricaricare dati
data_loaded = False

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class PickData(BaseModel):
    date: str = None
    league: str = None
    home: str = None
    away: str = None
    market: str = None
    pick: str = None
    prob: int = None
    odds: float = None
    value: float = None
    won: bool = None
    profit: float = None

class PlayerData(BaseModel):
    id: str
    name: str = None
    team: str = None
    league: str = None
    position: str = None
    xg_avg_10: float = 0
    pai: float = 1.0

class MatchData(BaseModel):
    date: str = None
    league: str = None
    home: str = None
    away: str = None
    ft_total: int = None
    xg_total: float = None
    xg_home: float = None
    xg_away: float = None
    won: bool = None
    market: str = None
    pick: str = None

# ============================================================================
# CREA TABELLE
# ============================================================================
async def create_tables_if_not_exist():
    """Crea le tabelle se non esistono"""
    try:
        conn = get_db_connection()
        if not conn:
            logger.error("Cannot connect to DB")
            return False
        
        cursor = conn.cursor()
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS picks (
            id SERIAL PRIMARY KEY,
            date DATE,
            league VARCHAR(50),
            home VARCHAR(100),
            away VARCHAR(100),
            market VARCHAR(20),
            pick VARCHAR(20),
            prob SMALLINT,
            odds NUMERIC(5,2),
            value NUMERIC(5,2),
            won BOOLEAN,
            profit NUMERIC(6,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS giocatori (
            id VARCHAR(20) PRIMARY KEY,
            name VARCHAR(150),
            team VARCHAR(100),
            league VARCHAR(50),
            position VARCHAR(5),
            xg_avg_10 NUMERIC(4,2),
            pai NUMERIC(4,2),
            form_trend VARCHAR(20),
            momentum_score SMALLINT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS partite (
            id SERIAL PRIMARY KEY,
            date DATE,
            league VARCHAR(50),
            home VARCHAR(100),
            away VARCHAR(100),
            ft_total SMALLINT,
            xg_total NUMERIC(5,2),
            xg_home NUMERIC(5,2),
            xg_away NUMERIC(5,2),
            won BOOLEAN,
            market VARCHAR(20),
            pick VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS feedback (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255),
            comment TEXT,
            rating SMALLINT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS donazioni (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255),
            amount NUMERIC(10,2),
            stripe_payment_id VARCHAR(255),
            status VARCHAR(20) DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        conn.commit()
        logger.info("Tables created/verified")
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Table creation error: {e}")
        return False

# ============================================================================
# CARICA DATI DA FILE PYTHON
# ============================================================================
async def load_initial_data():
    """Carica dati da Python files"""
    global data_loaded
    
    if data_loaded:
        return
    
    try:
        logger.info("Loading initial data from files...")
        
        # Import data files
        try:
            from data_picks import PICKS_DATA
            from data_players import PLAYERS_DATA
            from data_partite import PARTITE_DATA
        except ImportError as e:
            logger.error(f"Cannot import data files: {e}")
            return
        
        conn = get_db_connection()
        if not conn:
            logger.error("Cannot connect to DB")
            return
        
        cursor = conn.cursor()
        
        # Check if already loaded
        cursor.execute("SELECT COUNT(*) FROM picks")
        if cursor.fetchone()[0] > 0:
            logger.info("Database already populated")
            data_loaded = True
            cursor.close()
            conn.close()
            return
        
        # Load picks
        logger.info(f"Loading {len(PICKS_DATA)} picks...")
        for pick in PICKS_DATA:
            try:
                result = pick.get('result', {}) or {}
                cursor.execute("""
                    INSERT INTO picks (date, league, home, away, market, pick, prob, odds, value, won, profit)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (pick.get('date'), pick.get('league'), pick.get('home'), pick.get('away'),
                      pick.get('market'), pick.get('pick'), pick.get('prob'), pick.get('odds'),
                      pick.get('value'), result.get('won'), result.get('profit')))
            except Exception as e:
                logger.error(f"Pick insert error: {e}")
        
        conn.commit()
        logger.info(f"Loaded {len(PICKS_DATA)} picks")
        
        # Load players
        logger.info(f"Loading {len(PLAYERS_DATA)} players...")
        for player_id, pdata in PLAYERS_DATA.items():
            try:
                xg_history = pdata.get('xg_history', [])
                xg_avg = sum(xg_history[-10:]) / len(xg_history[-10:]) if xg_history else 0
                cursor.execute("""
                    INSERT INTO giocatori (id, name, team, league, position, xg_avg_10, pai)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (str(player_id), pdata.get('name'), pdata.get('team'), pdata.get('league'),
                      pdata.get('position'), round(xg_avg, 2), pdata.get('pai', 1.0)))
            except Exception as e:
                logger.error(f"Player insert error: {e}")
        
        conn.commit()
        logger.info(f"Loaded {len(PLAYERS_DATA)} players")
        
        # Load matches
        logger.info(f"Loading {len(PARTITE_DATA)} matches...")
        for p in PARTITE_DATA:
            try:
                cursor.execute("""
                    INSERT INTO partite (date, league, home, away, ft_total, xg_total, xg_home, xg_away, won, market, pick)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (p.get('date'), p.get('league'), p.get('home'), p.get('away'), p.get('ft_total'),
                      p.get('xg_total'), p.get('xg_home'), p.get('xg_away'), p.get('won'), p.get('market'), p.get('pick')))
            except Exception as e:
                logger.error(f"Match insert error: {e}")
        
        conn.commit()
        logger.info(f"Loaded {len(PARTITE_DATA)} matches")
        
        cursor.close()
        conn.close()
        
        data_loaded = True
        logger.info("All data loaded successfully!")
        
    except Exception as e:
        logger.error(f"Data loading error: {e}")

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            conn.close()
            return {"status": "healthy", "database": "connected", "timestamp": datetime.now().isoformat()}
        else:
            return {"status": "healthy", "database": "disconnected", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}, 500

# ============================================================================
# API - PICKS
# ============================================================================

@app.get("/api/picks")
async def get_picks(league: str = None, market: str = None, limit: int = 100):
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database unavailable"}, 500
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        where_clauses = []
        params = []
        
        if league:
            where_clauses.append("league = %s")
            params.append(league)
        
        if market:
            where_clauses.append("market = %s")
            params.append(market)
        
        where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        params.append(limit)
        
        cursor.execute(f"""
            SELECT id, date, league, home, away, market, pick,
                   prob, odds, value, won, profit
            FROM picks
            {where_sql}
            ORDER BY date DESC
            LIMIT %s
        """, params)
        
        picks = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return {
            "status": "success",
            "count": len(picks) if picks else 0,
            "data": list(picks) if picks else []
        }
    except Exception as e:
        logger.error(f"Error get_picks: {e}")
        return {"status": "error", "message": str(e)}, 500

# ============================================================================
# API - GIOCATORI
# ============================================================================

@app.get("/api/giocatori")
async def get_giocatori(team: str = None, position: str = None, limit: int = 50):
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database unavailable"}, 500
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        where_clauses = []
        params = []
        
        if team:
            where_clauses.append("LOWER(team) = LOWER(%s)")
            params.append(team)
        
        if position:
            where_clauses.append("position = %s")
            params.append(position)
        
        where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        params.append(limit)
        
        cursor.execute(f"""
            SELECT id, name, team, position, appearances,
                   xg_avg_10, pai, form_trend, momentum_score
            FROM giocatori
            {where_sql}
            ORDER BY xg_avg_10 DESC
            LIMIT %s
        """, params)
        
        giocatori = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return {
            "status": "success",
            "count": len(giocatori) if giocatori else 0,
            "data": list(giocatori) if giocatori else []
        }
    except Exception as e:
        logger.error(f"Error get_giocatori: {e}")
        return {"status": "error", "message": str(e)}, 500

# ============================================================================
# API - PARTITE
# ============================================================================

@app.get("/api/partite")
async def get_partite(league: str = None, limit: int = 100):
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database unavailable"}, 500
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        where_sql = " WHERE league = %s" if league else ""
        params = [league] if league else []
        params.append(limit)
        
        cursor.execute(f"""
            SELECT id, date, league, home, away, ft_total,
                   xg_total, xg_home, xg_away, won, market
            FROM partite
            {where_sql}
            ORDER BY date DESC
            LIMIT %s
        """, params)
        
        partite = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return {
            "status": "success",
            "count": len(partite) if partite else 0,
            "data": list(partite) if partite else []
        }
    except Exception as e:
        logger.error(f"Error get_partite: {e}")
        return {"status": "error", "message": str(e)}, 500

# ============================================================================
# API - ANALYTICS
# ============================================================================

@app.get("/api/analytics/picks-summary")
async def get_picks_summary():
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database unavailable"}, 500
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT 
                market,
                league,
                COUNT(*) as total_picks,
                SUM(CASE WHEN won THEN 1 ELSE 0 END) as wins,
                ROUND(100.0 * SUM(CASE WHEN won THEN 1 ELSE 0 END) / COUNT(*), 2) as win_rate,
                ROUND(AVG(profit), 2) as avg_profit
            FROM picks
            WHERE won IS NOT NULL
            GROUP BY market, league
            ORDER BY win_rate DESC
        """)
        
        stats = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return {
            "status": "success",
            "data": list(stats) if stats else []
        }
    except Exception as e:
        logger.error(f"Error get_picks_summary: {e}")
        return {"status": "error", "message": str(e)}, 500

# ============================================================================
# ADMIN - BATCH LOAD DATA
# ============================================================================

@app.post("/api/admin/load-batch")
async def load_batch_data(picks: list[PickData] = [], players: list[PlayerData] = [], matches: list[MatchData] = []):
    """Carica dati batch via POST JSON"""
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database unavailable"}, 500
        
        cursor = conn.cursor()
        loaded = 0
        
        # Carica picks
        for pick in picks:
            try:
                cursor.execute("""
                    INSERT INTO picks (date, league, home, away, market, pick, prob, odds, value, won, profit)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (pick.date, pick.league, pick.home, pick.away, pick.market, pick.pick, 
                      pick.prob, pick.odds, pick.value, pick.won, pick.profit))
                loaded += 1
            except Exception as e:
                logger.error(f"Pick insert error: {e}")
        
        # Carica players
        for player in players:
            try:
                cursor.execute("""
                    INSERT INTO giocatori (id, name, team, league, position, xg_avg_10, pai)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (player.id, player.name, player.team, player.league, player.position, 
                      player.xg_avg_10, player.pai))
                loaded += 1
            except Exception as e:
                logger.error(f"Player insert error: {e}")
        
        # Carica matches
        for match in matches:
            try:
                cursor.execute("""
                    INSERT INTO partite (date, league, home, away, ft_total, xg_total, xg_home, xg_away, won, market, pick)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (match.date, match.league, match.home, match.away, match.ft_total, match.xg_total,
                      match.xg_home, match.xg_away, match.won, match.market, match.pick))
                loaded += 1
            except Exception as e:
                logger.error(f"Match insert error: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"status": "success", "loaded": loaded, "total": len(picks) + len(players) + len(matches)}
    
    except Exception as e:
        logger.error(f"Batch load error: {e}")
        return {"status": "error", "message": str(e)}, 500

# ============================================================================
# ROOT
# ============================================================================
# ============================================================================
# MODELS - DONAZIONI
# ============================================================================

class DonationData(BaseModel):
    email: str
    amount: float
    message: str = ""
    stripe_payment_id: str = ""

# ============================================================================
# API - DONAZIONI
# ============================================================================

@app.post("/api/donazioni")
async def create_donation(donation: DonationData):
    """Salva una donazione nel database"""
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database unavailable"}, 500
        
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO donazioni (email, amount, stripe_payment_id, status)
            VALUES (%s, %s, %s, %s)
        """, (
            donation.email,
            donation.amount,
            donation.stripe_payment_id,
            'completed'
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Donazione salvata: {donation.email} - €{donation.amount}")
        
        return {
            "status": "success",
            "message": f"Donazione di €{donation.amount} registrata",
            "email": donation.email
        }
    
    except Exception as e:
        logger.error(f"Donation error: {e}")
        return {"status": "error", "message": str(e)}, 500

@app.get("/api/donazioni/stats")
async def get_donation_stats():
    """Statistiche donazioni"""
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database unavailable"}, 500
        
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_donations,
                SUM(amount) as total_amount,
                ROUND(AVG(amount), 2) as avg_amount,
                MAX(amount) as max_amount
            FROM donazioni
        """)
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        return {
            "status": "success",
            "data": {
                "total_donations": result[0] or 0,
                "total_amount": float(result[1]) if result[1] else 0,
                "avg_amount": float(result[2]) if result[2] else 0,
                "max_amount": float(result[3]) if result[3] else 0
            }
        }
    
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return {"status": "error", "message": str(e)}, 500
@app.get("/api/analytics/picks-summary")
async def get_picks_summary():
    """Analytics: Riepilogo performance per market"""
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database unavailable"}, 500
        
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                market,
                league,
                COUNT(*) as total_picks,
                ROUND(SUM(CASE WHEN won = 1 THEN 1 ELSE 0 END)::float / COUNT(*) * 100, 1) as win_rate,
                ROUND(AVG(profit), 2) as avg_profit
            FROM picks
            GROUP BY market, league
            ORDER BY total_picks DESC
        """)
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        data = []
        for row in results:
            data.append({
                "market": row[0],
                "league": row[1],
                "total_picks": row[2],
                "win_rate": row[3] or 0,
                "avg_profit": row[4] or 0
            })
        
        return {"status": "success", "data": data}
    
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        return {"status": "error", "message": str(e)}, 500
@app.post("/api/admin/load-real-data")
async def load_real_data():
    """Carica i dati reali da atlas_ml_master.json e player_props_db.json"""
    try:
        import json
        
        # Carica dati dai file
        with open('atlas_ml_master.json', 'r') as f:
            picks_data = json.load(f)
        
        with open('player_props_db.json', 'r') as f:
            players_data = json.load(f)
        
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database unavailable"}, 500
        
        cursor = conn.cursor()
        
        # Pulisci le tabelle
        cursor.execute("DELETE FROM picks")
        cursor.execute("DELETE FROM giocatori")
        
        # Inserisci i pick
        for item in picks_data:
            result = item.get('result', {})
            cursor.execute("""
                INSERT INTO picks (date, league, home, away, market, pick, prob, odds, value, won, profit)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                item.get('date'),
                item.get('league'),
                item.get('home'),
                item.get('away'),
                item.get('market'),
                item.get('pick'),
                item.get('prob', 0),
                item.get('odds', 0),
                item.get('value', 0),
                result.get('won', False),
                result.get('profit', 0)
            ))
        
        # Inserisci i giocatori
        for player_id, player_data in players_data.items():
            xg_history = player_data.get('match_xg_history', [])
            xg_avg = sum(xg_history) / len(xg_history) if xg_history else 0
            
            rating_history = player_data.get('rating_history', [])
            rating_avg = sum(rating_history) / len(rating_history) if rating_history else 0
            
            cursor.execute("""
                INSERT INTO giocatori (id, name, team, league, position, xg_avg_10, pai, form_trend, momentum_score)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    xg_avg_10 = EXCLUDED.xg_avg_10,
                    pai = EXCLUDED.pai,
                    form_trend = EXCLUDED.form_trend,
                    momentum_score = EXCLUDED.momentum_score
            """, (
                str(player_id),
                player_data.get('name'),
                player_data.get('team'),
                player_data.get('league'),
                player_data.get('position'),
                round(xg_avg, 2),
                round(rating_avg / 10, 2),
                'positive' if rating_avg > 6.5 else 'negative',
                int(rating_avg * 10)
            ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Dati reali caricati: {len(picks_data)} pick, {len(players_data)} giocatori")
        
        return {
            "status": "success",
            "picks_loaded": len(picks_data),
            "players_loaded": len(players_data),
            "message": "Dati reali caricati con successo!"
        }
    
    except Exception as e:
        logger.error(f"Load real data error: {e}")
        return {"status": "error", "message": str(e)}, 500
@app.get("/")
async def root():
    return {
        "app": "ATLAS Betting API",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
        "timestamp": datetime.now().isoformat()
    }

# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup():
    logger.info("🚀 ATLAS Betting API starting...")
    await create_tables_if_not_exist()
    await load_initial_data()
    logger.info("✅ ATLAS Betting API ready!")
