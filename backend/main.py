from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from datetime import datetime

app = FastAPI(title="ATLAS Betting API", version="1.0.0")

# CORS setup per frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Carica i dati dai JSON (placeholder per ora)
DATA = {
    "picks": [],
    "giocatori": [],
    "partite": [],
    "live_signals": []
}

# Carica player props se esiste
try:
    with open('data/player_props_db.json', encoding='utf-8') as f:
        DATA["giocatori"] = json.load(f)
except:
    DATA["giocatori"] = []

@app.get("/")
def root():
    return {
        "message": "ATLAS Betting API v1.0",
        "status": "online",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/picks/{data}")
def get_picks(data: str):
    """Restituisce i pick per una data specifica"""
    return {
        "data": data,
        "picks": DATA["picks"],
        "count": len(DATA["picks"])
    }

@app.get("/api/giocatori")
def get_giocatori(
    lega: str = Query(None),
    min_xg: float = Query(0),
    posizione: str = Query(None),
    skip: int = Query(0),
    limit: int = Query(50)
):
    """Restituisce giocatori con filtri"""
    risultati = DATA["giocatori"]
    
    if lega:
        risultati = [g for g in risultati if g.get('lega') == lega]
    if posizione:
        risultati = [g for g in risultati if g.get('posizione') == posizione]
    if min_xg > 0:
        risultati = [g for g in risultati if float(g.get('xg', 0)) >= min_xg]
    
    return {
        "total": len(risultati),
        "count": len(risultati[skip:skip+limit]),
        "giocatori": risultati[skip:skip+limit]
    }

@app.get("/api/giocatori/{giocatore_id}")
def get_giocatore(giocatore_id: str):
    """Restituisce dettagli di un giocatore"""
    for g in DATA["giocatori"]:
        if g.get('id') == giocatore_id or g.get('nome', '').lower() == giocatore_id.lower():
            return g
    return {"error": "Giocatore non trovato"}

@app.get("/api/partite")
def get_partite(data: str = Query(None)):
    """Restituisce partite per una data"""
    return {
        "data": data,
        "partite": DATA["partite"],
        "count": len(DATA["partite"])
    }

@app.get("/api/live-signals")
def get_live_signals():
    """Restituisce segnali live in-play"""
    return {
        "signals": DATA["live_signals"],
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/fantacalcio/formazione-ottimale")
def get_formazione_ottimale(data: str = Query(None)):
    """Restituisce la formazione fantacalcio ottimale"""
    return {
        "data": data,
        "formazione": {
            "portiere": None,
            "difensori": [],
            "centrocampisti": [],
            "attaccanti": []
        },
        "info": "Funzione in sviluppo"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
