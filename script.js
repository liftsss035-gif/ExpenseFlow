// ============================================
// EXPENSEFLOW - COMPLETE SCRIPT
// Live Render Backend Connected
// ============================================

const API_URL = "https://expenseflow-bvdn.onrender.com";

let transactions = [];
let budgets = [];
let charts = {};

// ============================================
// DOM READY
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setupForms();
    setupFilters();
    setupSettings();
    setupProfile();
    setupMobileMenu();

    loadTransactions();
    loadBudgets();

    setDefaultDates();
    updateDateTime();

    setInterval(updateDateTime, 60000);
});


// ============================================
// NAVIGATION
// ============================================

function setupNavigation() {
    const navItems = document.querySelectorAll("[data-section]");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const section = item.dataset.section;
            showSection(section);

            document.querySelectorAll("[data-section]").forEach(nav => {
                nav.classList.remove("active");
            });

            item.classList.add("active");

            closeMobileMenu();
        });
    });
}

function showSection(sectionName) {
    document.querySelectorAll(".page-section").forEach(section => {
        section.classList.remove("active");
    });

    const selected = document.getElementById(sectionName);

    if (selected) {
        selected.classList.add("active");
    }

    document.querySelectorAll(".page-title").forEach(title => {
        title.style.display = "none";
    });

    const title = document.getElementById(`${sectionName}-title`);

    if (title) {
        title.style.display = "block";
    }

    if (sectionName === "analytics") {
        setTimeout(() => {
            createCharts();
        }, 100);
    }

    if (sectionName === "dashboard") {
        updateDashboard();
    }
}


// ============================================
// MOBILE MENU
// ============================================

function setupMobileMenu() {
    const menuButton = document.getElementById("menuBtn");
    const sidebar = document.querySelector(".sidebar");

    if (menuButton && sidebar) {
        menuButton.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });
    }
}

function closeMobileMenu() {
    const sidebar = document.querySelector(".sidebar");

    if (sidebar) {
        sidebar.classList.remove("open");
    }
}


// ============================================
// LOAD TRANSACTIONS
// ============================================

async function loadTransactions() {
    try {
        const response = await fetch(`${API_URL}/api/transactions`);

        if (!response.ok) {
            throw new Error("Unable to load transactions");
        }

        transactions = await response.json();

        updateDashboard();
        renderTransactions();
        updateCategories();
        createCharts();

    } catch (error) {
        console.error(error);

        showToast(
            "Backend is waking up. Please wait a few seconds and refresh.",
            "error"
        );
    }
}


// ============================================
// ADD TRANSACTION
// ============================================

async function addTransaction(type) {
    const amountInput = document.getElementById(
        type === "expense" ? "expenseAmount" : "incomeAmount"
    );

    const categoryInput = document.getElementById(
        type === "expense" ? "expenseCategory" : "incomeCategory"
    );

    const descriptionInput = document.getElementById(
        type === "expense" ? "expenseDescription" : "incomeDescription"
    );

    const dateInput = document.getElementById(
        type === "expense" ? "expenseDate" : "incomeDate"
    );

    const paymentInput = document.getElementById(
        type === "expense" ? "expensePayment" : "incomePayment"
    );

    if (!amountInput || !categoryInput || !dateInput) {
        return;
    }

    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value.trim();
    const description = descriptionInput
        ? descriptionInput.value.trim()
        : "";

    const date = dateInput.value;

    const paymentMethod = paymentInput
        ? paymentInput.value
        : "Cash";

    if (!amount || amount <= 0) {
        showToast("Please enter a valid amount.", "error");
        return;
    }

    if (!category) {
        showToast("Please enter a category.", "error");
        return;
    }

    if (!date) {
        showToast("Please select a date.", "error");
        return;
    }

    const data = {
        transaction_type: type,
        amount: amount,
        category: category,
        description: description,
        date: date,
        payment_method: paymentMethod
    };

    try {
        const response = await fetch(`${API_URL}/api/transactions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error("Transaction could not be added");
        }

        showToast(
            type === "expense"
                ? "Expense added successfully!"
                : "Income added successfully!",
            "success"
        );

        if (amountInput) amountInput.value = "";
        if (categoryInput) categoryInput.value = "";
        if (descriptionInput) descriptionInput.value = "";

        await loadTransactions();

    } catch (error) {
        console.error(error);

        showToast(
            "Failed to connect to the backend.",
            "error"
        );
    }
}


// ============================================
// FORM SETUP
// ============================================

function setupForms() {
    const expenseForm = document.getElementById("expenseForm");

    if (expenseForm) {
        expenseForm.addEventListener("submit", event => {
            event.preventDefault();
            addTransaction("expense");
        });
    }

    const incomeForm = document.getElementById("incomeForm");

    if (incomeForm) {
        incomeForm.addEventListener("submit", event => {
            event.preventDefault();
            addTransaction("income");
        });
    }

    const budgetForm = document.getElementById("budgetForm");

    if (budgetForm) {
        budgetForm.addEventListener("submit", event => {
            event.preventDefault();
            addBudget();
        });
    }
}


// ============================================
// DELETE TRANSACTION
// ============================================

async function deleteTransaction(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this transaction?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/api/transactions/${id}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error("Delete failed");
        }

        showToast(
            "Transaction deleted successfully.",
            "success"
        );

        await loadTransactions();

    } catch (error) {
        console.error(error);

        showToast(
            "Could not delete transaction.",
            "error"
        );
    }
}


// ============================================
// RENDER TRANSACTIONS
// ============================================

function renderTransactions(list = transactions) {
    const container =
        document.getElementById("transactionsList");

    if (!container) {
        return;
    }

    if (!list.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💰</div>
                <h3>No transactions found</h3>
                <p>Add your first income or expense.</p>
            </div>
        `;

        return;
    }

    container.innerHTML = list.map(transaction => {

        const isIncome =
            transaction.transaction_type === "income";

        const amount = Number(transaction.amount);

        return `
            <div class="transaction-row">

                <div class="transaction-icon ${
                    isIncome ? "income" : "expense"
                }">
                    ${isIncome ? "↓" : "↑"}
                </div>

                <div class="transaction-info">
                    <strong>
                        ${escapeHTML(transaction.category)}
                    </strong>

                    <span>
                        ${escapeHTML(
                            transaction.description || "No description"
                        )}
                    </span>

                    <small>
                        ${formatDate(transaction.date)}
                        ${
                            transaction.payment_method
                                ? " • " +
                                  escapeHTML(
                                      transaction.payment_method
                                  )
                                : ""
                        }
                    </small>
                </div>

                <div class="transaction-amount ${
                    isIncome ? "income-text" : "expense-text"
                }">
                    ${isIncome ? "+" : "-"}${formatCurrency(amount)}
                </div>

                <button
                    class="delete-btn"
                    onclick="deleteTransaction(${transaction.id})"
                    title="Delete"
                >
                    🗑
                </button>

            </div>
        `;
    }).join("");
}


// ============================================
// DASHBOARD
// ============================================

function updateDashboard() {
    const income = transactions
        .filter(t => t.transaction_type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = transactions
        .filter(t => t.transaction_type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = income - expense;

    updateElement("totalIncome", formatCurrency(income));
    updateElement("totalExpense", formatCurrency(expense));
    updateElement("totalBalance", formatCurrency(balance));
    updateElement(
        "transactionCount",
        transactions.length
    );

    const recent = [...transactions]
        .sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        )
        .slice(0, 5);

    renderRecentTransactions(recent);
}

function renderRecentTransactions(list) {
    const container =
        document.getElementById("recentTransactions");

    if (!container) {
        return;
    }

    if (!list.length) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No recent transactions.</p>
            </div>
        `;

        return;
    }

    container.innerHTML = list.map(t => {

        const isIncome =
            t.transaction_type === "income";

        return `
            <div class="recent-item">

                <div class="recent-left">

                    <div class="recent-icon ${
                        isIncome ? "income" : "expense"
                    }">
                        ${isIncome ? "↓" : "↑"}
                    </div>

                    <div>
                        <strong>
                            ${escapeHTML(t.category)}
                        </strong>

                        <small>
                            ${formatDate(t.date)}
                        </small>
                    </div>

                </div>

                <strong class="${
                    isIncome
                        ? "income-text"
                        : "expense-text"
                }">
                    ${isIncome ? "+" : "-"}${formatCurrency(
                        Number(t.amount)
                    )}
                </strong>

            </div>
        `;
    }).join("");
}


// ============================================
// SEARCH + FILTER
// ============================================

function setupFilters() {
    const search =
        document.getElementById("searchInput");

    const type =
        document.getElementById("typeFilter");

    const category =
        document.getElementById("categoryFilter");

    const date =
        document.getElementById("dateFilter");

    [search, type, category, date].forEach(element => {

        if (element) {
            element.addEventListener(
                "input",
                filterTransactions
            );

            element.addEventListener(
                "change",
                filterTransactions
            );
        }

    });
}

function filterTransactions() {

    const search =
        document.getElementById("searchInput")
            ?.value
            .toLowerCase() || "";

    const type =
        document.getElementById("typeFilter")
            ?.value || "all";

    const category =
        document.getElementById("categoryFilter")
            ?.value || "all";

    const date =
        document.getElementById("dateFilter")
            ?.value || "";

    const filtered = transactions.filter(t => {

        const matchesSearch =
            String(t.category)
                .toLowerCase()
                .includes(search) ||

            String(t.description || "")
                .toLowerCase()
                .includes(search);

        const matchesType =
            type === "all" ||
            t.transaction_type === type;

        const matchesCategory =
            category === "all" ||
            t.category === category;

        const matchesDate =
            !date ||
            t.date === date;

        return (
            matchesSearch &&
            matchesType &&
            matchesCategory &&
            matchesDate
        );
    });

    renderTransactions(filtered);
}


// ============================================
// CATEGORY DROPDOWN
// ============================================

function updateCategories() {

    const select =
        document.getElementById("categoryFilter");

    if (!select) {
        return;
    }

    const categories = [
        ...new Set(
            transactions
                .map(t => t.category)
                .filter(Boolean)
        )
    ].sort();

    select.innerHTML = `
        <option value="all">All Categories</option>
        ${categories.map(category => `
            <option value="${escapeHTML(category)}">
                ${escapeHTML(category)}
            </option>
        `).join("")}
    `;
}


// ============================================
// ANALYTICS
// ============================================

function createCharts() {

    if (typeof Chart === "undefined") {
        return;
    }

    createExpenseChart();
    createCategoryChart();
    createMonthlyChart();
}

function createExpenseChart() {

    const canvas =
        document.getElementById("expenseChart");

    if (!canvas) {
        return;
    }

    if (charts.expense) {
        charts.expense.destroy();
    }

    const income = transactions
        .filter(t => t.transaction_type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = transactions
        .filter(t => t.transaction_type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    charts.expense = new Chart(canvas, {
        type: "doughnut",

        data: {
            labels: ["Income", "Expense"],

            datasets: [{
                data: [income, expense],

                backgroundColor: [
                    "#22c55e",
                    "#ef4444"
                ],

                borderWidth: 0
            }]
        },

        options: {
            responsive: true,

            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}


function createCategoryChart() {

    const canvas =
        document.getElementById("categoryChart");

    if (!canvas) {
        return;
    }

    if (charts.category) {
        charts.category.destroy();
    }

    const categoryData = {};

    transactions
        .filter(t =>
            t.transaction_type === "expense"
        )
        .forEach(t => {

            const category = t.category;

            categoryData[category] =
                (categoryData[category] || 0) +
                Number(t.amount);
        });

    const labels = Object.keys(categoryData);

    const values = Object.values(categoryData);

    charts.category = new Chart(canvas, {

        type: "bar",

        data: {
            labels,

            datasets: [{
                label: "Expenses",

                data: values,

                backgroundColor: "#6366f1",

                borderRadius: 8
            }]
        },

        options: {
            responsive: true,

            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}


function createMonthlyChart() {

    const canvas =
        document.getElementById("monthlyChart");

    if (!canvas) {
        return;
    }

    if (charts.monthly) {
        charts.monthly.destroy();
    }

    const monthly = {};

    transactions.forEach(t => {

        const month =
            String(t.date).slice(0, 7);

        if (!monthly[month]) {
            monthly[month] = {
                income: 0,
                expense: 0
            };
        }

        if (t.transaction_type === "income") {
            monthly[month].income +=
                Number(t.amount);
        } else {
            monthly[month].expense +=
                Number(t.amount);
        }
    });

    const labels =
        Object.keys(monthly).sort();

    charts.monthly = new Chart(canvas, {

        type: "line",

        data: {
            labels,

            datasets: [

                {
                    label: "Income",

                    data: labels.map(
                        month => monthly[month].income
                    ),

                    borderColor: "#22c55e",

                    backgroundColor:
                        "rgba(34,197,94,0.12)",

                    fill: true,

                    tension: 0.35
                },

                {
                    label: "Expense",

                    data: labels.map(
                        month => monthly[month].expense
                    ),

                    borderColor: "#ef4444",

                    backgroundColor:
                        "rgba(239,68,68,0.12)",

                    fill: true,

                    tension: 0.35
                }
            ]
        },

        options: {
            responsive: true,

            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}


// ============================================
// BUDGETS
// ============================================

async function loadBudgets() {

    try {

        const response =
            await fetch(`${API_URL}/api/budgets`);

        if (!response.ok) {
            throw new Error("Budget loading failed");
        }

        budgets = await response.json();

        renderBudgets();

    } catch (error) {

        console.error(error);

    }
}


async function addBudget() {

    const category =
        document.getElementById("budgetCategory")
            ?.value
            .trim();

    const amount =
        parseFloat(
            document.getElementById("budgetAmount")
                ?.value
        );

    const month =
        document.getElementById("budgetMonth")
            ?.value;

    if (!category || !amount || !month) {

        showToast(
            "Please fill all budget fields.",
            "error"
        );

        return;
    }

    try {

        const response =
            await fetch(`${API_URL}/api/budgets`, {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    category,
                    amount,
                    month
                })
            });

        if (!response.ok) {
            throw new Error("Budget failed");
        }

        showToast(
            "Budget added successfully!",
            "success"
        );

        document.getElementById(
            "budgetCategory"
        ).value = "";

        document.getElementById(
            "budgetAmount"
        ).value = "";

        await loadBudgets();

    } catch (error) {

        console.error(error);

        showToast(
            "Could not add budget.",
            "error"
        );
    }
}


async function deleteBudget(id) {

    if (!confirm("Delete this budget?")) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/api/budgets/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (!response.ok) {
            throw new Error("Delete failed");
        }

        await loadBudgets();

        showToast(
            "Budget deleted.",
            "success"
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Could not delete budget.",
            "error"
        );
    }
}


function renderBudgets() {

    const container =
        document.getElementById("budgetList");

    if (!container) {
        return;
    }

    if (!budgets.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <h3>No budgets yet</h3>
                <p>Create a budget to track your spending.</p>
            </div>
        `;

        return;
    }

    container.innerHTML = budgets.map(budget => {

        const spent =
            transactions
                .filter(t =>
                    t.transaction_type === "expense" &&
                    t.category === budget.category &&
                    String(t.date).startsWith(
                        String(budget.month)
                    )
                )
                .reduce(
                    (sum, t) =>
                        sum + Number(t.amount),
                    0
                );

        const limit =
            Number(budget.amount);

        const percentage =
            limit > 0
                ? Math.min(
                    (spent / limit) * 100,
                    100
                )
                : 0;

        return `
            <div class="budget-card">

                <div class="budget-top">

                    <div>
                        <strong>
                            ${escapeHTML(
                                budget.category
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(
                                budget.month
                            )}
                        </small>
                    </div>

                    <button
                        class="delete-btn"
                        onclick="deleteBudget(${budget.id})"
                    >
                        🗑
                    </button>

                </div>

                <div class="budget-numbers">

                    <span>
                        ${formatCurrency(spent)}
                    </span>

                    <span>
                        ${formatCurrency(limit)}
                    </span>

                </div>

                <div class="progress">

                    <div
                        class="progress-bar"
                        style="width:${percentage}%"
                    ></div>

                </div>

                <small>
                    ${Math.round(percentage)}% used
                </small>

            </div>
        `;
    }).join("");
}


// ============================================
// PROFILE
// ============================================

function setupProfile() {

    const savedName =
        localStorage.getItem("expenseflow_name");

    const savedEmail =
        localStorage.getItem("expenseflow_email");

    const nameInput =
        document.getElementById("profileName");

    const emailInput =
        document.getElementById("profileEmail");

    if (nameInput && savedName) {
        nameInput.value = savedName;
    }

    if (emailInput && savedEmail) {
        emailInput.value = savedEmail;
    }

    const profileForm =
        document.getElementById("profileForm");

    if (profileForm) {

        profileForm.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                const name =
                    nameInput?.value.trim() || "";

                const email =
                    emailInput?.value.trim() || "";

                localStorage.setItem(
                    "expenseflow_name",
                    name
                );

                localStorage.setItem(
                    "expenseflow_email",
                    email
                );

                updateProfileDisplay();

                showToast(
                    "Profile saved successfully!",
                    "success"
                );
            }
        );
    }

    updateProfileDisplay();
}


function updateProfileDisplay() {

    const name =
        localStorage.getItem(
            "expenseflow_name"
        ) || "User";

    document
        .querySelectorAll("[data-profile-name]")
        .forEach(element => {
            element.textContent = name;
        });
}


// ============================================
// SETTINGS / DARK MODE
// ============================================

function setupSettings() {

    const savedTheme =
        localStorage.getItem(
            "expenseflow_theme"
        );

    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
    }

    const themeToggle =
        document.getElementById("themeToggle");

    if (themeToggle) {

        themeToggle.checked =
            savedTheme === "dark";

        themeToggle.addEventListener(
            "change",
            () => {

                if (themeToggle.checked) {

                    document.body.classList.add(
                        "dark-mode"
                    );

                    localStorage.setItem(
                        "expenseflow_theme",
                        "dark"
                    );

                } else {

                    document.body.classList.remove(
                        "dark-mode"
                    );

                    localStorage.setItem(
                        "expenseflow_theme",
                        "light"
                    );
                }
            }
        );
    }
}


// ============================================
// DEFAULT DATES
// ============================================

function setDefaultDates() {

    const today =
        new Date()
            .toISOString()
            .split("T")[0];

    const expenseDate =
        document.getElementById("expenseDate");

    const incomeDate =
        document.getElementById("incomeDate");

    if (expenseDate) {
        expenseDate.value = today;
    }

    if (incomeDate) {
        incomeDate.value = today;
    }
}


// ============================================
// DATE / TIME
// ============================================

function updateDateTime() {

    const element =
        document.getElementById("currentDate");

    if (!element) {
        return;
    }

    const now = new Date();

    element.textContent =
        now.toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );
}


// ============================================
// TOAST
// ============================================

function showToast(message, type = "success") {

    let container =
        document.getElementById("toastContainer");

    if (!container) {

        container =
            document.createElement("div");

        container.id =
            "toastContainer";

        document.body.appendChild(container);
    }

    const toast =
        document.createElement("div");

    toast.className =
        `toast ${type}`;

    toast.textContent =
        message;

    container.appendChild(toast);

    setTimeout(() => {

        toast.classList.add("show");

    }, 10);

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {
            toast.remove();
        }, 300);

    }, 3000);
}


// ============================================
// HELPERS
// ============================================

function formatCurrency(amount) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }
    ).format(Number(amount) || 0);
}


function formatDate(date) {

    if (!date) {
        return "";
    }

    const parsed =
        new Date(date);

    if (isNaN(parsed)) {
        return date;
    }

    return parsed.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function updateElement(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================
// LOGOUT
// ============================================

function logout() {

    const confirmed =
        confirm("Are you sure you want to logout?");

    if (!confirmed) {
        return;
    }

    window.location.href =
        "index.html";
}


// ============================================
// GLOBAL FUNCTIONS
// ============================================

window.addTransaction = addTransaction;
window.deleteTransaction = deleteTransaction;
window.addBudget = addBudget;
window.deleteBudget = deleteBudget;
window.showSection = showSection;
window.logout = logout;
window.filterTransactions = filterTransactions;