# Django Expense Tracker Backend Setup & Architecture

## Prerequisites
- Python 3.10+
- pip & virtualenv
- MySQL Server (default in `settings.py`) or SQLite

---

## Setup Instructions

### 1. Create Virtual Environment
```bash
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```
Key packages installed:
- `Django==4.2.7`
- `djangorestframework==3.14.0`
- `djangorestframework-simplejwt==5.3.0`
- `django-cors-headers==4.3.1`
- `reportlab==4.0.4` (PDF report generation)
- `openpyxl==3.1.2` (Multi-sheet Excel workbook export)
- `requests==2.31.0` (Exchange rate utilities)
- `numpy==1.26.2` (Predictive moving average analytics)
- `Pillow==10.1.0`

### 3. Environment Variables & Database Setup
Configure your database credentials in `backend/.env` or `expense_tracker/settings.py`.
```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Create Superuser (Optional)
```bash
python manage.py createsuperuser
```

### 5. Run Development Server
```bash
python manage.py runserver 127.0.0.1:8000
```
The API is available at: `http://localhost:8000/api/`

---

## Enhanced Architecture & Models

1. **`accounts.User`**: Custom user model supporting email login, base `currency`, `monthly_budget`, `dark_mode`, `alert_threshold`, and `enable_alerts`.
2. **`expenses.Expense`**: Stores user transactions with `currency`, `original_amount`, `exchange_rate`, and `is_subscription`.
3. **`expenses.RecurringExpense`**: Manages repeating transactions (daily, weekly, monthly, yearly), `is_subscription` burn tracking, and `next_date`.
4. **`expenses.CategoryBudget`**: Per-category monthly limits with `rollover` support.
5. **`expenses.SavingsGoal` & `GoalContribution`**: Savings goals, target dates, contribution journals, and auto-computed progress.
6. **`expenses.Notification`**: In-app alerts for 80% and 100% budget thresholds, due recurring bills, and milestone celebrations.

---

## Production Deployment Checklist

1. Set `DEBUG = False` in `expense_tracker/settings.py`.
2. Ensure `ALLOWED_HOSTS` includes your domain or production IP.
3. Configure `CORS_ALLOWED_ORIGINS` to allow only your production frontend origin.
4. Set secure cookies: `SESSION_COOKIE_SECURE = True` and `CSRF_COOKIE_SECURE = True`.
5. Run `python manage.py collectstatic` to gather static assets.
6. Serve via a production WSGI/ASGI runner such as Gunicorn or Uvicorn behind Nginx.
