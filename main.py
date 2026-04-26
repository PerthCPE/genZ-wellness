from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import json
import os
from datetime import datetime

app = FastAPI(title="Mood & Energy Tracker", version="2.0")

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

DATA_FILE = "data.json"

# ── Recommendations map ──────────────────────────────────────────────────────
RECOMMENDATIONS = {
    "happy":   ["Share your vibe — call a friend 📞", "Start that creative project you've been ghosting 🎨", "Workout while you're in this energy ✨"],
    "sad":     ["Put on your comfort playlist 🎵", "Write down 3 things you're grateful for 📝", "Take a slow walk outside and breathe 🌿"],
    "tired":   ["Take a 20-min power nap 😴", "Drink a big glass of water first 💧", "5-minute stretching session 🧘"],
    "angry":   ["Box breathing: 4s in, hold 4s, out 4s 🌬️", "Punch a pillow or go for a run 🏃", "Journal it out — no filter 📒"],
    "anxious": ["Ground yourself: 5 things you can see 👁️", "Limit doomscrolling for the next hour 📵", "Make a small to-do list to feel in control ✅"],
    "neutral": ["Try something new today 🌀", "Check in with someone you haven't texted in a while 💬", "Organize one small corner of your space 🗂️"],
    "blessed": ["Do something kind for a stranger 🌸", "Document this moment — write or take a photo 📸", "Plan your next adventure 🗺️"],
    "hyped":   ["Channel that into a workout or project 🔥", "Don't crash — eat something and hydrate 🥤", "Share the energy — it's contagious 🎉"],
}

DEFAULT_RECS = ["Take a mindful moment 🧘", "Hydrate and breathe 💧", "You're doing better than you think 💫"]

# ── Data helpers ─────────────────────────────────────────────────────────────
def load_data() -> list:
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def save_data(logs: list):
    with open(DATA_FILE, "w") as f:
        json.dump(logs, f, indent=2)

# ── Schemas ───────────────────────────────────────────────────────────────────
class MoodLog(BaseModel):
    mood: str
    energy: int
    note: Optional[str] = None

# ── Pages ─────────────────────────────────────────────────────────────────────
@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/dashboard")
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

# ── API v1 + v2 ───────────────────────────────────────────────────────────────
@app.post("/logs", status_code=201)
async def add_log(log: MoodLog):
    if not (1 <= log.energy <= 10):
        return JSONResponse({"error": "Energy must be between 1 and 10"}, status_code=422)

    logs = load_data()
    entry = {
        "id": len(logs) + 1,
        "mood": log.mood.lower().strip(),
        "energy": log.energy,
        "note": log.note or "",
        "timestamp": datetime.now().isoformat()
    }
    logs.append(entry)
    save_data(logs)
    return {"message": "Log saved ✨", "log": entry}

@app.get("/logs")
async def get_logs(mood: Optional[str] = Query(None)):
    logs = load_data()
    if mood:
        logs = [l for l in logs if l["mood"] == mood.lower().strip()]
    return logs

@app.get("/stats")
async def get_stats():
    logs = load_data()
    if not logs:
        return {"average_energy": 0, "total_logs": 0, "mood_breakdown": {}}

    avg = round(sum(l["energy"] for l in logs) / len(logs), 2)
    breakdown = {}
    for l in logs:
        breakdown[l["mood"]] = breakdown.get(l["mood"], 0) + 1

    return {
        "average_energy": avg,
        "total_logs": len(logs),
        "mood_breakdown": breakdown
    }

@app.get("/recommend")
async def recommend(mood: Optional[str] = Query(None)):
    import random
    if mood and mood.lower() in RECOMMENDATIONS:
        suggestions = RECOMMENDATIONS[mood.lower()]
    else:
        suggestions = DEFAULT_RECS
    return {"activity": random.choice(suggestions), "mood": mood or "unknown"}

@app.delete("/logs/{log_id}")
async def delete_log(log_id: int):
    logs = load_data()
    logs = [l for l in logs if l.get("id") != log_id]
    save_data(logs)
    return {"message": "Deleted"}
