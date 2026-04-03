# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, set budgets per category, and visualize spending patterns through charts and summaries. It runs entirely in the browser using HTML, CSS, and Vanilla JavaScript, with all data persisted in the browser's Local Storage. No backend, login, or installation is required.

## Glossary

- **App**: The Expense & Budget Visualizer web application
- **Expense**: A single spending record with an amount, category, date, and optional description
- **Budget**: A user-defined spending limit assigned to a specific category for a given month
- **Category**: A user-defined or default label used to group expenses (e.g., Food, Transport, Utilities)
- **Storage**: The browser's Local Storage API used to persist all data client-side
- **Dashboard**: The main view showing a summary of budgets, expenses, and charts
- **Chart**: A visual representation (bar or pie) of expense data rendered on an HTML canvas element
- **Period**: A calendar month used to scope budget and expense data

---

## Requirements

### Requirement 1: Add and Manage Expenses

**User Story:** As a user, I want to add, edit, and delete expense entries, so that I can maintain an accurate record of my spending.


#### Acceptance Criteria

1. THE App SHALL provide a form with fields for amount (numeric), category (select), date (date picker), and description (optional text) to create a new Expense.
2. WHEN a user submits the expense form with valid data, THE App SHALL save the Expense to Storage and display it in the expense list.
3. IF a user submits the expense form with a missing or invalid amount (non-positive number), THEN THE App SHALL display an inline validation error and SHALL NOT save the Expense.
4. IF a user submits the expense form with no category selected, THEN THE App SHALL display an inline validation error and SHALL NOT save the Expense.
5. WHEN a user selects an existing Expense and chooses to edit it, THE App SHALL populate the form with the Expense's current values and allow the user to update them.
6. WHEN a user confirms deletion of an Expense, THE App SHALL remove the Expense from Storage and from the expense list.

---

### Requirement 2: Manage Categories

**User Story:** As a user, I want to create and manage expense categories, so that I can organize my spending in a way that fits my lifestyle.

#### Acceptance Criteria

1. THE App SHALL provide a default set of categories: Food, Transport, Utilities, Entertainment, Health, and Other.
2. WHEN a user creates a new category with a unique name, THE App SHALL save the category to Storage and make it available in all category selectors.
3. IF a user attempts to create a category with a name that already exists (case-insensitive), THEN THE App SHALL display an error and SHALL NOT create a duplicate category.
4. WHEN a user deletes a category that has no associated Expenses or Budgets, THE App SHALL remove it from Storage.
5. IF a user attempts to delete a category that has associated Expenses or Budgets, THEN THE App SHALL display a warning and SHALL NOT delete the category.

---

### Requirement 3: Set and Manage Budgets

**User Story:** As a user, I want to set a monthly budget for each category, so that I can control how much I spend in each area.

#### Acceptance Criteria

1. THE App SHALL allow a user to set one Budget per category per calendar month, expressed as a positive numeric amount.
2. WHEN a user saves a Budget for a category and Period, THE App SHALL persist it to Storage and reflect it in the Dashboard.
3. IF a user sets a Budget amount that is not a positive number, THEN THE App SHALL display a validation error and SHALL NOT save the Budget.
4. WHEN a user updates an existing Budget for a category and Period, THE App SHALL overwrite the previous value in Storage.
5. THE App SHALL allow a user to remove a Budget for a specific category and Period, after which THE App SHALL treat that category as having no budget limit for that Period.

---

### Requirement 4: Dashboard Summary View

**User Story:** As a user, I want to see a summary of my spending versus my budgets for the current month, so that I can quickly understand my financial status.

#### Acceptance Criteria

1. WHEN the App loads, THE Dashboard SHALL display the current calendar month as the active Period by default.
2. THE Dashboard SHALL display, for each category with a Budget or Expense in the active Period: the budgeted amount, the total spent amount, and the remaining amount.
3. WHEN total spending in a category meets or exceeds the Budget for the active Period, THE Dashboard SHALL visually distinguish that category (e.g., using a different color indicator).
4. THE Dashboard SHALL display the total budgeted amount and total spent amount across all categories for the active Period.
5. WHEN a user navigates to a different Period using previous/next month controls, THE Dashboard SHALL update all summaries and charts to reflect data for the selected Period.

---

### Requirement 5: Expense Visualization with Charts

**User Story:** As a user, I want to see charts of my spending, so that I can understand my expense distribution at a glance.

#### Acceptance Criteria

1. THE App SHALL render a pie chart showing the proportion of total spending per category for the active Period.
2. THE App SHALL render a bar chart comparing budgeted versus actual spending per category for the active Period.
3. WHEN the expense data for the active Period changes (add, edit, or delete), THE App SHALL re-render all charts to reflect the updated data.
4. WHEN a Period contains no Expense data, THE App SHALL display a placeholder message in place of the charts.
5. THE App SHALL render all charts using the HTML Canvas API without external charting libraries.

---

### Requirement 6: Expense List and Filtering

**User Story:** As a user, I want to view and filter my expense history, so that I can review specific transactions easily.

#### Acceptance Criteria

1. THE App SHALL display a list of all Expenses for the active Period, sorted by date descending by default.
2. WHEN a user selects a category filter, THE App SHALL display only Expenses matching the selected category for the active Period.
3. WHEN a user clears the category filter, THE App SHALL display all Expenses for the active Period.
4. THE App SHALL display each Expense entry with its date, category, description (if present), and amount.

---

### Requirement 7: Data Persistence

**User Story:** As a user, I want my data to be saved automatically, so that I don't lose my expenses or budgets when I close the browser tab.

#### Acceptance Criteria

1. WHEN any Expense or Budget is created, updated, or deleted, THE App SHALL immediately write the updated data to Storage.
2. WHEN the App loads, THE App SHALL read all Expenses, Budgets, and Categories from Storage and restore the previous application state.
3. IF Storage is unavailable or returns a parse error on load, THEN THE App SHALL initialize with empty data and display a non-blocking warning to the user.

---

### Requirement 9: Custom Category Management

**User Story:** As a user, I want to add custom categories beyond the default ones, so that I can organize my expenses according to my specific needs.

#### Acceptance Criteria

1. THE App SHALL provide a form to create new custom categories with a unique name.
2. WHEN a user creates a custom category with a valid name, THE App SHALL save it to Storage and make it available in all category selectors.
3. IF a user attempts to create a custom category with a name that already exists (case-insensitive), THEN THE App SHALL display an error and SHALL NOT create the duplicate category.
4. THE App SHALL allow users to delete custom categories that have no associated Expenses or Budgets.
5. IF a user attempts to delete a custom category that has associated Expenses or Budgets, THEN THE App SHALL display a warning and SHALL NOT delete the category.
6. THE App SHALL preserve all default categories (Food, Transport, Utilities, Entertainment, Health, Other) and SHALL NOT allow users to delete them.

---

### Requirement 10: Theme Toggle

**User Story:** As a user, I want to switch between dark and light themes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control to switch between dark and light themes.
2. WHEN a user selects a theme preference, THE App SHALL immediately apply the selected theme to all UI elements.
3. WHEN a user changes the theme preference, THE App SHALL save the preference to Storage.
4. WHEN the App loads, THE App SHALL read the saved theme preference from Storage and apply it.
5. IF no theme preference is saved in Storage, THEN THE App SHALL default to light theme.
6. THE App SHALL ensure all text remains readable and all interactive elements remain accessible in both themes.

---

### Requirement 11: Transaction Sorting

**User Story:** As a user, I want to sort my expense list by different criteria, so that I can view my transactions in the order that's most useful to me.

#### Acceptance Criteria

1. THE App SHALL provide sorting options for the expense list: by date, by amount, and by category.
2. WHEN a user selects a sort option, THE App SHALL immediately re-order the expense list according to the selected criteria.
3. WHEN sorting by date, THE App SHALL sort transactions in descending order (newest first) by default.
4. WHEN sorting by amount, THE App SHALL sort transactions in descending order (highest amount first) by default.
5. WHEN sorting by category, THE App SHALL sort transactions alphabetically by category name in ascending order.
6. THE App SHALL provide a toggle to reverse the sort order for each sorting criterion.
7. WHEN the App loads, THE App SHALL default to sorting by date in descending order.
