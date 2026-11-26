import React, { useState, useEffect } from 'react';
import { userApi, categoryBudgetApi } from '../../services/api';
import { CategoryBudget } from '../../types';
import { Save, AlertTriangle, Layers, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../../utils/currency';

const BudgetTab: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [budgetData, setBudgetData] = useState({
    monthlyBudget: 25000,
    alertThreshold: 80,
    enableAlerts: true,
    currentMonthExpenses: 0,
    budgetRemaining: 0,
  });

  // Category Budgets
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [newCat, setNewCat] = useState({
    category: 'food',
    monthly_limit: '',
    rollover: false,
  });
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const categories = [
    { code: 'food', label: 'Food' },
    { code: 'transport', label: 'Transport' },
    { code: 'entertainment', label: 'Entertainment' },
    { code: 'utilities', label: 'Utilities' },
    { code: 'healthcare', label: 'Healthcare' },
    { code: 'shopping', label: 'Shopping' },
    { code: 'education', label: 'Education' },
    { code: 'travel', label: 'Travel' },
    { code: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchBudgetSettings();
    loadCategoryBudgets();
  }, []);

  const fetchBudgetSettings = async () => {
    try {
      setIsInitialLoading(true);
      const data = await userApi.getSettings();
      setBudgetData({
        monthlyBudget: data.monthly_budget || 25000,
        alertThreshold: data.alert_threshold || 80,
        enableAlerts: data.enable_alerts !== false,
        currentMonthExpenses: data.budget_stats?.current_month_expenses || data.current_month_expenses || 0,
        budgetRemaining: data.budget_stats?.budget_remaining || data.budget_remaining || 0,
      });
    } catch {
      toast.error('Failed to load budget settings');
    } finally {
      setIsInitialLoading(false);
    }
  };

  const loadCategoryBudgets = async () => {
    try {
      const data = await categoryBudgetApi.getBudgets();
      setCategoryBudgets(data);
    } catch {
      // ignore
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setBudgetData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parseFloat(value) || 0,
    }));
  };

  const handleSubmitOverall = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await userApi.updateSettings({
        monthly_budget: budgetData.monthlyBudget,
        alert_threshold: budgetData.alertThreshold,
        enable_alerts: budgetData.enableAlerts,
      });
      await fetchBudgetSettings();
      toast.success('Overall budget settings saved!');
    } catch {
      toast.error('Failed to save budget settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategoryBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.monthly_limit || parseFloat(newCat.monthly_limit) <= 0) {
      toast.error('Please enter a valid monthly limit');
      return;
    }

    try {
      setIsSavingCategory(true);
      await categoryBudgetApi.setBudget(
        newCat.category,
        parseFloat(newCat.monthly_limit),
        newCat.rollover
      );
      setNewCat({ category: 'food', monthly_limit: '', rollover: false });
      await loadCategoryBudgets();
    } catch {
      toast.error('Failed to save category limit');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategoryBudget = async (id?: number | null) => {
    if (!id) return;
    try {
      await categoryBudgetApi.deleteBudget(id);
      setCategoryBudgets((prev) => prev.filter((b) => b.id !== id));
    } catch {
      toast.error('Failed to remove limit');
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const budgetPercentage = budgetData.monthlyBudget > 0 ? (budgetData.currentMonthExpenses / budgetData.monthlyBudget) * 100 : 0;
  const isOverBudget = budgetPercentage > 100;
  const isNearThreshold = budgetPercentage >= budgetData.alertThreshold;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Budget Management</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure overall monthly budget, alert thresholds, and per-category monthly limits with rollover options.
        </p>
      </div>

      {/* Current Month Overview Card */}
      <div className="bg-gray-50 dark:bg-gray-750 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
          Current Month Spending Overview
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Spent This Month</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatIndianCurrency(budgetData.currentMonthExpenses)}
            </p>
          </div>
          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Budget</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatIndianCurrency(budgetData.monthlyBudget)}
            </p>
          </div>
          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Remaining Budget</p>
            <p className={`text-2xl font-bold mt-1 ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatIndianCurrency(Math.max(0, budgetData.budgetRemaining))}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isOverBudget ? 'bg-red-500' : isNearThreshold ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
          <span>0%</span>
          <span>{budgetPercentage.toFixed(1)}% used</span>
          <span>100%</span>
        </div>

        {isOverBudget && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span className="text-red-700 dark:text-red-300 text-xs font-semibold">
              Warning: You have exceeded your monthly budget by {formatIndianCurrency(budgetData.currentMonthExpenses - budgetData.monthlyBudget)}!
            </span>
          </div>
        )}
      </div>

      {/* Section 1: Overall Monthly Budget Form */}
      <form onSubmit={handleSubmitOverall} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-base text-gray-900 dark:text-white mb-2">Overall Budget Limit</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="monthlyBudget" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Total Monthly Budget (₹) *
            </label>
            <input
              type="number"
              id="monthlyBudget"
              name="monthlyBudget"
              value={budgetData.monthlyBudget}
              onChange={handleChange}
              min="100"
              step="100"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div>
            <label htmlFor="alertThreshold" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Alert Trigger Threshold (%) *
            </label>
            <input
              type="number"
              id="alertThreshold"
              name="alertThreshold"
              value={budgetData.alertThreshold}
              onChange={handleChange}
              min="10"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="enableAlerts"
            name="enableAlerts"
            checked={budgetData.enableAlerts}
            onChange={handleChange}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="enableAlerts" className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Enable in-app notifications when spend crosses 80% and 100%
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Saving...' : 'Save Overall Budget'}</span>
          </button>
        </div>
      </form>

      {/* Section 2: Per-Category Monthly Limits & Rollover */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-6">
        <div>
          <h4 className="font-semibold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            Category-Specific Monthly Budgets & Rollovers
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Set individual limits per category with visual progress bars and rollover toggle for unused surplus.
          </p>
        </div>

        {/* Add Category Budget Form */}
        <form onSubmit={handleAddCategoryBudget} className="p-4 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={newCat.category}
              onChange={(e) => setNewCat({ ...newCat, category: e.target.value })}
              className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {categories.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Monthly Limit (₹)
            </label>
            <input
              type="number"
              min="1"
              value={newCat.monthly_limit}
              onChange={(e) => setNewCat({ ...newCat, monthly_limit: e.target.value })}
              placeholder="e.g., 5000"
              className="w-full text-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="catRollover"
              checked={newCat.rollover}
              onChange={(e) => setNewCat({ ...newCat, rollover: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
            />
            <label htmlFor="catRollover" className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Rollover unused budget
            </label>
          </div>

          <button
            type="submit"
            disabled={isSavingCategory}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Set Limit
          </button>
        </form>

        {/* Existing Category Budgets Progress Bars */}
        <div className="space-y-4">
          {categoryBudgets.filter((b) => b.monthly_limit > 0).length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 py-3 text-center">
              No category limits configured yet. Add limits above to track category burn.
            </p>
          ) : (
            categoryBudgets
              .filter((b) => b.monthly_limit > 0)
              .map((b) => {
                const pct = Math.min(100, b.percentage_used || 0);
                const isOver = (b.percentage_used || 0) > 100;
                return (
                  <div key={b.category} className="p-3.5 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white capitalize">
                          {b.category_label || b.category}
                        </span>
                        {b.rollover && (
                          <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                            Rollover ON
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {formatIndianCurrency(b.spent_this_month)} / {formatIndianCurrency(b.monthly_limit)} ({b.percentage_used.toFixed(1)}%)
                        </span>
                        {b.id && (
                          <button
                            onClick={() => handleDeleteCategoryBudget(b.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                            title="Remove category budget"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-purple-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetTab;
