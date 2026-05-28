from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import psycopg2
from psycopg2.extras import RealDictCursor, execute_batch
from dotenv import load_dotenv
from datetime import datetime
from pathlib import Path
from datetime import datetime
import logging
import json
import requests

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
# CARICA DATI DAL STARTUP
# ============================================================================
async def load_initial_data():
    """Carica i dati da JSON al startup - versione veloce con psycopg2 batch"""
    global data_loaded
    
    if data_loaded:
        return
    
    try:
        logger.info("Loading initial data...")
        
        conn = get_db_connection()
        if not conn:
            logger.error("Cannot connect to DB for data loading")
            return
        
        cursor = conn.cursor()
        
        # Check se picks sono già caricati
        cursor.execute("SELECT COUNT(*) FROM picks")
        picks_count = cursor.fetchone()[0]
        
        if picks_count > 0:
            logger.info(f"Database already populated ({picks_count} picks)")
            data_loaded = True
            cursor.close()
            conn.close()
            return
        
        # Carica picks
        logger.info("Loading picks...")
        with open('/mnt/project/atlas_ml_master.json', 'r') as f:
            picks = json.load(f)
        
        picks_data = []
        for pick in picks:
            result = pick.get('result', {}) or {}
            picks_data.append((
                pick.get('date'),
                pick.get('league'),
                pick.get('home'),
                pick.get('away'),
                pick.get('market'),
                pick.get('pick'),
                pick.get('prob'),
                pick.get('odds'),
                pick.get('value'),
                result.get('won'),
                result.get('profit')
            ))
        
        execute_batch(cursor, """
            INSERT INTO picks (date, league, home, away, market, pick, prob, odds, value, won, profit)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, picks_data, page_size=50)
        conn.commit()
        logger.info(f"Loaded {len(picks_data)} picks")
        
        # Carica giocatori
        logger.info("Loading players...")
        with open('/mnt/project/player_props_db.json', 'r') as f:
            players_dict = json.load(f)
        
        players_data = []
        for player_id, pdata in players_dict.items():
            xg_history = pdata.get('xg_history', [])
            xg_avg = sum(xg_history[-10:]) / len(xg_history[-10:]) if xg_history else 0
            players_data.append((
                str(player_id),
                pdata.get('name'),
                pdata.get('team'),
                pdata.get('league'),
                pdata.get('position'),
                round(xg_avg, 2),
                pdata.get('pai', 1.0)
            ))
        
        execute_batch(cursor, """
            INSERT INTO giocatori (id, name, team, league, position, xg_avg_10, pai)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, players_data, page_size=50)
        conn.commit()
        logger.info(f"Loaded {len(players_data)} players")
        
        # Carica partite
        logger.info("Loading matches...")
        with open('/mnt/user-data/uploads/atlas_ml_universe.json', 'r') as f:
            partite_list = json.load(f)
        
        partite_data = []
        for p in partite_list:
            partite_data.append((
                p.get('date'),
                p.get('league'),
                p.get('home'),
                p.get('away'),
                p.get('ft_total'),
                p.get('xg_total'),
                p.get('xg_home'),
                p.get('xg_away'),
                p.get('won'),
                p.get('market'),
                p.get('pick')
            ))
        
        execute_batch(cursor, """
            INSERT INTO partite (date, league, home, away, ft_total, xg_total, xg_home, xg_away, won, market, pick)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, partite_data, page_size=100)
        conn.commit()
        logger.info(f"Loaded {len(partite_data)} matches")
        
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
# ADMIN - BATCH LOAD DATA (API)
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
# API - PICKS TODAY
# ============================================================================

@app.get("/api/picks-today")
async def get_picks_today():
    """
    Legge il file picks più recente da GitHub API
    Formato file: picks_YYYY-MM-DD.json
    """
    try:
        # URL della cartella picks su GitHub API
        github_url = "https://api.github.com/repos/marcolippolis1990/atlas-betting/contents/backend/data/picks"
        
        # Fetch dalla API di GitHub
        response = requests.get(github_url)
        
        if response.status_code != 200:
            return {
                "error": "Nessun pick disponibile oggi",
                "message": "Salva un file picks_YYYY-MM-DD.json in GitHub /backend/data/picks/"
            }
        
        files = response.json()
        
        # Filtra solo i file picks_*.json
        pick_files = [f for f in files if f['name'].startswith('picks_') and f['name'].endswith('.json')]
        
        if not pick_files:
            return {
                "error": "Nessun pick disponibile oggi",
                "message": "Salva un file picks_YYYY-MM-DD.json in GitHub /backend/data/picks/"
            }
        
        # Prendi il file più recente
        latest_file = sorted(pick_files, key=lambda x: x['name'])[-1]
        
        # Leggi il contenuto del file
        file_response = requests.get(latest_file['download_url'])
        
        if file_response.status_code == 200:
            return file_response.json()
        else:
            return {"error": "Errore lettura file"}
            
    except Exception as e:
        return {"error": f"Errore: {str(e)}"}
# ============================================================================
# API - V5HIGH PICKS
# ============================================================================

@app.get("/api/picks-v5high")
async def get_v5high_picks():
    """Legge il file JSON dei pick da v5high"""
    try:
        picks_file = Path("backend/data/picks/picks_latest.json")
        
        if not picks_file.exists():
            return []
        
        with open(picks_file, 'r') as f:
            picks = json.load(f)
        return picks
    except Exception as e:
        logger.error(f"Error reading picks: {e}")
        return []
# ============================================================================
# ROOT
# ============================================================================

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
# STARTUP EVENT
# ============================================================================

@app.on_event("startup")
async def startup():
    logger.info("🚀 ATLAS Betting API starting...")
    await create_tables_if_not_exist()
    await load_initial_data()
    logger.info("✅ ATLAS Betting API ready!")
