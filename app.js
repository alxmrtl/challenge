// ==================== Data Store ====================
const Store = {
  // Get active challenge
  getChallenge() {
    const data = localStorage.getItem('activeChallenge');
    return data ? JSON.parse(data) : null;
  },

  // Save active challenge (immutable once started)
  saveChallenge(challenge) {
    localStorage.setItem('activeChallenge', JSON.stringify(challenge));
  },

  // Get completions for all days
  getCompletions() {
    const data = localStorage.getItem('completions');
    return data ? JSON.parse(data) : {};
  },

  // Save completion for a specific day
  saveCompletion(dayIndex, taskIndex, completed) {
    const completions = this.getCompletions();
    if (!completions[dayIndex]) {
      completions[dayIndex] = {};
    }
    completions[dayIndex][taskIndex] = completed;
    localStorage.setItem('completions', JSON.stringify(completions));
  },

  // Get completion status for a day
  getDayCompletion(dayIndex) {
    const completions = this.getCompletions();
    return completions[dayIndex] || {};
  },

  // Get all archived challenges
  getArchive() {
    const data = localStorage.getItem('archive');
    return data ? JSON.parse(data) : [];
  },

  // Archive current challenge
  archiveChallenge() {
    const challenge = this.getChallenge();
    const completions = this.getCompletions();

    if (!challenge) return;

    const archive = this.getArchive();
    archive.push({
      ...challenge,
      completions,
      archivedAt: new Date().toISOString()
    });

    localStorage.setItem('archive', JSON.stringify(archive));
    localStorage.removeItem('activeChallenge');
    localStorage.removeItem('completions');
  },

  // Clear all data
  clearAll() {
    localStorage.removeItem('activeChallenge');
    localStorage.removeItem('completions');
  },

  // Get current day index (0-based)
  getCurrentDayIndex() {
    const challenge = this.getChallenge();
    if (!challenge) return 0;

    const startDate = new Date(challenge.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    const diffTime = today - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, Math.min(diffDays, challenge.totalDays - 1));
  }
};

// ==================== State Management ====================
let currentTab = 'setup';
let currentDayIndex = 0;
let currentArchiveIndex = null;

// ==================== Navigation ====================
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active from all nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  // Show selected tab
  document.getElementById(`tab-${tabName}`).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  currentTab = tabName;

  // Render tab content
  renderCurrentTab();
}

function renderCurrentTab() {
  switch(currentTab) {
    case 'setup':
      renderSetupTab();
      break;
    case 'daily':
      renderDailyTab();
      break;
    case 'stats':
      renderStatsTab();
      break;
    case 'settings':
      renderSettingsTab();
      break;
  }
}

// ==================== Setup Tab ====================
function renderSetupTab() {
  const container = document.getElementById('setup-form');
  const challenge = Store.getChallenge();

  if (challenge) {
    // Challenge already exists - show summary
    container.innerHTML = `
      <div class="card">
        <h2 style="margin-bottom: 1rem; font-size: 1.5rem;">Active Challenge</h2>
        <p class="text-secondary mb-md">${challenge.totalDays} days • ${challenge.tasks.length} tasks</p>

        <div style="margin-top: 1.5rem;">
          ${challenge.tasks.map(task => `
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
              <span style="font-size: 1.5rem;">${task.emoji}</span>
              <div>
                <div style="font-weight: 600;">${task.name}</div>
                <div class="text-secondary" style="font-size: 0.875rem;">${task.description}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--color-border);">
          <p class="text-secondary" style="font-size: 0.875rem;">
            Point earned when completing ${challenge.pointThreshold} of ${challenge.tasks.length} tasks daily
          </p>
        </div>
      </div>

      <div class="text-center text-secondary" style="margin-top: 2rem;">
        <p>Challenge is active. Visit Settings to unlock or archive.</p>
      </div>
    `;
  } else {
    // No challenge - show creation form
    container.innerHTML = `
      <form id="challenge-form">
        <div class="input-group">
          <label class="input-label">Challenge Duration</label>
          <div class="input-number">
            <button type="button" onclick="adjustDays(-1)">−</button>
            <input type="number" id="input-days" value="30" min="1" max="365" readonly>
            <button type="button" onclick="adjustDays(1)">+</button>
          </div>
          <p class="text-secondary" style="font-size: 0.75rem; margin-top: 0.5rem;">Number of days for this challenge</p>
        </div>

        <div class="input-group">
          <label class="input-label">Point Threshold</label>
          <div class="input-number">
            <button type="button" onclick="adjustThreshold(-1)">−</button>
            <input type="number" id="input-threshold" value="1" min="1" max="10" readonly>
            <button type="button" onclick="adjustThreshold(1)">+</button>
          </div>
          <p class="text-secondary" style="font-size: 0.75rem; margin-top: 0.5rem;">Tasks to complete for daily point</p>
        </div>

        <div style="margin: 2rem 0;">
          <label class="input-label">Daily Tasks</label>
          <div id="tasks-container"></div>
          <button type="button" class="btn-secondary mt-md" onclick="addTask()">
            <span>+ Add Task</span>
          </button>
        </div>

        <button type="submit" class="btn-primary">
          <span>Start Challenge</span>
        </button>
      </form>
    `;

    // Initialize with one empty task
    if (document.querySelectorAll('.task-item').length === 0) {
      addTask();
    }

    // Form submission
    document.getElementById('challenge-form').addEventListener('submit', handleChallengeSubmit);
  }
}

let taskCount = 0;

function adjustDays(delta) {
  const input = document.getElementById('input-days');
  const newValue = parseInt(input.value) + delta;
  if (newValue >= 1 && newValue <= 365) {
    input.value = newValue;
  }
}

function adjustThreshold(delta) {
  const input = document.getElementById('input-threshold');
  const newValue = parseInt(input.value) + delta;
  const maxTasks = document.querySelectorAll('.task-item').length || 10;
  if (newValue >= 1 && newValue <= maxTasks) {
    input.value = newValue;
  }
}

function addTask() {
  const container = document.getElementById('tasks-container');
  const taskId = taskCount++;

  const taskHtml = `
    <div class="card task-item" data-task-id="${taskId}" style="margin-bottom: 1rem;">
      <div style="display: flex; gap: 1rem; align-items: flex-start;">
        <button type="button" class="emoji-btn" onclick="openEmojiPicker(${taskId})"
          style="font-size: 2rem; padding: 0.5rem; background: var(--color-bg-tertiary);
          border-radius: var(--radius-sm); min-width: 60px; height: 60px; display: flex;
          align-items: center; justify-content: center;">
          <span id="emoji-${taskId}">💪</span>
        </button>
        <div style="flex: 1;">
          <input type="text" class="input-field mb-sm" placeholder="Task name"
            id="task-name-${taskId}" required style="font-weight: 600;">
          <input type="text" class="input-field" placeholder="Description (optional)"
            id="task-desc-${taskId}">
        </div>
        <button type="button" onclick="removeTask(${taskId})"
          style="color: var(--color-text-tertiary); font-size: 1.5rem; padding: 0.25rem;">×</button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', taskHtml);
}

function removeTask(taskId) {
  const task = document.querySelector(`[data-task-id="${taskId}"]`);
  if (task) {
    task.remove();
  }
}

function handleChallengeSubmit(e) {
  e.preventDefault();

  const totalDays = parseInt(document.getElementById('input-days').value);
  const pointThreshold = parseInt(document.getElementById('input-threshold').value);

  const tasks = [];
  document.querySelectorAll('.task-item').forEach(item => {
    const id = item.dataset.taskId;
    const emoji = document.getElementById(`emoji-${id}`).textContent;
    const name = document.getElementById(`task-name-${id}`).value.trim();
    const description = document.getElementById(`task-desc-${id}`).value.trim();

    if (name) {
      tasks.push({ emoji, name, description });
    }
  });

  if (tasks.length === 0) {
    alert('Please add at least one task');
    return;
  }

  if (pointThreshold > tasks.length) {
    alert(`Point threshold cannot exceed number of tasks (${tasks.length})`);
    return;
  }

  const challenge = {
    totalDays,
    pointThreshold,
    tasks,
    startDate: new Date().toISOString()
  };

  Store.saveChallenge(challenge);
  currentDayIndex = 0;

  // Switch to daily view
  switchTab('daily');
}

// ==================== Emoji Picker ====================
const EMOJI_CATEGORIES = {
  'Body': ['💪', '🏃', '🧘', '🏋️', '🚴', '🥗', '💧', '😴', '🧊', '🔥'],
  'Mind': ['🧠', '📚', '✍️', '🎯', '💡', '🎓', '🔬', '🎨', '🎵', '📖'],
  'Spirit': ['❤️', '🙏', '☮️', '✨', '🌅', '🕉️', '💭', '🌟', '🔮', '☯️'],
  'Goals': ['🎯', '🏆', '📈', '💼', '💰', '🚀', '⚡', '🔱', '👑', '💎'],
  'Social': ['🤝', '👥', '💬', '📱', '☎️', '✉️', '🎁', '🤗', '👨‍👩‍👦', '🌐']
};

let currentEmojiTaskId = null;

function openEmojiPicker(taskId) {
  currentEmojiTaskId = taskId;

  const pickerHtml = `
    <div id="emoji-picker-overlay" onclick="closeEmojiPicker()"
      style="position: fixed; inset: 0; background: rgba(0,0,0,0.8);
      z-index: 1000; display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(10px); animation: fadeIn 0.2s ease;">
      <div onclick="event.stopPropagation()"
        style="background: var(--color-bg-secondary); border-radius: var(--radius-lg);
        padding: var(--space-xl); max-width: 90%; max-height: 80vh; overflow-y: auto;
        border: 1px solid var(--color-border); box-shadow: var(--shadow-lg);">

        <h3 style="margin-bottom: 1.5rem; font-size: 1.25rem;">Select Emoji</h3>

        ${Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => `
          <div style="margin-bottom: 1.5rem;">
            <div class="input-label" style="margin-bottom: 0.75rem;">${category}</div>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem;">
              ${emojis.map(emoji => `
                <button type="button" onclick="selectEmoji('${emoji}')"
                  style="font-size: 2rem; padding: 0.75rem; background: var(--color-bg-tertiary);
                  border-radius: var(--radius-sm); transition: all var(--transition-fast);"
                  onmouseover="this.style.background='var(--color-bg-elevated)'; this.style.transform='scale(1.1)'"
                  onmouseout="this.style.background='var(--color-bg-tertiary)'; this.style.transform='scale(1)'">
                  ${emoji}
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', pickerHtml);
}

function selectEmoji(emoji) {
  if (currentEmojiTaskId !== null) {
    document.getElementById(`emoji-${currentEmojiTaskId}`).textContent = emoji;
  }
  closeEmojiPicker();
}

function closeEmojiPicker() {
  const picker = document.getElementById('emoji-picker-overlay');
  if (picker) {
    picker.remove();
  }
  currentEmojiTaskId = null;
}

// ==================== Daily Tab ====================
function renderDailyTab() {
  const container = document.getElementById('daily-content');
  const challenge = Store.getChallenge();

  if (!challenge) {
    container.innerHTML = `
      <div class="text-center" style="margin-top: 4rem;">
        <p class="text-secondary">No active challenge</p>
        <button class="btn-primary mt-lg" onclick="switchTab('setup')" style="max-width: 200px; margin: 1.5rem auto 0;">
          <span>Create Challenge</span>
        </button>
      </div>
    `;
    return;
  }

  // Ensure currentDayIndex is within bounds
  currentDayIndex = Math.max(0, Math.min(currentDayIndex, challenge.totalDays - 1));

  const dayCompletion = Store.getDayCompletion(currentDayIndex);
  const completedCount = Object.values(dayCompletion).filter(Boolean).length;
  const totalTasks = challenge.tasks.length;
  const progressPercent = totalTasks > 0 ? (completedCount / totalTasks * 100) : 0;
  const pointEarned = completedCount >= challenge.pointThreshold;

  const startDate = new Date(challenge.startDate);
  const currentDate = new Date(startDate);
  currentDate.setDate(startDate.getDate() + currentDayIndex);

  container.innerHTML = `
    <!-- Day Navigation -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;">
      <button onclick="navigateDay(-1)" ${currentDayIndex === 0 ? 'disabled' : ''}
        style="width: 48px; height: 48px; background: var(--color-bg-secondary);
        border: 1px solid var(--color-border); border-radius: var(--radius-sm);
        font-size: 1.5rem; color: var(--color-text-primary);
        ${currentDayIndex === 0 ? 'opacity: 0.3; cursor: not-allowed;' : ''}">
        ←
      </button>

      <div class="text-center">
        <div style="font-size: 0.875rem; color: var(--color-text-secondary); text-transform: uppercase;
          letter-spacing: 0.1em; margin-bottom: 0.25rem;">
          Day ${currentDayIndex + 1} of ${challenge.totalDays}
        </div>
        <div style="font-size: 1rem; color: var(--color-text-primary);">
          ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <button onclick="navigateDay(1)" ${currentDayIndex === challenge.totalDays - 1 ? 'disabled' : ''}
        style="width: 48px; height: 48px; background: var(--color-bg-secondary);
        border: 1px solid var(--color-border); border-radius: var(--radius-sm);
        font-size: 1.5rem; color: var(--color-text-primary);
        ${currentDayIndex === challenge.totalDays - 1 ? 'opacity: 0.3; cursor: not-allowed;' : ''}">
        →
      </button>
    </div>

    <!-- Progress Ring -->
    <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 3rem;">
      <div style="position: relative; width: 200px; height: 200px;">
        <svg width="200" height="200" viewBox="0 0 200 200" style="transform: rotate(-90deg);">
          <!-- Background circle -->
          <circle cx="100" cy="100" r="85" fill="none" stroke="var(--color-bg-tertiary)" stroke-width="12"/>
          <!-- Progress circle -->
          <circle cx="100" cy="100" r="85" fill="none"
            stroke="url(#progressGradient)"
            stroke-width="12"
            stroke-linecap="round"
            stroke-dasharray="${2 * Math.PI * 85}"
            stroke-dashoffset="${2 * Math.PI * 85 * (1 - progressPercent / 100)}"
            style="transition: stroke-dashoffset 0.5s ease;"/>
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color: var(--color-maroon); stop-opacity: 1" />
              <stop offset="100%" style="stop-color: var(--color-gold); stop-opacity: 1" />
            </linearGradient>
          </defs>
        </svg>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          text-align: center;">
          <div style="font-size: 3rem; font-weight: 700; line-height: 1;
            background: linear-gradient(135deg, var(--color-maroon) 0%, var(--color-gold) 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            ${Math.round(progressPercent)}%
          </div>
          <div style="font-size: 0.875rem; color: var(--color-text-secondary); margin-top: 0.5rem;">
            ${completedCount} of ${totalTasks}
          </div>
        </div>
      </div>

      ${pointEarned ? `
        <div style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: var(--color-gold-subtle);
          border: 1px solid var(--color-gold); border-radius: var(--radius-md);
          color: var(--color-gold); font-weight: 600; font-size: 0.875rem;
          text-transform: uppercase; letter-spacing: 0.05em;">
          ⭐ Point Earned
        </div>
      ` : ''}
    </div>

    <!-- Tasks -->
    <div style="margin-bottom: 2rem;">
      ${challenge.tasks.map((task, index) => {
        const isCompleted = dayCompletion[index] || false;
        return `
          <div class="card" style="cursor: pointer; margin-bottom: 1rem;
            ${isCompleted ? 'background: var(--color-bg-tertiary);' : ''}"
            onclick="toggleTask(${index})">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 48px; height: 48px; border-radius: var(--radius-sm);
                background: ${isCompleted ? 'linear-gradient(135deg, var(--color-maroon) 0%, var(--color-gold) 100%)' : 'var(--color-bg-tertiary)'};
                border: 2px solid ${isCompleted ? 'var(--color-gold)' : 'var(--color-border)'};
                display: flex; align-items: center; justify-content: center;
                font-size: 1.5rem; transition: all var(--transition-base);">
                ${isCompleted ? '✓' : task.emoji}
              </div>
              <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 1rem;
                  ${isCompleted ? 'text-decoration: line-through; opacity: 0.7;' : ''}">
                  ${task.name}
                </div>
                ${task.description ? `
                  <div class="text-secondary" style="font-size: 0.875rem; margin-top: 0.25rem;">
                    ${task.description}
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function navigateDay(delta) {
  const challenge = Store.getChallenge();
  if (!challenge) return;

  const newIndex = currentDayIndex + delta;
  if (newIndex >= 0 && newIndex < challenge.totalDays) {
    currentDayIndex = newIndex;
    renderDailyTab();
  }
}

function toggleTask(taskIndex) {
  const challenge = Store.getChallenge();
  if (!challenge) return;

  const dayCompletion = Store.getDayCompletion(currentDayIndex);
  const currentState = dayCompletion[taskIndex] || false;

  Store.saveCompletion(currentDayIndex, taskIndex, !currentState);
  renderDailyTab();
}

// ==================== Stats Tab ====================
function renderStatsTab() {
  const container = document.getElementById('stats-content');
  const challenge = Store.getChallenge();
  const archive = Store.getArchive();

  if (currentArchiveIndex !== null) {
    renderArchiveDetail(archive[currentArchiveIndex]);
    return;
  }

  if (!challenge && archive.length === 0) {
    container.innerHTML = `
      <div class="text-center" style="margin-top: 4rem;">
        <p class="text-secondary">No challenge data available</p>
      </div>
    `;
    return;
  }

  let html = '';

  // Active Challenge Stats
  if (challenge) {
    const completions = Store.getCompletions();
    const totalDays = challenge.totalDays;
    const daysCompleted = Object.keys(completions).length;

    let totalPoints = 0;
    let possiblePoints = 0;

    for (let i = 0; i < totalDays; i++) {
      const dayComp = completions[i] || {};
      const tasksCompleted = Object.values(dayComp).filter(Boolean).length;

      if (Object.keys(dayComp).length > 0) {
        possiblePoints++;
        if (tasksCompleted >= challenge.pointThreshold) {
          totalPoints++;
        }
      }
    }

    html += `
      <div class="card mb-lg">
        <h2 style="margin-bottom: 1.5rem; font-size: 1.5rem;">Active Challenge</h2>

        <!-- Points Display -->
        <div style="display: flex; justify-content: space-around; margin-bottom: 2rem;
          padding: 1.5rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md);">
          <div class="text-center">
            <div style="font-size: 2.5rem; font-weight: 700;
              background: linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%);
              -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
              ${totalPoints}
            </div>
            <div class="text-secondary" style="font-size: 0.875rem; text-transform: uppercase;
              letter-spacing: 0.05em; margin-top: 0.25rem;">
              Points
            </div>
          </div>
          <div class="text-center">
            <div style="font-size: 2.5rem; font-weight: 700; color: var(--color-text-primary);">
              ${daysCompleted}
            </div>
            <div class="text-secondary" style="font-size: 0.875rem; text-transform: uppercase;
              letter-spacing: 0.05em; margin-top: 0.25rem;">
              Days Active
            </div>
          </div>
        </div>

        <!-- Heatmap -->
        <div>
          <div class="input-label mb-sm">Daily Progress</div>
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem;">
            ${Array.from({ length: totalDays }, (_, i) => {
              const dayComp = completions[i] || {};
              const tasksCompleted = Object.values(dayComp).filter(Boolean).length;
              const totalTasks = challenge.tasks.length;
              const completion = totalTasks > 0 ? tasksCompleted / totalTasks : 0;
              const pointEarned = tasksCompleted >= challenge.pointThreshold;

              let bgColor = 'var(--color-bg-tertiary)';
              if (completion === 1) {
                bgColor = 'var(--color-gold)';
              } else if (completion >= 0.75) {
                bgColor = 'var(--color-maroon-light)';
              } else if (completion >= 0.5) {
                bgColor = 'var(--color-maroon)';
              } else if (completion > 0) {
                bgColor = 'var(--color-maroon-dark)';
              }

              return `
                <div style="aspect-ratio: 1; background: ${bgColor};
                  border-radius: var(--radius-sm); position: relative;
                  border: 1px solid var(--color-border);">
                  ${pointEarned ? '<div style="position: absolute; top: 2px; right: 2px; font-size: 0.5rem;">⭐</div>' : ''}
                </div>
              `;
            }).join('')}
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 1rem;
            font-size: 0.75rem; color: var(--color-text-tertiary);">
            <span>Day 1</span>
            <span>Day ${totalDays}</span>
          </div>
        </div>
      </div>
    `;
  }

  // Archived Challenges
  if (archive.length > 0) {
    html += `
      <div>
        <h2 style="margin-bottom: 1rem; font-size: 1.5rem;">Archive</h2>
        ${archive.map((archivedChallenge, index) => {
          const totalDays = archivedChallenge.totalDays;
          const completions = archivedChallenge.completions || {};

          let totalPoints = 0;
          for (let i = 0; i < totalDays; i++) {
            const dayComp = completions[i] || {};
            const tasksCompleted = Object.values(dayComp).filter(Boolean).length;
            if (tasksCompleted >= archivedChallenge.pointThreshold) {
              totalPoints++;
            }
          }

          const archivedDate = new Date(archivedChallenge.archivedAt);

          return `
            <div class="card" style="cursor: pointer;" onclick="viewArchive(${index})">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 600; margin-bottom: 0.25rem;">
                    ${totalDays} Day Challenge
                  </div>
                  <div class="text-secondary" style="font-size: 0.875rem;">
                    ${archivedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div class="text-center">
                  <div style="font-size: 1.5rem; font-weight: 700; color: var(--color-gold);">
                    ${totalPoints}
                  </div>
                  <div class="text-secondary" style="font-size: 0.75rem;">
                    points
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  container.innerHTML = html;
}

function viewArchive(index) {
  currentArchiveIndex = index;
  renderStatsTab();
}

function renderArchiveDetail(archivedChallenge) {
  const container = document.getElementById('stats-content');
  const completions = archivedChallenge.completions || {};
  const totalDays = archivedChallenge.totalDays;

  let totalPoints = 0;
  let totalTasksCompleted = 0;
  let totalPossibleTasks = 0;

  for (let i = 0; i < totalDays; i++) {
    const dayComp = completions[i] || {};
    const tasksCompleted = Object.values(dayComp).filter(Boolean).length;
    totalTasksCompleted += tasksCompleted;
    totalPossibleTasks += archivedChallenge.tasks.length;

    if (tasksCompleted >= archivedChallenge.pointThreshold) {
      totalPoints++;
    }
  }

  const overallCompletion = totalPossibleTasks > 0
    ? Math.round((totalTasksCompleted / totalPossibleTasks) * 100)
    : 0;

  container.innerHTML = `
    <button class="btn-secondary mb-lg" onclick="currentArchiveIndex = null; renderStatsTab();">
      <span>← Back to Stats</span>
    </button>

    <div class="card mb-lg">
      <h2 style="margin-bottom: 1.5rem; font-size: 1.5rem;">
        ${totalDays} Day Challenge
      </h2>

      <div style="display: flex; justify-content: space-around; margin-bottom: 2rem;
        padding: 1.5rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md);">
        <div class="text-center">
          <div style="font-size: 2.5rem; font-weight: 700;
            background: linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            ${totalPoints}
          </div>
          <div class="text-secondary" style="font-size: 0.875rem; text-transform: uppercase;
            letter-spacing: 0.05em; margin-top: 0.25rem;">
            Points
          </div>
        </div>
        <div class="text-center">
          <div style="font-size: 2.5rem; font-weight: 700; color: var(--color-text-primary);">
            ${overallCompletion}%
          </div>
          <div class="text-secondary" style="font-size: 0.875rem; text-transform: uppercase;
            letter-spacing: 0.05em; margin-top: 0.25rem;">
            Completion
          </div>
        </div>
      </div>

      <!-- Task Breakdown -->
      <div class="mb-lg">
        <div class="input-label mb-sm">Task Performance</div>
        ${archivedChallenge.tasks.map((task, taskIndex) => {
          let taskCompleted = 0;
          for (let i = 0; i < totalDays; i++) {
            const dayComp = completions[i] || {};
            if (dayComp[taskIndex]) taskCompleted++;
          }
          const taskPercent = totalDays > 0 ? Math.round((taskCompleted / totalDays) * 100) : 0;

          return `
            <div style="margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span>${task.emoji}</span>
                  <span style="font-weight: 600; font-size: 0.875rem;">${task.name}</span>
                </div>
                <span style="font-weight: 600; color: var(--color-gold);">${taskPercent}%</span>
              </div>
              <div style="height: 8px; background: var(--color-bg-tertiary); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${taskPercent}%;
                  background: linear-gradient(90deg, var(--color-maroon) 0%, var(--color-gold) 100%);
                  transition: width 0.5s ease;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Heatmap -->
      <div>
        <div class="input-label mb-sm">Daily Progress</div>
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem;">
          ${Array.from({ length: totalDays }, (_, i) => {
            const dayComp = completions[i] || {};
            const tasksCompleted = Object.values(dayComp).filter(Boolean).length;
            const totalTasks = archivedChallenge.tasks.length;
            const completion = totalTasks > 0 ? tasksCompleted / totalTasks : 0;
            const pointEarned = tasksCompleted >= archivedChallenge.pointThreshold;

            let bgColor = 'var(--color-bg-tertiary)';
            if (completion === 1) {
              bgColor = 'var(--color-gold)';
            } else if (completion >= 0.75) {
              bgColor = 'var(--color-maroon-light)';
            } else if (completion >= 0.5) {
              bgColor = 'var(--color-maroon)';
            } else if (completion > 0) {
              bgColor = 'var(--color-maroon-dark)';
            }

            return `
              <div style="aspect-ratio: 1; background: ${bgColor};
                border-radius: var(--radius-sm); position: relative;
                border: 1px solid var(--color-border);">
                ${pointEarned ? '<div style="position: absolute; top: 2px; right: 2px; font-size: 0.5rem;">⭐</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ==================== Settings Tab ====================
function renderSettingsTab() {
  const container = document.getElementById('settings-content');
  const challenge = Store.getChallenge();

  container.innerHTML = `
    <div class="card mb-lg">
      <h3 style="margin-bottom: 1rem; font-size: 1.25rem;">Challenge Management</h3>

      ${challenge ? `
        <button class="btn-secondary mb-md" onclick="confirmUnlock()">
          <span>🔓 Unlock & Archive Challenge</span>
        </button>
        <p class="text-secondary" style="font-size: 0.875rem; margin-bottom: 1rem;">
          Archive your current challenge and start a new one. Your progress will be saved.
        </p>
      ` : `
        <p class="text-secondary">No active challenge</p>
      `}
    </div>

    <div class="card mb-lg">
      <h3 style="margin-bottom: 1rem; font-size: 1.25rem; color: var(--color-maroon);">Danger Zone</h3>
      <button class="btn-secondary" onclick="confirmClearAll()"
        style="border-color: var(--color-maroon); color: var(--color-maroon);">
        <span>Clear All Data</span>
      </button>
      <p class="text-secondary" style="font-size: 0.875rem; margin-top: 1rem;">
        Delete all challenges and archived data. This action cannot be undone.
      </p>
    </div>

    <div class="text-center text-secondary" style="margin-top: 3rem;">
      <p style="font-size: 0.875rem;">Challenge Tracker v1.0</p>
      <p style="font-size: 0.75rem; margin-top: 0.5rem;">Built for excellence</p>
    </div>
  `;
}

function confirmUnlock() {
  if (confirm('Archive this challenge and start fresh? Your progress will be saved in the archive.')) {
    Store.archiveChallenge();
    currentDayIndex = 0;
    switchTab('setup');
  }
}

function confirmClearAll() {
  if (confirm('Delete ALL data including archive? This cannot be undone.')) {
    if (confirm('Are you absolutely sure? This will erase everything.')) {
      localStorage.clear();
      currentDayIndex = 0;
      currentArchiveIndex = null;
      switchTab('setup');
    }
  }
}

// ==================== App Initialization ====================
document.addEventListener('DOMContentLoaded', () => {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(err => console.log('Service worker registration failed:', err));
  }

  // Setup navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.tab;
      switchTab(tab);
    });
  });

  // Initial render
  const challenge = Store.getChallenge();
  if (challenge) {
    currentDayIndex = Store.getCurrentDayIndex();
    switchTab('daily');
  } else {
    switchTab('setup');
  }
});
