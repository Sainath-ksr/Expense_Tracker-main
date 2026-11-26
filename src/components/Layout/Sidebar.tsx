import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Plus, 
  RefreshCw, 
  History, 
  BarChart3, 
  Settings, 
  CreditCard, 
  PiggyBank, 
  Layers, 
  Lightbulb,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Plus, label: 'Add Expense', path: '/add-expense' },
    { icon: RefreshCw, label: 'Recurring & Subs', path: '/recurring' },
    { icon: PiggyBank, label: 'Savings Goals', path: '/savings' },
    { icon: Layers, label: 'Category Analysis', path: '/categories' },
    { icon: History, label: 'History', path: '/history' },
    { icon: BarChart3, label: 'Reports & Export', path: '/reports' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sidebar - Fixed on desktop, overlay on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Link to="/" className="flex items-center space-x-3" onClick={onClose}>
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white transition-colors flex items-center gap-1.5">
                ExpenseTracker
                <span className="text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-md font-semibold">
                  AI
                </span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Intelligent Wealth Management</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 font-medium'
                    }`}
                    onClick={onClose}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Pro AI Tip Card */}
        <div className="p-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-md">
            <div className="flex items-center space-x-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="font-semibold text-xs uppercase tracking-wider text-blue-100">AI Assistant</span>
            </div>
            <p className="text-xs opacity-90 leading-relaxed">
              Click the floating AI assistant anytime to check if you can afford a purchase!
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
