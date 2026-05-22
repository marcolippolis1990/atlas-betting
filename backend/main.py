from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
    logger.error("❌ DATABASE_URL non configurato!")
    DATABASE_URL = "postgresql://postgres:xxxxx@roundhouse.proxy.rlwy.net:5432/railway"

app = FastAPI(
    title="ATLAS Betting API",
    description="Picking calcistico intelligente",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
def get_db_connection():
    """Connessione al database PostgreSQL"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logger.error(f"❌ Errore connessione DB: {e}")
        return None

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """Verifica che l'app sia online"""
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
# ENDPOINTS - PICKS
# ============================================================================

@app.get("/api/picks")
async def get_picks(league: str = None, market: str = None, limit: int = 100):
    """Ritorna pick dal database"""
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database non disponibile"}, 500
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Build query dinamico
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
# ENDPOINTS - GIOCATORI
# ============================================================================

@app.get("/api/giocatori")
async def get_giocatori(team: str = None, position: str = None, limit: int = 50):
    """Ritorna giocatori dal database"""
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database non disponibile"}, 500
            
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
# ENDPOINTS - PARTITE
# ============================================================================

@app.get("/api/partite")
async def get_partite(league: str = None, limit: int = 100):
    """Ritorna partite storiche dal database"""
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database non disponibile"}, 500
            
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
# ENDPOINTS - ANALYTICS
# ============================================================================

@app.get("/api/analytics/picks-summary")
async def get_picks_summary():
    """Riepilogo performance picks per market"""
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database non disponibile"}, 500
            
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
# ROOT
# ============================================================================
# ============================================================================
# ENDPOINT - LOAD DATA
# ============================================================================

@app.post("/api/admin/load-data")
async def load_data_from_json():
    """Carica dati da JSON nel database"""
    import json
    
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error", "message": "Database non disponibile"}, 500
        
        cursor = conn.cursor()
        
        # Load picks
        with open('/mnt/project/atlas_ml_master.json', 'r') as f:
            picks = json.load(f)
        
        picks_count = 0
        for pick in picks:
            result = pick.get('result', {}) or {}
            try:
                cursor.execute("""
                    INSERT INTO picks (date, league, home, away, market, pick, prob, odds, value, won, profit)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
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
                picks_count += 1
            except:
                pass
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "status": "success",
            "message": f"Caricati {picks_count} pick"
        }
    
    except Exception as e:
        logger.error(f"Error load_data: {e}")
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
# FINE
# ============================================================================
