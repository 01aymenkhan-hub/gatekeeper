'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLayout } from '@/context/LayoutContext';
import {
  Shield,
  LayoutDashboard,
  Users,
  Briefcase,
  UserCheck,
  Award,
  HardHat,
  Truck,
  FileBarChart,
  ShieldCheck,
  UserCog,
  Building2,
  Settings,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Visitors', href: '/visitors', icon: Users },
  { label: 'Vendors', href: '/vendors', icon: Briefcase },
  { label: 'Interviews', href: '/interviews', icon: UserCheck },
  { label: 'Special Guests', href: '/special-guests', icon: Award },
  { label: 'Contractors', href: '/contractors', icon: HardHat },
  { label: 'Deliveries', href: '/deliveries', icon: Truck },
  { label: 'Departments', href: '/departments', icon: Building2, adminOnly: true },
  { label: 'Reports & Analytics', href: '/reports', icon: FileBarChart, adminOnly: true },
  { label: 'Audit Logs', href: '/audit-logs', icon: ShieldCheck, adminOnly: true },
  { label: 'Manage Access', href: '/access', icon: UserCog, adminOnly: true },
  { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, theme, toggleTheme, logout } = useAuth();
  const {
    isMobileSidebarOpen,
    closeMobileSidebar,
    isDesktopCollapsed,
    toggleDesktopSidebar,
  } = useLayout();

  const renderNavLinks = (isCollapsed: boolean, onLinkClick?: () => void) => {
    return (
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
            Navigation
          </div>
        )}

        {NAV_ITEMS.map((item) => {
          if (item.adminOnly && user?.role !== 'ADMIN') return null;

          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center rounded-xl text-sm font-medium transition-all group ${
                isCollapsed
                  ? 'justify-center p-2.5 my-1'
                  : 'justify-between px-3 py-2'
              } ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-200'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>
              {!isCollapsed && isActive && <ChevronRight className="w-4 h-4 opacity-70 shrink-0" />}
            </Link>
          );
        })}
      </div>
    );
  };

  const renderUserFooter = (isCollapsed: boolean) => {
    return (
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/20">
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'justify-between'} px-1`}>
          <button
            onClick={toggleTheme}
            className={`flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer ${
              isCollapsed ? 'p-2 w-full' : 'px-2.5 py-1.5'
            }`}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {!isCollapsed && <span>Light</span>}
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                {!isCollapsed && <span>Dark</span>}
              </>
            )}
          </button>

          <button
            onClick={logout}
            className={`flex items-center justify-center gap-1 text-xs font-semibold rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer ${
              isCollapsed ? 'p-2 w-full' : 'px-2 py-1.5'
            }`}
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>

        {user && !isCollapsed && (
          <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
            <div className="overflow-hidden pr-2">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {user.name}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {user.email}
              </p>
            </div>
            <span
              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                user.role === 'ADMIN'
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}
            >
              {user.role}
            </span>
          </div>
        )}

        {user && isCollapsed && (
          <div
            className="w-9 h-9 mx-auto rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-xs font-extrabold text-blue-700 dark:text-blue-300"
            title={`${user.name} (${user.role})`}
          >
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 1. Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 no-print transition-all duration-200 ease-in-out border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] ${
          isDesktopCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand / Logo Section */}
        <div
          className={`h-16 border-b border-slate-200 dark:border-slate-800 flex items-center ${
            isDesktopCollapsed ? 'justify-center px-2' : 'justify-between px-5'
          }`}
        >
          {isDesktopCollapsed ? (
            <button
              onClick={toggleDesktopSidebar}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer group"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <Shield className="w-5 h-5 text-white group-hover:hidden transition-all" />
              <ChevronRight className="w-5 h-5 text-white hidden group-hover:block transition-all" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="overflow-hidden">
                  <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white leading-tight truncate">
                    GATE KEEPER
                  </h1>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    Visitor &amp; Access Control
                  </p>
                </div>
              </div>

              {/* Desktop Collapse Button */}
              <button
                onClick={toggleDesktopSidebar}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Navigation items */}
        {renderNavLinks(isDesktopCollapsed)}

        {/* Footer */}
        {renderUserFooter(isDesktopCollapsed)}
      </aside>

      {/* 2. Mobile Drawer Backdrop Overlay */}
      <div
        className={`lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 transition-opacity duration-200 ${
          isMobileSidebarOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobileSidebar}
        aria-hidden="true"
      />

      {/* 3. Mobile Off-Canvas Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] shadow-2xl transition-transform duration-200 ease-in-out no-print ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Brand Header with Close Button */}
        <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white leading-tight">
                GATE KEEPER
              </h1>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Visitor &amp; Access Control
              </p>
            </div>
          </div>

          <button
            onClick={closeMobileSidebar}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            title="Close menu"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation */}
        {renderNavLinks(false, closeMobileSidebar)}

        {/* Mobile Footer */}
        {renderUserFooter(false)}
      </aside>
    </>
  );
}
