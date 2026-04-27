/* ── shared.js ── runs on both pages ─────────────────────────────────────── */

const MOOD_MAP = {
  happy:   "😁",
  blessed: "😇",
  hyped:   "🤩",
  neutral: "😐",
  tired:   "😴",
  sad:     "😭",
  angry:   "😡",
  anxious: "😰",
};

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTimeout;
function showToast(msg, type = "success") {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  clearTimeout(toastTimeout);
  t.textContent = msg;
  t.className = `toast ${type}`;
  requestAnimationFrame(() => { requestAnimationFrame(() => { t.classList.add("show"); }); });
  toastTimeout = setTimeout(() => { t.classList.remove("show"); }, 3000);
}

// ── Format date ────────────────────────────────────────────────────────────
function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " +
         d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ══════════════════════════════════════════════════════════════════════════════
// INDEX PAGE
// ══════════════════════════════════════════════════════════════════════════════
if (document.getElementById("moodGrid")) {
  let selectedMood = null;

  // ── Build mood buttons ─────────────────────────────────────────────────
  const grid = document.getElementById("moodGrid");
  Object.entries(MOOD_MAP).forEach(([mood, emoji]) => {
    const btn = document.createElement("button");
    btn.className = "mood-btn";
    btn.dataset.mood = mood;
    btn.innerHTML = `<span class="emoji">${emoji}</span><span class="label">${mood}</span>`;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mood-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedMood = mood;
      updateBtn();
    });
    grid.appendChild(btn);
  });

  // ── Energy slider ──────────────────────────────────────────────────────
  const slider = document.getElementById("energySlider");
  const valDisplay = document.getElementById("energyVal");
  slider.addEventListener("input", () => { valDisplay.textContent = slider.value; });

  // ── Submit button state ────────────────────────────────────────────────
  function updateBtn() {
    document.getElementById("submitBtn").disabled = !selectedMood;
  }

  // ── Workout selector ───────────────────────────────────────────────────
  const workoutSelect = document.getElementById("workout");
  const panels = { weight: "workout-weight", run: "workout-run", other: "workout-other" };

  workoutSelect.addEventListener("change", () => {
    Object.values(panels).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    const active = panels[workoutSelect.value];
    if (active) document.getElementById(active).style.display = "block";
  });

  // Add exercise row
  document.getElementById("addExRow")?.addEventListener("click", () => {
    const tbody = document.getElementById("exerciseBody");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="ex-name" placeholder="e.g. Squat" /></td>
      <td><input type="number" class="ex-sets" placeholder="3" min="1" /></td>
      <td><input type="number" class="ex-reps" placeholder="10" min="1" /></td>
      <td><button class="row-del" onclick="deleteExRow(this)" title="Remove">✕</button></td>`;
    tbody.appendChild(tr);
  });

  window.deleteExRow = function(btn) {
    const tbody = document.getElementById("exerciseBody");
    if (tbody.rows.length > 1) btn.closest("tr").remove();
  };

  // Pace calculator
  const runDuration = document.getElementById("runDuration");
  const runDistance = document.getElementById("runDistance");
  function calcPace() {
    const d = parseFloat(runDistance?.value);
    const t = parseFloat(runDuration?.value);
    const display = document.getElementById("paceDisplay");
    if (!display) return;
    if (d > 0 && t > 0) {
      const paceMin = Math.floor(t / d);
      const paceSec = Math.round((t / d - paceMin) * 60);
      display.textContent = `${paceMin}:${String(paceSec).padStart(2, "0")}`;
    } else {
      display.textContent = "–";
    }
  }
  runDuration?.addEventListener("input", calcPace);
  runDistance?.addEventListener("input", calcPace);

  // ── Collect workout data ───────────────────────────────────────────────
  function collectWorkout() {
    const type = workoutSelect.value;
    if (!type) return null;

    if (type === "weight") {
      const rows = document.querySelectorAll("#exerciseBody tr");
      const exercises = [];
      rows.forEach(r => {
        const name = r.querySelector(".ex-name")?.value.trim();
        const sets = parseInt(r.querySelector(".ex-sets")?.value);
        const reps = parseInt(r.querySelector(".ex-reps")?.value);
        if (name) exercises.push({ name, sets: sets || null, reps: reps || null });
      });
      return { type: "weight", exercises };
    }

    if (type === "run") {
      return {
        type: "run",
        duration_min: parseFloat(runDuration.value) || null,
        distance_km: parseFloat(runDistance.value) || null,
        pace: document.getElementById("paceDisplay").textContent
      };
    }

    if (type === "other") {
      return { type: "other", activity: document.getElementById("otherActivity").value.trim() || null };
    }

    return null;
  }

  // ── Submit ─────────────────────────────────────────────────────────────
document.getElementById("submitBtn").addEventListener("click", async () => {
    if (!selectedMood) return;
    const note = document.getElementById("noteInput").value.trim();
    const energy = parseInt(slider.value);
    const workout = collectWorkout();
    const weight = parseFloat(document.getElementById("inputWeight")?.value) || null;
    const height = parseFloat(document.getElementById("inputHeight")?.value) || null;

    try {
      const res = await fetch("/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: selectedMood, energy, note: note || null, workout, weight, height })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Vibe logged ✨");
        document.querySelectorAll(".mood-btn").forEach(b => b.classList.remove("selected"));
        selectedMood = null;
        slider.value = 5; valDisplay.textContent = 5;
        document.getElementById("noteInput").value = "";
        workoutSelect.value = "";
        Object.values(panels).forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = "none";
        });
        document.getElementById("exerciseBody").innerHTML = `<tr>
          <td><input type="text" class="ex-name" placeholder="e.g. Bench Press" /></td>
          <td><input type="number" class="ex-sets" placeholder="3" min="1" /></td>
          <td><input type="number" class="ex-reps" placeholder="10" min="1" /></td>
          <td><button class="row-del" onclick="deleteExRow(this)" title="Remove">✕</button></td>
        </tr>`;
        if (runDuration) runDuration.value = "";
        if (runDistance) runDistance.value = "";
        const paceEl = document.getElementById("paceDisplay");
        if (paceEl) paceEl.textContent = "–";
        updateBtn();
        loadRecentLog();
      } else {
        showToast(data.error || "Something broke 💀", "error");
      }
    } catch (e) {
      showToast("Can't reach server 🌐", "error");
    }
  });

  // ── Recent log preview ─────────────────────────────────────────────────
  async function loadRecentLog() {
    try {
      const logs = await fetch("/logs").then(r => r.json());
      const wrap = document.getElementById("recentWrap");
      if (!logs.length) {
        wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">🌙</div><p>No logs yet — start tracking your vibe</p></div>`;
        return;
      }
      const last = logs[logs.length - 1];
      wrap.innerHTML = `
        <div class="log-item" style="animation:none">
          <div class="log-emoji">${MOOD_MAP[last.mood] || "😶"}</div>
          <div class="log-info">
            <div class="log-mood">${last.mood}</div>
            <div class="log-note">${last.note || "No note"}</div>
          </div>
          <div class="log-meta">
            <div class="log-energy">${last.energy}/10</div>
            <div class="log-time">${formatTime(last.timestamp)}</div>
          </div>
        </div>`;
    } catch {}
  }
  loadRecentLog();

} // ← ปิด INDEX block

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ══════════════════════════════════════════════════════════════════════════════
if (document.getElementById("statTotal")) {
  let allLogs = [];
  let activeFilter = "all";

  // ── Modal ──────────────────────────────────────────────────────────────
  window.openModal = function(id) {
    const log = allLogs.find(l => l.id === id);
    if (!log) return;

    document.getElementById("modalEmoji").textContent = MOOD_MAP[log.mood] || "😶";
    document.getElementById("modalMood").textContent = log.mood;
    document.getElementById("modalTime").textContent = formatTime(log.timestamp);

    const pct = (log.energy / 10) * 100;
    document.getElementById("modalEnergyFill").style.width = "0%";
    document.getElementById("modalEnergyVal").textContent = `${log.energy} / 10`;
    setTimeout(() => {
      document.getElementById("modalEnergyFill").style.width = pct + "%";
    }, 50);

    const noteSection = document.getElementById("modalNoteSection");
    const noteEl = document.getElementById("modalNote");
    if (log.note && log.note !== "–" && log.note !== "") {
      noteEl.textContent = log.note;
      noteSection.style.display = "block";
    } else {
      noteSection.style.display = "none";
    }

    const workoutSection = document.getElementById("modalWorkoutSection");
    const workoutContent = document.getElementById("modalWorkoutContent");
    const w = log.workout;

    if (w && w.type) {
      workoutSection.style.display = "block";
      if (w.type === "weight" && w.exercises?.length) {
        workoutContent.innerHTML = `
          <table class="modal-exercise-table">
            <thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th></tr></thead>
            <tbody>
              ${w.exercises.map(e => `
                <tr>
                  <td>${e.name || "–"}</td>
                  <td>${e.sets ?? "–"}</td>
                  <td>${e.reps ?? "–"}</td>
                </tr>`).join("")}
            </tbody>
          </table>`;
      } else if (w.type === "run") {
        workoutContent.innerHTML = `
          <div class="modal-run-grid">
            <div class="modal-run-item">
              <div class="run-val">${w.duration_min ?? "–"}</div>
              <div class="run-unit">Minutes</div>
            </div>
            <div class="modal-run-item">
              <div class="run-val">${w.distance_km ?? "–"}</div>
              <div class="run-unit">Kilometers</div>
            </div>
            <div class="modal-run-item">
              <div class="run-val">${w.pace ?? "–"}</div>
              <div class="run-unit">min/km</div>
            </div>
          </div>`;
      } else if (w.type === "other") {
        workoutContent.innerHTML = `<div class="modal-other-text">${w.activity || "–"}</div>`;
      } else {
        workoutSection.style.display = "none";
      }
    } else {
      workoutSection.style.display = "none";
    }

    // ── BMR / TDEE ──
    const bmrSection = document.getElementById("modalBmrSection");
    const w2 = log.weight;
    const h2 = log.height;

    if (w2 && h2) {
      bmrSection.style.display = "block";

      // Body stats
      document.getElementById("modalBodyStats").innerHTML = `
        <div class="bmr-stat-item">
          <span class="bmr-stat-val">${w2}</span>
          <span class="bmr-stat-unit">kg</span>
          <span class="bmr-stat-label">Weight</span>
        </div>
        <div class="bmr-stat-item">
          <span class="bmr-stat-val">${h2}</span>
          <span class="bmr-stat-unit">cm</span>
          <span class="bmr-stat-label">Height</span>
        </div>
        <div class="bmr-stat-item">
          <span class="bmr-stat-val">${(w2 / ((h2/100) ** 2)).toFixed(1)}</span>
          <span class="bmr-stat-unit"></span>
          <span class="bmr-stat-label">BMI</span>
        </div>`;

      // Store for recalculation
      window._bmrData = { weight: w2, height: h2, gender: "male", mul: 1.2 };
      calcBmr();

      // Activity chips
      document.querySelectorAll(".bmr-chip[data-mul]").forEach(btn => {
        btn.onclick = () => {
          document.querySelectorAll(".bmr-chip[data-mul]").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          window._bmrData.mul = parseFloat(btn.dataset.mul);
          calcBmr();
        };
      });
    } else {
      bmrSection.style.display = "none";
    }

    document.getElementById("logModal").classList.add("open");
  };

  window.closeModal = function(e) {
    if (e && e.target !== document.getElementById("logModal")) return;
    document.getElementById("logModal").classList.remove("open");
  };

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") document.getElementById("logModal")?.classList.remove("open");
  });

  // ── BMR Calculator ────────────────────────────────────────────────────
  function calcBmr() {
    const { weight, height, gender, mul } = window._bmrData || {};
    if (!weight || !height) return;

    // Boer formula LBM
    let lbm;
    if (gender === "male") {
      lbm = (0.407 * weight) + (0.267 * height) - 19.2;
    } else {
      lbm = (0.252 * weight) + (0.473 * height) - 48.3;
    }

    // Mifflin-St Jeor (ใช้ age 25 default ถ้าไม่มี)
    const age = window._bmrData.age || 25;
    let bmr;
    if (gender === "male") {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    const tdee = bmr * mul;

    document.getElementById("modalBMR").textContent  = Math.round(bmr).toLocaleString();
    document.getElementById("modalTDEE").textContent = Math.round(tdee).toLocaleString();
    document.getElementById("modalLBM").textContent  = lbm.toFixed(1);
  }

  window.setBmrGender = function(g) {
    if (!window._bmrData) return;
    window._bmrData.gender = g;
    document.getElementById("bmrMale").classList.toggle("active", g === "male");
    document.getElementById("bmrFemale").classList.toggle("active", g === "female");
    calcBmr();
  };

  // ── Heatmap ────────────────────────────────────────────────────────────
  function renderHeatmap() {
  const grid   = document.getElementById("heatmapGrid");
  const months = document.getElementById("heatmapMonths");
  const title  = document.getElementById("heatmapTitle");
  if (!grid) return;

  const CELL = 13; // 11px cell + 2px gap
  const DAY_LABEL_W = 28; // ความกว้าง heatmap-days column

  const year  = new Date().getFullYear();
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Group logs by date
  const logsByDate = {};
  allLogs.forEach(l => {
    const d   = new Date(l.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!logsByDate[key]) logsByDate[key] = [];
    logsByDate[key].push(l);
  });

  const totalLogs = allLogs.filter(l => new Date(l.timestamp).getFullYear() === year).length;
  title.textContent = `${totalLogs} log${totalLogs !== 1 ? "s" : ""} in ${year}`;

  // Start from Sunday before Jan 1
  const jan1     = new Date(year, 0, 1);
  const startDay = new Date(jan1);
  startDay.setDate(jan1.getDate() - jan1.getDay());

  const dec31  = new Date(year, 11, 31);
  const endDay = new Date(dec31);
  endDay.setDate(dec31.getDate() + (6 - dec31.getDay()));

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const colData  = [];
  const monthPos = {};
  let cur = new Date(startDay);
  let colIndex = 0;

  while (cur <= endDay) {
    const col = [];
    for (let dow = 0; dow < 7; dow++) {
      col.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    col.forEach(d => {
      if (d.getFullYear() === year && d.getDate() === 1) {
        monthPos[d.getMonth()] = colIndex;
      }
    });
    colData.push(col);
    colIndex++;
  }

  // ── Month labels — offset ต้องบวก DAY_LABEL_W ด้วย ──
  months.innerHTML = "";
  months.style.position = "relative";
  months.style.height   = "16px";
  months.style.minWidth = `${DAY_LABEL_W + colData.length * CELL}px`;

  for (let m = 0; m < 12; m++) {
  if (monthPos[m] === undefined) continue;
  const el = document.createElement("div");
  el.className      = "heatmap-month-label";
  el.textContent    = MONTH_NAMES[m];
  el.style.position = "absolute";
  el.style.left     = `${monthPos[m] * CELL}px`;
  months.appendChild(el); // ← บรรทัดนี้หายไป!
}

  // ── Grid ──
  const counts   = Object.values(logsByDate).map(a => a.length);
  const maxCount = Math.max(...counts, 1);

  grid.innerHTML = "";
  colData.forEach(col => {
    const colEl = document.createElement("div");
    colEl.className = "heatmap-col";

    col.forEach(d => {
      const cell = document.createElement("div");
      cell.className = "heatmap-cell";

      const inYear   = d.getFullYear() === year;
      const isFuture = d > today;

      if (!inYear || isFuture) {
        cell.style.opacity = "0.15";
        colEl.appendChild(cell);
        return;
      }

      const key   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const logs  = logsByDate[key] || [];
      const count = logs.length;

      let level = 0;
      if (count > 0) level = Math.min(4, Math.ceil((count / maxCount) * 4));
      cell.dataset.level = level;

      if (d.toDateString() === new Date().toDateString()) cell.classList.add("is-today");

      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      cell.dataset.tip = count > 0
        ? `${count} log${count > 1 ? "s" : ""} · ${dateStr}`
        : dateStr;

      if (count > 0) {
        cell.classList.add("has-log");
        cell.addEventListener("click", () => openModal(logs[logs.length - 1].id));
      }

      colEl.appendChild(cell);
    });

    grid.appendChild(colEl);
  });
}

  // ── Dashboard loader ───────────────────────────────────────────────────
  async function loadDashboard() {
    await Promise.all([loadStats(), loadLogs(), loadRecommend()]);
    renderHeatmap();
  }

  // ── Stats ──────────────────────────────────────────────────────────────
  async function loadStats() {
    try {
      const s = await fetch("/stats").then(r => r.json());
      document.getElementById("statTotal").textContent = s.total_logs;
      document.getElementById("statAvg").textContent = s.average_energy || "–";

      const breakdown = s.mood_breakdown || {};
      const max = Math.max(...Object.values(breakdown), 1);
      const topMood = Object.entries(breakdown).sort((a,b) => b[1]-a[1])[0];
      const statTop = document.getElementById("statTop");
      if (statTop) statTop.textContent = topMood ? MOOD_MAP[topMood[0]] : "–";

      const list = document.getElementById("breakdownList");
      if (!Object.keys(breakdown).length) {
        list.innerHTML = `<div class="empty-state" style="padding:20px 0"><p>No data yet</p></div>`;
        return;
      }
      list.innerHTML = Object.entries(breakdown)
        .sort((a,b) => b[1]-a[1])
        .map(([mood,count]) => `
          <div class="breakdown-item">
            <div class="breakdown-label">${MOOD_MAP[mood]||"😶"} <span style="font-size:.75rem;color:var(--muted);text-transform:capitalize">${mood}</span></div>
            <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:0%" data-pct="${Math.round(count/max*100)}%"></div></div>
            <div class="breakdown-count">${count}</div>
          </div>`)
        .join("");
      requestAnimationFrame(() => {
        document.querySelectorAll(".breakdown-bar").forEach(b => { b.style.width = b.dataset.pct; });
      });
    } catch(e) { console.error(e); }
  }

  // ── Logs ───────────────────────────────────────────────────────────────
async function loadLogs() {
    try {
      allLogs = await fetch("/logs").then(r => r.json());
      renderLogs();
      buildFilters();
      updateRunStats();   // ← เพิ่มบรรทัดนี้
      updateTopMood();    // ← เพิ่มบรรทัดนี้
    } catch {}
  }

  function updateRunStats() {
    const now = new Date();
    const thisMonth = allLogs.filter(l => {
      const d = new Date(l.timestamp);
      return d.getMonth() === now.getMonth() &&
             d.getFullYear() === now.getFullYear() &&
             l.workout?.type === "run";
    });

    const totalKm  = thisMonth.reduce((sum, l) => sum + (l.workout?.distance_km || 0), 0);
    const totalMin = thisMonth.reduce((sum, l) => sum + (l.workout?.duration_min || 0), 0);
    const totalHrs = (totalMin / 60).toFixed(1);

    const distEl = document.getElementById("statRunDist");
    const durEl  = document.getElementById("statRunDur");
    if (distEl) distEl.textContent = totalKm.toFixed(1);
    if (durEl)  durEl.textContent  = totalHrs;
  }

  function updateTopMood() {
    if (!allLogs.length) return;
    const breakdown = {};
    allLogs.forEach(l => {
      breakdown[l.mood] = (breakdown[l.mood] || 0) + 1;
    });
    const topMood = Object.entries(breakdown).sort((a,b) => b[1]-a[1])[0];
  }

  function renderLogs() {
    const list = document.getElementById("historyList");
    let logs = [...allLogs].reverse();
    if (activeFilter !== "all") logs = logs.filter(l => l.mood === activeFilter);

    if (!logs.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No logs found</p></div>`;
      return;
    }
    list.innerHTML = logs.map((l, i) => `
      <div class="log-item" style="animation-delay:${i * 0.05}s; cursor:pointer"
           onclick="openModal(${l.id})">
        <div class="log-emoji">${MOOD_MAP[l.mood]||"😶"}</div>
        <div class="log-info">
          <div class="log-mood">${l.mood}</div>
          <div class="log-note">${l.note || "–"}</div>
        </div>
        <div class="log-meta">
          <div class="log-energy">${l.energy}/10</div>
          <div class="log-time">${formatTime(l.timestamp)}</div>
        </div>
        <button class="log-delete" onclick="event.stopPropagation(); deleteLog(${l.id})" title="Delete">✕</button>
      </div>`).join("");
  }

  function buildFilters() {
    const moods = [...new Set(allLogs.map(l => l.mood))];
    const wrap = document.getElementById("filterWrap");
    wrap.innerHTML = `<button class="chip ${activeFilter==='all'?'active':''}" onclick="setFilter('all')">All</button>` +
      moods.map(m => `<button class="chip ${activeFilter===m?'active':''}" onclick="setFilter('${m}')">${MOOD_MAP[m]||"😶"} ${m}</button>`).join("");
  }

  window.setFilter = function(f) {
    activeFilter = f;
    renderLogs();
    buildFilters();
  };

  window.deleteLog = async function(id) {
    if (!confirm("Delete this log?")) return;
    await fetch(`/logs/${id}`, { method: "DELETE" });
    showToast("Deleted 🗑️");
    loadDashboard();
  };

  // ── Recommend ──────────────────────────────────────────────────────────
  async function loadRecommend(mood) {
    try {
      const url = mood ? `/recommend?mood=${mood}` : "/recommend";
      const r = await fetch(url).then(res => res.json());
      const parts = (r.activity || "").split(" ");
      const lastWord = parts[parts.length - 1];
      const isEmoji = /\p{Emoji}/u.test(lastWord);
      const icon = isEmoji ? lastWord : "💡";
      const text = isEmoji ? parts.slice(0, -1).join(" ") : r.activity;
      document.getElementById("recIcon").textContent = icon;
      document.getElementById("recText").textContent = text;
    } catch {}
  }

  document.getElementById("refreshRec")?.addEventListener("click", () => {
    loadRecommend();
    const btn = document.getElementById("refreshRec");
    btn.style.transform = "rotate(360deg)";
    setTimeout(() => { btn.style.transform = ""; }, 400);
  });

  loadDashboard();

} // ← ปิด DASHBOARD block