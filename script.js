// DUITKU MEGA - All Features
let expenses = [];
let savings = [];
let goals = [];
let recurring = [];
let wallets = { cash: 0, bank: 0, ewallet: 0, credit: 0 };
let currentWallet = 'cash';
let budget = 0;
let editId = null;
let currentChart = null;
let soundEnabled = true;
let userLevel = 1;
let userXP = 0;

const cats = {
    food: { icon: '🍜', name: 'Makan', color: '#ef4444' },
    transport: { icon: '🚗', name: 'Transport', color: '#3b82f6' },
    shopping: { icon: '🛒', name: 'Belanja', color: '#8b5cf6' },
    bills: { icon: '💳', name: 'Tagihan', color: '#f59e0b' },
    health: { icon: '💊', name: 'Kesehatan', color: '#10b981' },
    fun: { icon: '🎮', name: 'Hiburan', color: '#ec4899' },
    beauty: { icon: '💄', name: 'Beauty', color: '#f472b6' },
    other: { icon: '📦', name: 'Lainnya', color: '#6b7280' }
};

// PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installPrompt').style.display = 'flex';
});

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
            deferredPrompt = null;
            document.getElementById('installPrompt').style.display = 'none';
        });
    }
}

function dismissInstall() {
    document.getElementById('installPrompt').style.display = 'none';
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    load();
    checkPin();
    document.getElementById('expenseForm').addEventListener('submit', addExpense);
    render();
    initChart();
    processRecurring();
    generateCalendar();
});

function load() {
    expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    savings = JSON.parse(localStorage.getItem('savings') || '[]');
    goals = JSON.parse(localStorage.getItem('goals') || '[]');
    recurring = JSON.parse(localStorage.getItem('recurring') || '[]');
    wallets = JSON.parse(localStorage.getItem('wallets') || '{"cash":0,"bank":0,"ewallet":0,"credit":0}');
    budget = parseFloat(localStorage.getItem('budget') || '0');
    currentWallet = localStorage.getItem('currentWallet') || 'cash';
    soundEnabled = localStorage.getItem('sound') !== 'false';
    userLevel = parseInt(localStorage.getItem('level') || '1');
    userXP = parseInt(localStorage.getItem('xp') || '0');
    
    document.getElementById('currentWallet').value = currentWallet;
    document.getElementById('soundIcon').className = soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
}

function save() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('savings', JSON.stringify(savings));
    localStorage.setItem('goals', JSON.stringify(goals));
    localStorage.setItem('recurring', JSON.stringify(recurring));
    localStorage.setItem('wallets', JSON.stringify(wallets));
    localStorage.setItem('budget', budget);
    localStorage.setItem('currentWallet', currentWallet);
    localStorage.setItem('level', userLevel);
    localStorage.setItem('xp', userXP);
}

function addExpense(e) {
    e.preventDefault();
    const amt = parseFloat(document.getElementById('amount').value);
    const cat = document.getElementById('category').value;
    const note = document.getElementById('note').value;
    const tags = document.getElementById('tags').value;
    const isRec = document.getElementById('isRecurring').checked;
    
    if (!amt || !cat) {
        notify('Isi semua field!', 'danger');
        playSound('error');
        return;
    }
    
    const exp = {
        id: Date.now(),
        amount: amt,
        category: cat,
        note: note || cats[cat].name,
        tags: tags,
        wallet: currentWallet,
        date: new Date().toISOString()
    };
    
    expenses.unshift(exp);
    
    if (isRec) {
        recurring.push({
            id: Date.now() + 1,
            amount: amt,
            category: cat,
            note: note || cats[cat].name,
            wallet: currentWallet
        });
    }
    
    addXP(10);
    save();
    render();
    e.target.reset();
    notify('✅ Ditambahkan!', 'success');
    playSound('success');
}

function processRecurring() {
    const lastProcess = localStorage.getItem('lastRecurring');
    const now = new Date();
    const today = now.toDateString();
    
    if (lastProcess !== today && now.getDate() === 1) {
        recurring.forEach(r => {
            expenses.unshift({
                ...r,
                id: Date.now() + Math.random(),
                date: new Date().toISOString()
            });
        });
        localStorage.setItem('lastRecurring', today);
        save();
    }
}

function switchWallet() {
    currentWallet = document.getElementById('currentWallet').value;
    save();
    render();
}

function addXP(amount) {
    userXP += amount;
    while (userXP >= userLevel * 100) {
        userXP -= userLevel * 100;
        userLevel++;
        notify(`🎉 Level Up! Level ${userLevel}`, 'success');
        playSound('levelup');
    }
    save();
}

function render() {
    updateStats();
    updateBudget();
    updateCategories();
    updateList();
    updateRecurringList();
    updateGoals();
    updateChart();
    updateWalletBalance();
    document.getElementById('userLevel').textContent = userLevel;
}

function updateStats() {
    document.getElementById('todayTotal').textContent = fmt(getToday());
    document.getElementById('weekTotal').textContent = fmt(getWeek());
    document.getElementById('savingsTotal').textContent = fmt(getSavingsTotal());
}

function updateWalletBalance() {
    const total = expenses
        .filter(e => e.wallet === currentWallet)
        .reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('walletBalance').textContent = fmt(wallets[currentWallet] - total);
}

function updateBudget() {
    const month = getMonth();
    const pct = budget > 0 ? Math.min((month / budget) * 100, 100) : 0;
    
    const bar = document.getElementById('budgetProgress');
    bar.style.width = pct + '%';
    bar.className = pct >= 80 ? 'progress animated-gradient warning' : 'progress animated-gradient';
    
    document.getElementById('budgetPercent').textContent = pct.toFixed(0) + '%';
    document.getElementById('budgetText').textContent = 'dari ' + fmt(budget);
}

function updateCategories() {
    const totals = {};
    const monthTotal = getMonth();
    
    expenses.filter(e => isMonth(e.date)).forEach(e => {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const html = sorted.map(([cat, amt]) => {
        const pct = monthTotal > 0 ? (amt / monthTotal) * 100 : 0;
        const c = cats[cat];
        return `
            <div class="category-item">
                <div class="icon">${c.icon}</div>
                <div class="info">
                    <div class="name">${c.name}</div>
                    <div class="bar">
                        <div class="fill" style="width:${pct}%; background:${c.color}"></div>
                    </div>
                </div>
                <div class="amount">${fmt(amt)}</div>
            </div>
        `;
    }).join('') || '<p class="empty">Belum ada data</p>';
    
    document.getElementById('categoryList').innerHTML = html;
}

function updateList(filtered = null) {
    const list = filtered || expenses;
    if (!list.length) {
        document.getElementById('expenseList').innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Belum ada pengeluaran</p></div>';
        return;
    }
    
    const grouped = {};
    list.forEach(e => {
        const d = fmtDate(e.date);
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(e);
    });
    
    const html = Object.entries(grouped).map(([date, items]) => {
        const total = items.reduce((s, i) => s + i.amount, 0);
        return `
            <div class="expense-group">
                <div class="date-header">
                    <span>${date}</span>
                    <span>${fmt(total)}</span>
                </div>
                ${items.map(e => `
                    <div class="expense-item" onclick="openEdit(${e.id})">
                        <div class="left">
                            <div class="icon">${cats[e.category].icon}</div>
                            <div>
                                <div class="title">${e.note}</div>
                                <div class="meta">${cats[e.category].name} • ${e.wallet} • ${fmtTime(e.date)} ${e.tags ? `<br><small>${e.tags}</small>` : ''}</div>
                            </div>
                        </div>
                        <div class="amount">-${fmt(e.amount)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
    
    document.getElementById('expenseList').innerHTML = html;
}

function updateRecurringList() {
    if (!recurring.length) {
        document.getElementById('recurringList').innerHTML = '<p class="empty">Belum ada recurring</p>';
        return;
    }
    
    const html = recurring.map(r => `
        <div class="recurring-item">
            <div class="left">
                <div class="icon">${cats[r.category].icon}</div>
                <div>
                    <div class="title">${r.note}</div>
                    <div class="meta">Every month • ${r.wallet}</div>
                </div>
            </div>
            <div class="amount">${fmt(r.amount)}</div>
        </div>
    `).join('');
    
    document.getElementById('recurringList').innerHTML = html;
}

function updateGoals() {
    if (!goals.length) {
        document.getElementById('goalsList').innerHTML = '<p class="empty">Belum ada goals</p>';
        return;
    }
    
    const html = goals.map(g => {
        const pct = (g.current / g.target) * 100;
        return `
            <div class="goal-item">
                <div class="goal-header">
                    <strong>${g.name}</strong>
                    <span>${fmt(g.current)} / ${fmt(g.target)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress" style="width:${pct}%"></div>
                </div>
                <div class="goal-footer">
                    <span>${pct.toFixed(1)}%</span>
                    <button onclick="addToGoal(${g.id})" class="btn-small">Add</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('goalsList').innerHTML = html;
}

function initChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    currentChart = new Chart(ctx, {
        type: 'pie',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

function updateChart() {
    if (!currentChart) return;
    
    const totals = {};
    expenses.filter(e => isMonth(e.date)).forEach(e => {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    
    const labels = Object.keys(totals).map(k => cats[k].name);
    const data = Object.values(totals);
    const colors = Object.keys(totals).map(k => cats[k].color);
    
    currentChart.data.labels = labels;
    currentChart.data.datasets[0].data = data;
    currentChart.data.datasets[0].backgroundColor = colors;
    currentChart.update();
}

function switchChart(type) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    currentChart.destroy();
    const ctx = document.getElementById('expenseChart').getContext('2d');
    currentChart = new Chart(ctx, {
        type: type,
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: { responsive: true, maintainAspectRatio: true }
    });
    updateChart();
}

function generateCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let html = '<div class="calendar-grid">';
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        const dayExpenses = expenses.filter(e => new Date(e.date).toDateString() === date.toDateString());
        const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
        const intensity = total > 0 ? Math.min(total / 100000, 1) : 0;
        
        html += `
            <div class="calendar-day" style="background: rgba(239, 68, 68, ${intensity})">
                <div class="day-number">${i}</div>
                ${total > 0 ? `<div class="day-amount">${fmt(total)}</div>` : ''}
            </div>
        `;
    }
    html += '</div>';
    
    document.getElementById('calendarView').innerHTML = html;
}

function getToday() {
    const today = new Date().toDateString();
    return expenses.filter(e => new Date(e.date).toDateString() === today).reduce((s, e) => s + e.amount, 0);
}

function getWeek() {
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return expenses.filter(e => new Date(e.date) >= week).reduce((s, e) => s + e.amount, 0);
}

function getMonth() {
    return expenses.filter(e => isMonth(e.date)).reduce((s, e) => s + e.amount, 0);
}

function getSavingsTotal() {
    return savings.reduce((s, i) => s + i.amount, 0);
}

function isMonth(d) {
    const date = new Date(d);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function fmt(n) {
    return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function fmtDate(d) {
    const date = new Date(d);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Hari Ini';
    if (date.toDateString() === yesterday.toDateString()) return 'Kemarin';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtTime(d) {
    return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.getElementById('themeIcon').className = next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    playSound('click');
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('sound', soundEnabled);
    document.getElementById('soundIcon').className = soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
}

function playSound(type) {
    if (!soundEnabled) return;
    const freq = { success: 880, error: 220, click: 440, levelup: 1320 };
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq[type] || 440;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
}

function openBudgetModal() {
    document.getElementById('budgetInput').value = budget || '';
    document.getElementById('budgetModal').classList.add('show');
}

function closeBudgetModal() {
    document.getElementById('budgetModal').classList.remove('show');
}

function saveBudget() {
    budget = parseFloat(document.getElementById('budgetInput').value) || 0;
    save();
    render();
    closeBudgetModal();
    notify('✅ Budget disimpan!', 'success');
    playSound('success');
}

function openEdit(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    
    editId = id;
    document.getElementById('editAmount').value = exp.amount;
    document.getElementById('editCategory').value = exp.category;
    document.getElementById('editNote').value = exp.note;
    document.getElementById('editTags').value = exp.tags || '';
    document.getElementById('editModal').classList.add('show');
}

function closeEditModal() {
    editId = null;
    document.getElementById('editModal').classList.remove('show');
}

function saveEdit() {
    const exp = expenses.find(e => e.id === editId);
    if (!exp) return;
    
    exp.amount = parseFloat(document.getElementById('editAmount').value);
    exp.category = document.getElementById('editCategory').value;
    exp.note = document.getElementById('editNote').value;
    exp.tags = document.getElementById('editTags').value;
    
    save();
    render();
    closeEditModal();
    notify('✅ Updated!', 'success');
    playSound('success');
}

function deleteExpense() {
    if (!confirm('Hapus?')) return;
    expenses = expenses.filter(e => e.id !== editId);
    save();
    render();
    closeEditModal();
    notify('✅ Dihapus!', 'success');
    playSound('success');
}

function addGoal() {
    document.getElementById('goalModal').classList.add('show');
}

function closeGoalModal() {
    document.getElementById('goalModal').classList.remove('show');
}

function saveGoal() {
    const name = document.getElementById('goalName').value;
    const target = parseFloat(document.getElementById('goalTarget').value);
    const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
    
    if (!name || !target) {
        notify('Isi semua field!', 'danger');
        return;
    }
    
    goals.push({ id: Date.now(), name, target, current });
    save();
    render();
    closeGoalModal();
    notify('✅ Goal ditambahkan!', 'success');
    document.getElementById('goalName').value = '';
    document.getElementById('goalTarget').value = '';
    document.getElementById('goalCurrent').value = '';
}

function addToGoal(id) {
    const amount = prompt('Tambah berapa?');
    if (!amount) return;
    
    const goal = goals.find(g => g.id === id);
    if (goal) {
        goal.current += parseFloat(amount);
        save();
        render();
        notify('✅ Goal updated!', 'success');
    }
}

function openResetModal() {
    document.getElementById('resetModal').classList.add('show');
}

function closeResetModal() {
    document.getElementById('resetModal').classList.remove('show');
}

function confirmReset() {
    if (!confirm('YAKIN reset SEMUA?')) return;
    localStorage.clear();
    location.reload();
}

function showPinModal() {
    document.getElementById('pinModal').classList.add('show');
}

function closePinModal() {
    document.getElementById('pinModal').classList.remove('show');
}

function savePin() {
    const pin = document.getElementById('pinInput').value;
    if (pin) localStorage.setItem('pin', pin);
    else localStorage.removeItem('pin');
    closePinModal();
    notify('✅ PIN saved!', 'success');
}

function checkPin() {
    const pin = localStorage.getItem('pin');
    if (pin) {
        const input = prompt('Enter PIN:');
        if (input !== pin) {
            alert('Wrong PIN!');
            location.reload();
        }
    }
}

function toggleSearch() {
    const panel = document.getElementById('searchPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function searchExpenses() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = expenses.filter(e => 
        e.note.toLowerCase().includes(query) || 
        e.tags?.toLowerCase().includes(query) ||
        cats[e.category].name.toLowerCase().includes(query)
    );
    updateList(filtered);
}

function toggleFilter() {
    const panel = document.getElementById('filterPanel');
    panel.style.display = panel.style.display === 'none' ? 'grid' : 'none';
}

function applyFilter() {
    const period = document.getElementById('filterPeriod').value;
    const cat = document.getElementById('filterCategory').value;
    const wallet = document.getElementById('filterWallet').value;
    
    let filtered = [...expenses];
    
    if (period === 'today') {
        const today = new Date().toDateString();
        filtered = filtered.filter(e => new Date(e.date).toDateString() === today);
    } else if (period === 'week') {
        const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(e => new Date(e.date) >= week);
    } else if (period === 'month') {
        filtered = filtered.filter(e => isMonth(e.date));
    }
    
    if (cat !== 'all') filtered = filtered.filter(e => e.category === cat);
    if (wallet !== 'all') filtered = filtered.filter(e => e.wallet === wallet);
    
    updateList(filtered);
}

function exportCSV() {
    if (!expenses.length) {
        notify('No data!', 'warning');
        return;
    }
    
    let csv = 'Date,Time,Category,Note,Tags,Wallet,Amount\n';
    expenses.forEach(e => {
        const d = new Date(e.date);
        csv += `${d.toLocaleDateString()},${d.toLocaleTimeString()},${cats[e.category].name},"${e.note}","${e.tags || ''}",${e.wallet},${e.amount}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `duitku_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    notify('✅ Exported!', 'success');
}

function exportPDF() {
    notify('📄 PDF export coming soon!', 'info');
}

function showStats() {
    document.getElementById('statsModal').classList.add('show');
    
    const html = `
        <h3>Monthly Stats</h3>
        <p>Total Expenses: ${fmt(getMonth())}</p>
        <p>Budget: ${fmt(budget)}</p>
        <p>Remaining: ${fmt(budget - getMonth())}</p>
        <p>Savings: ${fmt(getSavingsTotal())}</p>
        <p>Level: ${userLevel}</p>
        <p>XP: ${userXP}/${userLevel * 100}</p>
    `;
    
    document.getElementById('detailedStats').innerHTML = html;
}

function closeStatsModal() {
    document.getElementById('statsModal').classList.remove('show');
}

function notify(msg, type = 'success') {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

window.onclick = e => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
};

// Check theme on load
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('themeIcon').className = savedTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';