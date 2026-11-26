"""
Export utilities for generating PDF summaries and Excel workbooks.
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Sum, Count, Avg
from datetime import datetime
import io
from .models import Expense, RecurringExpense, CategoryBudget, SavingsGoal


class ExportPDFReportView(generics.GenericAPIView):
    """
    Generate and download a PDF expense summary report.
    GET /api/reports/export/pdf/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&category=food
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        category = request.query_params.get('category')

        expenses = Expense.objects.filter(user=user)
        if start_date:
            expenses = expenses.filter(date__gte=start_date)
        if end_date:
            expenses = expenses.filter(date__lte=end_date)
        if category and category != 'all':
            expenses = expenses.filter(category=category)

        total_amount = float(expenses.aggregate(total=Sum('amount'))['total'] or 0)
        total_count = expenses.count()

        buffer = io.BytesIO()

        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors

            doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
            styles = getSampleStyleSheet()
            elements = []

            # Title
            title_style = ParagraphStyle(
                'ReportTitle',
                parent=styles['Heading1'],
                fontSize=20,
                textColor=colors.HexColor('#1E3A8A'),
                spaceAfter=8
            )
            elements.append(Paragraph("Expense Tracker — Financial Report", title_style))

            # Subheader
            sub_style = ParagraphStyle(
                'ReportSub',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#4B5563'),
                spaceAfter=14
            )
            date_range_str = f"{start_date or 'Beginning'} to {end_date or 'Present'}"
            user_info = f"Generated for: <b>{user.get_full_name() or user.username}</b> ({user.email}) | Period: {date_range_str} | Date: {timezone.now().strftime('%d %b %Y')}"
            elements.append(Paragraph(user_info, sub_style))

            # Summary Box
            summary_data = [
                ['Total Spend', 'Transactions', 'Daily Average (Est.)', 'Monthly Budget'],
                [
                    f"₹{total_amount:,.2f}",
                    str(total_count),
                    f"₹{(total_amount / max(1, 30)):,.2f}",
                    f"₹{float(user.monthly_budget or 0):,.2f}"
                ]
            ]
            summary_table = Table(summary_data, colWidths=[130, 100, 140, 130])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F3F4F6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('TEXTCOLOR', (0, 1), (-1, 1), colors.HexColor('#111827')),
                ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
            ]))
            elements.append(summary_table)
            elements.append(Spacer(1, 16))

            # Table of expenses
            elements.append(Paragraph("<b>Transaction Details</b>", styles['Heading3']))
            elements.append(Spacer(1, 6))

            table_data = [['Date', 'Title', 'Category', 'Amount']]
            for exp in expenses.order_by('-date')[:150]:
                table_data.append([
                    exp.date.strftime('%Y-%m-%d'),
                    exp.title[:35],
                    exp.get_category_display() if hasattr(exp, 'get_category_display') else exp.category.title(),
                    f"₹{float(exp.amount):,.2f}"
                ])
            if not expenses.exists():
                table_data.append(['—', 'No transactions found in this period', '—', '—'])

            exp_table = Table(table_data, colWidths=[80, 220, 100, 100])
            exp_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563EB')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F9FAFB')]),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            elements.append(exp_table)

            doc.build(elements)
            pdf = buffer.getvalue()
            buffer.close()

            response = HttpResponse(pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="expense_report_{timezone.now().strftime("%Y%m%d")}.pdf"'
            return response

        except Exception as e:
            # Fallback plain text response if reportlab fails
            return Response({'error': f'Failed to generate PDF: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExportExcelReportView(generics.GenericAPIView):
    """
    Generate and download a multi-sheet Excel (.xlsx) workbook.
    Sheet 1: Summary KPI & Category Breakdown
    Sheet 2: Detailed Expenses
    Sheet 3: Recurring & Subscriptions
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        category = request.query_params.get('category')

        expenses = Expense.objects.filter(user=user)
        if start_date:
            expenses = expenses.filter(date__gte=start_date)
        if end_date:
            expenses = expenses.filter(date__lte=end_date)
        if category and category != 'all':
            expenses = expenses.filter(category=category)

        try:
            import openpyxl
            from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

            wb = openpyxl.Workbook()
            
            header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
            header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
            sub_fill = PatternFill(start_color="F3F4F6", end_color="F3F4F6", fill_type="solid")
            bold_font = Font(name="Calibri", size=11, bold=True)
            align_right = Alignment(horizontal="right")
            align_center = Alignment(horizontal="center")

            # Sheet 1: Summary
            ws1 = wb.active
            ws1.title = "Summary"
            ws1.views.sheetView[0].showGridLines = True

            ws1['A1'] = "EXPENSE TRACKER — FINANCIAL SUMMARY REPORT"
            ws1['A1'].font = Font(name="Calibri", size=14, bold=True, color="1E3A8A")
            ws1['A2'] = f"User: {user.get_full_name() or user.username} | Email: {user.email} | Export Date: {timezone.now().strftime('%Y-%m-%d %H:%M')}"
            ws1['A2'].font = Font(name="Calibri", size=10, italic=True)

            total_amount = float(expenses.aggregate(total=Sum('amount'))['total'] or 0)
            monthly_budget = float(user.monthly_budget or 0)

            ws1['A4'] = "Metric"
            ws1['B4'] = "Value"
            for col in ['A4', 'B4']:
                ws1[col].fill = header_fill
                ws1[col].font = header_font

            metrics = [
                ("Total Expenses", f"₹{total_amount:,.2f}"),
                ("Total Transactions", expenses.count()),
                ("Monthly Budget", f"₹{monthly_budget:,.2f}"),
                ("Remaining Budget", f"₹{max(0.0, monthly_budget - total_amount):,.2f}"),
                ("Budget Used (%)", f"{(total_amount / monthly_budget * 100):.1f}%" if monthly_budget > 0 else "N/A"),
            ]
            for row_idx, (m, v) in enumerate(metrics, start=5):
                ws1.cell(row=row_idx, column=1, value=m)
                ws1.cell(row=row_idx, column=2, value=v)

            # Category Breakdown Table in Sheet 1
            ws1['A12'] = "Category Breakdown"
            ws1['A12'].font = Font(name="Calibri", size=12, bold=True)
            ws1['A13'] = "Category"
            ws1['B13'] = "Amount (₹)"
            ws1['C13'] = "Percentage (%)"
            ws1['D13'] = "Transaction Count"
            for col in ['A13', 'B13', 'C13', 'D13']:
                ws1[col].fill = header_fill
                ws1[col].font = header_font

            row = 14
            for cat_code, cat_label in Expense.CATEGORY_CHOICES:
                cat_total = float(expenses.filter(category=cat_code).aggregate(total=Sum('amount'))['total'] or 0)
                cat_count = expenses.filter(category=cat_code).count()
                if cat_total > 0:
                    ws1.cell(row=row, column=1, value=cat_label)
                    ws1.cell(row=row, column=2, value=cat_total)
                    ws1.cell(row=row, column=3, value=round((cat_total / total_amount * 100), 1) if total_amount > 0 else 0)
                    ws1.cell(row=row, column=4, value=cat_count)
                    row += 1

            ws1.column_dimensions['A'].width = 25
            ws1.column_dimensions['B'].width = 18
            ws1.column_dimensions['C'].width = 18
            ws1.column_dimensions['D'].width = 18

            # Sheet 2: All Expenses
            ws2 = wb.create_sheet(title="Transactions")
            ws2.views.sheetView[0].showGridLines = True
            tx_headers = ["ID", "Date", "Title", "Category", "Amount (₹)", "Currency", "Description"]
            for col_idx, h in enumerate(tx_headers, start=1):
                cell = ws2.cell(row=1, column=col_idx, value=h)
                cell.fill = header_fill
                cell.font = header_font

            for row_idx, exp in enumerate(expenses.order_by('-date'), start=2):
                ws2.cell(row=row_idx, column=1, value=exp.id)
                ws2.cell(row=row_idx, column=2, value=exp.date.strftime('%Y-%m-%d'))
                ws2.cell(row=row_idx, column=3, value=exp.title)
                ws2.cell(row=row_idx, column=4, value=exp.get_category_display() if hasattr(exp, 'get_category_display') else exp.category)
                ws2.cell(row=row_idx, column=5, value=float(exp.amount))
                ws2.cell(row=row_idx, column=6, value=getattr(exp, 'currency', 'INR') or 'INR')
                ws2.cell(row=row_idx, column=7, value=exp.description or '')

            for col in ['A', 'B', 'C', 'D', 'E', 'F', 'G']:
                ws2.column_dimensions[col].width = 18
            ws2.column_dimensions['C'].width = 30
            ws2.column_dimensions['G'].width = 35

            # Sheet 3: Recurring & Subscriptions
            ws3 = wb.create_sheet(title="Recurring & Subscriptions")
            ws3.views.sheetView[0].showGridLines = True
            rec_headers = ["ID", "Title", "Amount (₹)", "Frequency", "Category", "Next Date", "Is Subscription", "Active"]
            for col_idx, h in enumerate(rec_headers, start=1):
                cell = ws3.cell(row=1, column=col_idx, value=h)
                cell.fill = header_fill
                cell.font = header_font

            recurrings = RecurringExpense.objects.filter(user=user)
            for row_idx, r in enumerate(recurrings, start=2):
                ws3.cell(row=row_idx, column=1, value=r.id)
                ws3.cell(row=row_idx, column=2, value=r.title)
                ws3.cell(row=row_idx, column=3, value=float(r.amount))
                ws3.cell(row=row_idx, column=4, value=r.frequency.title())
                ws3.cell(row=row_idx, column=5, value=r.category.title())
                ws3.cell(row=row_idx, column=6, value=r.next_date.strftime('%Y-%m-%d'))
                ws3.cell(row=row_idx, column=7, value="Yes" if getattr(r, 'is_subscription', False) else "No")
                ws3.cell(row=row_idx, column=8, value="Active" if r.is_active else "Paused")

            for col in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']:
                ws3.column_dimensions[col].width = 18
            ws3.column_dimensions['B'].width = 28

            buffer = io.BytesIO()
            wb.save(buffer)
            excel_data = buffer.getvalue()
            buffer.close()

            response = HttpResponse(
                excel_data,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="expenses_{timezone.now().strftime("%Y%m%d")}.xlsx"'
            return response

        except Exception as e:
            return Response({'error': f'Failed to generate Excel report: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CurrencyExchangeRatesView(generics.GenericAPIView):
    """
    Get current exchange rates (cached / fallback).
    GET /api/reports/currency-rates/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        base_currency = getattr(request.user, 'currency', 'INR') or 'INR'
        
        # Standard exchange rates relative to USD
        usd_rates = {
            'USD': 1.0,
            'INR': 83.35,
            'EUR': 0.92,
            'GBP': 0.79,
            'CAD': 1.36,
            'AUD': 1.52,
            'JPY': 155.20,
        }

        # Compute relative to user's base currency
        base_to_usd = usd_rates.get(base_currency, 83.35)
        rates_for_user = {}
        for cur, rate_to_usd in usd_rates.items():
            rates_for_user[cur] = round(rate_to_usd / base_to_usd, 4)

        return Response({
            'base_currency': base_currency,
            'rates': rates_for_user,
            'usd_rates': usd_rates,
            'last_updated': timezone.now().isoformat()
        })
