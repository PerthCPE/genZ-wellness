
# 🌙 Gen Z Mood & Energy Tracker

A full-stack mini web application built with **FastAPI** + **HTML/CSS/JS**.  
Dark mode. Glassmorphism. Emoji-based. No database — just vibes and a JSON file.

---

## 📁 Project Structure

```
project/
 ├── main.py              ← FastAPI backend (API + page routes)
 ├── data.json            ← Local data storage (auto-created)
 ├── requirements.txt     ← Python dependencies
 ├── templates/
 │    ├── index.html      ← Home page (log mood)
 │    └── dashboard.html  ← Dashboard (stats + history)
 └── static/
      ├── style.css       ← Gen Z dark aesthetic styles
      └── script.js       ← Frontend logic (both pages)
```

---

## 🚀 Setup & Run

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the server
```bash
uvicorn main:app --reload
```

### 3. Open in browser
```
http://localhost:8000
```

---

## 🔌 API Reference

### POST /logs
Log a new mood entry.

**Request:**
```json
{
  "mood": "happy",
  "energy": 8,
  "note": "Had a great day"
}
```

**Response:**
```json
{
  "message": "Log saved ✨",
  "log": {
    "id": 1,
    "mood": "happy",
    "energy": 8,
    "note": "Had a great day",
    "timestamp": "2025-04-26T14:30:00"
  }
}
```

---

### GET /logs
Retrieve all logs (Version 1).

```
GET /logs
```

**With mood filter (Version 2):**
```
GET /logs?mood=sad
```

---

### GET /stats
Get summary statistics.

**Response:**
```json
{
  "average_energy": 6.5,
  "total_logs": 10,
  "mood_breakdown": {
    "happy": 4,
    "sad": 2,
    "tired": 4
  }
}
```

---

### GET /recommend
Get a wellness suggestion based on mood.

```
GET /recommend?mood=tired
```

**Response:**
```json
{
  "activity": "Take a 20-min power nap 😴",
  "mood": "tired"
}
```

---

### DELETE /logs/{id}
Delete a specific log entry.

---

## 🎨 UI Features

| Feature | Description |
|---|---|
| Mood Selector | 8 emoji-based mood buttons with bounce animation |
| Energy Slider | 1–10 range with glowing purple thumb |
| Note Field | Optional text area with glassmorphism style |
| Dashboard Stats | Total logs, average energy, top mood |
| Mood Breakdown | Animated bar chart per mood |
| History List | All entries, filterable by mood |
| Recommendations | Random wellness tip per mood, refreshable |
| Toast Alerts | Non-intrusive slide-up notifications |

---

## 🧠 Supported Moods

| Mood | Emoji |
|---|---|
| happy | 😁 |
| blessed | 😇 |
| hyped | 🤩 |
| neutral | 😐 |
| tired | 😴 |
| sad | 😭 |
| angry | 😡 |
| anxious | 😰 |

---

## 📦 Version History

### v1 — Basic API
- `POST /logs` — save a log
- `GET /logs` — retrieve all logs

### v2 — Enhanced
- `GET /logs?mood=X` — filter by mood
- `GET /stats` — average energy + breakdown
- `GET /recommend?mood=X` — wellness suggestions
- Full Gen Z dark mode dashboard UI
- Smooth animations + glassmorphism

---

## 💡 Notes

- No database required — data is stored in `data.json`
- No external APIs or API keys needed
- Fully offline-compatible after first page load
- Server must be running at `localhost:8000` for the frontend to work
