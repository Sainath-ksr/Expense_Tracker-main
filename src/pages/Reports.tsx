import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { reportsApi, aiApi } from '../services/api';
import Layout from '../components/Layout/Layout';
import StatCard from '../components/Cards/StatCard';
import CustomPieChart from '../components/Charts/PieChart';
import CustomBarChart from '../components/Charts/BarChart';
import PredictionWidget from '../components/AI/PredictionWidget';
import { 
  DollarSign, 
  TrendingUp, 
  Target, 
  Calendar, 
  Download, 
  RefreshCw, 
  BarChart3, 
  PieChart as PieChartIcon, 
  FileSpreadsheet, 
  FileText,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatIndianCurrency } from '../utils/currency';

const Reports: React.FC = () => {
  const location = useLocation();
  const [reportsData, setReportsData] = useState<any>(null);
  const [spendingTrendData, setSpendingTrendData] = useState<any>(null);
  const [categorySummaryData, setCategorySummaryData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewType, setViewType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState(12);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  const categories = [
    'all',
    'food',
    'transport',
    'entertainment',
    'utilities',
    'healthcare',
    'shopping',
    'education',
    'travel',
    'other'
  ];

  useEffect(() => {
    fetchAllReportsData();
  }, [viewType, selectedPeriod, startDate, endDate]);

  const fetchAllReportsData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const [reports, spendingTrend, categorySummary] = await Promise.all([
        reportsApi.getReports(startDate || undefined, endDate || undefined),
        reportsApi.getSpendingTrend(viewType, selectedPeriod),
        reportsApi.getCategorySummary(startDate || undefined, endDate || undefined)
      ]);
      
      setReportsData(reports);
      setSpendingTrendData(spendingTrend);
      setCategorySummaryData(categorySummary);
    } catch {
      setError('Failed to fetch reports data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      toast.loading('Generating formatted PDF report...', { id: 'pdf' });
      await reportsApi.downloadPDF(
        startDate || undefined, 
        endDate || undefined, 
        categoryFilter !== 'all' ? categoryFilter : undefined
      );
      toast.dismiss('pdf');
      toast.success('PDF report downloaded successfully!');
    } catch {
      toast.dismiss('pdf');
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.loading('Generating multi-sheet Excel workbook...', { id: 'excel' });
      await reportsApi.downloadExcel(
        startDate || undefined, 
        endDate || undefined, 
        categoryFilter !== 'all' ? categoryFilter : undefined
      );
      toast.dismiss('excel');
      toast.success('Excel (.xlsx) workbook downloaded!');
    } catch {
      toast.dismiss('excel');
      toast.error('Failed to export Excel workbook');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSVFallback = () => {
    try {
      const csvContent = [
        ['Report Type', 'Period', 'Amount', 'Details'],
        ['Total Expenses', 'Filtered Range', reportsData?.total_expenses || 0, ''],
        ['Daily Average', 'Filtered Range', reportsData?.daily_average || 0, ''],
        ...(spendingTrendData?.trend_data || []).map((item: any) => [
          'Spending Trend',
          item.period,
          item.amount,
          viewType === 'monthly' ? 'Monthly' : 'Yearly'
        ]),
        ...(categorySummaryData?.category_data || []).map((item: any) => [
          'Category Summary',
          item.category,
          item.amount,
          `${item.percentage.toFixed(1)}% (${item.count} expenses)`
        ])
      ].map((row) => row.join(',')).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense_reports_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('CSV downloaded!');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
        </div>
      </Layout>
    );
  }

  const pieChartData = (categorySummaryData?.category_data || []).map((item: any) => ({
    name: item.category,
    value: item.amount,
    color: '#3B82F6'
  }));

  const barChartData = (spendingTrendData?.trend_data || []).map((item: any) => ({
    name: item.period,
    amount: item.amount
  }));

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8 pb-12">
        {/* Header & Export Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Reports & Statement Exports
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Multi-sheet Excel (.xlsx), executive PDF summaries, and comprehensive analytics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
            <button 
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel (.xlsx)</span>
            </button>
            <button 
              onClick={handleExportCSVFallback}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white capitalize"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 text-xs">
              <button
                onClick={() => setViewType('monthly')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  viewType === 'monthly'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setViewType('yearly')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  viewType === 'yearly'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
        </div>

        {/* Predictive Analytics Section */}
        <PredictionWidget />

        {/* KPI Cards */}
        {reportsData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Filtered Spend"
              value={formatIndianCurrency(reportsData.total_expenses)}
              icon={DollarSign}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
              subtitle={`${reportsData.total_count} transactions recorded`}
            />
            <StatCard
              title="Daily Average"
              value={formatIndianCurrency(reportsData.daily_average)}
              icon={TrendingUp}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-100"
              subtitle="Average spending rate"
            />
            <StatCard
              title="Top Category"
              value={reportsData.top_category?.name || 'N/A'}
              icon={Target}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100"
              subtitle={reportsData.top_category ? formatIndianCurrency(reportsData.top_category.amount) : 'No data'}
            />
            <StatCard
              title="Periods Tracked"
              value={spendingTrendData?.total_periods || 0}
              icon={Calendar}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-100"
              subtitle={`${viewType} intervals`}
            />
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Historical Spending Trend
            </h3>
            <p className="text-xs text-gray-500 mb-4">{viewType === 'monthly' ? 'Month-by-month' : 'Year-by-year'} evolution</p>
            {barChartData.length > 0 ? (
              <CustomBarChart data={barChartData} title="" />
            ) : (
              <div className="h-72 flex items-center justify-center text-sm text-gray-500">
                No data available
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Category Distribution
            </h3>
            <p className="text-xs text-gray-500 mb-4">Breakdown by expense type</p>
            {pieChartData.length > 0 ? (
              <CustomPieChart data={pieChartData} title="" />
            ) : (
              <div className="h-72 flex items-center justify-center text-sm text-gray-500">
                No category data available
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Table */}
        {categorySummaryData?.category_data && categorySummaryData.category_data.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-base text-gray-900 dark:text-white">
                Detailed Category Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Percentage</th>
                    <th className="py-3 px-4 text-center">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {categorySummaryData.category_data.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-750">
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white capitalize">
                        {item.category}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        {formatIndianCurrency(item.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${Math.min(item.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-500">
                        {item.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
