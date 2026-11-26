# Quick Start Guide for Django Backend

## 🚀 Prerequisites

- Python 3.10+
- MySQL or SQLite (configured in `.env` / `expense_tracker/settings.py`)

---

## 🔧 Step-by-Step Setup

### Step 1: Install Dependencies
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate      # Windows
# source venv/bin/activate  # Linux/macOS

pip install -r requirements.txt
```
*(Includes `reportlab`, `openpyxl`, `numpy`, `requests`, `djangorestframework-simplejwt`, `Pillow`, etc.)*

### Step 2: Database Setup & Migrations
```bash
python manage.py makemigrations accounts
python manage.py makemigrations expenses
python manage.py migrate
```

### Step 3: Create Superuser (Optional)
```bash
python manage.py createsuperuser
```

### Step 4: Start Server
```bash
python manage.py runserver 127.0.0.1:8000
```

---

## 📍 New & Enhanced API Endpoints

Once the server is running at `http://127.0.0.1:8000/api/`:

### 1. Authentication & Profile
- `POST /api/register/` - User registration
- `POST /api/token/` - Login & JWT acquisition
- `POST /api/token/refresh/` - Refresh JWT token
- `GET/PUT /api/profile/` - View/update user profile
- `GET/PUT /api/budget/` - Monthly budget & alert thresholds

### 2. Expenses & Recurring
- `GET/POST /api/expenses/` - List/create expenses (multi-currency supported)
- `GET/POST /api/recurring/` - List/create recurring bills & subscriptions
- `POST /api/recurring/{id}/toggle_active/` - Pause / resume recurring bill
- `POST /api/recurring/generate_all_recurring_expenses/` - Auto-generate due expenses

### 3. Savings Goals & Category Budgets
- `GET/POST /api/savings-goals/` - List/create savings goals
- `POST /api/savings-goals/{id}/contribute/` - Log contribution to goal
- `GET/POST /api/budgets/categories/` - Category budgets with rollover options

### 4. AI & Automation
- `GET /api/ai/insights/` - Pattern recognition, weekend spikes, large purchases
- `POST /api/ai/categorize/` - Auto-predict category from merchant/title
- `GET /api/ai/predict/` - Forecasting model for next month's total & category spend
- `POST /api/ai/chat/` - Context-aware AI financial assistant (RAG on actual spend)
- `POST /api/ai/ocr/` - Receipt image scan & pre-fill

### 5. Notifications & Export
- `GET /api/notifications/` - List user notifications
- `POST /api/notifications/check-alerts/` - Check 80%/100% budget & 3-day recurring alerts
- `POST /api/notifications/mark-all-read/` - Mark all notifications as read
- `GET /api/reports/export/pdf/` - Download executive PDF report
- `GET /api/reports/export/excel/` - Download multi-sheet .xlsx workbook
- `GET /api/reports/currency-rates/` - Cached multi-currency exchange rates
