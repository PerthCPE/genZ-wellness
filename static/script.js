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

    try {
      const res = await fetch("/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: selectedMood, energy, note: note || null, workout })
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

    document.getElementById("logModal").classList.add("open");
  };

  window.closeModal = function(e) {
    if (e && e.target !== document.getElementById("logModal")) return;
    document.getElementById("logModal").classList.remove("open");
  };

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") document.getElementById("logModal")?.classList.remove("open");
  });


  // ── Heatmap ────────────────────────────────────────────────────────────
  function renderHeatmap() {
    const grid   = document.getElementById("heatmapGrid");
    const months = document.getElementById("heatmapMonths");
    const title  = document.getElementById("heatmapTitle");
    if (!grid) return;

    const year  = new Date().getFullYear();
    const today = new Date();
    today.setHours(23,59,59,999);

    // จัดกลุ่ม log ตาม YYYY-MM-DD
    const logsByDate = {};
    allLogs.forEach(l => {
      const d   = new Date(l.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!logsByDate[key]) logsByDate[key] = [];
      logsByDate[key].push(l);
    });

    const totalLogs = allLogs.filter(l => new Date(l.timestamp).getFullYear() === year).length;
    title.textContent = `${totalLogs} log${totalLogs !== 1 ? "s" : ""} in ${year}`;

    // หาวันอาทิตย์แรกของปี (เริ่ม column แรก)
    const jan1    = new Date(year, 0, 1);
    const startDay = new Date(jan1);
    startDay.setDate(jan1.getDate() - jan1.getDay()); // เลื่อนไปอาทิตย์ก่อนหน้า

    const dec31   = new Date(year, 11, 31);
    const endDay  = new Date(dec31);
    endDay.setDate(dec31.getDate() + (6 - dec31.getDay()));

    // สร้าง columns (แต่ละ column = 1 สัปดาห์)
    const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const colData  = []; // [{date, cells:[]}]
    const monthPos = {}; // month -> column index ที่เริ่ม

    let cur = new Date(startDay);
    let colIndex = 0;

    while (cur <= endDay) {
      const col = [];
      for (let dow = 0; dow < 7; dow++) {
        col.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      // บันทึก column แรกของแต่ละเดือน
      col.forEach(d => {
        if (d.getFullYear() === year && d.getDate() === 1) {
          monthPos[d.getMonth()] = colIndex;
        }
      });
      colData.push(col);
      colIndex++;
    }

    // render month labels
    const totalCols = colData.length;
    const cellSize  = 11 + 2; // width + gap
    let monthHtml   = "";
    for (let m = 0; m < 12; m++) {
      const col = monthPos[m] ?? null;
      if (col === null) continue;
      const leftPx = col * cellSize;
      monthHtml += `<div class="heatmap-month-label" style="width:${cellSize}px; margin-left:${m===0 ? leftPx : cellSize}px">${MONTH_NAMES[m]}</div>`;
    }
    // ใช้แบบ absolute positioning แทน
    months.style.position = "relative";
    months.style.height   = "16px";
    months.style.minWidth = `${colData.length * CELL}px`;
    months.innerHTML = "";
    for (let m = 0; m < 12; m++) {
      const col = monthPos[m] ?? null;
      if (col === null) continue;
      const el = document.createElement("div");
      el.className   = "heatmap-month-label";
      el.textContent = MONTH_NAMES[m];
      el.style.position = "absolute";
      el.style.left     = `${col * cellSize}px`;
      months.appendChild(el);
    }

    // max logs ใน 1 วัน (สำหรับ level)
    const counts = Object.values(logsByDate).map(a => a.length);
    const maxCount = Math.max(...counts, 1);

    // render grid
    grid.innerHTML = "";
    colData.forEach(col => {
      const colEl = document.createElement("div");
      colEl.className = "heatmap-col";

      col.forEach(d => {
        const cell  = document.createElement("div");
        cell.className = "heatmap-cell";

        const inYear = d.getFullYear() === year;
        const isFuture = d > today;

        if (!inYear || isFuture) {
          // วันนอกปีหรืออนาคต — แสดงเป็น empty
          cell.style.opacity = "0.2";
          colEl.appendChild(cell);
          return;
        }

        const key  = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const logs = logsByDate[key] || [];
        const count = logs.length;

        // level 0-4
        let level = 0;
        if (count > 0) {
          level = Math.min(4, Math.ceil((count / maxCount) * 4));
        }
        cell.dataset.level = level;

        // today
        const isToday = d.toDateString() === new Date().toDateString();
        if (isToday) cell.classList.add("is-today");

        // tooltip
        const dateStr = d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
        cell.dataset.tip = count > 0
          ? `${count} log${count>1?"s":""} · ${dateStr}`
          : dateStr;

        if (count > 0) {
          cell.classList.add("has-log");
          cell.addEventListener("click", () => {
            // เปิด modal log ล่าสุดของวันนั้น
            const last = logs[logs.length - 1];
            openModal(last.id);
          });
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
    } catch {}
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