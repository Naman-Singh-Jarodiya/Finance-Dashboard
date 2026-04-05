 const STORAGE_KEY = 'zorvyn_finance_v2';
    const THEME_KEY = 'zorvyn_theme';
    const RANGE_KEY = 'zorvyn_range';

    const modalOverlay = document.getElementById('modalOverlay');
    const txBody = document.getElementById('txBody');
    const noData = document.getElementById('noData');
    const toastArea = document.getElementById('toastArea');
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastTitle = document.getElementById('toastTitle');
    const toastMsg = document.getElementById('toastMsg');
    const filterButtons = [...document.querySelectorAll('.filter-btn')];

    let chartLine = null;
    let chartPie = null;
    let currentRange = localStorage.getItem(RANGE_KEY) || '7';
    let currentSort = 'dateDesc';

    const sampleTransactions = [
      { id: crypto.randomUUID(), date: '2026-04-05', category: 'Food', note: 'Lunch with team', type: 'Expense', amount: 2000 },
      { id: crypto.randomUUID(), date: '2026-04-01', category: 'Freelance Project', note: 'Website redesign', type: 'Income', amount: 50000 },
      { id: crypto.randomUUID(), date: '2026-03-29', category: 'Transport', note: 'Monthly travel', type: 'Expense', amount: 1800 },
      { id: crypto.randomUUID(), date: '2026-03-25', category: 'Savings', note: 'Auto transfer', type: 'Income', amount: 12000 },
      { id: crypto.randomUUID(), date: '2026-03-22', category: 'Bills', note: 'Internet + electricity', type: 'Expense', amount: 3500 },
      { id: crypto.randomUUID(), date: '2026-03-18', category: 'Food', note: 'Groceries', type: 'Expense', amount: 2400 },
      { id: crypto.randomUUID(), date: '2026-03-10', category: 'Bonus', note: 'Performance bonus', type: 'Income', amount: 8000 },
      { id: crypto.randomUUID(), date: '2026-02-28', category: 'Entertainment', note: 'Movie night', type: 'Expense', amount: 900 }
    ];

    const budgetConfig = [
      { label: 'Food', limit: 6000, color: 'from-rose-500 to-pink-500' },
      { label: 'Transport', limit: 2500, color: 'from-amber-500 to-orange-500' },
      { label: 'Bills', limit: 5000, color: 'from-indigo-500 to-violet-500' },
      { label: 'Entertainment', limit: 2000, color: 'from-emerald-500 to-teal-500' }
    ];

    const initialState = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
      return sampleTransactions;
    };

    let transactions = initialState();

    function persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    }

    function formatCurrency(value) {
      return '₹' + Number(value || 0).toLocaleString('en-IN');
    }

    function formatDate(dateStr) {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }

    function normalizeDate(dateStr) {
      return new Date(dateStr + 'T00:00:00').getTime();
    }

    function getRangeDays() {
      return currentRange === 'all' ? Infinity : Number(currentRange);
    }

    function getFilteredTransactions() {
      let list = [...transactions];
      const days = getRangeDays();
      if (days !== Infinity) {
        const cutoff = new Date();
        cutoff.setHours(0,0,0,0);
        cutoff.setDate(cutoff.getDate() - (days - 1));
        list = list.filter(tx => normalizeDate(tx.date) >= cutoff.getTime());
      }
      return list;
    }

    function moneySummary(list) {
      const income = list.filter(t => t.type === 'Income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = list.filter(t => t.type === 'Expense').reduce((s, t) => s + Number(t.amount), 0);
      const balance = income - expense;
      const savingsRate = income > 0 ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;
      return { income, expense, balance, savingsRate };
    }

    function showToast(type, title, message) {
      toastArea.classList.remove('hidden');
      toastArea.classList.add('flex');
      toast.classList.remove('hidden');
      toastTitle.textContent = title;
      toastMsg.textContent = message;

      if (type === 'success') {
        toastIcon.className = 'icon-badge bg-emerald-100 text-emerald-600 text-xl';
        toastIcon.textContent = '✓';
      } else if (type === 'danger') {
        toastIcon.className = 'icon-badge bg-rose-100 text-rose-600 text-xl';
        toastIcon.textContent = '!';
      } else {
        toastIcon.className = 'icon-badge bg-indigo-100 text-indigo-600 text-xl';
        toastIcon.textContent = 'i';
      }

      clearTimeout(window.toastTimer);
      window.toastTimer = setTimeout(hideToast, 2200);
    }

    function hideToast() {
      toast.classList.add('hidden');
      toastArea.classList.add('hidden');
      toastArea.classList.remove('flex');
    }

    function toggleModal(forceOpen = null) {
      const open = forceOpen === null ? modalOverlay.classList.contains('hidden') : forceOpen;
      if (open) {
        modalOverlay.classList.remove('hidden');
        modalOverlay.classList.add('flex');
      } else {
        modalOverlay.classList.add('hidden');
        modalOverlay.classList.remove('flex');
        document.getElementById('transactionForm').reset();
        document.getElementById('editingId').value = '';
        document.getElementById('modalTitle').textContent = 'New Transaction';
        document.getElementById('dateInput').value = new Date().toISOString().slice(0,10);
      }
    }

    function openCreateModal() {
      document.getElementById('modalTitle').textContent = 'New Transaction';
      document.getElementById('transactionForm').reset();
      document.getElementById('editingId').value = '';
      document.getElementById('dateInput').value = new Date().toISOString().slice(0,10);
      toggleModal(true);
    }

    function openEditModal(id) {
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;
      document.getElementById('modalTitle').textContent = 'Edit Transaction';
      document.getElementById('editingId').value = tx.id;
      document.getElementById('catInput').value = tx.category;
      document.getElementById('amtInput').value = tx.amount;
      document.getElementById('typeInput').value = tx.type;
      document.getElementById('dateInput').value = tx.date;
      document.getElementById('noteInput').value = tx.note || '';
      toggleModal(true);
    }

    function saveTransaction() {
      const id = document.getElementById('editingId').value;
      const category = document.getElementById('catInput').value.trim();
      const amount = Number(document.getElementById('amtInput').value);
      const type = document.getElementById('typeInput').value;
      const date = document.getElementById('dateInput').value || new Date().toISOString().slice(0,10);
      const note = document.getElementById('noteInput').value.trim();

      if (!category || !amount || amount <= 0 || !date) {
        showToast('danger', 'Invalid entry', 'Please fill category, amount, and date.');
        return;
      }

      if (id) {
        const idx = transactions.findIndex(t => t.id === id);
        if (idx !== -1) transactions[idx] = { ...transactions[idx], category, amount, type, date, note };
        showToast('success', 'Transaction updated', 'Your changes were saved.');
      } else {
        transactions.unshift({ id: crypto.randomUUID(), category, amount, type, date, note });
        showToast('success', 'Transaction added', 'New entry saved successfully.');
      }

      persist();
      toggleModal(false);
      renderAll();
    }

    function deleteTransaction(id) {
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;
      const ok = confirm(`Delete ${tx.category} transaction?`);
      if (!ok) return;
      transactions = transactions.filter(t => t.id !== id);
      persist();
      showToast('success', 'Transaction deleted', 'The item was removed.');
      renderAll();
    }

    function updateRole() {
      const role = document.getElementById('roleSelect').value;
      const addBtn = document.getElementById('addBtn');
      const adminCells = document.querySelectorAll('.admin-cell');
      if (role === 'admin') {
        addBtn.classList.remove('hidden');
        adminCells.forEach(cell => cell.classList.remove('hidden'));
      } else {
        addBtn.classList.add('hidden');
        adminCells.forEach(cell => cell.classList.add('hidden'));
      }
    }

    function setRange(range) {
      currentRange = range;
      localStorage.setItem(RANGE_KEY, range);
      filterButtons.forEach(btn => {
        const active = btn.dataset.range === range;
        btn.className = active
          ? 'filter-btn px-4 py-2 rounded-full text-sm font-bold bg-indigo-600 text-white'
          : 'filter-btn px-4 py-2 rounded-full text-sm font-bold btn-soft text-slate-600 dark:text-slate-300';
      });
      renderAll();
    }

    function toggleTheme() {
      const html = document.documentElement;
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
      document.getElementById('themeBtn').textContent = next === 'dark' ? '☀ Theme' : '🌙 Theme';
      renderCharts();
    }

    function animateNumber(el, target, isPercent = false) {
      const start = 0;
      const duration = 700;
      const startTime = performance.now();
      function step(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const value = Math.round(start + (target - start) * progress);
        el.textContent = isPercent ? `${value}%` : formatCurrency(value);
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function renderSummary() {
      const filtered = getFilteredTransactions();
      const { income, expense, balance, savingsRate } = moneySummary(filtered);
      animateNumber(document.getElementById('balanceNum'), balance);
      animateNumber(document.getElementById('incomeNum'), income);
      animateNumber(document.getElementById('expenseNum'), expense);
      animateNumber(document.getElementById('savingsNum'), savingsRate, true);
      updateInsight(filtered, income, expense);
      renderBudgetList(filtered);
    }

    function updateInsight(list, income, expense) {
      const foodSpend = list.filter(t => t.type === 'Expense' && t.category.toLowerCase() === 'food').reduce((s, t) => s + t.amount, 0);
      const transportSpend = list.filter(t => t.type === 'Expense' && t.category.toLowerCase() === 'transport').reduce((s, t) => s + t.amount, 0);
      const pct = income > 0 ? Math.round((expense / income) * 100) : 0;
      const text = document.getElementById('insightText');
      if (foodSpend > transportSpend) {
        text.innerHTML = `Your <span class="font-bold text-indigo-700 dark:text-indigo-300">Food</span> spending is higher than Transport. Try setting a weekly cap.`;
      } else if (pct > 35) {
        text.innerHTML = `You have spent <span class="font-bold text-indigo-700 dark:text-indigo-300">${pct}%</span> of your income in the selected range. Consider saving more.`;
      } else {
        text.innerHTML = `Nice work — your spending looks balanced. Keep tracking goals and budgets.`;
      }
    }

    function renderBudgetList(list) {
      const box = document.getElementById('budgetList');
      box.innerHTML = '';

      budgetConfig.forEach(item => {
        const spent = list.filter(t => t.type === 'Expense' && t.category.toLowerCase() === item.label.toLowerCase()).reduce((s, t) => s + Number(t.amount), 0);
        const pct = Math.min(100, Math.round((spent / item.limit) * 100));
        const row = document.createElement('div');
        row.className = 'slide-up';
        row.innerHTML = `
          <div class="flex items-center justify-between mb-2 text-sm">
            <span class="font-bold text-slate-800 dark:text-slate-200">${item.label}</span>
            <span class="text-slate-500">${formatCurrency(spent)} / ${formatCurrency(item.limit)}</span>
          </div>
          <div class="h-3 rounded-full bg-slate-100 dark:bg-slate-900/60 overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r ${item.color}" style="width:${pct}%"></div>
          </div>
        `;
        box.appendChild(row);
      });
    }

    function getVisibleTransactions() {
      const filtered = getFilteredTransactions();
      const search = document.getElementById('searchInput').value.toLowerCase().trim();
      let list = filtered.filter(tx => {
        const hay = `${tx.category} ${tx.note || ''} ${tx.type} ${tx.amount} ${tx.date}`.toLowerCase();
        return hay.includes(search);
      });

      if (currentSort === 'dateDesc') list.sort((a, b) => normalizeDate(b.date) - normalizeDate(a.date));
      if (currentSort === 'amountDesc') list.sort((a, b) => Number(b.amount) - Number(a.amount));
      if (currentSort === 'amountAsc') list.sort((a, b) => Number(a.amount) - Number(b.amount));
      if (currentSort === 'dateAsc') list.sort((a, b) => normalizeDate(a.date) - normalizeDate(b.date));
      return list;
    }

    function renderTable() {
      const list = getVisibleTransactions();
      txBody.innerHTML = '';
      noData.classList.toggle('hidden', list.length > 0);

      list.forEach(tx => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition slide-up';
        const isIncome = tx.type === 'Income';
        row.innerHTML = `
          <td class="px-8 py-5 text-slate-400 text-xs">${formatDate(tx.date)}</td>
          <td class="px-8 py-5 font-semibold text-slate-900 dark:text-slate-100">${tx.category}</td>
          <td class="px-8 py-5 text-slate-500 dark:text-slate-300">${tx.note || '-'}</td>
          <td class="px-8 py-5">
            <span class="inline-flex items-center rounded-full ${isIncome ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'} px-3 py-1 text-[11px] font-bold uppercase">
              ${tx.type}
            </span>
          </td>
          <td class="px-8 py-5 text-right font-extrabold ${isIncome ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-900 dark:text-slate-50'}">${isIncome ? '+' : '-'}${formatCurrency(tx.amount)}</td>
          <td class="px-8 py-5 text-right admin-cell hidden">
            <div class="flex items-center justify-end gap-3 text-sm">
              <button onclick="openEditModal('${tx.id}')" class="text-indigo-600 hover:underline font-bold">Edit</button>
              <button onclick="deleteTransaction('${tx.id}')" class="text-rose-600 hover:underline font-bold">Delete</button>
            </div>
          </td>
        `;
        txBody.appendChild(row);
      });
    }

    function renderCharts() {
      const visible = getVisibleTransactions();
      const sorted = [...visible].sort((a, b) => normalizeDate(a.date) - normalizeDate(b.date));

      const labels = sorted.map(tx => tx.date.slice(5));
      const cumulative = [];
      let running = 0;
      sorted.forEach(tx => {
        running += tx.type === 'Income' ? Number(tx.amount) : -Number(tx.amount);
        cumulative.push(running);
      });

      const categoryMap = {};
      visible.filter(tx => tx.type === 'Expense').forEach(tx => {
        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + Number(tx.amount);
      });
      const pieLabels = Object.keys(categoryMap).length ? Object.keys(categoryMap) : ['No Data'];
      const pieValues = Object.keys(categoryMap).length ? Object.values(categoryMap) : [1];
      const pieColors = ['#f43f5e', '#f59e0b', '#10b981', '#6366f1', '#14b8a6', '#ec4899'];

      if (chartLine) chartLine.destroy();
      if (chartPie) chartPie.destroy();

      chartLine = new Chart(document.getElementById('lineChart'), {
        type: 'line',
        data: {
          labels: labels.length ? labels : ['No Data'],
          datasets: [{
            label: 'Balance',
            data: cumulative.length ? cumulative : [0],
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.10)',
            borderWidth: 3,
            tension: 0.42,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#4f46e5',
            pointBorderWidth: 3,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              titleColor: '#fff',
              bodyColor: '#fff',
              padding: 12,
              displayColors: false
            }
          },
          scales: {
            x: { grid: { color: 'rgba(148, 163, 184, 0.14)' }, ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted') } },
            y: { grid: { color: 'rgba(148, 163, 184, 0.14)' }, ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted') } }
          }
        }
      });

      chartPie = new Chart(document.getElementById('pieChart'), {
        type: 'doughnut',
        data: {
          labels: pieLabels,
          datasets: [{
            data: pieValues,
            backgroundColor: pieLabels[0] === 'No Data' ? ['#cbd5e1'] : pieColors,
            borderWidth: 0,
            hoverOffset: 8,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '76%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 18,
                color: getComputedStyle(document.documentElement).getPropertyValue('--muted')
              }
            }
          }
        }
      });
    }

    function renderAll() {
      renderSummary();
      renderTable();
      renderCharts();
      updateRole();
    }

    function resetFilters() {
      document.getElementById('searchInput').value = '';
      currentSort = 'dateDesc';
      setRange('7');
      showToast('info', 'Filters reset', 'Back to default view.');
    }

    function sortByDate() {
      currentSort = currentSort === 'dateDesc' ? 'dateAsc' : 'dateDesc';
      renderTable();
      showToast('info', 'Sorted', currentSort === 'dateDesc' ? 'Newest transactions first.' : 'Oldest transactions first.');
    }

    function sortByAmount() {
      currentSort = currentSort === 'amountDesc' ? 'amountAsc' : 'amountDesc';
      renderTable();
      showToast('info', 'Sorted', currentSort === 'amountDesc' ? 'Highest amount first.' : 'Lowest amount first.');
    }

    function exportCSV() {
      const list = getVisibleTransactions();
      const rows = [['Date','Category','Note','Type','Amount']];
      list.forEach(tx => rows.push([tx.date, tx.category, tx.note || '', tx.type, tx.amount]));
      const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'zorvyn-transactions.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('success', 'CSV exported', 'Downloaded current transaction list.');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') toggleModal(false);
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => setRange(btn.dataset.range));
    });

    // Initial setup
    (function init() {
      const theme = localStorage.getItem(THEME_KEY) || 'light';
      document.documentElement.setAttribute('data-theme', theme);
      document.getElementById('themeBtn').textContent = theme === 'dark' ? '☀ Theme' : '🌙 Theme';
      document.getElementById('dateInput').value = new Date().toISOString().slice(0,10);
      setRange(currentRange);
      updateRole();
      renderAll();
    })();
    
 
async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // 🎨 Title
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text("Finance Report", 20, 20);

  // 🟦 Header background
  doc.setFillColor(99, 102, 241); // Indigo
  doc.rect(20, 30, 170, 10, "F");

  // ⚪ Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text("Date", 22, 37);
  doc.text("Category", 55, 37);
  doc.text("Type", 115, 37);
  doc.text("Amount", 155, 37);

  let y = 50;

  transactions.forEach((tx, index) => {
    // 🎨 Alternate row color
    if (index % 2 === 0) {
      doc.setFillColor(240, 240, 255);
      doc.rect(20, y - 5, 170, 10, "F");
    }

    doc.setTextColor(0, 0, 0);

    doc.text(tx.date, 22, y);
    doc.text(tx.category, 55, y);

    // 🟢 Income / 🔴 Expense color
    if (tx.type === "income") {
      doc.setTextColor(34, 197, 94); // green
    } else {
      doc.setTextColor(239, 68, 68); // red
    }

    doc.text(tx.type, 115, y);

    // 🔁 reset color for amount
    doc.setTextColor(0, 0, 0);

    let cleanAmount = String(tx.amount).replace(/[^0-9.-]/g, "");

    doc.text(
      "Rs. " + Number(cleanAmount || 0).toLocaleString("en-IN"),
      155,
      y
    );

    y += 12;

    // 📄 new page
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save("finance-report.pdf");
}