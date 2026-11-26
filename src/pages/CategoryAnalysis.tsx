import React, { useState, useEffect, useMemo } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { reportsApi } from '../services/api';
import Layout from '../components/Layout/Layout';
import CustomPieChart from '../components/Charts/PieChart';
import { formatIndianCurrency } from '../utils/currency';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  PieChart as PieIcon, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Layers, 
  Calendar 
} from 'lucide-react';
import { startOfMonth, subMonths, format } from 'date-fns';

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#64748B'
];

const CategoryAnalysis: React.FC = () => {
  const { expenses } = useExpenses();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);

  // Group current month vs last month
  const categoryStats = useMemo(() => {
    const thisMonthExpenses = expenses.filter((e) => new Date(e.date) >= thisMonthStart);
    const lastMonthExpenses = expenses.filter(
      (e) => new Date(e.date) >= lastMonthStart && new Date(e.date) <= lastMonthEnd
    );

    const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalLastMonth = lastMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const catMap: Record<string, { thisMonth: number; lastMonth: number; count: number }> = {};

    thisMonthExpenses.forEach((e) => {
      const cat = e.category.toLowerCase();
      if (!catMap[cat]) catMap[cat] = { thisMonth: 0, lastMonth: 0, count: 0 };
      catMap[cat].thisMonth += Number(e.amount) || 0;
      catMap[cat].count += 1;
    });

    lastMonthExpenses.forEach((e) => {
      const cat = e.category.toLowerCase();
      if (!catMap[cat]) catMap[cat] = { thisMonth: 0, lastMonth: 0, count: 0 };
      catMap[cat].lastMonth += Number(e.amount) || 0;
    });

    return Object.entries(catMap).map(([category, data]) => {
      const share = totalThisMonth > 0 ? (data.thisMonth / totalThisMonth) * 100 : 0;
      const momGrowth =
        data.lastMonth > 0
          ? ((data.thisMonth - data.lastMonth) / data.lastMonth) * 100
          : data.thisMonth > 0
          ? 100
          : 0;
      const avgSize = data.count > 0 ? data.thisMonth / data.count : 0;

      return {
        category,
        categoryName: category.charAt(0).toUpperCase() + category.slice(1),
        thisMonth: data.thisMonth,
        lastMonth: data.lastMonth,
        count: data.count,
        share: Number(share.toFixed(1)),
        momGrowth: Number(momGrowth.toFixed(1)),
        avgSize: Number(avgSize.toFixed(2)),
      };
    }).sort((a, b) => b.thisMonth - a.lastMonth);
  }, [expenses]);

  // Pie chart data
  const pieData = useMemo(() => {
    return categoryStats
      .filter((c) => c.thisMonth > 0)
      .map((c, idx) => ({
        name: c.categoryName,
        value: c.thisMonth,
        color: COLORS[idx % COLORS.length],
      }));
  }, [categoryStats]);

  // Bar chart MoM comparison data
  const barData = useMemo(() => {
    return categoryStats.slice(0, 8).map((c) => ({
      name: c.categoryName,
      'This Month': c.thisMonth,
      'Last Month': c.lastMonth,
    }));
  }, [categoryStats]);

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8 pb-12">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            Category-Wise Expense Analysis
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Deep dive into percentage share, month-over-month (MoM) growth, and average transaction size.
          </p>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Share Pie / Donut Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Category Share (This Month)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Percentage breakdown of all expenditures</p>
            {pieData.length > 0 ? (
              <CustomPieChart data={pieData} />
            ) : (
              <div className="h-64 flex items-center justify-center text-sm text-gray-500">
                No data available for this month
              </div>
            )}
          </div>

          {/* MoM Comparison Bar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Month-over-Month Comparison
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">This Month vs. Last Month spend per category</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} angle={-25} textAnchor="end" />
                  <YAxis stroke="#9CA3AF" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px', border: 'none', color: '#fff' }}
                    formatter={(val: any) => [formatIndianCurrency(Number(val)), '']}
                  />
                  <Bar dataKey="Last Month" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="This Month" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Deep Dive Breakdown Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Category Metrics Table
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Detailed statistics: Share %, MoM Change, and Average Ticket Size
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">This Month (₹)</th>
                  <th className="py-3 px-4 text-right">Last Month (₹)</th>
                  <th className="py-3 px-4 text-center">Share</th>
                  <th className="py-3 px-4 text-center">MoM Growth</th>
                  <th className="py-3 px-4 text-right">Avg Ticket (₹)</th>
                  <th className="py-3 px-4 text-center">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {categoryStats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No expense data recorded yet.
                    </td>
                  </tr>
                ) : (
                  categoryStats.map((row) => (
                    <tr
                      key={row.category}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                        {row.categoryName}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-white">
                        {formatIndianCurrency(row.thisMonth)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500 dark:text-gray-400">
                        {formatIndianCurrency(row.lastMonth)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                          {row.share}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                            row.momGrowth > 0
                              ? 'text-red-600 dark:text-red-400'
                              : row.momGrowth < 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-gray-500'
                          }`}
                        >
                          {row.momGrowth > 0 ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : row.momGrowth < 0 ? (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          ) : null}
                          {row.momGrowth > 0 ? `+${row.momGrowth}%` : `${row.momGrowth}%`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                        {formatIndianCurrency(row.avgSize)}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-500 dark:text-gray-400">
                        {row.count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CategoryAnalysis;
