// ============================================================
// Expense & Budget Visualizer — app.js
// ============================================================

// ===== Constants =====
const STORAGE_KEY = "expense_visualizer_data";

const DEFAULT_CATEGORIES = ["Food", "Transport", "Utilities", "Entertainment", "Health", "Other"];

// ===== AppState =====
// Central in-memory state for the application.
// Shape mirrors the design doc AppState definition.
let AppState = {
  expenses: [],    // Expense[]
  budgets: [],     // Budget[]
  categories: [],  // string[]
  activePeriod: "", // "YYYY-MM"
  settings: {
    theme: "light", // "light" | "dark"
    sortBy: "date", // "date" | "amount" | "category"
    sortDirection: "desc" // "asc" | "desc"
  }
};

// ===== Helpers =====

/**
 * Returns the current calendar month as a "YYYY-MM" string.
 * @returns {string}
 */
function currentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Shows the warning banner with the given message.
 * @param {string} message
 */
function showWarningBanner(message) {
  const banner = document.getElementById("warning-banner");
  const msg = document.getElementById("warning-message");
  if (banner && msg) {
    msg.textContent = message;
    banner.classList.remove("hidden");
  }
}

/**
 * Hides the warning banner.
 */
function hideWarningBanner() {
  const banner = document.getElementById("warning-banner");
  if (banner) {
    banner.classList.add("hidden");
  }
}

// ===== Storage Layer =====

/**
 * Reads and parses state from Local Storage.
 * On any error (unavailable storage, malformed JSON), initializes with
 * empty default state and shows a non-blocking warning banner.
 *
 * Requirements: 7.2, 7.3
 *
 * @returns {{ expenses: any[], budgets: any[], categories: string[], activePeriod: string }}
 */
function loadState() {
  const defaultState = {
    expenses: [],
    budgets: [],
    categories: [...DEFAULT_CATEGORIES],
    activePeriod: currentPeriod(),
    settings: {
      theme: "light",
      sortBy: "date",
      sortDirection: "desc"
    }
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw === null) {
      // No saved data yet — first run, use defaults silently
      return defaultState;
    }

    const parsed = JSON.parse(raw);

    // Basic shape validation — fall back to defaults for missing keys
    const state = {
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
      categories: Array.isArray(parsed.categories) && parsed.categories.length > 0
        ? parsed.categories
        : [...DEFAULT_CATEGORIES],
      activePeriod: typeof parsed.activePeriod === "string" && parsed.activePeriod
        ? parsed.activePeriod
        : currentPeriod(),
      settings: {
        theme: (parsed.settings && typeof parsed.settings.theme === "string" && 
                (parsed.settings.theme === "light" || parsed.settings.theme === "dark"))
               ? parsed.settings.theme
               : "light",
        sortBy: (parsed.settings && typeof parsed.settings.sortBy === "string" &&
                 ["date", "amount", "category"].includes(parsed.settings.sortBy))
                ? parsed.settings.sortBy
                : "date",
        sortDirection: (parsed.settings && typeof parsed.settings.sortDirection === "string" &&
                        ["asc", "desc"].includes(parsed.settings.sortDirection))
                       ? parsed.settings.sortDirection
                       : "desc"
      }
    };

    return state;

  } catch (err) {
    // localStorage unavailable (SecurityError) or JSON.parse failed (SyntaxError)
    const isParseError = err instanceof SyntaxError;
    const message = isParseError
      ? "Saved data could not be read (malformed JSON). Starting with empty data."
      : "Local Storage is unavailable. Data will not be saved this session.";

    // Defer banner display until DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => showWarningBanner(message));
    } else {
      showWarningBanner(message);
    }

    return defaultState;
  }
}

/**
 * Serializes the current AppState to JSON and writes it to Local Storage.
 * Catches and silently handles write errors (e.g. quota exceeded).
 *
 * Requirements: 7.1
 */
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState));
  } catch (err) {
    showWarningBanner("Could not save data: Local Storage write failed. Changes may not persist.");
  }
}

// ===== Theme Management =====

/**
 * Applies the specified theme by adding/removing CSS classes on document root.
 * Requirements: 10.2
 * @param {string} theme - "light" or "dark"
 */
function applyTheme(theme) {
  const root = document.documentElement;
  
  if (theme === "dark") {
    root.classList.add("dark-theme");
  } else {
    root.classList.remove("dark-theme");
  }
}

/**
 * Toggles between light and dark themes.
 * Requirements: 10.1, 10.2, 10.3
 */
function toggleTheme() {
  const newTheme = AppState.settings.theme === "light" ? "dark" : "light";
  AppState.settings.theme = newTheme;
  applyTheme(newTheme);
  saveState();
  
  // Re-render charts to apply theme-appropriate colors
  renderPieChart();
  renderBarChart();
}

// ===== Initialization =====

/**
 * Bootstraps the application:
 * 1. Loads persisted state (or defaults) from Local Storage
 * 2. Sets activePeriod to current month if not already set
 * 3. Wires up the warning banner dismiss button
 */
function initApp() {
  const loaded = loadState();

  AppState.expenses = loaded.expenses;
  AppState.budgets = loaded.budgets;
  AppState.categories = loaded.categories;
  AppState.activePeriod = loaded.activePeriod || currentPeriod();
  AppState.settings = loaded.settings;

  // Apply saved theme
  applyTheme(AppState.settings.theme);

  // Wire dismiss button for warning banner
  const closeBtn = document.getElementById("warning-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", hideWarningBanner);
  }

  // Render the period label on first load
  renderPeriodLabel();

  // Wire period navigation buttons
  const prevBtn = document.getElementById("prev-period");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => navigatePeriod("prev"));
  }

  const nextBtn = document.getElementById("next-period");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => navigatePeriod("next"));
  }

  // Wire theme toggle button
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  // Populate category selects from loaded state
  populateCategorySelects();

  // Wire category filter change to re-render expense list
  const categoryFilter = document.getElementById("category-filter");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", renderExpenseList);
  }

  // Wire sorting controls
  const sortBySelect = document.getElementById("sort-by");
  if (sortBySelect) {
    sortBySelect.addEventListener("change", (e) => {
      updateSortSettings(e.target.value, null);
      renderExpenseList();
    });
  }

  const sortDirectionBtn = document.getElementById("sort-direction");
  if (sortDirectionBtn) {
    sortDirectionBtn.addEventListener("click", () => {
      const newDirection = AppState.settings.sortDirection === "asc" ? "desc" : "asc";
      updateSortSettings(null, newDirection);
      renderSortControls();
      renderExpenseList();
    });
  }

  // Render form in default "add" mode
  renderExpenseForm();

  // Wire expense form submit handler
  const expenseForm = document.getElementById("expense-form");
  if (expenseForm) {
    expenseForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const editIdVal = document.getElementById("edit-id").value.trim();
      const amount = document.getElementById("expense-amount").value;
      const category = document.getElementById("expense-category").value;
      const date = document.getElementById("expense-date").value;
      const description = document.getElementById("expense-description").value.trim();

      let result;
      if (editIdVal) {
        result = editExpense(editIdVal, { amount, category, date, description });
      } else {
        result = addExpense(amount, category, date, description);
      }

      if (!result.success) {
        // Show inline validation errors
        const errorMsg = result.error || "";

        const amountError = document.getElementById("amount-error");
        const categoryError = document.getElementById("category-error");
        const dateError = document.getElementById("date-error");
        const amountInput = document.getElementById("expense-amount");
        const categoryInput = document.getElementById("expense-category");
        const dateInput = document.getElementById("expense-date");

        // Clear previous errors first
        [amountError, categoryError, dateError].forEach((el) => { if (el) el.textContent = ""; });
        [amountInput, categoryInput, dateInput].forEach((el) => { if (el) el.classList.remove("invalid"); });

        if (errorMsg.toLowerCase().includes("amount")) {
          if (amountError) amountError.textContent = errorMsg;
          if (amountInput) amountInput.classList.add("invalid");
        } else if (errorMsg.toLowerCase().includes("category")) {
          if (categoryError) categoryError.textContent = errorMsg;
          if (categoryInput) categoryInput.classList.add("invalid");
        } else if (errorMsg.toLowerCase().includes("date")) {
          if (dateError) dateError.textContent = errorMsg;
          if (dateInput) dateInput.classList.add("invalid");
        }
      } else {
        renderExpenseForm();
        renderAll();
      }
    });
  }

  // Wire cancel button to reset form
  const cancelBtn = document.getElementById("form-cancel-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      renderExpenseForm();
    });
  }



  // Wire category management UI
  const addCategoryBtn = document.getElementById("add-category-btn");
  const newCategoryInput = document.getElementById("new-category-input");
  
  const handleAddCategory = () => {
    const errorEl = document.getElementById("category-add-error");
    const name = newCategoryInput ? newCategoryInput.value : "";
    const result = addCategory(name);
    if (!result.success) {
      if (errorEl) errorEl.textContent = result.error || "Could not add category";
      if (newCategoryInput) newCategoryInput.classList.add("invalid");
    } else {
      if (errorEl) errorEl.textContent = "";
      if (newCategoryInput) {
        newCategoryInput.value = "";
        newCategoryInput.classList.remove("invalid");
      }
      // Re-render all components to ensure category selectors are updated
      renderAll();
    }
  };

  if (addCategoryBtn) {
    addCategoryBtn.addEventListener("click", handleAddCategory);
  }

  // Allow Enter key to add category
  if (newCategoryInput) {
    newCategoryInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddCategory();
      }
    });

    // Clear error when user starts typing
    newCategoryInput.addEventListener("input", () => {
      const errorEl = document.getElementById("category-add-error");
      if (errorEl) errorEl.textContent = "";
      newCategoryInput.classList.remove("invalid");
    });
  }

  // Wire budget form
  const budgetForm = document.getElementById("budget-form");
  if (budgetForm) {
    budgetForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const category = document.getElementById("budget-category").value;
      const amount = document.getElementById("budget-amount").value;
      const errorEl = document.getElementById("budget-amount-error");
      const result = setBudget(category, AppState.activePeriod, amount);
      if (!result.success) {
        if (errorEl) errorEl.textContent = result.error || "Invalid budget";
      } else {
        if (errorEl) errorEl.textContent = "";
        budgetForm.reset();
        renderAll();
      }
    });
  }

  // Initial render of all UI components
  renderAll();
}

// ===== Category Management =====

/**
 * Adds a new custom category to AppState if it doesn't already exist (case-insensitive).
 * Validates uniqueness against all existing categories including default ones.
 *
 * Requirements: 9.1, 9.2, 9.3
 *
 * @param {string} name - The category name to add.
 * @returns {{ success: boolean, error?: string }}
 */
function addCategory(name) {
  const trimmed = (name || "").trim();

  if (!trimmed) {
    return { success: false, error: "Category name cannot be empty" };
  }

  const lowerTrimmed = trimmed.toLowerCase();
  const duplicate = AppState.categories.some(
    (c) => c.toLowerCase() === lowerTrimmed
  );

  if (duplicate) {
    return { success: false, error: "Category name already exists (case-insensitive)" };
  }

  AppState.categories.push(trimmed);
  saveState();
  return { success: true };
}

/**
 * Deletes a custom category from AppState if no expenses or budgets reference it.
 * Prevents deletion of default categories and categories with associated data.
 *
 * Requirements: 9.4, 9.5, 9.6
 *
 * @param {string} name - The category name to delete.
 * @returns {{ success: boolean, error?: string }}
 */
function deleteCategory(name) {
  const trimmedName = (name || "").trim();
  
  if (!trimmedName) {
    return { success: false, error: "Category name cannot be empty" };
  }

  // Check if it's a default category (case-insensitive)
  const isDefault = DEFAULT_CATEGORIES.some(
    (defaultCat) => defaultCat.toLowerCase() === trimmedName.toLowerCase()
  );

  if (isDefault) {
    return { success: false, error: "Cannot delete default categories" };
  }

  const lowerName = trimmedName.toLowerCase();

  // Check for associated expenses
  const hasExpense = AppState.expenses.some(
    (e) => (e.category || "").toLowerCase() === lowerName
  );

  // Check for associated budgets
  const hasBudget = AppState.budgets.some(
    (b) => (b.category || "").toLowerCase() === lowerName
  );

  if (hasExpense || hasBudget) {
    return {
      success: false,
      error: "Cannot delete category with associated expenses or budgets"
    };
  }

  // Remove the category (preserve original casing)
  AppState.categories = AppState.categories.filter(
    (c) => c.toLowerCase() !== lowerName
  );
  saveState();
  return { success: true };
}

// ===== Expense CRUD =====

/**
 * Adds a new expense to AppState and persists to Storage.
 *
 * Requirements: 1.2, 1.3, 1.4, 7.1
 *
 * @param {number|string} amount - Must parse to a positive float.
 * @param {string} category - Must be a non-empty string.
 * @param {string} date - "YYYY-MM-DD" string.
 * @param {string} [description] - Optional description.
 * @returns {{ success: boolean, expense?: object, error?: string }}
 */
function addExpense(amount, category, date, description) {
  const parsedAmount = parseFloat(amount);

  if (!isFinite(parsedAmount) || parsedAmount <= 0) {
    return { success: false, error: "Amount must be a positive number" };
  }

  const trimmedCategory = (category || "").trim();
  if (!trimmedCategory) {
    return { success: false, error: "Category cannot be empty" };
  }

  const newExpense = {
    id: crypto.randomUUID(),
    amount: parsedAmount,
    category: trimmedCategory,
    date: date || "",
    description: description || ""
  };

  AppState.expenses.push(newExpense);
  saveState();
  return { success: true, expense: newExpense };
}

/**
 * Applies a partial update to an existing expense, re-validates, and persists.
 *
 * Requirements: 1.5, 1.3, 1.4, 7.1
 *
 * @param {string} id - The id of the expense to update.
 * @param {{ amount?: number, category?: string, date?: string, description?: string }} fields
 * @returns {{ success: boolean, expense?: object, error?: string }}
 */
function editExpense(id, fields) {
  const index = AppState.expenses.findIndex((e) => e.id === id);

  if (index === -1) {
    return { success: false, error: "Expense not found" };
  }

  const expense = AppState.expenses[index];

  // Validate provided fields before applying
  if (fields.amount !== undefined) {
    const parsedAmount = parseFloat(fields.amount);
    if (!isFinite(parsedAmount) || parsedAmount <= 0) {
      return { success: false, error: "Amount must be a positive number" };
    }
    expense.amount = parsedAmount;
  }

  if (fields.category !== undefined) {
    const trimmedCategory = (fields.category || "").trim();
    if (!trimmedCategory) {
      return { success: false, error: "Category cannot be empty" };
    }
    expense.category = trimmedCategory;
  }

  if (fields.date !== undefined) {
    expense.date = fields.date;
  }

  if (fields.description !== undefined) {
    expense.description = fields.description;
  }

  saveState();
  return { success: true, expense: expense };
}

/**
 * Removes an expense by id from AppState and persists to Storage.
 *
 * Requirements: 1.6, 7.1
 *
 * @param {string} id - The id of the expense to delete.
 * @returns {{ success: boolean }}
 */
function deleteExpense(id) {
  AppState.expenses = AppState.expenses.filter((e) => e.id !== id);
  saveState();
  return { success: true };
}

// ===== Budget Management =====

/**
 * Sets (upserts) a budget for a given category and period.
 * If a budget already exists for the same category (case-insensitive) and period,
 * its amount is overwritten. Otherwise a new entry is added.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 7.1
 *
 * @param {string} category - The category name.
 * @param {string} period   - The calendar month as "YYYY-MM".
 * @param {number|string} amount - Must parse to a positive float.
 * @returns {{ success: boolean, budget?: object, error?: string }}
 */
function setBudget(category, period, amount) {
  const parsedAmount = parseFloat(amount);

  if (!isFinite(parsedAmount) || parsedAmount <= 0) {
    return { success: false, error: "Budget amount must be a positive number" };
  }

  const trimmedCategory = (category || "").trim();
  if (!trimmedCategory) {
    return { success: false, error: "Category cannot be empty" };
  }

  const lowerCategory = trimmedCategory.toLowerCase();
  const existing = AppState.budgets.find(
    (b) => (b.category || "").toLowerCase() === lowerCategory && b.period === period
  );

  if (existing) {
    existing.amount = parsedAmount;
    saveState();
    return { success: true, budget: existing };
  }

  const budgetEntry = { category: trimmedCategory, period, amount: parsedAmount };
  AppState.budgets.push(budgetEntry);
  saveState();
  return { success: true, budget: budgetEntry };
}



// ===== Dashboard Summary =====

/**
 * Computes per-category budget vs. spent summary for the given period.
 *
 * Collects all unique categories that have either an expense or a budget in
 * the period. For each category returns:
 *   - budgeted: budget amount for that category+period (0 if none)
 *   - spent: sum of all expense amounts for that category in the period
 *   - remaining: budgeted - spent (can be negative)
 *   - overBudget: true if spent >= budgeted AND budgeted > 0
 *
 * Requirements: 4.2, 4.3, 4.4
 *
 * @param {string} period - "YYYY-MM"
 * @returns {{ category: string, budgeted: number, spent: number, remaining: number, overBudget: boolean }[]}
 */
function getSummaryData(period) {
  const periodExpenses = AppState.expenses.filter((e) => (e.date || "").startsWith(period));
  const periodBudgets = AppState.budgets.filter((b) => b.period === period);

  // Collect unique categories (case-sensitive, preserve original casing)
  const categorySet = new Map(); // lowercase -> original casing

  periodExpenses.forEach((e) => {
    const key = (e.category || "").toLowerCase();
    if (!categorySet.has(key)) categorySet.set(key, e.category);
  });

  periodBudgets.forEach((b) => {
    const key = (b.category || "").toLowerCase();
    if (!categorySet.has(key)) categorySet.set(key, b.category);
  });

  return Array.from(categorySet.entries()).map(([lowerCat, category]) => {
    const budgetEntry = periodBudgets.find((b) => (b.category || "").toLowerCase() === lowerCat);
    const budgeted = budgetEntry ? budgetEntry.amount : 0;

    const spent = periodExpenses
      .filter((e) => (e.category || "").toLowerCase() === lowerCat)
      .reduce((sum, e) => sum + e.amount, 0);

    const remaining = budgeted - spent;
    const overBudget = budgeted > 0 && spent >= budgeted;

    return { category, budgeted, spent, remaining, overBudget };
  });
}

/**
 * Renders the budget vs. spent summary table for the active period.
 *
 * Requirements: 4.2, 4.3, 4.4
 */
function renderDashboardSummary() {
  const tbody = document.getElementById("summary-body");
  const tfoot = document.getElementById("summary-foot");

  if (!tbody || !tfoot) return;

  tbody.innerHTML = "";
  tfoot.innerHTML = "";

  const data = getSummaryData(AppState.activePeriod);

  if (data.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "empty-state";
    td.textContent = "No data for this period.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  data.forEach(({ category, budgeted, spent, remaining, overBudget }) => {
    const tr = document.createElement("tr");
    if (overBudget) tr.classList.add("over-budget");

    // Category cell
    const tdCat = document.createElement("td");
    tdCat.textContent = category;
    if (overBudget) {
      const badge = document.createElement("span");
      badge.className = "over-budget-badge";
      badge.textContent = "!";
      tdCat.appendChild(badge);
    }

    const tdBudgeted = document.createElement("td");
    tdBudgeted.textContent = formatCurrency(budgeted);

    const tdSpent = document.createElement("td");
    tdSpent.textContent = formatCurrency(spent);

    const tdRemaining = document.createElement("td");
    tdRemaining.className = "remaining";
    tdRemaining.textContent = formatCurrency(remaining);

    tr.appendChild(tdCat);
    tr.appendChild(tdBudgeted);
    tr.appendChild(tdSpent);
    tr.appendChild(tdRemaining);
    tbody.appendChild(tr);
  });

  // Totals row in tfoot
  const totalBudgeted = data.reduce((sum, r) => sum + r.budgeted, 0);
  const totalSpent = data.reduce((sum, r) => sum + r.spent, 0);
  const totalRemaining = data.reduce((sum, r) => sum + r.remaining, 0);

  const tfootRow = document.createElement("tr");

  const tdLabel = document.createElement("td");
  tdLabel.textContent = "Total";

  const tdTotalBudgeted = document.createElement("td");
  tdTotalBudgeted.textContent = formatCurrency(totalBudgeted);

  const tdTotalSpent = document.createElement("td");
  tdTotalSpent.textContent = formatCurrency(totalSpent);

  const tdTotalRemaining = document.createElement("td");
  tdTotalRemaining.textContent = formatCurrency(totalRemaining);

  tfootRow.appendChild(tdLabel);
  tfootRow.appendChild(tdTotalBudgeted);
  tfootRow.appendChild(tdTotalSpent);
  tfootRow.appendChild(tdTotalRemaining);
  tfoot.appendChild(tfootRow);
}

// ===== Chart Colors =====

/**
 * Distinct hex color palette for chart slices/bars.
 * Adapts to current theme for better integration.
 * Requirements: 5.1, 5.2, 10.2
 */
function getChartColors() {
  const isDark = document.documentElement.classList.contains("dark-theme");
  
  if (isDark) {
    return [
      "#6366f1", // primary (lighter for dark theme)
      "#10b981", // emerald
      "#f59e0b", // amber
      "#f87171", // red (lighter)
      "#a78bfa", // violet (lighter)
      "#06b6d4", // cyan
      "#fb923c", // orange (lighter)
      "#a3e635"  // lime (lighter)
    ];
  } else {
    return [
      "#4f46e5", // primary
      "#10b981", // emerald
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // violet
      "#06b6d4", // cyan
      "#f97316", // orange
      "#84cc16"  // lime
    ];
  }
}

/**
 * Gets theme-appropriate text colors for charts.
 * Requirements: 10.2
 */
function getChartTextColors() {
  const isDark = document.documentElement.classList.contains("dark-theme");
  
  return {
    primary: isDark ? "#f7fafc" : "#374151",
    secondary: isDark ? "#a0aec0" : "#6b7280",
    grid: isDark ? "#4a5568" : "#e5e7eb"
  };
}

// ===== Pie Chart =====

/**
 * Aggregates spending by category for the given period.
 * Returns an array of { category, total } sorted by total descending.
 * Returns empty array if no expenses exist for the period.
 *
 * Requirements: 5.1
 *
 * @param {string} period - "YYYY-MM"
 * @returns {{ category: string, total: number }[]}
 */
function getPieChartData(period) {
  const expenses = getExpensesForPeriod(period);
  if (expenses.length === 0) return [];

  const totals = new Map();
  expenses.forEach((e) => {
    const key = e.category || "Other";
    totals.set(key, (totals.get(key) || 0) + e.amount);
  });

  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Renders the pie chart for the active period using the Canvas 2D API.
 * Shows a placeholder message when there are no expenses.
 *
 * Requirements: 5.1, 5.4, 5.5, 10.2
 */
function renderPieChart() {
  const canvas = document.getElementById("pie-chart");
  const placeholder = document.getElementById("pie-placeholder");

  if (!canvas || !placeholder) return;

  const data = getPieChartData(AppState.activePeriod);

  if (data.length === 0) {
    canvas.style.display = "none";
    placeholder.classList.remove("hidden");
    return;
  }

  canvas.style.display = "";
  placeholder.classList.add("hidden");

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  const total = data.reduce((sum, d) => sum + d.total, 0);
  const colors = getChartColors();
  const textColors = getChartTextColors();

  // Reserve bottom area for legend
  const legendLineHeight = 20;
  const legendHeight = data.length * legendLineHeight + 10;
  const chartAreaHeight = height - legendHeight;

  const cx = width / 2;
  const cy = chartAreaHeight / 2;
  const radius = Math.min(cx, cy) - 10;

  let startAngle = -Math.PI / 2; // Start from top

  data.forEach((slice, i) => {
    const sliceAngle = (slice.total / total) * 2 * Math.PI;
    const color = colors[i % colors.length];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    startAngle += sliceAngle;
  });

  // Draw legend
  const legendStartY = chartAreaHeight + 10;
  const swatchSize = 12;

  data.forEach((slice, i) => {
    const color = colors[i % colors.length];
    const y = legendStartY + i * legendLineHeight;

    ctx.fillStyle = color;
    ctx.fillRect(10, y, swatchSize, swatchSize);

    ctx.fillStyle = textColors.primary;
    ctx.font = "12px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(
      `${slice.category}: ${formatCurrency(slice.total)}`,
      10 + swatchSize + 6,
      y
    );
  });
}

// ===== Bar Chart =====

/**
 * Prepares data for the bar chart by calling getSummaryData and returning
 * an array of { category, budgeted, spent } for each category that has
 * either a budget or expenses in the given period.
 *
 * Requirements: 5.2
 *
 * @param {string} period - "YYYY-MM"
 * @returns {{ category: string, budgeted: number, spent: number }[]}
 */
function getBarChartData(period) {
  const summary = getSummaryData(period);
  if (!summary || summary.length === 0) return [];
  return summary.map(({ category, budgeted, spent }) => ({ category, budgeted, spent }));
}

/**
 * Renders the grouped bar chart (budget vs. actual per category) for the
 * active period using the Canvas 2D API.
 * Shows a placeholder message when there is no data or all values are zero.
 *
 * Requirements: 5.2, 5.4, 5.5, 10.2
 */
function renderBarChart() {
  const canvas = document.getElementById("bar-chart");
  const placeholder = document.getElementById("bar-placeholder");

  if (!canvas || !placeholder) return;

  const data = getBarChartData(AppState.activePeriod);

  const maxValue = data.length > 0
    ? Math.max(...data.map((d) => Math.max(d.budgeted, d.spent)))
    : 0;

  if (data.length === 0 || maxValue === 0) {
    canvas.style.display = "none";
    placeholder.classList.remove("hidden");
    return;
  }

  canvas.style.display = "";
  placeholder.classList.add("hidden");

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  const colors = getChartColors();
  const textColors = getChartTextColors();

  // Margins
  const marginTop = 40; // extra space for legend
  const marginRight = 20;
  const marginBottom = 60;
  const marginLeft = 60;

  const chartWidth = width - marginLeft - marginRight;
  const chartHeight = height - marginTop - marginBottom;

  // Y axis scale — round up to a nice number
  const yTickCount = 5;
  const rawStep = maxValue / yTickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep = Math.ceil(rawStep / magnitude) * magnitude;
  const yMax = niceStep * yTickCount;

  // Draw gridlines and Y axis labels
  ctx.strokeStyle = textColors.grid;
  ctx.lineWidth = 1;
  ctx.fillStyle = textColors.secondary;
  ctx.font = "11px sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= yTickCount; i++) {
    const value = niceStep * i;
    const y = marginTop + chartHeight - (value / yMax) * chartHeight;

    // Gridline
    ctx.beginPath();
    ctx.moveTo(marginLeft, y);
    ctx.lineTo(marginLeft + chartWidth, y);
    ctx.stroke();

    // Label
    ctx.fillText(formatCurrency(value), marginLeft - 6, y);
  }

  // Draw axes
  ctx.strokeStyle = textColors.secondary;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginLeft, marginTop);
  ctx.lineTo(marginLeft, marginTop + chartHeight);
  ctx.lineTo(marginLeft + chartWidth, marginTop + chartHeight);
  ctx.stroke();

  // Bar layout
  const groupCount = data.length;
  const groupWidth = chartWidth / groupCount;
  const barPadding = groupWidth * 0.15;
  const barWidth = (groupWidth - barPadding * 2) / 2;

  data.forEach((d, i) => {
    const groupX = marginLeft + i * groupWidth + barPadding;

    // Budgeted bar (left)
    const budgetedHeight = (d.budgeted / yMax) * chartHeight;
    const budgetedY = marginTop + chartHeight - budgetedHeight;

    ctx.fillStyle = colors[0]; // primary color
    ctx.fillRect(groupX, budgetedY, barWidth, budgetedHeight);

    // Actual (spent) bar (right)
    const spentHeight = (d.spent / yMax) * chartHeight;
    const spentY = marginTop + chartHeight - spentHeight;

    // Use red if over budget, amber otherwise
    const overBudget = d.budgeted > 0 && d.spent >= d.budgeted;
    ctx.fillStyle = overBudget ? colors[3] : colors[2]; // red or amber
    ctx.fillRect(groupX + barWidth, spentY, barWidth, spentHeight);

    // X axis category label (rotated 45°)
    const labelX = groupX + barWidth; // center of the group
    const labelY = marginTop + chartHeight + 8;

    ctx.save();
    ctx.translate(labelX, labelY);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = textColors.primary;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(d.category, 0, 0);
    ctx.restore();
  });

  // Legend at the top
  const legendY = 10;
  const swatchSize = 12;
  const legendGap = 16;

  // "Budgeted" swatch
  ctx.fillStyle = colors[0];
  ctx.fillRect(marginLeft, legendY, swatchSize, swatchSize);
  ctx.fillStyle = textColors.primary;
  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Budgeted", marginLeft + swatchSize + 4, legendY);

  // "Actual" swatch
  const actualLegendX = marginLeft + 90;
  ctx.fillStyle = colors[2];
  ctx.fillRect(actualLegendX, legendY, swatchSize, swatchSize);
  ctx.fillStyle = textColors.primary;
  ctx.fillText("Actual", actualLegendX + swatchSize + 4, legendY);
}

// ===== Render Stub (wired fully in task 12) =====

/**
 * Updates the budget overview section with real-time balance.
 */
function renderBudgetOverview() {
  const summaryData = getSummaryData(AppState.activePeriod);
  
  const totalBudgeted = summaryData.reduce((sum, item) => sum + item.budgeted, 0);
  const totalSpent = summaryData.reduce((sum, item) => sum + item.spent, 0);
  const totalBalance = totalBudgeted - totalSpent;
  
  const totalBalanceEl = document.getElementById("total-balance");
  
  if (totalBalanceEl) {
    totalBalanceEl.textContent = formatCurrency(totalBalance);
    totalBalanceEl.className = "balance-amount";
    if (totalBalance < 0) {
      totalBalanceEl.classList.add("negative");
    } else if (totalBalance > 0) {
      totalBalanceEl.classList.add("positive");
    }
  }
}

/**
 * Re-renders all UI components.
 */
function renderAll() {
  renderBudgetOverview();
  renderPeriodLabel();
  renderExpenseList();
  renderDashboardSummary();
  renderPieChart();
  renderBarChart();
  renderCategoryList();
  populateCategorySelects();
  renderSortControls();
}

/**
 * Renders the category list in #category-list, with a delete button per custom category.
 * Default categories are shown but cannot be deleted.
 *
 * Requirements: 9.1, 9.2, 9.4, 9.5, 9.6
 */
function renderCategoryList() {
  const ul = document.getElementById("category-list");
  if (!ul) return;

  ul.innerHTML = "";

  AppState.categories.forEach((cat) => {
    const li = document.createElement("li");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = cat;

    // Check if this is a default category (case-insensitive)
    const isDefault = DEFAULT_CATEGORIES.some(
      (defaultCat) => defaultCat.toLowerCase() === cat.toLowerCase()
    );

    li.appendChild(nameSpan);

    // Only show delete button for custom categories
    if (!isDefault) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-danger";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        const errorEl = document.getElementById("category-add-error");
        const result = deleteCategory(cat);
        if (!result.success) {
          if (errorEl) errorEl.textContent = result.error || "Cannot delete category";
        } else {
          if (errorEl) errorEl.textContent = "";
          renderAll();
        }
      });
      li.appendChild(deleteBtn);
    } else {
      // Add a visual indicator for default categories
      const defaultBadge = document.createElement("span");
      defaultBadge.className = "default-badge";
      defaultBadge.textContent = "Default";
      li.appendChild(defaultBadge);
    }

    ul.appendChild(li);
  });
}

// ===== Transaction Sorting =====

/**
 * Updates the sorting preferences in AppState and persists to storage.
 * Requirements: 11.2, 11.6
 * 
 * @param {string} sortBy - "date" | "amount" | "category"
 * @param {string} sortDirection - "asc" | "desc"
 */
function updateSortSettings(sortBy, sortDirection) {
  if (sortBy) {
    AppState.settings.sortBy = sortBy;
  }
  if (sortDirection) {
    AppState.settings.sortDirection = sortDirection;
  }
  saveState();
}

/**
 * Sorts an array of expenses based on the current sort settings.
 * Requirements: 11.2, 11.3, 11.4, 11.5
 * 
 * @param {object[]} expenses - Array of expense objects
 * @returns {object[]} - Sorted array of expenses
 */
function sortExpenses(expenses) {
  const { sortBy, sortDirection } = AppState.settings;
  
  const sorted = [...expenses].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "date":
        // Sort by date, then by creation order for same dates
        comparison = (a.date || "").localeCompare(b.date || "");
        if (comparison === 0) {
          comparison = (a.id || "").localeCompare(b.id || "");
        }
        break;
        
      case "amount":
        comparison = (a.amount || 0) - (b.amount || 0);
        break;
        
      case "category":
        comparison = (a.category || "").localeCompare(b.category || "");
        if (comparison === 0) {
          // Secondary sort by date for same category
          comparison = (a.date || "").localeCompare(b.date || "");
        }
        break;
        
      default:
        comparison = 0;
    }
    
    return sortDirection === "desc" ? -comparison : comparison;
  });
  
  return sorted;
}

/**
 * Renders the sorting controls UI based on current AppState settings.
 * Requirements: 11.1, 11.6
 */
function renderSortControls() {
  const sortBySelect = document.getElementById("sort-by");
  const sortDirectionBtn = document.getElementById("sort-direction");
  
  if (sortBySelect) {
    sortBySelect.value = AppState.settings.sortBy;
  }
  
  if (sortDirectionBtn) {
    const icon = sortDirectionBtn.querySelector(".sort-icon");
    if (AppState.settings.sortDirection === "asc") {
      sortDirectionBtn.classList.add("asc");
      sortDirectionBtn.setAttribute("aria-label", "Sort ascending - click for descending");
      if (icon) icon.textContent = "↑";
    } else {
      sortDirectionBtn.classList.remove("asc");
      sortDirectionBtn.setAttribute("aria-label", "Sort descending - click for ascending");
      if (icon) icon.textContent = "↓";
    }
  }
}

// ===== Expense List Helpers =====

/**
 * Returns expenses from AppState.expenses where the expense date starts with
 * the given period string (e.g., "2026-04"), sorted according to current sort settings.
 *
 * Requirements: 6.1, 11.2, 11.3, 11.4, 11.5
 *
 * @param {string} period - "YYYY-MM" string
 * @returns {object[]}
 */
function getExpensesForPeriod(period) {
  const periodExpenses = AppState.expenses.filter((e) => (e.date || "").startsWith(period));
  return sortExpenses(periodExpenses);
}

/**
 * Formats a number as a USD currency string (e.g., "$12.50").
 *
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/**
 * Formats a "YYYY-MM-DD" string to a human-readable date like "Apr 2, 2026".
 * Uses T00:00:00 suffix to avoid timezone offset issues.
 *
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {string}
 */
function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Returns the CSS badge class for a given category name.
 *
 * @param {string} category
 * @returns {string}
 */
function getCategoryBadgeClass(category) {
  const map = {
    food: "badge-food",
    transport: "badge-transport",
    utilities: "badge-utilities",
    entertainment: "badge-entertainment",
    health: "badge-health",
    other: "badge-other"
  };
  return map[(category || "").toLowerCase()] || "";
}

/**
 * Renders the expense list for the active period, applying the current
 * category filter. Shows the empty state when no expenses match.
 *
 * Requirements: 1.6, 6.1, 6.2, 6.3, 6.4
 */
function renderExpenseList() {
  const list = document.getElementById("expense-list");
  const emptyEl = document.getElementById("expense-empty");
  const filterSelect = document.getElementById("category-filter");

  if (!list || !emptyEl) return;

  const filterValue = filterSelect ? filterSelect.value : "";
  let expenses = getExpensesForPeriod(AppState.activePeriod);

  if (filterValue) {
    expenses = expenses.filter((e) => e.category === filterValue);
  }

  // Remove all existing expense-item <li> elements (keep #expense-empty)
  Array.from(list.querySelectorAll(".expense-item")).forEach((el) => el.remove());

  if (expenses.length === 0) {
    emptyEl.style.display = "";
    return;
  }

  emptyEl.style.display = "none";

  expenses.forEach((expense) => {
    const li = document.createElement("li");
    li.className = "expense-item";

    const badgeClass = getCategoryBadgeClass(expense.category);

    const dateSpan = document.createElement("span");
    dateSpan.className = "expense-date";
    dateSpan.textContent = expense.date ? formatDate(expense.date) : "";

    const badge = document.createElement("span");
    badge.className = "badge" + (badgeClass ? " " + badgeClass : "");
    badge.textContent = expense.category;

    const descSpan = document.createElement("span");
    descSpan.className = "expense-desc";
    descSpan.textContent = expense.description || "";

    const amountSpan = document.createElement("span");
    amountSpan.className = "expense-amount";
    amountSpan.textContent = formatCurrency(expense.amount);

    const actions = document.createElement("div");
    actions.className = "expense-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-edit";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => enterEditMode(expense));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      deleteExpense(expense.id);
      renderAll();
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(dateSpan);
    li.appendChild(badge);
    li.appendChild(descSpan);
    li.appendChild(amountSpan);
    li.appendChild(actions);

    list.appendChild(li);
  });
}

// ===== Form UI =====

/**
 * Populates ALL category <select> elements on the page with options from
 * AppState.categories. Preserves the current selection if the value still exists.
 *
 * Requirements: 1.1, 2.2
 */
function populateCategorySelects() {
  const selects = document.querySelectorAll("select#expense-category, select#budget-category, select#category-filter");

  selects.forEach((sel) => {
    const current = sel.value;

    // Remove all options except the first placeholder (value="")
    while (sel.options.length > 1) {
      sel.remove(1);
    }

    AppState.categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    });

    // Restore previous selection if still valid
    if (current && AppState.categories.includes(current)) {
      sel.value = current;
    }
  });
}

/**
 * Resets the expense form to "add" mode:
 * clears all fields, clears error spans, resets heading and button text,
 * hides the cancel button, and clears the hidden edit-id field.
 *
 * Requirements: 1.1, 1.2
 */
function renderExpenseForm() {
  const form = document.getElementById("expense-form");
  if (form) form.reset();

  const editId = document.getElementById("edit-id");
  if (editId) editId.value = "";

  // Clear error spans and invalid classes
  ["expense-amount", "expense-category", "expense-date"].forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) field.classList.remove("invalid");
  });
  ["amount-error", "category-error", "date-error"].forEach((spanId) => {
    const span = document.getElementById(spanId);
    if (span) span.textContent = "";
  });

  const heading = document.getElementById("form-heading");
  if (heading) heading.textContent = "Add Expense";

  const submitBtn = document.getElementById("form-submit-btn");
  if (submitBtn) submitBtn.textContent = "Add Expense";

  const cancelBtn = document.getElementById("form-cancel-btn");
  if (cancelBtn) cancelBtn.classList.add("hidden");
}

/**
 * Switches the expense form to "edit" mode for the given expense:
 * populates all fields, updates heading and button text, shows cancel button,
 * and scrolls the form into view.
 *
 * Requirements: 1.5
 *
 * @param {{ id: string, amount: number, category: string, date: string, description: string }} expense
 */
function enterEditMode(expense) {
  const editId = document.getElementById("edit-id");
  if (editId) editId.value = expense.id;

  const amountInput = document.getElementById("expense-amount");
  if (amountInput) amountInput.value = expense.amount;

  const categorySelect = document.getElementById("expense-category");
  if (categorySelect) categorySelect.value = expense.category;

  const dateInput = document.getElementById("expense-date");
  if (dateInput) dateInput.value = expense.date;

  const descInput = document.getElementById("expense-description");
  if (descInput) descInput.value = expense.description || "";

  // Clear any lingering errors
  ["expense-amount", "expense-category", "expense-date"].forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) field.classList.remove("invalid");
  });
  ["amount-error", "category-error", "date-error"].forEach((spanId) => {
    const span = document.getElementById(spanId);
    if (span) span.textContent = "";
  });

  const heading = document.getElementById("form-heading");
  if (heading) heading.textContent = "Edit Expense";

  const submitBtn = document.getElementById("form-submit-btn");
  if (submitBtn) submitBtn.textContent = "Update Expense";

  const cancelBtn = document.getElementById("form-cancel-btn");
  if (cancelBtn) cancelBtn.classList.remove("hidden");

  const formSection = document.getElementById("form-section");
  if (formSection) formSection.scrollIntoView({ behavior: "smooth" });
}

// ===== Period Navigation =====

/**
 * Converts a "YYYY-MM" period string to a human-readable label like "April 2026".
 *
 * Requirements: 4.1, 4.5
 *
 * @param {string} period - "YYYY-MM"
 * @returns {string}
 */
function formatPeriodLabel(period) {
  const d = new Date(period + "-01T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Updates the #active-period-label element with the formatted label for
 * the current AppState.activePeriod.
 *
 * Requirements: 4.1, 4.5
 */
function renderPeriodLabel() {
  const label = document.getElementById("active-period-label");
  if (label) {
    label.textContent = formatPeriodLabel(AppState.activePeriod);
  }
}

/**
 * Navigates the active period by one month in the given direction.
 * Handles year wrap-around (Jan → Dec of previous year, Dec → Jan of next year).
 * Persists the new period, updates the label, and re-renders all UI components.
 *
 * Requirements: 4.1, 4.5
 *
 * @param {"prev"|"next"} direction
 */
function navigatePeriod(direction) {
  const [yearStr, monthStr] = AppState.activePeriod.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10); // 1-12

  if (direction === "prev") {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  } else {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  AppState.activePeriod = `${year}-${String(month).padStart(2, "0")}`;
  saveState();
  renderPeriodLabel();
  renderAll();
}

// ===== Bootstrap =====
document.addEventListener("DOMContentLoaded", initApp);
