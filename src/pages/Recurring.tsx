import React, { useState, useEffect, useMemo } from 'react';
import { recurringApi } from '../services/api';
import { RecurringExpense } from '../types';
import { useExpenses } from '../context/ExpenseContext';
import Layout from '../components/Layout/Layout';
import { Plus, RefreshCw, Edit, Trash2, Calendar, CreditCard, Flame, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../utils/currency';

const Recurring: React.FC = () => {
  const { refreshExpenses } = useExpenses();
  const [activeTab, setActiveTab] = useState<'all' | 'subscriptions'>('all');
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    frequency: 'monthly' as const,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    description: '',
    is_subscription: false,
  });

  const categories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Healthcare', 'Shopping', 'Education', 'Travel', 'Other'];
  const frequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  useEffect(() => {
    fetchRecurringExpenses();
  }, []);

  const fetchRecurringExpenses = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await recurringApi.getRecurringExpenses();
      setRecurringExpenses(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to fetch recurring expenses');
      setRecurringExpenses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      food: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
      transport: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
      entertainment: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
      utilities: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300',
      healthcare: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
      shopping: 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300',
      education: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
      travel: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[category.toLowerCase()] || colors.other;
  };

  // Subscription analytics: Monthly and Annual Burn
  const subscriptionStats = useMemo(() => {
    const activeSubs = recurringExpenses.filter((r) => r.is_active && r.is_subscription);
    
    let monthlyBurn = 0;
    activeSubs.forEach((s) => {
      const amt = Number(s.amount) || 0;
      if (s.frequency === 'daily') monthlyBurn += amt * 30;
      else if (s.frequency === 'weekly') monthlyBurn += amt * 4.33;
      else if (s.frequency === 'monthly') monthlyBurn += amt;
      else if (s.frequency === 'yearly') monthlyBurn += amt / 12;
    });

    const annualBurn = monthlyBurn * 12;

    return {
      activeCount: activeSubs.length,
      monthlyBurn: Number(monthlyBurn.toFixed(2)),
      annualBurn: Number(annualBurn.toFixed(2)),
      activeSubs,
    };
  }, [recurringExpenses]);

  const displayedExpenses = useMemo(() => {
    if (activeTab === 'subscriptions') {
      return recurringExpenses.filter((r) => r.is_subscription);
    }
    return recurringExpenses;
  }, [recurringExpenses, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const recurringData: RecurringExpense = {
      title: formData.title,
      amount: parseFloat(formData.amount),
      category: formData.category.toLowerCase(),
      frequency: formData.frequency,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      next_date: formData.start_date,
      is_active: true,
      description: formData.description,
      is_subscription: formData.is_subscription,
    };

    if (editingRecurring && editingRecurring.id) {
      try {
        const updated = await recurringApi.updateRecurringExpense(editingRecurring.id, recurringData);
        setRecurringExpenses((prev) => prev.map((r) => (r.id === editingRecurring.id ? updated : r)));
        resetForm();
      } catch {
        toast.error('Failed to update recurring expense');
      }
    } else {
      try {
        const created = await recurringApi.createRecurringExpense(recurringData);
        setRecurringExpenses((prev) => [...prev, created]);
        resetForm();
      } catch {
        toast.error('Failed to create recurring expense');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      amount: '',
      category: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      description: '',
      is_subscription: false,
    });
    setShowAddForm(false);
    setEditingRecurring(null);
  };

  const handleEdit = (r: RecurringExpense) => {
    setEditingRecurring(r);
    setFormData({
      title: r.title,
      amount: r.amount.toString(),
      category: r.category,
      frequency: r.frequency,
      start_date: r.start_date,
      end_date: r.end_date || '',
      description: r.description || '',
      is_subscription: !!r.is_subscription,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id || !window.confirm('Are you sure you want to delete this?')) return;
    try {
      await recurringApi.deleteRecurringExpense(id);
      setRecurringExpenses((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error('Failed to delete');
    }
  };

  const toggleActive = async (id?: string) => {
    if (!id) return;
    try {
      const updated = await recurringApi.toggleActive(id);
      setRecurringExpenses((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {
      toast.error('Failed to toggle status');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Recurring & Subscriptions
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Automated recurring bills, next-due-date tracking, and subscription burn rate calculation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  setIsGenerating(true);
                  const res = await recurringApi.generateRecurringExpenses();
                  await fetchRecurringExpenses();
                  await refreshExpenses();
                } catch {
                  toast.error('Failed to generate expenses');
                } finally {
                  setIsGenerating(false);
                }
              }}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              Auto-Log Due Now
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Recurring
            </button>
          </div>
        </div>

        {/* Subscription Burn Rate Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              <CreditCard className="w-4 h-4 text-blue-500" />
              <span>Active Subscriptions</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {subscriptionStats.activeCount}
            </div>
            <span className="text-xs text-gray-400 mt-1 block">Software, streaming, services</span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Monthly Recurring Burn</span>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {formatIndianCurrency(subscriptionStats.monthlyBurn)}
            </div>
            <span className="text-xs text-gray-400 mt-1 block">Monthly automated drain</span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span>Annual Recurring Commitment</span>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {formatIndianCurrency(subscriptionStats.annualBurn)}
            </div>
            <span className="text-xs text-gray-400 mt-1 block">Projected 12-month burn</span>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            All Recurring Bills ({recurringExpenses.length})
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'subscriptions'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Subscriptions Only ({recurringExpenses.filter((r) => r.is_subscription).length})
          </button>
        </div>

        {/* Expenses List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {displayedExpenses.length === 0 ? (
            <div className="text-center py-12 px-4">
              <RefreshCw className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                No items in this view
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Add subscriptions or regular recurring bills to automate your budget logging.
              </p>
            </div>
          ) : (
            displayedExpenses.map((exp) => (
              <div
                key={exp.id}
                className="p-5 hover:bg-gray-50/60 dark:hover:bg-gray-750 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                      {exp.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getCategoryColor(exp.category)}`}>
                      {exp.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                      {exp.frequency}
                    </span>
                    {exp.is_subscription && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        Subscription
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {formatIndianCurrency(exp.amount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Next due: <b>{exp.next_date ? new Date(exp.next_date).toLocaleDateString() : 'N/A'}</b>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      exp.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {exp.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => toggleActive(exp.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      exp.is_active
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200'
                    }`}
                  >
                    {exp.is_active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => handleEdit(exp)}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal: Add / Edit Recurring Form */}
        {(showAddForm || editingRecurring) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 animate-slide-up">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {editingRecurring ? 'Edit Recurring / Subscription' : 'Add Recurring / Subscription'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Netflix, Gym Membership, Rent"
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="499"
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {frequencies.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Subscription Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_subscription"
                    checked={formData.is_subscription}
                    onChange={(e) => setFormData({ ...formData, is_subscription: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="is_subscription" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Track as active subscription (included in monthly burn analysis)
                  </label>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors"
                  >
                    {editingRecurring ? 'Save Changes' : 'Create Recurring'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Recurring;
