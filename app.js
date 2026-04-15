(() => {
  const STORAGE_KEY = 'habit-tracker-data';

  // ── Helpers ──────────────────────────────────────────────────────────────
  function todayKey() {
    return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  }

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { habits: [] };
    } catch {
      return { habits: [] };
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function calcStreak(completedDates) {
    if (!completedDates.length) return 0;
    const sorted = [...new Set(completedDates)].sort().reverse();
    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (const d of sorted) {
      const date = new Date(d + 'T00:00:00');
      const diff = Math.round((cursor - date) / 86400000);
      if (diff === 0 || diff === 1) {
        streak++;
        cursor = date;
      } else {
        break;
      }
    }
    return streak;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const data = load();
    const today = todayKey();
    const list = document.getElementById('habits-list');
    const footer = document.getElementById('footer');
    list.innerHTML = '';

    if (!data.habits.length) {
      list.innerHTML = '<p class="empty">No habits yet — add one above!</p>';
      footer.textContent = '';
      return;
    }

    const done = data.habits.filter(h => h.completedDates.includes(today)).length;
    footer.textContent = `${done} / ${data.habits.length} completed today`;

    data.habits.forEach(habit => {
      const isDone = habit.completedDates.includes(today);
      const streak = calcStreak(habit.completedDates);

      const card = document.createElement('div');
      card.className = 'habit-card' + (isDone ? ' done' : '');

      card.innerHTML = `
        <button class="check-btn" data-id="${habit.id}" title="Toggle complete">✓</button>
        <span class="habit-name">${escapeHtml(habit.name)}</span>
        ${streak > 1 ? `<span class="streak">🔥 ${streak}d</span>` : ''}
        <button class="delete-btn" data-id="${habit.id}" title="Delete">✕</button>
      `;

      list.appendChild(card);
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  function addHabit(name) {
    const data = load();
    data.habits.push({
      id: Date.now().toString(),
      name: name.trim(),
      completedDates: [],
    });
    save(data);
    render();
  }

  function toggleHabit(id) {
    const data = load();
    const today = todayKey();
    const habit = data.habits.find(h => h.id === id);
    if (!habit) return;
    const idx = habit.completedDates.indexOf(today);
    if (idx === -1) {
      habit.completedDates.push(today);
    } else {
      habit.completedDates.splice(idx, 1);
    }
    save(data);
    render();
  }

  function deleteHabit(id) {
    const data = load();
    data.habits = data.habits.filter(h => h.id !== id);
    save(data);
    render();
  }

  // ── Event wiring ──────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Date header
    document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const input = document.getElementById('habit-input');
    const addBtn = document.getElementById('add-btn');

    addBtn.addEventListener('click', () => {
      const val = input.value.trim();
      if (val) { addHabit(val); input.value = ''; }
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') addBtn.click();
    });

    document.getElementById('habits-list').addEventListener('click', e => {
      const checkBtn = e.target.closest('.check-btn');
      const deleteBtn = e.target.closest('.delete-btn');
      if (checkBtn) toggleHabit(checkBtn.dataset.id);
      if (deleteBtn) deleteHabit(deleteBtn.dataset.id);
    });

    render();
  });
})();
