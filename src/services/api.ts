// src/services/api.ts
import axios from "axios";
import toast from "react-hot-toast";
import { 
  Expense, 
  User, 
  RecurringExpense, 
  SavingsGoal, 
  CategoryBudget, 
  NotificationItem, 
  AIInsight, 
  AIPrediction 
} from "../types";

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

const getAccessToken = () => localStorage.getItem("auth_token");
const getRefreshToken = () => localStorage.getItem("refresh_token");
const setAccessToken = (token: string) => localStorage.setItem("auth_token", token);

export const clearAuth = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_data");
};

// Attach JWT automatically
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh expired access token
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearAuth();
        return Promise.reject(error);
      }

      try {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = axios
            .post(`${API_BASE_URL}/token/refresh/`, { refresh: refreshToken })
            .then((res) => {
              const newAccess = res.data.access;
              setAccessToken(newAccess);
              api.defaults.headers.common["Authorization"] = `Bearer ${newAccess}`;
              return newAccess;
            })
            .finally(() => (isRefreshing = false));
        }

        const newAccessToken = await (refreshPromise as Promise<string>);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        clearAuth();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

// ─── Expense API ─────────────────────────────────────────────────────────────
export const expenseApi = {
  async getExpenses(): Promise<Expense[]> {
    try {
      const res = await api.get("/expenses/");
      return res.data;
    } catch (error: any) {
      console.error("Failed to fetch expenses:", error.response?.data || error.message);
      return [];
    }
  },
  async createExpense(data: Omit<Expense, "id" | "userId" | "createdAt">): Promise<Expense> {
    try {
      const res = await api.post("/expenses/", data);
      toast.success("Expense added!");
      return res.data.expense || res.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Failed to create expense";
      toast.error(errorMsg);
      throw error;
    }
  },
  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
    try {
      const res = await api.put(`/expenses/${id}/`, data);
      toast.success("Expense updated!");
      return res.data.expense || res.data;
    } catch (error: any) {
      toast.error("Failed to update expense");
      throw error;
    }
  },
  async deleteExpense(id: string): Promise<void> {
    try {
      await api.delete(`/expenses/${id}/`);
      toast.success("Expense deleted!");
    } catch (error: any) {
      toast.error("Failed to delete expense");
      throw error;
    }
  },
  async getExpensesGroupedByMonth(year?: number, month?: number): Promise<any> {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const res = await api.get("/expenses/monthly_grouped/", { params });
    return res.data;
  },
};

// ─── User API ────────────────────────────────────────────────────────────────
export const userApi = {
  async getProfile(): Promise<User> {
    const res = await api.get("/profile/");
    const userData = res.data.user || res.data;
    localStorage.setItem("user_data", JSON.stringify(userData));
    return userData;
  },
  async updateProfile(userData: Partial<User> | FormData): Promise<User> {
    const config = userData instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : {};
    const res = await api.put("/profile/", userData, config);
    const updated = res.data.user || res.data;
    localStorage.setItem("user_data", JSON.stringify(updated));
    toast.success("Profile updated!");
    return updated;
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post("/change-password/", {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: newPassword,
    });
    toast.success("Password changed!");
  },
  async getSettings(): Promise<any> {
    try {
      const res = await api.get("/budget/");
      return res.data;
    } catch {
      return { monthly_budget: 25000, alert_threshold: 80, enable_alerts: true };
    }
  },
  async updateSettings(settingsData: any): Promise<any> {
    const res = await api.put("/budget/", settingsData);
    toast.success("Settings updated!");
    return res.data;
  },
};

// ─── Reports API ─────────────────────────────────────────────────────────────
export const reportsApi = {
  async getReports(startDate?: string, endDate?: string) {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const res = await api.get("/reports/", { params });
    return res.data;
  },
  async getSpendingTrend(viewType: 'monthly' | 'yearly' = 'monthly', months: number = 12) {
    const res = await api.get("/reports/spending_trend/", { params: { view: viewType, months } });
    return res.data;
  },
  async getCategorySummary(startDate?: string, endDate?: string) {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const res = await api.get("/reports/category_summary/", { params });
    return res.data;
  },
  async getCurrencyRates(): Promise<{ base_currency: string; rates: Record<string, number> }> {
    const res = await api.get("/reports/currency-rates/");
    return res.data;
  },
  async downloadPDF(startDate?: string, endDate?: string, category?: string) {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (category) params.category = category;
    
    const res = await api.get("/reports/export/pdf/", {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `expense_report_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },
  async downloadExcel(startDate?: string, endDate?: string, category?: string) {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (category) params.category = category;
    
    const res = await api.get("/reports/export/excel/", {
      params,
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `expense_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  }
};

// ─── Recurring Expenses API ──────────────────────────────────────────────────
export const recurringApi = {
  async getRecurringExpenses(): Promise<RecurringExpense[]> {
    try {
      const res = await api.get("/recurring/");
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },
  async createRecurringExpense(data: RecurringExpense): Promise<RecurringExpense> {
    const res = await api.post("/recurring/", data);
    toast.success("Recurring expense created!");
    return res.data;
  },
  async updateRecurringExpense(id: string, data: Partial<RecurringExpense>): Promise<RecurringExpense> {
    const res = await api.put(`/recurring/${id}/`, data);
    toast.success("Recurring expense updated!");
    return res.data;
  },
  async deleteRecurringExpense(id: string): Promise<void> {
    await api.delete(`/recurring/${id}/`);
    toast.success("Recurring expense deleted!");
  },
  async toggleActive(id: string): Promise<RecurringExpense> {
    const res = await api.post(`/recurring/${id}/toggle_active/`);
    return res.data;
  },
  async generateRecurringExpenses(): Promise<{ generated_count: number }> {
    const res = await api.post("/recurring/generate_all_recurring_expenses/");
    toast.success(`Generated ${res.data.generated_count} recurring expenses!`);
    return res.data;
  },
};

// ─── Savings Goals API ───────────────────────────────────────────────────────
export const savingsApi = {
  async getGoals(): Promise<SavingsGoal[]> {
    try {
      const res = await api.get("/savings-goals/");
      return res.data;
    } catch {
      return [];
    }
  },
  async createGoal(data: Partial<SavingsGoal>): Promise<SavingsGoal> {
    const res = await api.post("/savings-goals/", data);
    toast.success("Savings goal created!");
    return res.data;
  },
  async updateGoal(id: number, data: Partial<SavingsGoal>): Promise<SavingsGoal> {
    const res = await api.put(`/savings-goals/${id}/`, data);
    toast.success("Goal updated!");
    return res.data;
  },
  async deleteGoal(id: number): Promise<void> {
    await api.delete(`/savings-goals/${id}/`);
    toast.success("Goal deleted!");
  },
  async contribute(id: number, amount: number, note?: string, date?: string): Promise<any> {
    const res = await api.post(`/savings-goals/${id}/contribute/`, { amount, note, date });
    toast.success("Contribution recorded!");
    return res.data;
  }
};

// ─── Category Budgets API ────────────────────────────────────────────────────
export const categoryBudgetApi = {
  async getBudgets(): Promise<CategoryBudget[]> {
    try {
      const res = await api.get("/budgets/categories/");
      return res.data;
    } catch {
      return [];
    }
  },
  async setBudget(category: string, monthly_limit: number, rollover: boolean = false): Promise<CategoryBudget> {
    const res = await api.post("/budgets/categories/", { category, monthly_limit, rollover });
    toast.success("Category budget saved!");
    return res.data;
  },
  async deleteBudget(id: number): Promise<void> {
    await api.delete(`/budgets/categories/${id}/`);
    toast.success("Category budget removed!");
  }
};

// ─── Notifications & Alerts API ──────────────────────────────────────────────
export const notificationApi = {
  async getNotifications(): Promise<{ notifications: NotificationItem[]; unread_count: number }> {
    try {
      const res = await api.get("/notifications/");
      return res.data;
    } catch {
      return { notifications: [], unread_count: 0 };
    }
  },
  async markAsRead(notificationId: number | string): Promise<void> {
    await api.post(`/notifications/mark-read/${notificationId}/`);
  },
  async markAllRead(): Promise<void> {
    await api.post("/notifications/mark-all-read/");
    toast.success("All notifications marked as read");
  },
  async checkAlerts(): Promise<any> {
    const res = await api.post("/notifications/check-alerts/");
    return res.data;
  }
};

// ─── AI Endpoints API ────────────────────────────────────────────────────────
export const aiApi = {
  async getInsights(): Promise<{ insights: AIInsight[] }> {
    try {
      const res = await api.get("/ai/insights/");
      return res.data;
    } catch {
      return { insights: [] };
    }
  },
  async autoCategorize(description: string): Promise<{ category: string; confidence: string }> {
    const res = await api.post("/ai/categorize/", { description });
    return res.data;
  },
  async getPrediction(): Promise<AIPrediction> {
    const res = await api.get("/ai/predict/");
    return res.data;
  },
  async chatWithAssistant(message: string): Promise<{ response: string; timestamp: string }> {
    const res = await api.post("/ai/chat/", { message });
    return res.data;
  },
  async scanReceipt(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("image", file);
    const res = await api.post("/ai/ocr/", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  }
};

export default api;
