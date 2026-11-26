"""
Savings Goals, Category Budgets, and Notifications views.
"""
from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from .models import Expense, RecurringExpense, Notification, CategoryBudget, SavingsGoal, GoalContribution


# ─── Savings Goals ViewSet ───────────────────────────────────────────────────

class SavingsGoalViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavingsGoal.objects.filter(user=self.request.user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        goals = self.get_queryset()
        data = []
        for g in goals:
            contribs = [
                {
                    'id': c.id,
                    'amount': float(c.amount),
                    'note': c.note or '',
                    'date': c.date.isoformat(),
                    'created_at': c.created_at.isoformat()
                }
                for c in g.contributions.all()
            ]
            data.append({
                'id': g.id,
                'name': g.name,
                'target_amount': float(g.target_amount),
                'current_amount': float(g.current_amount),
                'target_date': g.target_date.isoformat() if g.target_date else None,
                'icon': g.icon,
                'color': g.color,
                'description': g.description or '',
                'is_completed': g.is_completed,
                'progress_percentage': g.progress_percentage,
                'created_at': g.created_at.isoformat(),
                'contributions': contribs,
            })
        return Response(data)

    def create(self, request, *args, **kwargs):
        d = request.data
        name = d.get('name', '').strip()
        target_amount = d.get('target_amount')
        if not name or not target_amount:
            return Response({'error': 'Name and target amount are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        target_date = d.get('target_date') or None
        if target_date == '':
            target_date = None

        goal = SavingsGoal.objects.create(
            user=request.user,
            name=name,
            target_amount=Decimal(str(target_amount)),
            current_amount=Decimal(str(d.get('current_amount', 0))),
            target_date=target_date,
            icon=d.get('icon', 'other'),
            color=d.get('color', 'blue'),
            description=d.get('description', ''),
        )
        return Response({
            'id': goal.id,
            'name': goal.name,
            'target_amount': float(goal.target_amount),
            'current_amount': float(goal.current_amount),
            'target_date': goal.target_date.isoformat() if goal.target_date else None,
            'icon': goal.icon,
            'color': goal.color,
            'description': goal.description,
            'is_completed': goal.is_completed,
            'progress_percentage': goal.progress_percentage,
            'contributions': []
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        goal = self.get_object()
        d = request.data
        if 'name' in d: goal.name = d['name']
        if 'target_amount' in d: goal.target_amount = Decimal(str(d['target_amount']))
        if 'target_date' in d: goal.target_date = d['target_date'] or None
        if 'icon' in d: goal.icon = d['icon']
        if 'color' in d: goal.color = d['color']
        if 'description' in d: goal.description = d['description']
        goal.is_completed = goal.current_amount >= goal.target_amount
        goal.save()
        return Response({
            'id': goal.id,
            'name': goal.name,
            'target_amount': float(goal.target_amount),
            'current_amount': float(goal.current_amount),
            'progress_percentage': goal.progress_percentage,
            'is_completed': goal.is_completed,
        })

    def destroy(self, request, *args, **kwargs):
        goal = self.get_object()
        goal.delete()
        return Response({'message': 'Goal deleted successfully'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def contribute(self, request, pk=None):
        goal = self.get_object()
        amount = request.data.get('amount')
        note = request.data.get('note', '')
        contrib_date = request.data.get('date', timezone.now().date().isoformat())
        
        if not amount or float(amount) <= 0:
            return Response({'error': 'Amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

        contrib = GoalContribution.objects.create(
            goal=goal,
            amount=Decimal(str(amount)),
            note=note,
            date=contrib_date
        )
        goal.refresh_from_db()

        # Create milestone or completion notification if goal completed
        if goal.is_completed:
            Notification.objects.create(
                user=request.user,
                title=f"Goal Reached: {goal.name}! 🎉",
                message=f"Congratulations! You reached your savings goal of ₹{float(goal.target_amount):,.2f}.",
                type='goal_completed'
            )

        return Response({
            'contribution_id': contrib.id,
            'new_total': float(goal.current_amount),
            'progress_percentage': goal.progress_percentage,
            'is_completed': goal.is_completed
        })


# ─── Category Budget ViewSet ─────────────────────────────────────────────────

class CategoryBudgetViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        budgets = CategoryBudget.objects.filter(user=request.user)
        today = timezone.now().date()
        month_start = today.replace(day=1)
        
        budget_map = {b.category: b for b in budgets}
        results = []
        
        for code, label in Expense.CATEGORY_CHOICES:
            b = budget_map.get(code)
            spent = Expense.objects.filter(
                user=request.user, category=code, date__gte=month_start, date__lte=today
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            monthly_limit = float(b.monthly_limit) if b else 0.0
            rollover = b.rollover if b else False
            spent_f = float(spent)
            pct = round((spent_f / monthly_limit * 100), 1) if monthly_limit > 0 else 0.0

            results.append({
                'id': b.id if b else None,
                'category': code,
                'category_label': label,
                'monthly_limit': monthly_limit,
                'rollover': rollover,
                'spent_this_month': spent_f,
                'remaining': max(0.0, monthly_limit - spent_f) if monthly_limit > 0 else 0.0,
                'percentage_used': pct,
                'is_over_budget': spent_f > monthly_limit if monthly_limit > 0 else False
            })
        return Response(results)

    def create(self, request):
        d = request.data
        category = d.get('category')
        monthly_limit = d.get('monthly_limit')
        rollover = d.get('rollover', False)

        if not category or monthly_limit is None:
            return Response({'error': 'Category and monthly_limit are required'}, status=status.HTTP_400_BAD_REQUEST)

        obj, created = CategoryBudget.objects.update_or_create(
            user=request.user,
            category=category,
            defaults={
                'monthly_limit': Decimal(str(monthly_limit)),
                'rollover': bool(rollover)
            }
        )
        return Response({
            'id': obj.id,
            'category': obj.category,
            'monthly_limit': float(obj.monthly_limit),
            'rollover': obj.rollover,
            'created': created
        }, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        try:
            b = CategoryBudget.objects.get(pk=pk, user=request.user)
            if 'monthly_limit' in request.data:
                b.monthly_limit = Decimal(str(request.data['monthly_limit']))
            if 'rollover' in request.data:
                b.rollover = bool(request.data['rollover'])
            b.save()
            return Response({
                'id': b.id,
                'category': b.category,
                'monthly_limit': float(b.monthly_limit),
                'rollover': b.rollover
            })
        except CategoryBudget.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    def destroy(self, request, pk=None):
        try:
            CategoryBudget.objects.get(pk=pk, user=request.user).delete()
            return Response({'message': 'Budget limit removed'})
        except CategoryBudget.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)


# ─── Enhanced Notifications & Alert Triggering ──────────────────────────────

class CheckAlertsView(generics.GenericAPIView):
    """
    Check budgets (overall & per category) and recurring bills, then create notifications.
    POST /api/notifications/check-alerts/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        today = timezone.now().date()
        month_start = today.replace(day=1)
        created_alerts = []

        # 1. Overall monthly budget check
        monthly_budget = float(user.monthly_budget) if hasattr(user, 'monthly_budget') else 0
        if monthly_budget > 0:
            spent = Expense.objects.filter(user=user, date__gte=month_start).aggregate(
                total=Sum('amount'))['total'] or 0
            pct = (float(spent) / monthly_budget) * 100
            
            if pct >= 100:
                if not Notification.objects.filter(user=user, type='budget_exceeded', created_at__date=today).exists():
                    Notification.objects.create(
                        user=user,
                        title='Budget Exceeded! 🚨',
                        message=f'You have exceeded your total monthly budget of ₹{monthly_budget:,.2f}. Total spent: ₹{float(spent):,.2f} ({pct:.1f}%).',
                        type='budget_exceeded'
                    )
                    created_alerts.append('Monthly budget exceeded')
            elif pct >= 80:
                if not Notification.objects.filter(user=user, type='budget_80', created_at__date=today).exists():
                    Notification.objects.create(
                        user=user,
                        title='Budget Alert: 80% Spent ⚠️',
                        message=f'You have reached {pct:.1f}% of your monthly budget (₹{float(spent):,.2f} of ₹{monthly_budget:,.2f}).',
                        type='budget_80'
                    )
                    created_alerts.append('Monthly budget 80% reached')

        # 2. Per-category budget check
        category_budgets = CategoryBudget.objects.filter(user=user)
        for cb in category_budgets:
            limit = float(cb.monthly_limit)
            if limit > 0:
                cat_spent = Expense.objects.filter(
                    user=user, category=cb.category, date__gte=month_start
                ).aggregate(total=Sum('amount'))['total'] or 0
                cat_pct = (float(cat_spent) / limit) * 100

                if cat_pct >= 100:
                    if not Notification.objects.filter(
                        user=user, type='category_alert', title__icontains=cb.category, created_at__date=today
                    ).exists():
                        Notification.objects.create(
                            user=user,
                            title=f'{cb.category.title()} Budget Exceeded! 🚨',
                            message=f'You exceeded your {cb.category} limit of ₹{limit:,.2f} (Spent: ₹{float(cat_spent):,.2f}).',
                            type='category_alert'
                        )
                        created_alerts.append(f'{cb.category} budget exceeded')
                elif cat_pct >= 80:
                    if not Notification.objects.filter(
                        user=user, type='category_alert', title__icontains=cb.category, created_at__date=today
                    ).exists():
                        Notification.objects.create(
                            user=user,
                            title=f'{cb.category.title()} Budget at 80% ⚠️',
                            message=f'You used {cat_pct:.1f}% of your {cb.category} budget (₹{float(cat_spent):,.2f} of ₹{limit:,.2f}).',
                            type='category_alert'
                        )
                        created_alerts.append(f'{cb.category} budget 80%')

        # 3. Recurring expenses due within 3 days
        upcoming_window = today + timedelta(days=3)
        due_soon = RecurringExpense.objects.filter(
            user=user, is_active=True, next_date__gte=today, next_date__lte=upcoming_window
        )
        for r in due_soon:
            days_left = (r.next_date - today).days
            day_label = 'today' if days_left == 0 else f'in {days_left} day{"s" if days_left > 1 else ""}'
            if not Notification.objects.filter(
                user=user, type='recurring_due', title__icontains=r.title, created_at__date=today
            ).exists():
                Notification.objects.create(
                    user=user,
                    title=f'Upcoming Bill: {r.title} 📅',
                    message=f'Your recurring expense "{r.title}" for ₹{float(r.amount):,.2f} is due {day_label} ({r.next_date}).',
                    type='recurring_due'
                )
                created_alerts.append(f'Bill due: {r.title}')

        return Response({
            'message': f'Checked alerts. Created {len(created_alerts)} new notification(s).',
            'created_alerts': created_alerts
        })


class MarkAllReadView(generics.GenericAPIView):
    """Mark all notifications as read."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated_count = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read', 'count': updated_count})


class MarkSingleReadView(generics.GenericAPIView):
    """Mark a single notification as read."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            n = Notification.objects.get(pk=pk, user=request.user)
            n.is_read = True
            n.save()
            return Response({'message': 'Notification marked as read', 'id': pk})
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)
