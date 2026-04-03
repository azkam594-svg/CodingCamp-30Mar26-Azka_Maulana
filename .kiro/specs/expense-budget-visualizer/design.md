# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page, client-side web application built with HTML, CSS, and Vanilla JavaScript. It requires no backend, no build step, and no installation — users open a single HTML file in a modern browser and start tracking expenses immediately.

All data is persisted in the browser's Local Storage API. The UI is organized around a single dashboard view that shows a transaction input form, a scrollable expense list, a total balance summary, and a pie chart visualizing spending by category.

The design prioritizes simplicity: minimal dependencies (Chart.js via CDN for charting), a clean visual hierarchy, and immediate reactivity — every add or delete operation updates the balance and chart in real time.

---

## Architecture

The application follows a simple MVC-like pattern without any framework:

```
┌─────────────────────────────────────────────────────┐
│                    index.html                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Input Form  │  │ Transaction  │  │  Summary  │  │
│  │  + Category  │  │  List + Sort │  │  + Chart  │  │
│  │  Management  │  │  Controls    │  │  + Theme  │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │
│         │                 │                │         │
│         └────────┬────────┘                │         │
│                  ▼                         │         │
│           ┌─────────────┐                  │         │
│           │  store.js   │◄─────────────────┘         │
│           │ (state +    │                             │
│           │  storage +  │                             │
│           │  settings)  │                             │
│           └─────────────┘                             │
└─────────────────────────────────────────────────────┘
```

**Data flow:**
1. User interacts with Input Form, Category Management, Sort Controls, Theme Toggle, or Transaction List
2. Interaction calls a function in `store.js` (add/delete transaction, manage categories, change theme, update sort)
3. `store.js` updates in-memory state and writes to Local Storage
4. `store.js` triggers a re-render of all dependent UI components (balance, list, chart, theme)

This unidirectional flow keeps state management simple and predictable.

**File structure:**
```
expense-budget-visualizer/
├── index.html       # Single HTML file, all markup
├── style.css        # All styles
└── app.js           # All JavaScript (store, UI, chart)
```

Given the scope of this feature (no routing, no complex state), all JavaScript lives in a single `app.js` file organized into logical sections.

---

## Components and Interfaces

### Input Form

Renders a form with fields for adding expenses:

| Field | Type | Validation |
|---|---|---|
| Description | `<input type="text">` | Optional text field |
| Amount | `<input type="number">` | Required, positive number |
| Category | `<select>` | Required, includes default and custom categories |
| Date | `<input type="date">` | Required, defaults to today |

On submit:
- Validates all fields; shows inline error messages if invalid
- Calls `addExpense(description, amount, category, date)`
- Clears the form on success

### Custom Category Management

Provides UI for managing expense categories:

**Category Creation Form:**
- Text input for category name
- Validation for uniqueness (case-insensitive)
- Add button to create new category

**Category List:**
- Displays all custom categories
- Delete button for each custom category (if no associated data)
- Default categories are preserved and cannot be deleted

### Theme Toggle

A toggle control that switches between dark and light themes:
- Toggle button/switch in the header
- Immediately applies theme changes via CSS custom properties
- Persists theme preference to Local Storage
- Defaults to light theme if no preference saved

### Transaction Sorting Controls

Provides sorting options for the expense list:
- Dropdown/buttons for sort criteria: Date, Amount, Category
- Toggle for sort direction (ascending/descending)
- Default: Date descending (newest first)
- Immediately re-renders list when sort options change

### Transaction List

A scrollable `<ul>` that renders one `<li>` per transaction. Each item shows:
- Description (if provided)
- Amount (formatted as currency)
- Category badge
- Date
- Delete button

Features:
- Sortable by date, amount, or category
- Sort direction toggle (ascending/descending)
- Default sort: date descending

Clicking delete calls `deleteTransaction(id)`.

### Total Balance

A `<div>` at the top of the page displaying the sum of all transaction amounts. Updates automatically after every add/delete.

### Pie Chart

A `<canvas>` element rendered using Chart.js. Shows spending distribution by category. Re-renders on every state change.

---

## Data Models

### Transaction

```js
{
  id: string,        // crypto.randomUUID() or Date.now().toString()
  description: string, // optional item description
  amount: number,    // positive float
  category: string,  // category name (default or custom)
  date: string,      // ISO 8601 date string (YYYY-MM-DD)
  createdAt: string  // ISO 8601 timestamp
}
```

### Category

```js
{
  id: string,        // unique identifier
  name: string,      // category name, unique (case-insensitive)
  isDefault: boolean, // true for system categories, false for custom
  createdAt: string  // ISO 8601 timestamp
}
```

### Budget

```js
{
  id: string,        // unique identifier
  categoryId: string, // reference to category
  amount: number,    // positive budget amount
  period: string,    // YYYY-MM format for month
  createdAt: string  // ISO 8601 timestamp
}
```

### AppState

```js
{
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  settings: {
    theme: 'light' | 'dark',
    sortBy: 'date' | 'amount' | 'category',
    sortDirection: 'asc' | 'desc'
  }
}
```

### Storage Schema

All data is stored under a single key in Local Storage:

```
Key:   "expense_visualizer_data"
Value: JSON.stringify(AppState)
```

On load, the app reads this key, parses it, and initializes state. If the key is missing or the JSON is malformed, the app initializes with default state including default categories and light theme.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Transaction add round-trip

*For any* valid transaction (non-empty name, positive amount, valid category), after calling `addTransaction`, the transaction should appear in the in-memory state and be retrievable from Local Storage.

**Validates: Requirements 1.2, 7.1**

---

### Property 2: Invalid form submissions are rejected

*For any* form submission where the amount is non-positive or zero, or the category is empty/unselected, or the name is blank, the transaction list length should remain unchanged after the attempted submission.

**Validates: Requirements 1.3, 1.4**

---

### Property 3: Transaction delete removes from state and storage

*For any* transaction present in the list, after calling `deleteTransaction(id)`, that transaction's id should not appear in the in-memory state or in the value stored in Local Storage.

**Validates: Requirements 1.6, 7.1**

---

### Property 4: Category uniqueness (case-insensitive)

*For any* existing category name, attempting to add a category with the same name in any casing should leave the category list length unchanged.

**Validates: Requirements 2.3**

---

### Property 5: Category with associated data cannot be deleted

*For any* category that has at least one associated expense or budget, attempting to delete it should leave the category list unchanged.

**Validates: Requirements 2.5**

---

### Property 6: Budget uniqueness per category and period

*For any* category and calendar month, setting a budget twice should result in exactly one budget entry for that category/month (the second write overwrites the first).

**Validates: Requirements 3.1, 3.4**

---

### Property 7: Invalid budget amounts are rejected

*For any* budget amount that is not a positive number (zero, negative, non-numeric), the budget should not be saved and the budget list should remain unchanged.

**Validates: Requirements 3.3**

---

### Property 8: Dashboard remaining amount invariant

*For any* category with a budget and expenses in the active period, the displayed remaining amount should equal the budget minus the sum of all expense amounts in that category.

**Validates: Requirements 4.2, 4.4**

---

### Property 9: Chart data reflects current state

*For any* application state, the data arrays passed to the chart renderer should equal the aggregated totals computed from the current transaction list — both for the pie chart (spending per category) and bar chart (budget vs actual per category).

**Validates: Requirements 5.1, 5.2, 5.3**

---

### Property 10: Expense list is sorted by date descending

*For any* non-empty list of transactions, the rendered list items should appear in descending order of `createdAt` timestamp.

**Validates: Requirements 6.1**

---

### Property 11: Category filter shows only matching expenses

*For any* selected category filter, every transaction rendered in the list should belong to that category; clearing the filter should restore all transactions for the active period.

**Validates: Requirements 6.2, 6.3**

---

### Property 12: Expense list items contain all required fields

*For any* transaction, the rendered list item should contain the item name, amount, category, and date.

**Validates: Requirements 6.4**

---

### Property 13: Storage persistence round-trip

*For any* application state, serializing it to Local Storage and then deserializing it on the next load should produce an equivalent state (same transactions, budgets, and categories).

**Validates: Requirements 7.2**

---

### Property 14: Export JSON contains all data

*For any* application state, the exported JSON object should contain arrays for all expenses, budgets, and categories that match the current in-memory state.

**Validates: Requirements 8.1**

---

### Property 15: Custom category creation round-trip

*For any* valid custom category name (non-empty, unique case-insensitive), after calling `addCategory`, the category should appear in the categories list and be available in all category selectors.

**Validates: Requirements 9.1, 9.2**

---

### Property 16: Duplicate category names are rejected

*For any* category name that already exists in the system (case-insensitive), attempting to create a new category with that name should leave the categories list unchanged.

**Validates: Requirements 9.3**

---

### Property 17: Custom categories without dependencies can be deleted

*For any* custom category that has no associated expenses or budgets, calling `deleteCategory` should remove it from the categories list and storage.

**Validates: Requirements 9.4**

---

### Property 18: Categories with dependencies cannot be deleted

*For any* category that has at least one associated expense or budget, attempting to delete it should leave the categories list unchanged.

**Validates: Requirements 9.5**

---

### Property 19: Default categories are preserved

*For any* default category (Food, Transport, Utilities, Entertainment, Health, Other), it should always be present in the categories list and cannot be deleted.

**Validates: Requirements 9.6**

---

### Property 20: Theme changes are applied immediately

*For any* theme selection (light or dark), all UI elements should immediately reflect the selected theme's color scheme.

**Validates: Requirements 10.2**

---

### Property 21: Theme preference persistence round-trip

*For any* theme preference (light or dark), after saving it to storage and reloading the app, the same theme should be applied.

**Validates: Requirements 10.3, 10.4**

---

### Property 22: Transaction sorting produces correct order

*For any* sort criteria (date, amount, category) and direction (ascending, descending), the transaction list should be ordered according to the selected criteria and direction.

**Validates: Requirements 11.2, 11.3, 11.4, 11.5**

---

### Property 23: Sort direction toggle reverses order

*For any* current sort configuration, toggling the sort direction should reverse the order of transactions while maintaining the same sort criteria.

**Validates: Requirements 11.6**

---

## Responsive Design

The app uses a mobile-first CSS approach with a single breakpoint at `768px`.

### Layout Strategy

**Mobile (< 768px) — single column stack:**
```
┌─────────────────────┐
│   Header + Theme    │
├─────────────────────┤
│   Period Navigator  │
├─────────────────────┤
│   Total Summary     │
├─────────────────────┤
│   Input Form        │
├─────────────────────┤
│   Category Mgmt     │
├─────────────────────┤
│   Sort Controls     │
├─────────────────────┤
│   Expense List      │
├─────────────────────┤
│   Pie Chart         │
├─────────────────────┤
│   Bar Chart         │
└─────────────────────┘
```

**Desktop (≥ 768px) — two-column grid:**
```
┌──────────────────┬──────────────────┐
│  Header + Theme  │  Total Summary   │
├──────────────────┼──────────────────┤
│  Period Nav      │  Dashboard       │
├──────────────────┼──────────────────┤
│  Input Form      │  Pie Chart       │
├──────────────────┼──────────────────┤
│  Category Mgmt   │  Bar Chart       │
├──────────────────┼──────────────────┤
│  Sort Controls   │                  │
├──────────────────┤                  │
│  Expense List    │                  │
└──────────────────┴──────────────────┘
```

### Responsive Rules

| Element | Mobile | Desktop |
|---|---|---|
| Layout | Single column, full width | CSS Grid, 2 columns (40% / 60%) |
| Form inputs | Full width, stacked | Full width within column |
| Expense list | Full width, max-height scroll | Full width within column, scrollable |
| Charts (`<canvas>`) | Full width, height auto-scaled | Fixed height (280px), width fills column |
| Category badges | Wrap freely | Inline |
| Buttons | Full width on mobile | Auto width |
| Font sizes | Base 14px | Base 16px |

### Implementation Notes

- Use `<meta name="viewport" content="width=device-width, initial-scale=1">` in `<head>`
- Use CSS Grid with `grid-template-columns: 1fr` on mobile, `grid-template-columns: 2fr 3fr` on desktop
- Canvas elements resize via JS: on `window.resize`, re-read `canvas.parentElement.clientWidth` and re-render charts
- Touch targets (buttons, selects) minimum 44×44px per mobile usability guidelines
- No horizontal scrolling at any viewport width

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Local Storage unavailable (private browsing, quota exceeded) | Catch the exception, initialize with empty state, show a non-blocking banner warning |
| Malformed JSON in Local Storage | Catch `JSON.parse` error, initialize with empty state, show warning |
| Chart.js CDN fails to load | Catch the script error, hide the chart canvas, show a fallback text message |
| Duplicate category name | Show inline error below the category input, do not save |
| Delete category with associated data | Show a confirmation/warning dialog, abort deletion |
| Delete default category | Show error message, prevent deletion |
| Invalid form fields on submit | Show inline error messages next to each invalid field, do not save |
| Theme application failure | Fall back to light theme, show warning message |
| Sort operation on empty list | Handle gracefully, show empty state message |

All errors are surfaced to the user via non-blocking UI messages (inline errors or a dismissible banner). No errors are silently swallowed.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:
- Unit tests catch concrete bugs with specific known inputs
- Property-based tests verify general correctness across the full input space

### Unit Tests

Focus on:
- Specific examples: adding a known transaction and checking the exact output
- Edge cases: empty storage, single transaction, all transactions in one category
- Error conditions: corrupted storage JSON, CDN failure fallback
- Integration: form submit → state update → DOM re-render → storage write

### Property-Based Tests

Use **fast-check** (JavaScript property-based testing library) for all property tests.

Each property test must run a minimum of **100 iterations**.

Each test must include a comment tag in the format:
`// Feature: expense-budget-visualizer, Property {number}: {property_text}`

**Property Test Examples:**
- Property 15: `// Feature: expense-budget-visualizer, Property 15: Custom category creation round-trip`
- Property 20: `// Feature: expense-budget-visualizer, Property 20: Theme changes are applied immediately`
- Property 22: `// Feature: expense-budget-visualizer, Property 22: Transaction sorting produces correct order`

All 23 correctness properties must be implemented as property-based tests.