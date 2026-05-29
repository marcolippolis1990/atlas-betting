from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import psycopg2
from psycopg2.extras import RealDictCursor, execute_batch
from dotenv import load_dotenv
from datetime import datetime, timedelta
from pathlib import Path
import logging
import json
import requests
from passlib.context import CryptContext
from jwt import encode, decode, ExpiredSignatureError, InvalidTokenError

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24  # 30 giorni

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    # Bcrypt ha un limite di 72 byte
    password = password[:72]
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Bcrypt ha un limite di 72 byte
    plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

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

class RegisterRequest(BaseModel):
    email: str
    password: str
    password_confirm: str

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    email: str
    username: str

class RosaPlayer(BaseModel):
    id: int
    name: str
    team: str
    pos: str
    avg_rating: float
    prob_score: float
    prob_assist: float

class RosaRequest(BaseModel):
    players: list[RosaPlayer]

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
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            username VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_rosa (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            player_id INTEGER NOT NULL,
            player_name VARCHAR(150) NOT NULL,
            player_team VARCHAR(100) NOT NULL,
            player_pos VARCHAR(5) NOT NULL,
            avg_rating NUMERIC(4,2),
            prob_score NUMERIC(5,3),
            prob_assist NUMERIC(5,3),
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
# API - AUTENTICAZIONE
# ============================================================================

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    """Registra un nuovo utente"""
    try:
        if req.password != req.password_confirm:
            raise HTTPException(status_code=400, detail="Le password non corrispondono")
        
        if len(req.password) < 6:
            raise HTTPException(status_code=400, detail="La password deve essere almeno 6 caratteri")
        
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Database unavailable")
        
        cursor = conn.cursor()
        
        # Controlla se l'email esiste già
        cursor.execute("SELECT id FROM users WHERE email = %s", (req.email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="Email già registrata")
        
        # Hash password e crea utente
        hashed_password = hash_password(req.password)
        username = req.email.split('@')[0]
        
        cursor.execute(
            "INSERT INTO users (email, password, username) VALUES (%s, %s, %s) RETURNING id",
            (req.email, hashed_password, username)
        )
        user_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()
        
        # Crea token
        access_token = create_access_token(data={"sub": req.email, "user_id": user_id})
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            email=req.email,
            username=username
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Register error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    """Login utente"""
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Database unavailable")
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT id, email, password, username FROM users WHERE email = %s", (req.email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user or not verify_password(req.password, user['password']):
            raise HTTPException(status_code=401, detail="Email o password scorretti")
        
        # Crea token
        access_token = create_access_token(data={"sub": req.email, "user_id": user['id']})
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            email=user['email'],
            username=user['username']
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# API - ROSA GIOCATORI
# ============================================================================

def get_current_user(authorization: str = Header(None)):
    """Estrae user_id dal token JWT"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Token mancante")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalido")
        return user_id
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalido")

@app.post("/api/user/rosa")
async def save_rosa(req: RosaRequest, authorization: str = Header(None)):
    """Salva la rosa giocatori dell'utente"""
    try:
        user_id = get_current_user(authorization)
        
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Database unavailable")
        
        cursor = conn.cursor()
        
        # Cancella la rosa vecchia
        cursor.execute("DELETE FROM user_rosa WHERE user_id = %s", (user_id,))
        
        # Inserisci la nuova rosa
        rosa_data = []
        for player in req.players:
            rosa_data.append((
                user_id,
                player.id,
                player.name,
                player.team,
                player.pos,
                player.avg_rating,
                player.prob_score,
                player.prob_assist
            ))
        
        if rosa_data:
            execute_batch(cursor, """
                INSERT INTO user_rosa (user_id, player_id, player_name, player_team, player_pos, avg_rating, prob_score, prob_assist)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, rosa_data, page_size=50)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"status": "success", "message": "Rosa salvata", "players_saved": len(req.players)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save rosa error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/rosa")
async def get_rosa(authorization: str = Header(None)):
    """Recupera la rosa giocatori dell'utente"""
    try:
        user_id = get_current_user(authorization)
        
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Database unavailable")
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT player_id as id, player_name as name, player_team as team, player_pos as pos,
                   avg_rating, prob_score, prob_assist
            FROM user_rosa
            WHERE user_id = %s
            ORDER BY added_at DESC
        """, (user_id,))
        
        rosa = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return {
            "status": "success",
            "data": list(rosa) if rosa else []
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get rosa error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
    """Legge il file JSON dei pick da v5high da GitHub"""
    try:
        github_url = "https://raw.githubusercontent.com/marcolippolis1990/atlas-betting/main/backend/data/picks/picks_latest.json"
        response = requests.get(github_url)
        
        if response.status_code == 200:
            return response.json()
        else:
            return []
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
