import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard, Building2, PlusCircle, Users, BarChart3,
  Settings, Globe, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { useState } from 'react';

const AppSidebar: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/municipalities', icon: Building2, label: t('municipalities') },
    { to: '/voters', icon: Users, label: t('voters') },
    { to: '/segments', icon: Filter, label: language === 'ne' ? 'सेग्मेन्ट' : 'Segments' },
    { to: '/analytics', icon: BarChart3, label: t('analytics') },
    { to: '/settings', icon: Settings, label: t('settings') },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col z-40 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <h1 className="text-sm font-bold leading-tight truncate">
            {t('appTitle')}
          </h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Language Toggle */}
      <div className="px-2 py-3 border-t border-sidebar-border">
        <button
          onClick={() => setLanguage(language === 'ne' ? 'en' : 'ne')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full hover:bg-sidebar-accent transition-colors"
        >
          <Globe className="w-5 h-5 shrink-0" />
          {!collapsed && (
            <span>{language === 'ne' ? 'English' : 'नेपाली'}</span>
          )}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
