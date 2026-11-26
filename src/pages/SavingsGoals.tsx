import React, { useState, useEffect } from 'react';
import { savingsApi } from '../services/api';
import { SavingsGoal } from '../types';
import Layout from '../components/Layout/Layout';
import { formatIndianCurrency } from '../utils/currency';
import { 
  PiggyBank, 
  Plus, 
  Target, 
  CheckCircle, 
  Calendar, 
  DollarSign, 
  Trash2, 
  Sparkles,
  TrendingUp,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const SavingsGoals: React.FC = () => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  // Form states
  const [goalForm, setGoalForm] = useState({
    name: '',
    target_amount: '',
    current_amount: '0',
    target_date: '',
    icon: 'other',
    color: 'blue',
    description: '',
  });

  const [contribForm, setContribForm] = useState({
    amount: '',
    note: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setIsLoading(true);
      const data = await savingsApi.getGoals();
      setGoals(data);
    } catch {
      toast.error('Failed to load savings goals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.name || !goalForm.target_amount) {
      toast.error('Please enter goal name and target amount');
      return;
    }

    try {
      await savingsApi.createGoal({
        name: goalForm.name,
        target_amount: parseFloat(goalForm.target_amount),
        current_amount: parseFloat(goalForm.current_amount || '0'),
        target_date: goalForm.target_date || null,
        icon: goalForm.icon,
        color: goalForm.color,
        description: goalForm.description,
      });
      setShowAddModal(false);
      setGoalForm({
        name: '',
        target_amount: '',
        current_amount: '0',
        target_date: '',
        icon: 'other',
        color: 'blue',
        description: '',
      });
      loadGoals();
    } catch {
      toast.error('Failed to create goal');
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !contribForm.amount) return;

    try {
      await savingsApi.contribute(
        selectedGoal.id,
        parseFloat(contribForm.amount),
        contribForm.note,
        contribForm.date
      );
      setShowContributeModal(false);
      setContribForm({
        amount: '',
        note: '',
        date: new Date().toISOString().split('T')[0],
      });
      loadGoals();
    } catch {
      toast.error('Failed to log contribution');
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this savings goal?')) return;
    try {
      await savingsApi.deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch {
      toast.error('Failed to delete goal');
    }
  };

  const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount || 0), 0);
  const completedGoals = goals.filter((g) => g.is_completed).length;

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PiggyBank className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              Savings Goals
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Plan, log contributions, and reach your targets with visual milestones.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Savings Goal</span>
          </button>
        </div>

        {/* Overview KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Saved Across Goals</span>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatIndianCurrency(totalSaved)}
            </div>
            <span className="text-xs text-gray-500 mt-1 block">
              Out of {formatIndianCurrency(totalTarget)} target
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Overall Progress</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : '0.0'}%
            </div>
            <span className="text-xs text-gray-500 mt-1 block">
              {completedGoals} of {goals.length} goals achieved
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Goals</span>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {goals.length - completedGoals}
            </div>
            <span className="text-xs text-gray-500 mt-1 block">In progress</span>
          </div>
        </div>

        {/* Goals Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-gray-500 mt-3">Loading savings goals...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
            <PiggyBank className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Savings Goals Yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1 mb-5">
              Set up targets like an emergency fund, vacation, gadget, or new home to track your progress visually.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {goals.map((g) => {
              const pct = Math.min(100, Number(g.progress_percentage || 0));
              return (
                <div
                  key={g.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
                >
                  {g.is_completed && (
                    <div className="absolute top-3 right-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Reached
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">{g.name}</h3>
                        {g.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{g.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="my-4">
                      <div className="flex items-baseline justify-between text-sm mb-1.5">
                        <span className="font-bold text-lg text-gray-900 dark:text-white">
                          {formatIndianCurrency(Number(g.current_amount))}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          of {formatIndianCurrency(Number(g.target_amount))}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            g.is_completed ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-500 mt-1.5">
                        <span>{pct.toFixed(1)}% funded</span>
                        {g.target_date && <span>Target: {g.target_date}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedGoal(g);
                        setShowContributeModal(true);
                      }}
                      className="flex-1 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Log Contribution
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(g.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Add Goal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Savings Goal</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Goal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={goalForm.name}
                    onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                    placeholder="e.g., Emergency Fund, Europe Vacation"
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Target Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={goalForm.target_amount}
                      onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })}
                      placeholder="50000"
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Current Saved (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={goalForm.current_amount}
                      onChange={(e) => setGoalForm({ ...goalForm, current_amount: e.target.value })}
                      placeholder="0"
                      className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={goalForm.target_date}
                    onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Description / Purpose
                  </label>
                  <textarea
                    rows={2}
                    value={goalForm.description}
                    onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                    placeholder="Why are you saving for this?"
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Save Goal
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Log Contribution */}
        {showContributeModal && selectedGoal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Add Contribution</h3>
                  <p className="text-xs text-gray-500">For: {selectedGoal.name}</p>
                </div>
                <button onClick={() => setShowContributeModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleContribute} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={contribForm.amount}
                    onChange={(e) => setContribForm({ ...contribForm, amount: e.target.value })}
                    placeholder="1000"
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={contribForm.date}
                    onChange={(e) => setContribForm({ ...contribForm, date: e.target.value })}
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Note / Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={contribForm.note}
                    onChange={(e) => setContribForm({ ...contribForm, note: e.target.value })}
                    placeholder="e.g., Monthly bonus, freelance payout"
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Log Contribution
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowContributeModal(false)}
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

export default SavingsGoals;
