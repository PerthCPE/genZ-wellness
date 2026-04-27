from fastapi import FastAPI, Query, Cookie, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import json, os, uuid
from datetime import datetime, timezone, timedelta
import psycopg2, psycopg2.extras
from dotenv import load_dotenv
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Asia/Bangkok")


load_dotenv()

app = FastAPI(title="Mood & Energy Tracker", version="2.0")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ── Recommendations ───────────────────────────────────────────────────────────
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

# ── DB ────────────────────────────────────────────────────────────────────────
def get_conn():
    return psycopg2.connect(
        os.environ["DATABASE_URL"],
        cursor_factory=psycopg2.extras.RealDictCursor,
        sslmode="require"
    )

# ── User ID ───────────────────────────────────────────────────────────────────
def get_user_id(response: Response, user_id: Optional[str] = None) -> str:
    if not user_id:
        user_id = str(uuid.uuid4())
        response.set_cookie(key="user_id", value=user_id,
                            max_age=60*60*24*365, httponly=True, samesite="lax")
    return user_id

# ── Schemas ───────────────────────────────────────────────────────────────────
class MoodLog(BaseModel):
    mood:    str
    energy:  int
    note:    Optional[str] = None
    workout: Optional[dict] = None
    weight:  Optional[float] = None
    height:  Optional[float] = None 

# ── Pages ─────────────────────────────────────────────────────────────────────
@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/dashboard")
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

# ── POST /logs ────────────────────────────────────────────────────────────────
@app.post("/logs", status_code=201)
async def add_log(log: MoodLog, response: Response,
                  user_id: Optional[str] = Cookie(default=None)):
    if not (1 <= log.energy <= 10):
        return JSONResponse({"error": "Energy must be between 1 and 10"}, status_code=422)
    uid = get_user_id(response, user_id)
    conn = get_conn(); cur = conn.cursor()
    cur.execute(
        "INSERT INTO mood_logs (user_id,mood,energy,note,workout,weight,height) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *",
        (uid, log.mood.lower().strip(), log.energy, log.note,
        json.dumps(log.workout) if log.workout else None,
        log.weight, log.height)
)
    row = dict(cur.fetchone())
    conn.commit(); conn.close()
    row["timestamp"] = row["timestamp"].astimezone(TZ).isoformat()
    return {"message": "Log saved ✨", "log": row}

# ── GET /logs ─────────────────────────────────────────────────────────────────
@app.get("/logs")
async def get_logs(response: Response, mood: Optional[str] = Query(None),
                   user_id: Optional[str] = Cookie(default=None)):
    uid = get_user_id(response, user_id)
    conn = get_conn(); cur = conn.cursor()
    if mood:
        cur.execute("SELECT * FROM mood_logs WHERE user_id=%s AND mood=%s ORDER BY id",
                    (uid, mood.lower().strip()))
    else:
        cur.execute("SELECT * FROM mood_logs WHERE user_id=%s ORDER BY id", (uid,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    for r in rows:
        r["timestamp"] = r["timestamp"].astimezone(TZ).isoformat()
    return rows

# ── GET /stats ────────────────────────────────────────────────────────────────
@app.get("/stats")
async def get_stats(response: Response,
                    user_id: Optional[str] = Cookie(default=None)):
    uid = get_user_id(response, user_id)
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as total, AVG(energy) as avg FROM mood_logs WHERE user_id=%s", (uid,))
    s = dict(cur.fetchone())
    cur.execute("SELECT mood, COUNT(*) as cnt FROM mood_logs WHERE user_id=%s GROUP BY mood", (uid,))
    bd = {r["mood"]: r["cnt"] for r in cur.fetchall()}
    conn.close()
    return {
        "total_logs": s["total"],
        "average_energy": round(float(s["avg"] or 0), 2),
        "mood_breakdown": bd
    }

# ── GET /recommend ────────────────────────────────────────────────────────────
@app.get("/recommend")
async def recommend(mood: Optional[str] = Query(None)):
    import random
    suggestions = RECOMMENDATIONS.get(mood.lower(), DEFAULT_RECS) if mood else DEFAULT_RECS
    return {"activity": random.choice(suggestions), "mood": mood or "unknown"}

# ── DELETE /logs/{id} ─────────────────────────────────────────────────────────
@app.delete("/logs/{log_id}")
async def delete_log(log_id: int, response: Response,
                     user_id: Optional[str] = Cookie(default=None)):
    uid = get_user_id(response, user_id)
    conn = get_conn(); cur = conn.cursor()
    cur.execute("DELETE FROM mood_logs WHERE id=%s AND user_id=%s", (log_id, uid))
    conn.commit(); conn.close()
    return {"message": "Deleted"}