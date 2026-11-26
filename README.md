<div align="center">

# Expense Tracker — Smart Personal Finance & AI-Powered Wealth Dashboard

<a href="#license">
  <img alt="License: Apache-2.0" src="https://img.shields.io/badge/License-Apache--2.0-blue.svg">
</a>
<a href="https://www.python.org/" target="_blank">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.10+-blue">
</a>
<a href="https://www.djangoproject.com/" target="_blank">
  <img alt="Django" src="https://img.shields.io/badge/Django-4.2-darkgreen">
</a>
<a href="https://react.dev/" target="_blank">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB">
</a>
<a href="#">
  <img alt="Build" src="https://img.shields.io/badge/build-passing-brightgreen">
</a>

</div>

### Modern, AI-driven full-stack expense tracking with real-time budget alerts, forecasting, OCR receipt scanning, financial chatbot, multi-currency conversion, and executive reports.

---

## Table of Contents

- [Overview](#overview)
- [Complete Feature Set (15 Major Features)](#complete-feature-set-15-major-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)
- [License](#license)
- [Contact](#contact)

---

## Overview

Expense Tracker is an enterprise-grade full-stack personal finance web application to record, categorize, predict, and analyze personal spending. Built on Django REST Framework, React 18, TypeScript, and Tailwind CSS, it offers:

- **AI-Powered Automation**: Smart auto-categorization, moving-average forecasts, receipt OCR, and context-aware conversational financial advice.
- **Deep Financial Control**: Overall & category-level monthly budgets, rollover management, real-time threshold notifications, and recurring subscription burn tracking.
- **Global & Flexible**: Multi-currency conversion (INR, USD, EUR, GBP, CAD, AUD, JPY), complete dark/light mode, and formatted PDF & multi-sheet Excel exports.

---

## Complete Feature Set (15 Major Features)

### 1. Core Dashboard, Budgets & Multi-Currency
1. **Advanced Dashboard (`src/pages/Dashboard.tsx`)**:
   - Interactive KPI cards: Total spend, remaining budget, savings rate %, and top category.
   - Period filters: Weekly, Monthly, Yearly, and Custom Date Range.
   - Recharts dynamic trend line chart and category distribution donut chart.
   - Quick-action shortcuts bar: Add Expense, Savings Goals, Category Analysis, and Reports.
2. **Monthly Budget Management (`BudgetTab.tsx` & `CategoryBudget` model)**:
   - Supports overall monthly budgets and per-category limits.
   - Rollover options for unused monthly category surplus.
   - Real-time threshold progress bars (Green → Amber → Red).
3. **Category-Wise Expense Analysis (`src/pages/CategoryAnalysis.tsx`)**:
   - Deep-dive category breakdowns with percentage share.
   - Month-over-Month (MoM) comparison with percentage growth rates.
   - Average transaction size metrics and dual Pie/Donut + MoM Bar charts.
4. **Recurring Expense Management (`src/pages/Recurring.tsx`)**:
   - Full CRUD across daily, weekly, monthly, and yearly frequencies.
   - Next-due-date computation, pause/resume toggles, and auto-logging logic.
5. **Multiple Currencies (`src/utils/currency.ts` & User Profile)**:
   - Multi-currency expense entry (INR, USD, EUR, GBP, CAD, AUD, JPY).
   - Automatic exchange-rate conversion to base currency with cached/fallback rates.
   - Base currency user preference supported in profile settings.
6. **Dark/Light Mode Theme Switching**:
   - Persistent theme switching via Tailwind's `dark:` classes.
   - Saved across sessions in `localStorage` and synchronized with user preferences.

### 2. AI & Automation Features
7. **AI Expense Insights (`AIInsightsWidget.tsx` & `/api/ai/insights/`)**:
   - Analyzes spending patterns: weekend vs. weekday spending spikes, top-growing categories, budget pace warnings, and unusual single purchases (>3x average).
8. **Automatic Expense Categorization (`AddExpense.tsx` & `/api/ai/categorize/`)**:
   - Real-time auto-categorization predictor that auto-selects the category as the user types the merchant or description.
9. **Expense Prediction (`PredictionWidget.tsx` & `/api/ai/predict/`)**:
   - Weighted moving average forecasting next month's total spend and category-level projections with confidence ratings.
10. **Financial Chatbot (`ChatbotWidget.tsx` & `/api/ai/chat/`)**:
    - Floating, context-aware AI assistant that queries user expenses, budgets, category burn, and checks purchase affordability (*"Can I afford a ₹3,000 purchase?"*).
11. **Receipt Scanner using OCR (`AddExpense.tsx` & `/api/ai/ocr/`)**:
    - Receipt image upload with backend parsing to extract merchant/title, total amount, date, and suggested category.

### 3. Planning, Alerts & Reporting
12. **Savings Goals (`src/pages/SavingsGoals.tsx` & `/api/savings-goals/`)**:
    - Dedicated page to create goals, set target amounts/dates, log contributions, and track visual funding progress.
13. **Budget Alerts & In-App Notifications (`NotificationDropdown.tsx` & `/api/notifications/`)**:
    - Alerts triggered when spending reaches 80% or 100% of overall or category limits, or when a bill is due within 3 days.
    - Notification bell with unread badge counter in top navigation.
14. **Subscription Tracking (`Recurring.tsx`)**:
    - Dedicated view calculating active monthly recurring burn rate and 12-month annual commitment.
15. **PDF and Excel Reports (`Reports.tsx` & `/api/reports/export/`)**:
    - One-click downloads for formatted executive PDF summaries (`reportlab`) and multi-sheet Excel workbooks (`openpyxl`), plus CSV fallback.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React, React Hot Toast, Date-fns, PapaParse.
- **Backend**: Python 3.10+, Django 4.2, Django REST Framework, SimpleJWT, django-cors-headers, Pillow, ReportLab, OpenPyXL, NumPy, Requests.
- **Database**: MySQL / SQLite (configured via decouple `.env`).

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- MySQL Server (or SQLite)

### 1. Clone & Backend Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd Expense_Tracker-main/backend

# Create & activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

# Install all backend dependencies
pip install -r requirements.txt

# Run migrations (creates User, Expense, RecurringExpense, CategoryBudget, SavingsGoal, Notification)
python manage.py migrate

# Create an administrator account (optional)
python manage.py createsuperuser

# Start Django development server
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend Setup
```bash
# In project root:
npm install

# Run frontend development server
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

---

## API Documentation

All protected endpoints require `Authorization: Bearer <JWT_ACCESS_TOKEN>`.

### Authentication & Profile
- `POST /api/register/` - User registration
- `POST /api/token/` - Login & JWT acquisition
- `POST /api/token/refresh/` - Refresh JWT token
- `GET/PUT /api/profile/` - View/update user profile
- `GET/PUT /api/budget/` - View/update monthly budget settings

### Expenses & Recurring
- `GET/POST /api/expenses/` - List/create expenses
- `PUT/DELETE /api/expenses/{id}/` - Update/delete expense
- `GET /api/expenses/monthly_grouped/` - Monthly grouped totals
- `GET/POST /api/recurring/` - List/create recurring expenses
- `POST /api/recurring/{id}/toggle_active/` - Toggle active/paused
- `POST /api/recurring/generate_all_recurring_expenses/` - Auto-log due bills

### Savings Goals & Category Budgets
- `GET/POST /api/savings-goals/` - List/create savings goals
- `POST /api/savings-goals/{id}/contribute/` - Log contribution to goal
- `GET/POST /api/budgets/categories/` - List/save category budgets & rollover
- `DELETE /api/budgets/categories/{id}/` - Delete category limit

### AI & Automation Endpoints
- `GET /api/ai/insights/` - AI spending pattern insights
- `POST /api/ai/categorize/` - Auto-categorization prediction
- `GET /api/ai/predict/` - Next month expense forecast
- `POST /api/ai/chat/` - Context-aware financial assistant
- `POST /api/ai/ocr/` - Receipt image scan & extraction

### Notifications & Reports
- `GET /api/notifications/` - List unread/all notifications
- `POST /api/notifications/check-alerts/` - Trigger real-time alert checks
- `POST /api/notifications/mark-all-read/` - Mark all notifications read
- `GET /api/reports/` - Comprehensive analytics & trends
- `GET /api/reports/export/pdf/` - Download executive PDF report
- `GET /api/reports/export/excel/` - Download multi-sheet .xlsx workbook
- `GET /api/reports/currency-rates/` - Fetch cached exchange rates

---

## License

This project is licensed under the **Apache License 2.0**. See the [`LICENSE`](LICENSE) file for details.
