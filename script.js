let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let savings = JSON.parse(localStorage.getItem('savings')) || [];
let budget = parseFloat(localStorage.getItem('budget')) || 0;
let editId = null;

const cats = {
    food: { icon: '🍜', name: 'Makan', color: '#ef4444' },
    transport: { icon: '🚗', name: 'Transport', color: '#3b82f6' },
    shopping: { icon: '🛒', name: 'Belanja', color: '#8b5cf6' },
    bills: { icon: '💳', name: 'Tagihan', color: '#f59e0b' },
    health: { icon: '💊', name: 'Kesehatan', color: '#10b981' },
    fun: { icon: '🎮', name: 'Hiburan', color: '#ec4899' },
    beauty: { icon: '💄', name: 'Skincare & Make Up', color: '#f472b6' },
    other: { icon: '📦', name: 'Lainnya', color: '#6b7280' }
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('expenseForm').addEventListener('submit', addExpense);
    document.getElementById('savingsForm').addEventListener('submit', addSavings);
    render();
});

function save() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('savings', JSON.stringify(savings));
    localStorage.setItem('budget', budget);
}

function addExpense(e) {
    e.preventDefault();
    const amt = parseFloat(document.getElementById('amount').value);
    const cat = document.getElementById('category').value;
    const note = document.getElementById('note').value;
    
    expenses.unshift({
        id: Date.now(),
        amount: amt,
        category: cat,
        note: note || cats[cat].name,
        date: new Date().toISOString()
    });
    
    save(); render(); e.target.reset();
    notify('✅ Berhasil ditambah!');
}

function addSavings(e) {
    e.preventDefault();
    const amt = parseFloat(document.getElementById('savingsAmount').value);
    const note = document.getElementById('savingsNote').value;
    
    savings.unshift({ id: Date.now(), amount: amt, note: note, date: new Date().toISOString() });
    save(); render(); e.target.reset();
    notify('💰 Tabungan disimpan!');
}

function render() {
    const monthExp = expenses.filter(e => isMonth(e.date)).reduce((s, e) => s + e.amount, 0);
    const totalSav = savings.reduce((s, e) => s + e.amount, 0);
    
    document.getElementById('monthTotal').textContent = fmt(monthExp);
    document.getElementById('savingsTotal').textContent = fmt(totalSav);
    
    // Update Budget
    const pct = budget > 0 ? Math.min((monthExp / budget) * 100, 100) : 0;
    document.getElementById('budgetProgress').style.width = pct + '%';
    document.getElementById('budgetPercent').textContent = Math.round(pct) + '%';
    document.getElementById('budgetText').textContent = `dari ${fmt(budget)}`;
    
    updateList();
}

function updateList() {
    const list = document.getElementById('expenseList');
    list.innerHTML = expenses.map(e => `
        <div class="expense-item" onclick="openEdit(${e.id})">
            <div><strong>${e.note}</strong><br><small>${cats[e.category].name}</small></div>
            <div style="color:red">-${fmt(e.amount)}</div>
        </div>
    `).join('') || '<p class="empty">Kosong</p>';
}

function fmt(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
function isMonth(d) { return new Date(d).getMonth() === new Date().getMonth(); }

function openBudgetModal() { document.getElementById('budgetModal').classList.add('show'); }
function closeBudgetModal() { document.getElementById('budgetModal').classList.remove('show'); }
function saveBudget() {
    budget = parseFloat(document.getElementById('budgetInput').value) || 0;
    save(); render(); closeBudgetModal();
}

function openResetModal() { document.getElementById('resetModal').classList.add('show'); }
function closeResetModal() { document.getElementById('resetModal').classList.remove('show'); }
function confirmReset() { localStorage.clear(); location.reload(); }

function notify(msg) {
    const n = document.createElement('div');
    n.className = 'notification success';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2000);
}