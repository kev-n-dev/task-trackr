const tasks = [];
let taskIdCounter = 0;
let taskHistory = [];
let jiraTasks = {};
let totalPoints = 0;

chrome.storage.local.get(
  ["tasks", "taskIdCounter", "taskHistory", "jiraTasks", "totalPoints"],
  (result) => {
    if (result.tasks) {
      tasks.push(...result.tasks.filter((t) => !t.deleted));
      taskIdCounter = result.taskIdCounter || 0;
      taskHistory = result.taskHistory || [];
      jiraTasks = result.jiraTasks || {};
      totalPoints = result.totalPoints || 0;
      renderTasks();
      updatePointsDisplay();
    }
  },
);

function saveTasks() {
  const tasksToSave = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    time: t.time,
    running: false,
    deleted: t.deleted || false,
    storyPoints: t.storyPoints,
    jiraKey: t.jiraKey,
    status: t.status,
  }));
  chrome.storage.local.set({
    tasks: tasksToSave,
    taskIdCounter,
    taskHistory,
    jiraTasks,
    totalPoints,
  });
}

function getEncouragementText(points, timeInSeconds) {
  const minutes = timeInSeconds / 60;
  const efficiency = points / Math.max(minutes, 1);

  if (efficiency >= 10) return "LEGENDARY!";
  if (efficiency >= 5) return "AMAZING!";
  if (efficiency >= 3) return "SUPERB!";
  if (efficiency >= 2) return "FANTASTIC!";
  if (efficiency >= 1) return "GREAT!";
  return "NICE!";
}

function calculatePoints(task) {
  const basePoints = 5;
  if (task.storyPoints) {
    return basePoints * parseFloat(task.storyPoints);
  }
  return basePoints;
}

function updatePointsDisplay() {
  const pointsEl = document.getElementById("total-points");
  if (pointsEl) pointsEl.textContent = `🏆 ${totalPoints} pts`;
}

function logTaskTime(
  taskTitle,
  seconds,
  status,
  storyPoints = null,
  jiraKey = null,
) {
  const today = new Date().toISOString().split("T")[0];
  const existing = taskHistory.find(
    (h) => h.date === today && h.jiraKey === jiraKey && jiraKey,
  );
  if (existing) {
    existing.time = seconds;
    existing.status = status;
    if (storyPoints) existing.storyPoints = storyPoints;
  } else {
    taskHistory.push({
      date: today,
      task: taskTitle,
      time: seconds,
      status,
      storyPoints,
      jiraKey,
    });
  }
}

function getJiraTicketInfo() {
  const url = window.location.href;
  const keyMatch = url.match(/[A-Z]+-\d+/);
  if (!keyMatch) return null;

  const key = keyMatch[0];
  const titleEl =
    document.querySelector(
      '[data-test-id="issue.views.issue-base.foundation.summary.heading"]',
    ) ||
    document.querySelector("#summary-val") ||
    document.querySelector('h1[id*="summary"]') ||
    document.querySelector("h1");
  const title = titleEl ? titleEl.textContent.trim() : key;

  const storyPointsEl =
    document.querySelector(
      '[data-testid="issue.views.field.rich-text.story-point-estimate"]',
    ) ||
    document.querySelector('[aria-label*="Story Points"]') ||
    document.querySelector('[aria-label*="Story point"]') ||
    document.querySelector('[data-testid*="story-point"]') ||
    document.querySelector(".ghx-estimate") ||
    Array.from(document.querySelectorAll("span")).find((el) =>
      el.textContent.includes("Story Points"),
    )?.nextElementSibling;

  let storyPoints = storyPointsEl ? storyPointsEl.textContent.trim() : null;
  if (storyPoints) storyPoints = storyPoints.match(/\d+/)?.[0];

  console.log("Jira Info:", { key, title, storyPoints, storyPointsEl });

  return { key, title, storyPoints };
}

const toolbar = document.createElement("div");
toolbar.id = "custom-toolbar";
const isJiraPage = window.location.href.match(/[A-Z]+-\d+/);
toolbar.innerHTML = `
  <div class="task-queue" id="task-queue"></div>
  <div style="display: flex; gap: 10px; align-items: center; padding: 0 20px;">
    <button id="toggle-toolbar-btn" style="background: linear-gradient(135deg, #f093fb, #f5576c); border: none; color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 18px; box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);">▲</button>
    <div id="total-points" style="font-weight: bold; font-size: 16px; color: #FFD700;">🏆 ${totalPoints} pts</div>
    <div style="position: relative; margin-right: 20px;">
      <button id="add-dropdown-btn">+ Add ▼</button>
      <div id="add-dropdown-menu" style="display: none; position: absolute; top: 100%; right: 0; background: white; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 1000; min-width: 150px; margin-top: 4px;">
        ${isJiraPage ? '<div class="dropdown-item" data-action="add-jira">+ Add Jira Ticket</div>' : ""}
        <div class="dropdown-item" data-action="add-task">+ Add Task</div>
        <div class="dropdown-item" data-action="download-report">📊 Report</div>
      </div>
    </div>
  </div>
  <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 4px; background: rgba(255,255,255,0.2);">
    <div id="workday-progress" style="height: 100%; background: linear-gradient(90deg, #FFD700, #FFA500); width: 0%; transition: width 0.3s;"></div>
  </div>
`;
document.body.prepend(toolbar);
document.body.style.marginTop = "90px";

function updateWorkdayProgress() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const startHour = 9;
  const endHour = 17;
  const totalMinutes = (endHour - startHour) * 60;
  const elapsedMinutes = Math.max(0, (hours - startHour) * 60 + minutes);
  const progress = Math.min(100, (elapsedMinutes / totalMinutes) * 100);
  const progressBar = document.getElementById("workday-progress");
  if (progressBar) progressBar.style.width = `${progress}%`;
}

updateWorkdayProgress();
setInterval(updateWorkdayProgress, 60000);

const toggleToolbarBtn = document.getElementById("toggle-toolbar-btn");
const taskQueue = document.getElementById("task-queue");
toggleToolbarBtn.style.position = "fixed";
toggleToolbarBtn.style.right = "5%";
toggleToolbarBtn.style.bottom = "-20px";
toggleToolbarBtn.style.zIndex = "9999999";
toggleToolbarBtn.addEventListener("click", () => {
  const isHidden = toolbar.style.transform === "translateY(-86px)";
  toolbar.style.transition = "transform 0.3s";
  toolbar.style.transform = isHidden ? "translateY(0)" : "translateY(-86px)";
  document.body.style.marginTop = isHidden ? "90px" : "4px";
  toggleToolbarBtn.textContent = isHidden ? "▲" : "▼";
  taskQueue.style.display = isHidden ? "flex" : "none";
});

const addDropdownBtn = document.getElementById("add-dropdown-btn");
const addDropdownMenu = document.getElementById("add-dropdown-menu");

addDropdownBtn.addEventListener("click", () => {
  addDropdownMenu.style.display =
    addDropdownMenu.style.display === "none" ? "block" : "none";
});

document.addEventListener("click", (e) => {
  if (
    !e.target.closest("#add-dropdown-btn") &&
    !e.target.closest("#add-dropdown-menu")
  ) {
    addDropdownMenu.style.display = "none";
  }
});

addDropdownMenu.addEventListener("click", (e) => {
  const item = e.target.closest(".dropdown-item");
  if (!item) return;

  addDropdownMenu.style.display = "none";

  if (item.dataset.action === "add-task") {
    const title = prompt("Task title:");
    if (title) addTask(title);
  } else if (item.dataset.action === "download-report") {
    downloadReport();
  } else if (item.dataset.action === "add-jira") {
    const jiraInfo = getJiraTicketInfo();
    if (!jiraInfo) return;

    const existing = tasks.find((t) => t.jiraKey === jiraInfo.key);
    if (existing) {
      alert(`${jiraInfo.key} is already in the task list`);
      return;
    }

    const storyPoints = prompt(
      `Story Points for ${jiraInfo.key}:`,
      jiraInfo.storyPoints || "",
    );
    if (storyPoints === null) return;

    const finalPoints = storyPoints.trim() || null;
    const taskTitle = finalPoints
      ? `${jiraInfo.key} [${finalPoints}SP] - ${jiraInfo.title}`
      : `${jiraInfo.key} - ${jiraInfo.title}`;

    const prevTask = jiraTasks[jiraInfo.key];
    const status = prevTask?.status === "DONE" ? "REOPENED" : "TODO";

    addTask(taskTitle, finalPoints, jiraInfo.key, status);

    jiraTasks[jiraInfo.key] = {
      title: jiraInfo.title,
      storyPoints: finalPoints,
      status,
      history: [
        ...(prevTask?.history || []),
        { date: new Date().toISOString(), status },
      ],
    };
    saveTasks();
  }
});

function addTask(title, storyPoints = null, jiraKey = null, status = "TODO") {
  const task = {
    id: taskIdCounter++,
    title,
    time: 0,
    interval: null,
    running: false,
    storyPoints,
    jiraKey,
    status,
  };
  tasks.push(task);
  saveTasks();
  renderTasks();
}

window.toggleTimer = function (id) {
  const taskIndex = tasks.findIndex((t) => t.id === id);
  if (taskIndex === -1) return;

  const task = tasks[taskIndex];

  if (task.running) {
    clearInterval(task.interval);
    task.running = false;
  } else {
    tasks.forEach((t) => {
      if (t.running) {
        clearInterval(t.interval);
        t.running = false;
      }
    });
    task.interval = setInterval(() => {
      task.time++;
      task.status = "INPROGRESS";
      if (task.jiraKey) jiraTasks[task.jiraKey].status = "INPROGRESS";
      updateTaskTime(task);
      logTaskTime(
        task.title,
        task.time,
        task.status,
        task.storyPoints,
        task.jiraKey,
      );
      saveTasks();
    }, 1000);
    task.running = true;
    tasks.splice(taskIndex, 1);
    tasks.unshift(task);
  }
  saveTasks();
  renderTasks();
};

window.removeTask = function (id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    const card = document.getElementById(`task-${task.id}`);
    if (card) {
      const points = calculatePoints(task);
      const encouragement = getEncouragementText(points, task.time);

      const cardRect = card.getBoundingClientRect();
      const toolbar = document.getElementById("custom-toolbar");

      card.style.animation =
        "screenShake 0.3s ease-in-out 0.2s, taskComplete 0.6s ease-out";

      const stamp = document.createElement("div");
      stamp.style.cssText = `position: fixed; top: ${cardRect.top + cardRect.height / 2}px; left: ${cardRect.left + cardRect.width / 2}px; transform: translate(-50%, -50%); z-index: 1000000; pointer-events: none;`;
      stamp.innerHTML = `
        <div style="transform: rotate(-15deg); font-size: 48px; font-weight: bold; background: linear-gradient(135deg, #FFD700, #FFA500); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; -webkit-text-stroke: 2px #D4AF37; filter: drop-shadow(2px 2px 4px rgba(255, 165, 0, 0.5)); animation: stamp 0.5s ease-out; white-space: nowrap; border: 3px solid #D4AF37; border-radius: 8px; padding: 8px 16px;">
          ✓ ${encouragement}<br><span style="font-size: 24px; background: linear-gradient(135deg, #FFD700, #FFA500); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; -webkit-text-stroke: 1px #D4AF37;">+${points} pts</span>
        </div>
      `;
      toolbar.appendChild(stamp);

      setTimeout(() => {
        toolbar.removeChild(stamp);
        if (task.interval) clearInterval(task.interval);
        task.status = "DONE";
        if (task.jiraKey) jiraTasks[task.jiraKey].status = "DONE";
        if (task.time > 0) {
          logTaskTime(
            task.title,
            task.time,
            task.status,
            task.storyPoints,
            task.jiraKey,
          );
          totalPoints += points;
          updatePointsDisplay();
        }
        task.deleted = true;
        tasks.splice(
          tasks.findIndex((t) => t.id === id),
          1,
        );
        saveTasks();
        renderTasks();
      }, 600);
    }
  }
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function downloadReport() {
  const byDate = {};
  taskHistory.forEach((h) => {
    if (!byDate[h.date]) byDate[h.date] = [];
    byDate[h.date].push(h);
  });

  let report = "Task Time Report\n\n";
  report += `Total Points Earned: ${totalPoints}\n`;
  report += "=".repeat(40) + "\n\n";

  Object.keys(byDate)
    .sort()
    .reverse()
    .forEach((date) => {
      report += `Date: ${date}\n`;
      report += "=".repeat(40) + "\n";
      let dailyPoints = 0;
      byDate[date].forEach((entry) => {
        const hours = Math.floor(entry.time / 3600);
        const mins = Math.floor((entry.time % 3600) / 60);
        const secs = entry.time % 60;
        const statusTag = entry.status ? ` [${entry.status}]` : "";
        const points = entry.storyPoints ? ` (${entry.storyPoints}SP)` : "";
        const taskPoints = entry.storyPoints
          ? 5 * parseFloat(entry.storyPoints)
          : 5;
        report += `${entry.task}: ${hours}h ${mins}m ${secs}s${points}${statusTag} - ${taskPoints} pts\n`;
        if (entry.status === "DONE") dailyPoints += taskPoints;
      });
      const total = byDate[date].reduce((sum, e) => sum + e.time, 0);
      const totalHours = Math.floor(total / 3600);
      const totalMins = Math.floor((total % 3600) / 60);
      const totalSecs = total % 60;
      report += `Total: ${totalHours}h ${totalMins}m ${totalSecs}s | Points: ${dailyPoints}\n\n`;
    });

  const blob = new Blob([report], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `task-report-${new Date().toISOString().split("T")[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function updateTaskTime(task) {
  const el = document.getElementById(`task-${task.id}`);
  if (el) el.querySelector(".time").textContent = formatTime(task.time);
}

function renderTasks() {
  const queue = document.getElementById("task-queue");
  queue.innerHTML = "";
  const sortedTasks = [...tasks]
    .filter((t) => !t.deleted)
    .sort((a, b) => b.running - a.running);
  sortedTasks.forEach((task) => {
    const card = document.createElement("div");
    card.className = "task-card";
    card.id = `task-${task.id}`;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "✕";
    removeBtn.onclick = () => removeTask(task.id);

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;

    const bottom = document.createElement("div");
    bottom.className = "task-bottom";

    const time = document.createElement("div");
    time.className = "time";
    time.textContent = formatTime(task.time);

    const playBtn = document.createElement("button");
    playBtn.className = "play-pause-btn";
    playBtn.textContent = task.running ? "⏸" : "▶";
    playBtn.onclick = () => toggleTimer(task.id);

    bottom.appendChild(time);
    bottom.appendChild(playBtn);
    card.appendChild(removeBtn);
    card.appendChild(title);
    card.appendChild(bottom);
    queue.appendChild(card);
  });
}
