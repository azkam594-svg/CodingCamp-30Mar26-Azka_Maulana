# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a single-file client-side web app (`index.html`, `style.css`, `app.js`) with no build step. All state lives in `app.js` and is persisted to Local Storage. UI re-renders reactively on every state mutation.

## Tasks

- [x] 1. Scaffold project files and core data layer
  - Create `index.html` with semantic markup: form section, expense list section, dashboard summary section, chart canvases
  - Create `style.css` with base layout, form styles, list styles, badge styles, and chart placeholder styles
  - Create `app.js` with the `AppState` shape, `loadState()` / `saveState()` functions using the `"expense_visualizer_data"` Local Storage key
  - Implement graceful fallback: if Storage is unavailable or JSON is malformed, initialize with empty data and show a non-blocking warning banner
  - _Requirements: 7.2, 7.3_

- [x] 2. Implement category management
  - [x] 2.1 Seed default categories and implement add/delete logic
    - Initialize default categories: Food, Transport, Utilities, Entertainment, Health, Other
    - Implement `addCategory(name)` — case-insensitive duplicate check, save to state + Storage
    - Implement `deleteCategory(name)` — block deletion if any Expense or Budget references the category, show warning; otherwise remove and save
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 2.2 Write unit tests for category add/delete rules
    - Test duplicate detection (case-insensitive)
    - Test deletion blocked when expenses/budgets exist
    - _Requirements: 2.3, 2.5_

- [x] 3. Implement expense CRUD
  - [x] 3.1 Implement `addExpense`, `editExpense`, `deleteExpense` functions
    - `addExpense(amount, category, date, description)` — validate positive amount and non-empty category; generate `id` via `crypto.randomUUID()`; save to state + Storage
    - `editExpense(id, fields)` — apply partial update, re-validate, save
    - `deleteExpense(id)` — remove by id, save
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 7.1_
  - [x] 3.2 Write property test for expense amount validation
    - **Property: Any submitted expense with a non-positive amount must never appear in state**
    - **Validates: Requirements 1.3**
  - [x] 3.3 Write unit tests for expense CRUD
    - Test add/edit/delete round-trips
    - Test validation errors for missing category and invalid amount
    - _Requirements: 1.3, 1.4, 1.6_

- [x] 4. Implement budget management
  - [x] 4.1 Implement `setBudget` and `removeBudget` functions
    - `setBudget(category, period, amount)` — validate positive amount; upsert (overwrite if exists for same category+period); save to state + Storage
    - `removeBudget(category, period)` — remove entry, save
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1_
  - [x] 4.2 Write unit tests for budget upsert and validation
    - Test that setting a budget twice for same category+period overwrites
    - Test validation error for non-positive amount
    - _Requirements: 3.3, 3.4_

- [x] 5. Checkpoint — Ensure all data-layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Build the Input Form UI
  - [x] 6.1 Render the expense form and wire submit handler
    - Render form fields: amount (number), category (select populated from state), date (date picker), description (optional text)
    - On submit: call `addExpense`, show inline validation errors if invalid, clear form on success
    - Pre-populate form and switch to edit mode when `editExpense` is triggered from the list
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 6.2 Write unit tests for form validation feedback
    - Test that submitting with invalid amount renders an error message in the DOM
    - Test that submitting with no category renders an error message in the DOM
    - _Requirements: 1.3, 1.4_

- [x] 7. Build the Expense List UI
  - [x] 7.1 Render the expense list with filtering
    - Render a `<ul>` of expenses for the active Period, sorted by date descending
    - Each `<li>` shows date, category badge, description, amount, edit button, delete button
    - Render a category filter `<select>`; filtering updates the visible list without changing state
    - _Requirements: 1.6, 6.1, 6.2, 6.3, 6.4_
  - [x] 7.2 Write unit tests for list filtering and sort order
    - Test that filtering by category hides non-matching items
    - Test that expenses are ordered date-descending
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. Build the Dashboard Summary UI
  - [x] 8.1 Render per-category budget vs. spent summary
    - For each category with a Budget or Expense in the active Period: render budgeted amount, total spent, remaining
    - Apply a visual over-budget indicator when spent >= budget
    - Render totals row: total budgeted and total spent across all categories
    - _Requirements: 4.2, 4.3, 4.4_
  - [x] 8.2 Implement Period navigation controls
    - Render previous/next month buttons; update `activePeriod` in state and re-render dashboard, list, and charts
    - Default active Period to current calendar month on load
    - _Requirements: 4.1, 4.5_
  - [x] 8.3 Write unit tests for over-budget detection
    - Test that a category at exactly 100% of budget is flagged
    - Test that a category below budget is not flagged
    - _Requirements: 4.3_

- [x] 9. Build the Charts UI
  - [x] 9.1 Implement pie chart (spending by category)
    - Draw a pie chart on a `<canvas>` using the Canvas 2D API (no external libraries)
    - Show placeholder message when active Period has no expenses
    - _Requirements: 5.1, 5.4, 5.5_
  - [x] 9.2 Implement bar chart (budget vs. actual per category)
    - Draw a grouped bar chart on a `<canvas>` using the Canvas 2D API
    - Show placeholder message when active Period has no expenses
    - _Requirements: 5.2, 5.4, 5.5_
  - [x] 9.3 Wire chart re-render to state changes
    - Call chart render functions after every add, edit, delete, and period navigation
    - _Requirements: 5.3_
  - [x] 9.4 Write unit tests for chart data aggregation
    - Test that category totals fed to the pie chart match summed expense amounts
    - Test that bar chart data correctly pairs budget and actual values per category
    - _Requirements: 5.1, 5.2_

- [x] 10. Checkpoint — Ensure all UI and chart tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement data export
  - [x] 11.1 Implement export-to-JSON download
    - Serialize all Expenses, Budgets, and Categories from state to JSON
    - Use File System Access API if available; fall back to anchor-tag download
    - Filename format: `expenses-YYYY-MM-DD.json`
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 11.2 Write unit tests for export filename and payload
    - Test that the exported JSON contains all three data collections
    - Test that the filename includes today's date in the correct format
    - _Requirements: 8.1, 8.2_

- [x] 12. Wire everything together and final integration
  - [x] 12.1 Connect all UI components to the shared state
    - Ensure every state mutation (add/edit/delete expense, set/remove budget, add/delete category, period change) triggers re-render of: expense list, dashboard summary, both charts, and category selects
    - Load state from Storage on app init and render full UI
    - _Requirements: 4.1, 5.3, 7.1, 7.2_
  - [x] 12.2 Write integration tests for full add-expense flow
    - Simulate adding an expense and assert list, summary totals, and chart data all update consistently
    - _Requirements: 1.2, 4.2, 5.3_



- [x] 14. Implement custom category management
  - [x] 14.1 Create category management UI components
    - Add category creation form with text input and add button
    - Add category list display with delete buttons for custom categories
    - Implement validation for unique category names (case-insensitive)
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 14.2 Implement category add/delete logic
    - Extend `addCategory(name)` to handle custom categories with uniqueness validation
    - Implement `deleteCategory(id)` with dependency checking (block if expenses/budgets exist)
    - Preserve default categories and prevent their deletion
    - _Requirements: 9.2, 9.4, 9.5, 9.6_
  
  - [x] 14.3 Write property test for custom category creation
    - **Property 15: Custom category creation round-trip**
    - **Validates: Requirements 9.1, 9.2**
  
  - [x] 14.4 Write property test for category deletion rules
    - **Property 17: Custom categories without dependencies can be deleted**
    - **Property 18: Categories with dependencies cannot be deleted**
    - **Validates: Requirements 9.4, 9.5**

- [x] 15. Implement theme toggle 
skip all testing dont write testing 
  - [x] 15.1 Create theme toggle UI and CSS variables
    - Add theme toggle button/switch in header
    - Define CSS custom properties for light and dark themes
    - Implement theme switching via CSS class changes on document root
    - _Requirements: 10.1, 10.2, 10.6_

    skip all testing
  
  - [x] 15.2 Implement theme persistence and initialization
    - Add theme preference to AppState settings
    - Save theme changes to Local Storage immediately
    - Load saved theme preference on app initialization
    - Default to light theme if no preference saved
    - _Requirements: 10.3, 10.4, 10.5_

- [x] 16. Implement transaction sorting controls
  - [x] 16.1 Create sorting UI controls
    - Add sort criteria dropdown/buttons (Date, Amount, Category)
    - Add sort direction toggle button (ascending/descending)
    - Display current sort state in UI
    - _Requirements: 11.1, 11.6_
  
  - [x] 16.2 Implement sorting logic and state management
    - Add sorting preferences to AppState settings
    - Implement sort functions for date, amount, and category criteria
    - Apply default sort (date descending) on app load
    - Update expense list rendering to use current sort settings
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.7_
  


- [x] 17. Integration and wiring for new features
  - [x] 17.1 Wire new features to shared state and UI
    - Connect category management to category selectors throughout app
    - Ensure theme changes apply to all UI components including charts
    - Integrate sorting controls with expense list rendering
    - Update state persistence to include new settings
    - _Requirements: 9.2, 10.2, 11.2, 7.1_
  

- [x] 18. Final checkpoint for new features — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All charts use the native Canvas 2D API — no Chart.js or other libraries
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- New features (14-18) extend the existing app with custom categories, theme toggle, and transaction sorting

dont write file testing just make file for web i dont testing
