import logging
import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI setup
app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')

def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logger.error(f"DB connection error: {e}")
        return None

# Pydantic models
class PickData(BaseModel):
    email: str = ""
    date: str = ""
    market: str = ""
    pick: str = ""

class GiocatoreData(BaseModel):
    name: str
    team: str
    position: str

class DonationData(BaseModel):
    email: str
    amount: float
    message: str = ""
    stripe_payment_id: str = ""

class FeedbackData(BaseModel):
    email: str
    comment: str
    rating: int = 5

# ============================================================================
# DATABASE SETUP
# ============================================================================

def create_tables_if_not_exist():
    """Crea le tabelle se non esistono"""
    conn = get_db_connection()
    if not conn:
        logger.error("Cannot create tables - no DB connection")
        return
    
    cursor = conn.cursor()
    
    # Tabella picks
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS picks (
            id SERIAL PRIMARY KEY,
            date DATE,
            league VARCHAR(100),
            home VARCHAR(100),
            away VARCHAR(100),
            market VARCHAR(50),
            pick VARCHAR(50),
            prob FLOAT,
            odds FLOAT,
            value FLOAT,
            won BOOLEAN DEFAULT FALSE,
            profit FLOAT DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    
    # Tabella giocatori
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS giocatori (
            id VARCHAR(20) PRIMARY KEY,
            name VARCHAR(255),
            team VARCHAR(100),
            league VARCHAR(100),
            position VARCHAR(10),
            xg_avg_10 FLOAT,
            pai FLOAT,
            form_trend VARCHAR(20),
            momentum_score INT,
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    
    # Tabella partite
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS partite (
            id SERIAL PRIMARY KEY,
            date DATE,
            league VARCHAR(100),
            home VARCHAR(100),
            away VARCHAR(100),
            ft_total INT,
            xg_total FLOAT,
            xg_home FLOAT,
            xg_away FLOAT,
            won BOOLEAN,
            market VARCHAR(50),
            pick VARCHAR(50),
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    
    # Tabella users
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    
    # Tabella feedback
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255),
            comment TEXT,
            rating INT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    
    # Tabella donazioni
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS donazioni (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255),
            amount FLOAT,
            stripe_payment_id VARCHAR(255),
            status VARCHAR(50),
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    
    conn.commit()
    cursor.close()
    conn.close()
    logger.info("✅ Tables created/verified")

# ============================================================================
# LOAD DATA FROM JSON FILES
# ============================================================================

def load_initial_data():
    """Carica i dati reali dai file JSON al startup"""
    conn = get_db_connection()
    if not conn:
        logger.error("Cannot load data - no DB connection")
        return
    
    cursor = conn.cursor()
    
    # Controlla se ci sono già dati
    cursor.execute("SELECT COUNT(*) FROM picks")
    count = cursor.fetchone()[0]
    
    if count > 0:
        logger.info(f"✅ Database già contiene {count} pick")
        cursor.close()
        conn.close()
        return
    
    logger.info("📥 Caricamento dati dai file JSON...")
    
    try:
        # Carica picks
        with open('atlas_ml_master.json', 'r') as f:
            picks_data = json.load(f)
        
        picks_inserted = 0
        for item in picks_data:
            result = item.get('result', {})
            try:
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
                picks_inserted += 1
            except Exception as e:
                logger.warning(f"Skip pick: {e}")
        
        conn.commit()
        logger.info(f"✅ Caricati {picks_inserted} pick")
        
        # Carica giocatori
        with open('player_props_db.json', 'r') as f:
            players_data = json.load(f)
        
        players_inserted = 0
        for player_id, player_data in players_data.items():
            xg_history = player_data.get('match_xg_history', [])
            xg_avg = sum(xg_history) / len(xg_history) if xg_history else 0
            
            rating_history = player_data.get('rating_history', [])
            rating_avg = sum(rating_history) / len(rating_history) if rating_history else 0
            
            try:
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
                players_inserted += 1
            except Exception as e:
                logger.warning(f"Skip player: {e}")
        
        conn.commit()
        logger.info(f"✅ Caricati {players_inserted} giocatori")
        
    except FileNotFoundError as e:
        logger.error(f"❌ File JSON non trovato: {e}")
    except Exception as e:
        logger.error(f"❌ Errore caricamento dati: {e}")
    finally:
        cursor.close()
        conn.close()

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check"""
    conn = get_db_connection()
    if conn:
        conn.close()
        return {"status": "healthy", "database": "connected"}
    return {"status": "healthy", "database": "disconnected"}, 500

@app.get("/api/picks")
async def get_picks(league: str = None, market: str = None, limit: int = 100):
    """Ottieni i pick"""
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error"}, 500
        
        cursor = conn.cursor()
        query = "SELECT * FROM picks WHERE 1=1"
        params = []
        
        if league:
            query += " AND league = %s"
            params.append(league)
        if market:
            query += " AND market = %s"
            params.append(market)
        
        query += " ORDER BY date DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        picks = [
            {
                "id": r[0],
                "date": str(r[1]),
                "league": r[2],
                "home": r[3],
                "away": r[4],
                "market": r[5],
                "pick": r[6],
                "prob": r[7],
                "odds": r[8],
                "value": r[9],
                "won": r[10],
                "profit": r[11]
            }
            for r in rows
        ]
        
        cursor.close()
        conn.close()
        
        return {"status": "success", "count": len(picks), "data": picks}
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"status": "error"}, 500

@app.get("/api/giocatori")
async def get_giocatori(team: str = None, position: str = None, limit: int = 20):
    """Ottieni i giocatori"""
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error"}, 500
        
        cursor = conn.cursor()
        query = "SELECT * FROM giocatori WHERE 1=1"
        params = []
        
        if team:
            query += " AND team = %s"
            params.append(team)
        if position:
            query += " AND position = %s"
            params.append(position)
        
        query += " ORDER BY xg_avg_10 DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        giocatori = [
            {
                "id": r[0],
                "name": r[1],
                "team": r[2],
                "league": r[3],
                "position": r[4],
                "xg_avg_10": r[5],
                "pai": r[6],
                "form_trend": r[7],
                "momentum_score": r[8]
            }
            for r in rows
        ]
        
        cursor.close()
        conn.close()
        
        return {"status": "success", "count": len(giocatori), "data": giocatori}
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"status": "error"}, 500

@app.get("/api/analytics/picks-summary")
async def get_picks_summary():
    """Analytics per market"""
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error"}, 500
        
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                market,
                league,
                COUNT(*) as total_picks,
                ROUND(SUM(CASE WHEN won = true THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100, 1) as win_rate,
                ROUND(AVG(profit), 2) as avg_profit
            FROM picks
            GROUP BY market, league
            ORDER BY total_picks DESC
        """)
        
        rows = cursor.fetchall()
        
        data = [
            {
                "market": r[0],
                "league": r[1],
                "total_picks": r[2],
                "win_rate": r[3] or 0,
                "avg_profit": r[4] or 0
            }
            for r in rows
        ]
        
        cursor.close()
        conn.close()
        
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"status": "error"}, 500

@app.post("/api/donazioni")
async def create_donation(donation: DonationData):
    """Salva una donazione"""
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error"}, 500
        
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
        
        logger.info(f"Donazione: {donation.email} - €{donation.amount}")
        return {"status": "success", "message": f"Donazione di €{donation.amount} registrata"}
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"status": "error"}, 500

@app.post("/api/feedback")
async def create_feedback(feedback: FeedbackData):
    """Salva il feedback"""
    try:
        conn = get_db_connection()
        if not conn:
            return {"status": "error"}, 500
        
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO feedback (email, comment, rating)
            VALUES (%s, %s, %s)
        """, (
            feedback.email,
            feedback.comment,
            feedback.rating
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Feedback: {feedback.email}")
        return {"status": "success", "message": "Grazie per il feedback!"}
    except Exception as e:
        logger.error(f"Error: {e}")
        return {"status": "error"}, 500

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "status": "online",
        "service": "ATLAS Betting API",
        "version": "1.0",
        "endpoints": {
            "health": "/health",
            "picks": "/api/picks",
            "giocatori": "/api/giocatori",
            "analytics": "/api/analytics/picks-summary",
            "donazioni": "/api/donazioni (POST)",
            "feedback": "/api/feedback (POST)"
        }
    }

# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Al startup del server"""
    logger.info("🚀 ATLAS API Starting...")
    create_tables_if_not_exist()
    load_initial_data()
    logger.info("✅ ATLAS API Ready!")
