export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  currency: string;
  monthly_budget?: number;
  profilePicture?: string;
  dark_mode?: boolean;
  alert_threshold?: number;
  enable_alerts?: boolean;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  userId?: string;
  createdAt?: string;
  currency?: string;
  original_amount?: number;
  exchange_rate?: number;
  is_subscription?: boolean;
}

export interface RecurringExpense {
  id?: string;
  title: string;
  amount: number;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date?: string | null;
  next_date?: string;
  is_active?: boolean;
  description?: string;
  is_subscription?: boolean;
  rollover_budget?: boolean;
}

export interface CategoryBudget {
  id?: number | null;
  category: string;
  category_label?: string;
  monthly_limit: number;
  rollover: boolean;
  spent_this_month: number;
  remaining: number;
  percentage_used: number;
  is_over_budget?: boolean;
}

export interface GoalContribution {
  id?: number;
  amount: number;
  note?: string;
  date: string;
  created_at?: string;
}

export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  icon: string;
  color: string;
  description?: string;
  is_completed: boolean;
  progress_percentage: number;
  created_at?: string;
  contributions?: GoalContribution[];
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface AIInsight {
  type: string;
  icon: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'danger' | 'success';
}

export interface AIPrediction {
  predicted_total: number;
  by_category: Record<string, number>;
  historical_months: number;
  confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  next_month: string;
  message?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}
