// ==========================================
// DUITKU MEGA - FULL ENGINE (FIXED & SYNCED)
// ==========================================

let expenses = [];
let goals = [];
let recurring = [];
let wallets = { cash: 0, bank: 0, ewallet: 0, credit: 0 };
let currentWallet = 'cash';
let budget = 0;
let userLevel = 1;
let userXP = 0;
let soundEnabled = true;

const cats = {
    food: { icon: '🍜', name: 'Makan', color: '#ef4444' },
    transport: { icon: '🚗', name: 'Transport', color: '#3b82f6' },
    shopping: { icon: '🛒', name: 'Belanja', color: '#8b5cf6' },
    bills: { icon: '💳', name: 'Tagihan', color: '#f59e0b' },
    health: { icon: '💊', name: 'Kesehatan', color: '#10b981' },
    fun: { icon: '🎮', name: 'Hiburan', color: '#ec4899' },
    other: { icon: '📦', name: 'Lainnya', color: '#6b7280' }
};

// 1. INIT & LOAD DATA
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initChart();
    render();
    processRecurring(); // Fitur auto-debet bulanan
    
    document.getElementById('expenseForm').addEventListener('submit', addExpense);
});

function loadData() {
    expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    goals = JSON.parse(localStorage.getItem('goals') || '[]');
    recurring = JSON.parse(localStorage.getItem('recurring') || '[]');
    wallets = JSON.parse(localStorage.getItem('wallets') || '{"cash":0,"bank":0,"ewallet":0,"credit":0}');
    budget = parseFloat(localStorage.getItem('budget') || '0');
    currentWallet = localStorage.getItem('currentWallet') || 'cash';
    userLevel = parseInt(localStorage.getItem('level') || '1');
    userXP = parseInt(localStorage.getItem('xp') || '0');
    
    document.getElementById('currentWallet').value = currentWallet;
}

function save() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('wallets', JSON.stringify(wallets));
    localStorage.setItem('budget', budget);
    localStorage.setItem('currentWallet', currentWallet);
    localStorage.setItem('level', userLevel);
    localStorage.setItem('xp', userXP);
}

// 2. CORE FUNCTIONS
function addExpense(e) {
    e.preventDefault();
    const amt = parseFloat(document.getElementById('amount').value);
    const cat = document.getElementById('category').value;
    const note = document.getElementById('note').value;
    
    if (!amt) return notify('Isi jumlahnya!', 'danger');

    const exp = {
        id: Date.now(),
        amount: amt,
        category: cat,
        note: note || cats[cat].name,
        wallet: currentWallet,
        date: new Date().toISOString()
    };

    expenses.unshift(exp);
    addXP(10); // Fitur Leveling
    save();
    render();
    e.target.reset();
    notify('✅ Berhasil dicatat!', 'success');
    playSound('success');
}

// 3. SYSTEM XP & LEVELING
function addXP(amount) {
    userXP += amount;
    if (userXP >= userLevel * 100) {
        userXP = 0;
        userLevel++;
        notify(`🎉 LEVEL UP! Sekarang Level ${userLevel}`, 'success');
        playSound('levelup');
    }
    document.getElementById('userLevel').textContent = userLevel;
    document.getElementById('xpFill').style.width = (userXP / (userLevel * 100) * 100) + '%';
}

// 4. RENDERING ENGINE
function render() {
    updateWalletBalance();
    updateBudgetProgress();
    updateStats();
    updateList();
    updateChart();
}

function updateWalletBalance() {
    const totalSpent = expenses
        .filter(e => e.wallet === currentWallet)
        .reduce((sum, e) => sum + e.amount, 0);
    
    // Asumsi saldo awal (bisa kamu tambah fitur edit saldo nanti)
    const initialBalance = wallets[currentWallet] || 0;
    const balance = initialBalance - totalSpent;
    
    const el = document.getElementById('walletBalance');
    el.textContent = fmt(balance);
    el.style.color = balance < 0 ? 'var(--danger)' : 'var(--primary)';
}

function updateBudgetProgress() {
    const monthTotal = expenses
        .filter(e => isThisMonth(e.date))
        .reduce((s, e) => s + e.amount, 0);
    
    const pct = budget > 0 ? Math.min((monthTotal / budget) * 100, 100) : 0;
    const bar = document.getElementById('budgetProgress');
    
    bar.style.width = pct + '%';
    bar.style.background = pct > 85 ? 'var(--danger)' : 'var(--primary)';
    
    document.getElementById('budgetPercent').textContent = Math.round(pct) + '%';
    document.getElementById('budgetText').textContent = `dari ${fmt(budget)}`;
}

function updateStats() {
    const today = new Date().toDateString();
    const todayTotal = expenses
        .filter(e => new Date(e.date).toDateString() === today)
        .reduce((s, e) => s + e.amount, 0);
    
    document.getElementById('todayTotal').textContent = fmt(todayTotal);
}

function updateList() {
    const listContainer = document.getElementById('expenseList');
    if (expenses.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted)">Belum ada catatan hari ini.</p>';
        return;
    }

    listContainer.innerHTML = expenses.slice(0, 10).map(e => `
        <div class="glow-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:15px">
            <div style="display:flex; align-items:center; gap:12px">
                <div style="font-size:1.5rem">${cats[e.category].icon}</div>
                <div>
                    <div style="font-weight:700">${e.note}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted)">${fmtDate(e.date)} • ${e.wallet}</div>
                </div>
            </div>
            <div style="color:var(--danger); font-weight:800">-${fmt(e.amount)}</div>
        </div>
    `).join('');
}

// 5. CHART & ANALYTICS
function initChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    currentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{ data: [], backgroundColor: [] }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function updateChart() {
    const totals = {};
    expenses.filter(e => isThisMonth(e.date)).forEach(e => {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
    });

    currentChart.data.labels = Object.keys(totals).map(k => cats[k].name);
    currentChart.data.datasets[0].data = Object.values(totals);
    currentChart.data.datasets[0].backgroundColor = Object.keys(totals).map(k => cats[k].color);
    currentChart.update();
}

// 6. UTILITIES
function fmt(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
function fmtDate(d) { return new Date(d).toLocaleDateString('id-ID', { day:'numeric', month:'short' }); }
function isThisMonth(d) { return new Date(d).getMonth() === new Date().getMonth(); }

function switchWallet() {
    currentWallet = document.getElementById('currentWallet').value;
    save();
    render();
}

function notify(msg, type) {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

// 7. RECURRING ENGINE (Auto-input tiap bulan)
function processRecurring() {
    const lastCheck = localStorage.getItem('lastRecurringCheck');
    const now = new Date();
    if (lastCheck !== now.getMonth().toString()) {
        recurring.forEach(r => {
            expenses.unshift({...r, id: Date.now(), date: now.toISOString()});
        });
        localStorage.setItem('lastRecurringCheck', now.getMonth().toString());
        save();
    }
}

// SOUND ENGINE
function playSound(type) {
    if (!soundEnabled) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.frequency.value = type === 'success' ? 880 : 440;
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
}