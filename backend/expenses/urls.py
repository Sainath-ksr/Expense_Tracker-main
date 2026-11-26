from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import ai_views
from . import savings_views
from . import report_views

router = DefaultRouter()
router.register(r'expenses', views.ExpenseViewSet, basename='expense')
router.register(r'recurring', views.RecurringExpenseViewSet, basename='recurring_expense')
router.register(r'savings-goals', savings_views.SavingsGoalViewSet, basename='savings_goal')
router.register(r'budgets/categories', savings_views.CategoryBudgetViewSet, basename='category_budget')

urlpatterns = [
    path('', include(router.urls)),
    
    # Reports
    path('reports/', views.ReportsView.as_view(), name='reports'),
    path('reports/spending_trend/', views.SpendingTrendView.as_view(), name='reports_spending_trend'),
    path('reports/category_summary/', views.CategorySummaryView.as_view(), name='reports_category_summary'),
    path('reports/export/pdf/', report_views.ExportPDFReportView.as_view(), name='reports_export_pdf'),
    path('reports/export/excel/', report_views.ExportExcelReportView.as_view(), name='reports_export_excel'),
    path('reports/currency-rates/', report_views.CurrencyExchangeRatesView.as_view(), name='reports_currency_rates'),
    
    # Notifications & Alerts
    path('notifications/', views.NotificationsView.as_view(), name='notifications'),
    path('notifications/check-alerts/', savings_views.CheckAlertsView.as_view(), name='check_alerts'),
    path('notifications/mark-all-read/', savings_views.MarkAllReadView.as_view(), name='mark_all_read'),
    path('notifications/mark-read/<int:pk>/', savings_views.MarkSingleReadView.as_view(), name='mark_single_read'),
    
    # AI & Automation
    path('ai/insights/', ai_views.AIInsightsView.as_view(), name='ai_insights'),
    path('ai/categorize/', ai_views.AutoCategorizeView.as_view(), name='ai_categorize'),
    path('ai/predict/', ai_views.ExpensePredictionView.as_view(), name='ai_predict'),
    path('ai/chat/', ai_views.FinancialChatbotView.as_view(), name='ai_chat'),
    path('ai/ocr/', ai_views.OCRReceiptView.as_view(), name='ai_ocr'),
]
