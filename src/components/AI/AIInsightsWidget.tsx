import React, { useState, useEffect } from 'react';
import { aiApi } from '../../services/api';
import { AIInsight } from '../../types';
import { Sparkles, ChevronRight, AlertTriangle, TrendingUp, CheckCircle, Info } from 'lucide-react';

const AIInsightsWidget: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const res = await aiApi.getInsights();
      setInsights(res.insights || []);
    } catch (err) {
      console.error("Failed to load AI insights:", err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'danger':
        return 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300';
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300';
      default:
        return 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'danger':
        return <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              AI Expense Insights
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">Smart</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Automated spending intelligence & pattern detection</p>
          </div>
        </div>
        <button
          onClick={loadInsights}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      ) : insights.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
          No insights generated yet. Add more expenses to discover patterns!
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-lg border flex items-start gap-3 transition-all ${getSeverityStyle(insight.severity)}`}
            >
              <div className="mt-0.5">{getSeverityIcon(insight.severity)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                  <span>{insight.icon}</span>
                  <span>{insight.title}</span>
                </div>
                <p className="text-xs mt-1 leading-relaxed opacity-90 text-gray-700 dark:text-gray-300">{insight.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIInsightsWidget;
