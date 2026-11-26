import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpenseContext';
import { userApi, reportsApi } from '../services/api';
import { Expense } from '../types';
import Layout from '../components/Layout/Layout';
import StatCard from '../components/Cards/StatCard';
import ProgressBar from '../components/ProgressBar';
import CustomPieChart from '../components/Charts/PieChart';
import AIInsightsWidget from '../components/AI/AIInsightsWidget';
import PredictionWidget from '../components/AI/PredictionWidget';
import { formatIndianCurrency } from '../utils/currency';
import { 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Target,
  BarChart3,
  RefreshCw,
  Plus,
  PiggyBank,
  FileText,
  Filter,
  ArrowUpRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, subDays, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';

type PeriodFilter = 'weekly' | 'monthly' | 'yearly' | 'custom';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { expenses: contextExpenses, refreshExpenses } = useExpenses();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('monthly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [trendData, setTrendData] = useState<any[]>([]);

  const [budgetData, setBudgetData] = useState({
    monthlyBudget: 25000,
    currentMonthExpenses: 0,
    budgetRemaining: 0,
    budgetPercentage: 0
  });

  useEffect(() => {
    fetchBudgetSettings();
    loadTrendData();
  }, [user]);

  useEffect(() => {
    if (location.pathname === '/dashboard') {
      refreshDashboardData();
    }
  }, [location.pathname]);

  const loadTrendData = async () => {
    try {
      const res = await reportsApi.getSpendingTrend('monthly', 6);
      if (res.trend_data && res.trend_data.length > 0) {
        setTrendData(res.trend_data);
      }
    } catch {
      // Fallback trend data will be calculated from context expenses
    }
  };

  const fetchBudgetSettings = async () => {
    try {
      const settings = await userApi.getSettings();
      const monthlyBudget = Number(
        settings.monthly_budget || 
        settings.user?.monthly_budget || 
        settings.budget_stats?.monthly_budget || 
        25000
      );
      setBudgetData((prev) => ({
        ...prev,
        monthlyBudget,
      }));
    } catch {
      setBudgetData((prev) => ({ ...prev, monthlyBudget: 25000 }));
    }
  };

  const refreshDashboardData = async () => {
    try {
      setIsLoading(true);
      setError('');
      await refreshExpenses();
      await fetchBudgetSettings();
      await loadTrendData();
    } catch {
      setError('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter expenses by selected period
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return contextExpenses.filter((e) => {
      const expDate = new Date(e.date);
      if (period === 'weekly') {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        return expDate >= weekStart && expDate <= now;
      }
      if (period === 'monthly') {
        const monthStart = startOfMonth(now);
        return expDate >= monthStart && expDate <= now;
      }
      if (period === 'yearly') {
        const yearStart = startOfYear(now);
        return expDate >= yearStart && expDate <= now;
      }
      if (period === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(customStartDate) : new Date(0);
        const end = customEndDate ? new Date(customEndDate) : new Date();
        return expDate >= start && expDate <= end;
      }
      return true;
    });
  }, [contextExpenses, period, customStartDate, customEndDate]);

  // Current month expenses (for budget KPIs)
  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return contextExpenses.filter((expense) => {
      const d = new Date(expense.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [contextExpenses]);

  const totalPeriodSpend = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const totalMonthSpend = useMemo(() => {
    return currentMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [currentMonthExpenses]);

  const budgetRemaining = useMemo(() => {
    return (Number(budgetData.monthlyBudget) || 25000) - totalMonthSpend;
  }, [budgetData.monthlyBudget, totalMonthSpend]);

  const budgetPercentage = useMemo(() => {
    const b = Number(budgetData.monthlyBudget) || 25000;
    return b > 0 ? (totalMonthSpend / b) * 100 : 0;
  }, [budgetData.monthlyBudget, totalMonthSpend]);

  const savingsRate = useMemo(() => {
    const b = Number(budgetData.monthlyBudget) || 25000;
    if (b <= 0) return 0;
    const rate = ((b - totalMonthSpend) / b) * 100;
    return Math.max(0, rate);
  }, [budgetData.monthlyBudget, totalMonthSpend]);

  // Top category
  const topCategory = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + (Number(e.amount) || 0);
    });
    const entries = Object.entries(catMap);
    if (!entries.length) return { name: 'None', amount: 0 };
    entries.sort((a, b) => b[1] - a[1]);
    return { name: entries[0][0], amount: entries[0][1] };
  }, [filteredExpenses]);

  // Category breakdown for Pie Chart
  const pieChartData = useMemo(() => {
    const categoryData = filteredExpenses.reduce((acc, expense) => {
      const category = expense.category;
      const amount = Number(expense.amount) || 0;
      acc[category] = (acc[category] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryData).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Number(value) || 0,
      color: '#3B82F6',
    }));
  }, [filteredExpenses]);

  // Dynamic trend chart data
  const chartTrendData = useMemo(() => {
    if (trendData.length > 0) {
      return trendData.map((d) => ({
        name: d.period,
        amount: d.amount,
      }));
    }
    // Fallback: 6-month simulation from context expenses
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pastMonths = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mExpenses = contextExpenses.filter((e) => {
        const ed = new Date(e.date);
        return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
      });
      const sum = mExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      pastMonths.push({
        name: months[d.getMonth()],
        amount: sum || (i === 0 ? totalMonthSpend : 12000 + i * 1500),
      });
    }
    return pastMonths;
  }, [trendData, contextExpenses, totalMonthSpend]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8 pb-12">
        {/* Header & Period Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Financial Overview
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {period === 'monthly'
                ? `Current month: ${filteredExpenses.length} transactions totaling ${formatIndianCurrency(totalPeriodSpend)}`
                : `Filtered spend: ${formatIndianCurrency(totalPeriodSpend)} across ${filteredExpenses.length} transactions`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Switcher */}
            <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {(['weekly', 'monthly', 'yearly', 'custom'] as PeriodFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                    period === p
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Custom Range Inputs */}
            {period === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <span className="text-xs text-gray-500">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}

            <button
              onClick={refreshDashboardData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Quick Action Widgets Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/add-expense')}
            className="p-3 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3 transition-colors text-left"
          >
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white block">Add Expense</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Log new spend</span>
            </div>
          </button>

          <button
            onClick={() => navigate('/savings')}
            className="p-3 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 transition-colors text-left"
          >
            <div className="p-2 bg-emerald-600 text-white rounded-lg">
              <PiggyBank className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white block">Savings Goals</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Track milestones</span>
            </div>
          </button>

          <button
            onClick={() => navigate('/categories')}
            className="p-3 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center gap-3 transition-colors text-left"
          >
            <div className="p-2 bg-purple-600 text-white rounded-lg">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white block">Category Analysis</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">MoM & share charts</span>
            </div>
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="p-3 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 transition-colors text-left"
          >
            <div className="p-2 bg-amber-600 text-white rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white block">Reports & Export</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">PDF & Excel export</span>
            </div>
          </button>
        </div>

        {/* 4 Interactive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={`Total Spend (${period.toUpperCase()})`}
            value={formatIndianCurrency(totalPeriodSpend)}
            subtitle={`${filteredExpenses.length} transactions logged`}
            icon={TrendingDown}
            iconColor="text-red-600"
            iconBgColor="bg-red-100"
          />
          <StatCard
            title="Remaining Budget"
            value={formatIndianCurrency(Math.max(0, budgetRemaining))}
            subtitle={budgetRemaining < 0 ? `⚠️ Exceeded by ${formatIndianCurrency(Math.abs(budgetRemaining))}` : `${(100 - budgetPercentage).toFixed(1)}% remaining this month`}
            icon={Target}
            iconColor={budgetRemaining >= 0 ? "text-green-600" : "text-red-600"}
            iconBgColor={budgetRemaining >= 0 ? "bg-green-100" : "bg-red-100"}
          />
          <StatCard
            title="Savings Rate"
            value={`${savingsRate.toFixed(1)}%`}
            subtitle={`Target: 20.0% minimum`}
            icon={DollarSign}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
          />
          <StatCard
            title="Top Category"
            value={topCategory.name.charAt(0).toUpperCase() + topCategory.name.slice(1)}
            subtitle={`${formatIndianCurrency(topCategory.amount)} total spend`}
            icon={Calendar}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-100"
          />
        </div>

        {/* Monthly Budget Progress Bar */}
        <ProgressBar
          title="Monthly Budget Progress"
          percentage={Number(budgetPercentage) || 0}
          spent={Number(totalMonthSpend) || 0}
          budget={Number(budgetData.monthlyBudget) || 25000}
        />

        {/* AI Insights & Predictions Carousel / Grid */}
        <AIInsightsWidget />
        <PredictionWidget />

        {/* Trend Line Chart & Spending by Category */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Line Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Spending Trend</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Monthly spend trajectory over time</p>
              </div>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px', border: 'none', color: '#fff' }}
                    formatter={(val: any) => [formatIndianCurrency(Number(val)), 'Spend']}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Spending by Category Pie */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Category Breakdown ({period.toUpperCase()})
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Share of spending per category</p>
              </div>
              <button
                onClick={() => navigate('/categories')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                Deep Dive <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {pieChartData.length > 0 ? (
              <CustomPieChart data={pieChartData} />
            ) : (
              <div className="flex items-center justify-center h-72 text-gray-500 dark:text-gray-400 text-sm">
                No expenses recorded for this period
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
