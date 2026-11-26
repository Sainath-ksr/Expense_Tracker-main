import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpenses } from '../context/ExpenseContext';
import { aiApi } from '../services/api';
import Layout from '../components/Layout/Layout';
import ExpenseItem from '../components/ExpenseItem';
import { convertCurrency, CURRENCY_SYMBOLS } from '../utils/currency';
import { Plus, RefreshCw, Sparkles, Camera, Upload, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const AddExpense: React.FC = () => {
  const navigate = useNavigate();
  const { addExpense, expenses, isLoading, refreshExpenses } = useExpenses();
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    currency: 'INR',
    original_amount: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [autoCategoryConfidence, setAutoCategoryConfidence] = useState<string | null>(null);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'Food',
    'Transport',
    'Entertainment',
    'Utilities',
    'Healthcare',
    'Shopping',
    'Education',
    'Travel',
    'Other',
  ];

  const currencyOptions = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

  // Smart auto-categorization on title change (debounced)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTitleChange = (val: string) => {
    setFormData((prev) => ({ ...prev, title: val }));
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (val.trim().length >= 3) {
      debounceTimer.current = setTimeout(async () => {
        try {
          const res = await aiApi.autoCategorize(val);
          if (res.category && res.category !== 'other') {
            const matched = categories.find((c) => c.toLowerCase() === res.category.toLowerCase());
            if (matched) {
              setFormData((prev) => ({ ...prev, category: matched }));
              setAutoCategoryConfidence(res.confidence);
            }
          }
        } catch {
          // Silent fallback
        }
      }, 400);
    } else {
      setAutoCategoryConfidence(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // OCR Receipt Scanner Handler
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanningReceipt(true);
      toast.loading('Scanning receipt with AI/OCR...', { id: 'ocr' });
      const data = await aiApi.scanReceipt(file);
      toast.dismiss('ocr');

      if (data) {
        const detectedTitle = data.merchant || data.title || 'Receipt Purchase';
        const detectedAmount = data.amount ? String(data.amount) : '';
        const detectedCategory = categories.find(
          (c) => c.toLowerCase() === (data.category || '').toLowerCase()
        ) || 'Shopping';
        const detectedDate = data.date || new Date().toISOString().split('T')[0];

        setFormData((prev) => ({
          ...prev,
          title: detectedTitle,
          amount: detectedAmount,
          category: detectedCategory,
          date: detectedDate,
          description: `Extracted via receipt scanner. ${data.raw_text ? 'Notes: ' + data.raw_text.slice(0, 80) : ''}`,
        }));
        setAutoCategoryConfidence('high');
        toast.success('Receipt details pre-filled!');
      }
    } catch {
      toast.dismiss('ocr');
      toast.error('Failed to parse receipt. Please enter details manually.');
    } finally {
      setIsScanningReceipt(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!formData.title.trim() || !formData.amount || !formData.category) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    const inputAmount = parseFloat(formData.amount);
    if (isNaN(inputAmount) || inputAmount <= 0) {
      setError('Please enter a valid amount');
      setIsSubmitting(false);
      return;
    }

    // Convert to INR base currency if another currency selected
    const baseConvertedAmount = convertCurrency(inputAmount, formData.currency, 'INR');

    try {
      await addExpense({
        title: formData.title.trim(),
        amount: baseConvertedAmount,
        category: formData.category.toLowerCase(),
        date: formData.date,
        description: formData.description.trim(),
        currency: formData.currency,
        original_amount: inputAmount,
        exchange_rate: Number((baseConvertedAmount / inputAmount).toFixed(4)),
      } as any);

      // Reset form
      setFormData({
        title: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        currency: 'INR',
        original_amount: '',
      });
      setAutoCategoryConfidence(null);
    } catch {
      setError('Failed to create expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header with Receipt Upload */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="h-6 w-6 md:h-7 md:w-7 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              Add New Expense
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track spending with AI auto-categorization, receipt OCR, and multi-currency conversion.
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleReceiptUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanningReceipt}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              {isScanningReceipt ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Scan Receipt (OCR)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expense Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title or Merchant *
                </label>
                {autoCategoryConfidence && (
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium">
                    <Sparkles className="w-3.5 h-3.5" /> AI predicted: {formData.category} ({autoCategoryConfidence})
                  </span>
                )}
              </div>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="e.g., Starbucks, Swiggy, Uber, Electricity Bill"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {/* Currency Selector */}
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Currency *
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                >
                  {currencyOptions.map((c) => (
                    <option key={c} value={c}>
                      {c} ({CURRENCY_SYMBOLS[c] || c})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount ({CURRENCY_SYMBOLS[formData.currency] || formData.currency}) *
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="0.00"
                />
                {formData.currency !== 'INR' && formData.amount && (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 block">
                    ≈ ₹{convertCurrency(Number(formData.amount), formData.currency, 'INR')} in base INR
                  </span>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (optional)
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Add any additional details..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex justify-center items-center gap-2 py-2.5 px-4 bg-blue-600 dark:bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  'Add Expense'
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Expenses</h3>
            <button
              onClick={refreshExpenses}
              disabled={isLoading}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 flex-shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="whitespace-nowrap">Refresh</span>
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading expenses...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400">No expenses yet. Add your first expense above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.slice(0, 10).map((expense) => (
                <ExpenseItem key={expense.id} expense={expense} />
              ))}
              {expenses.length > 10 && (
                <div className="text-center py-4">
                  <button
                    onClick={() => navigate('/history')}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                  >
                    View all {expenses.length} expenses →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AddExpense;
