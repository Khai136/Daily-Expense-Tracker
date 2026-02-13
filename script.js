let expenses = [];
let savings = [];
let budget = 0;
let editId = null;

const cats = {
    food: { icon: '🍜', name: 'Makan', color: '#ef4444' },
    transport: { icon: '🚗', name: 'Transport', color: '#3b82f6' },
    shopping: { icon: '🛒', name: 'Belanja', color: '#8b5cf6' },
    bills: { icon: '💳', name: 'Tagihan', color: '#f59e0b' },
    health: { icon: '💊', name: 'Kesehatan', color: '#10b981' },
    fun: { icon: '🎮', name: 'Hiburan', color: '#ec4899' },
    beauty: { icon: '💄', name: 'Skincare & Makeup', color: '#f472b6' },
    other: { icon: '📦', name: 'Lainnya', color: '#6b7280' }
};

document.addEventListener('DOMContentLoaded', () => {
    load();
    document.getElementById('expenseForm').addEventListener('submit', addExpense);
    document.getElementById('savingsForm').addEventListener('submit', addSavings);
    render();
});

function load() {
    const e = localStorage.getItem('expenses');
    const s = localStorage.getItem('savings');
    const b = localStorage.getItem('budget');
    if (e) expenses = JSON.parse(e);
    if (s) savings = JSON.parse(s);
    if (b) budget = parseFloat(b);
}

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
    
    if (!amt || amt <= 0 || !cat) {
        notify('Isi semua field!', 'danger');
        return;
    }
    
    expenses.unshift({
        id: Date.now(),
        amount: amt,
        category: cat,
        note: note || cats[cat].name,
        date: new Date().toISOString()
    });
    
    save();
    render();
    e.target.reset();
    notify('✅ Pengeluaran ditambahkan!', 'success');
}

function addSavings(e) {
    e.preventDefault();
    const amt = parseFloat(document.getElementById('savingsAmount').value);
    const note = document.getElementById('savingsNote').value;
    
    if (!amt || amt <= 0 || !note) {
        notify('Isi semua field!', 'danger');
        return;
    }
    
    savings.unshift({
        id: Date.now(),
        amount: amt,
        note: note,
        date: new Date().toISOString()
    });
    
    save();
    render();
    e.target.reset();
    notify('✅ Tabungan ditambahkan!', 'success');
}

function render() {
    updateStats();
    updateBudget();
    updateCategories();
    updateList();
}

function updateStats() {
    const today = getToday();
    const week = getWeek();
    const month = getMonth();
    const totalSavings = savings.reduce((sum, s) => sum + s.amount, 0);
    
    document.getElementById('todayTotal').textContent = fmt(today);
    document.getElementById('weekTotal').textContent = fmt(week);
    document.getElementById('monthTotal').textContent = fmt(month);
    document.getElementById('savingsTotal').textContent = fmt(totalSavings);
}

function updateBudget() {
    const month = getMonth();
    const pct = budget > 0 ? Math.min((month / budget) * 100, 100) : 0;
    
    const bar = document.getElementById('budgetProgress');
    bar.style.width = pct + '%';
    bar.className = pct >= 80 ? 'progress warning' : 'progress';
    
    document.getElementById('budgetPercent').textContent = pct.toFixed(0) + '%';
    document.getElementById('budgetText').textContent = 'dari ' + fmt(budget);
    
    if (pct >= 80 && pct < 100) {
        const last = localStorage.getItem('lastWarn');
        const now = new Date().toDateString();
        if (last !== now) {
            notify(`⚠️ Sudah ${pct.toFixed(0)}%!`, 'warning');
            localStorage.setItem('lastWarn', now);
        }
    }
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
    }).join('') || '<p class="empty">Belum ada data bulan ini</p>';
    
    document.getElementById('categoryList').innerHTML = html;
}

function updateList(filtered = null) {
    const list = filtered || expenses;
    if (!list.length) {
        document.getElementById('expenseList').innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-inbox"></i>
                <p>Belum ada pengeluaran</p>
            </div>
        `;
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
                                <div class="meta">${cats[e.category].name} • ${fmtTime(e.date)}</div>
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

function getToday() {
    const today = new Date().toDateString();
    return expenses.filter(e => new Date(e.date).toDateString() === today)
        .reduce((s, e) => s + e.amount, 0);
}

function getWeek() {
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return expenses.filter(e => new Date(e.date) >= week)
        .reduce((s, e) => s + e.amount, 0);
}

function getMonth() {
    return expenses.filter(e => isMonth(e.date))
        .reduce((s, e) => s + e.amount, 0);
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

function openBudgetModal() {
    document.getElementById('budgetInput').value = budget || '';
    document.getElementById('budgetModal').classList.add('show');
}

function closeBudgetModal() {
    document.getElementById('budgetModal').classList.remove('show');
}

function saveBudget() {
    const val = parseFloat(document.getElementById('budgetInput').value);
    if (isNaN(val) || val < 0) {
        notify('Budget tidak valid!', 'danger');
        return;
    }
    budget = val;
    save();
    render();
    closeBudgetModal();
    notify('✅ Budget disimpan!', 'success');
}

function openEdit(id) {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    
    editId = id;
    document.getElementById('editAmount').value = exp.amount;
    document.getElementById('editCategory').value = exp.category;
    document.getElementById('editNote').value = exp.note;
    document.getElementById('editModal').classList.add('show');
}

function closeEditModal() {
    editId = null;
    document.getElementById('editModal').classList.remove('show');
}

function saveEdit() {
    const exp = expenses.find(e => e.id === editId);
    if (!exp) return;
    
    const amt = parseFloat(document.getElementById('editAmount').value);
    if (isNaN(amt) || amt <= 0) {
        notify('Jumlah tidak valid!', 'danger');
        return;
    }
    
    exp.amount = amt;
    exp.category = document.getElementById('editCategory').value;
    exp.note = document.getElementById('editNote').value;
    
    save();
    render();
    closeEditModal();
    notify('✅ Diupdate!', 'success');
}

function deleteExpense() {
    if (!confirm('Hapus pengeluaran ini?')) return;
    expenses = expenses.filter(e => e.id !== editId);
    save();
    render();
    closeEditModal();
    notify('✅ Dihapus!', 'success');
}

function openResetModal() {
    document.getElementById('resetModal').classList.add('show');
}

function closeResetModal() {
    document.getElementById('resetModal').classList.remove('show');
}

function confirmReset() {
    if (!confirm('YAKIN ingin menghapus SEMUA data? Aksi ini TIDAK BISA dibatalkan!')) return;
    
    expenses = [];
    savings = [];
    budget = 0;
    localStorage.clear();
    
    render();
    closeResetModal();
    notify('✅ Semua data dihapus!', 'success');
}

function toggleFilter() {
    const panel = document.getElementById('filterPanel');
    panel.style.display = panel.style.display === 'none' ? 'grid' : 'none';
}

function applyFilter() {
    const period = document.getElementById('filterPeriod').value;
    const cat = document.getElementById('filterCategory').value;
    
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
    
    if (cat !== 'all') {
        filtered = filtered.filter(e => e.category === cat);
    }
    
    updateList(filtered);
}

function exportCSV() {
    if (!expenses.length) {
        notify('Belum ada data!', 'warning');
        return;
    }
    
    let csv = 'Tanggal,Waktu,Kategori,Keterangan,Jumlah\n';
    expenses.forEach(e => {
        const d = new Date(e.date);
        csv += `${d.toLocaleDateString('id-ID')},${d.toLocaleTimeString('id-ID')},${cats[e.category].name},"${e.note}",${e.amount}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `duitku_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    notify('✅ Di-export!', 'success');
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
