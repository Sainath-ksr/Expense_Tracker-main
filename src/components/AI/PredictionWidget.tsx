import React, { useState, useEffect } from 'react';
import { aiApi } from '../../services/api';
import { AIPrediction } from '../../types';
import { formatIndianCurrency } from '../../utils/currency';
import { TrendingUp, Calendar, Zap, AlertCircle } from 'lucide-react';

const PredictionWidget: React.FC = () => {
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrediction();
  }, []);

  const loadPrediction = async () => {
    try {
      setLoading(true);
      const res = await aiApi.getPrediction();
      setPrediction(res);
    } catch (err) {
      console.error("Failed to load predictions:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-20 bg-gray-100 dark:bg-gray-700/50 rounded" />
      </div>
    );
  }

  if (!prediction) return null;

  const categories = Object.entries(prediction.by_category || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              Expense Forecast
              <span className="text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                {prediction.next_month}
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Predicted spend based on moving averages</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {formatIndianCurrency(prediction.predicted_total)}
          </div>
          <span className={`text-[11px] font-medium capitalize px-2 py-0.5 rounded-full ${
            prediction.confidence === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
            prediction.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {prediction.confidence} Confidence
          </span>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Projected By Category:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {categories.slice(0, 8).map(([cat, amt]) => (
              <div key={cat} className="p-2 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-100 dark:border-gray-700/60">
                <span className="text-[11px] text-gray-500 dark:text-gray-400 capitalize block truncate">{cat}</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{formatIndianCurrency(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionWidget;
