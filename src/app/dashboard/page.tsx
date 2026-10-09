'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  Users,
  UserCheck,
  Briefcase,
  Award,
  DoorOpen,
  DoorClosed,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  UserPlus,
  Search,
  Calendar,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  IconRegisterVisitor,
  IconCheckoutVisitor,
  IconCheckStatus,
  IconAddVendor,
  IconCurrentlyInside,
} from '@/components/icons/OperatorTaskIcons';
import CheckInModal from '@/components/modals/CheckInModal';
import CheckOutModal from '@/components/modals/CheckOutModal';
import CheckStatusModal from '@/components/modals/CheckStatusModal';
import VisitorBadgeModal from '@/components/modals/VisitorBadgeModal';
import CategoryRecordsModal, { CategoryModalConfig } from '@/components/modals/CategoryRecordsModal';

export default function DashboardPage() {
  const { currentGate } = useAuth();
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Live time and date for gate hero
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  // Modals state
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInCategory, setCheckInCategory] = useState('VISITOR');
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [selectedCheckoutVisit, setSelectedCheckoutVisit] = useState<any>(null);
  const [isCheckStatusOpen, setIsCheckStatusOpen] = useState(false);
  const [selectedVisitBadge, setSelectedVisitBadge] = useState<any>(null);
  const [categoryModalConfig, setCategoryModalConfig] = useState<CategoryModalConfig | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const gateParam = currentGate ? `?gateId=${currentGate.id}` : '';
      const res = await fetch(`/api/dashboard/stats${gateParam}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  }, [currentGate]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [fetchStats]);

  const openCheckIn = (category: string = 'VISITOR') => {
    setCheckInCategory(category);
    setIsCheckInOpen(true);
  };

  return (
    <AppLayout onRefreshData={fetchStats}>
      <div className="space-y-6">
        {/* Gate Control Hero Section */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-5 sm:p-7 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200 bg-white/10 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {t('active_gate')}: {currentGate?.name || t('all_gates')}
              </span>
              {currentGate?.type && (
                <span className="text-[11px] font-mono font-bold text-blue-200 bg-white/10 px-2 py-0.5 rounded-md">
                  {currentGate.type}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
              {t('gate_control_dashboard')}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
              {t('gate_control_subtitle')}
            </p>
          </div>

          {/* Live Clock & Date Badge */}
          <div className="w-full md:w-auto shrink-0 flex items-center justify-between md:justify-end gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <p className="font-mono text-sm sm:text-base font-extrabold tracking-wider text-white">
                  {currentTime || '--:--:--'}
                </p>
                <p className="text-[11px] font-medium text-blue-200 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{currentDate || '...'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Action Area - Visual Task Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Register Visitor */}
          <button
            type="button"
            onClick={() => openCheckIn('VISITOR')}
            className="group relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white to-emerald-500/5 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-950/20 border-2 border-emerald-500/30 hover:border-emerald-500 dark:border-emerald-800 dark:hover:border-emerald-500 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-200 text-left cursor-pointer flex flex-col justify-between min-h-[135px] sm:min-h-[150px]"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                <IconRegisterVisitor className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                + Entry
              </span>
            </div>
            <div className="mt-3">
              <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                {t('register_visitor')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                {t('register_visitor_desc')}
              </p>
            </div>
          </button>

          {/* 2. Check Out Visitor */}
          <button
            type="button"
            onClick={() => {
              setSelectedCheckoutVisit(null);
              setIsCheckOutOpen(true);
            }}
            className="group relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/20 border-2 border-amber-500/30 hover:border-amber-500 dark:border-amber-800 dark:hover:border-amber-500 shadow-sm hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-200 text-left cursor-pointer flex flex-col justify-between min-h-[135px] sm:min-h-[150px]"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:scale-110 transition-transform">
                <IconCheckoutVisitor className="w-7 h-7 sm:w-8 sm:h-8 text-slate-950" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300">
                Exit
              </span>
            </div>
            <div className="mt-3">
              <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                {t('checkout_visitor')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                {t('checkout_visitor_desc')}
              </p>
            </div>
          </button>

          {/* 3. Check Status */}
          <button
            type="button"
            onClick={() => setIsCheckStatusOpen(true)}
            className="group relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 via-white to-blue-500/5 dark:from-blue-950/40 dark:via-slate-900 dark:to-blue-950/20 border-2 border-blue-500/30 hover:border-blue-500 dark:border-blue-800 dark:hover:border-blue-500 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 text-left cursor-pointer flex flex-col justify-between min-h-[135px] sm:min-h-[150px]"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform">
                <IconCheckStatus className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-300">
                Verify
              </span>
            </div>
            <div className="mt-3">
              <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                {t('check_status')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                {t('check_status_desc')}
              </p>
            </div>
          </button>

          {/* 4. Add Vendor */}
          <button
            type="button"
            onClick={() => openCheckIn('VENDOR')}
            className="group relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-white to-purple-500/5 dark:from-purple-950/40 dark:via-slate-900 dark:to-purple-950/20 border-2 border-purple-500/30 hover:border-purple-500 dark:border-purple-800 dark:hover:border-purple-500 shadow-sm hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200 text-left cursor-pointer flex flex-col justify-between min-h-[135px] sm:min-h-[150px]"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/30 group-hover:scale-110 transition-transform">
                <IconAddVendor className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-300">
                Supply
              </span>
            </div>
            <div className="mt-3">
              <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                {t('add_vendor')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                {t('add_vendor_desc')}
              </p>
            </div>
          </button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Total Today */}
          <button
            type="button"
            onClick={() =>
              setCategoryModalConfig({
                isOpen: true,
                category: 'ALL',
                titleKey: 'total_visitors_today',
                defaultTitle: 'Total Visitors Today',
                gateId: currentGate?.id,
              })
            }
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer text-left group"
            title="Click to view all visitor records today"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {t('total_visitors_today')}
              </span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {stats?.totalToday || 0}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> {t('live_indicator')}
              </span>
            </div>
          </button>

          {/* 2. Currently Inside */}
          <button
            type="button"
            onClick={() =>
              setCategoryModalConfig({
                isOpen: true,
                category: 'ALL',
                status: 'CHECKED_IN',
                titleKey: 'currently_inside',
                defaultTitle: 'Currently Inside',
                gateId: currentGate?.id,
              })
            }
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all cursor-pointer text-left group"
            title="Click to view all visitors currently inside"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {t('currently_inside')}
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <DoorOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {stats?.currentlyInside || 0}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {t('active_on_site')}
              </span>
            </div>
          </button>

          {/* 3. Check-outs */}
          <button
            type="button"
            onClick={() =>
              setCategoryModalConfig({
                isOpen: true,
                category: 'ALL',
                status: 'CHECKED_OUT',
                titleKey: 'total_checkouts',
                defaultTitle: 'Total Check-Outs',
                gateId: currentGate?.id,
              })
            }
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md transition-all cursor-pointer text-left group"
            title="Click to view checked-out visitors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                {t('total_checkouts')}
              </span>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform">
                <DoorClosed className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {stats?.totalCheckOutsToday || 0}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {t('exited_premises')}
              </span>
            </div>
          </button>

          {/* 4. Overstay Alert */}
          <button
            type="button"
            onClick={() =>
              setCategoryModalConfig({
                isOpen: true,
                category: 'ALL',
                status: 'OVERSTAY',
                titleKey: 'overstay_alerts',
                defaultTitle: 'Overstay Alerts',
                gateId: currentGate?.id,
              })
            }
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-rose-400 dark:hover:border-rose-600 hover:shadow-md transition-all cursor-pointer text-left group"
            title="Click to view overstay visitors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                {t('overstay_alerts')}
              </span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {stats?.overstayCount || 0}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {t('flagged_badges')}
              </span>
            </div>
          </button>
        </div>

        {/* Secondary Category Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() =>
              setCategoryModalConfig({
                isOpen: true,
                category: 'VENDOR',
                titleKey: 'vendors',
                defaultTitle: 'Vendors',
                gateId: currentGate?.id,
              })
            }
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-sm flex items-center justify-between shadow-2xs cursor-pointer text-left group transition-all"
            title="Click to view vendors"
          >
            <div>
              <span className="text-[11px] font-medium text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors block">
                {t('vendors')}
              </span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {stats?.vendorsToday || 0}
              </span>
            </div>
            <Briefcase className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </button>

          <button
            type="button"
            onClick={() =>
              setCategoryModalConfig({
                isOpen: true,
                category: 'INTERVIEW',
                titleKey: 'interviews',
                defaultTitle: 'Interviews',
                gateId: currentGate?.id,
              })
            }
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-sm flex items-center justify-between shadow-2xs cursor-pointer text-left group transition-all"
            title="Click to view interviews"
          >
            <div>
              <span className="text-[11px] font-medium text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors block">
                {t('interviews')}
              </span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {stats?.interviewsToday || 0}
              </span>
            </div>
            <UserCheck className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </button>

          <button
            type="button"
            onClick={() =>
              setCategoryModalConfig({
                isOpen: true,
                category: 'SPECIAL_GUEST',
                titleKey: 'special_guests',
                defaultTitle: 'Special Guests',
                gateId: currentGate?.id,
              })
            }
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-sm flex items-center justify-between shadow-2xs cursor-pointer text-left group transition-all"
            title="Click to view special guests"
          >
            <div>
              <span className="text-[11px] font-medium text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors block">
                {t('special_guests')}
              </span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {stats?.specialGuestsToday || 0}
              </span>
            </div>
            <Award className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </button>

          <button
            type="button"
            onClick={() =>
              setCategoryModalConfig({
                isOpen: true,
                category: 'DELIVERY',
                titleKey: 'deliveries',
                defaultTitle: 'Deliveries',
                gateId: currentGate?.id,
              })
            }
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-sm flex items-center justify-between shadow-2xs cursor-pointer text-left group transition-all"
            title="Click to view deliveries"
          >
            <div>
              <span className="text-[11px] font-medium text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors block">
                {t('deliveries')}
              </span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {stats?.deliveriesToday || 0}
              </span>
            </div>
            <DoorClosed className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </button>
        </div>

        {/* Main Content Grid: Currently Inside Table + Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Currently Inside (Full width on tablet, 2 cols on xl) */}
          <div
            id="currently-inside-section"
            className="xl:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs min-w-0"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                  {t('currently_inside_facility')} ({stats?.activeVisitors?.length || 0})
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {t('real_time_occupancy')}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCategoryModalConfig({
                      isOpen: true,
                      category: 'ALL',
                      status: 'CHECKED_IN',
                      titleKey: 'currently_inside_facility',
                      defaultTitle: 'Currently Inside Facility',
                      gateId: currentGate?.id,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="View all visitors currently inside in full-screen modal"
                >
                  <IconCurrentlyInside className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('view_all')}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {stats?.activeVisitors && stats.activeVisitors.length > 0 ? (
                <>
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-5 py-3">{t('visitor')}</th>
                        <th className="px-4 py-3">{t('category')}</th>
                        <th className="px-4 py-3">{t('host_and_dept')}</th>
                        <th className="px-4 py-3">{t('card_badge')}</th>
                        <th className="px-4 py-3">{t('entry_time')}</th>
                        <th className="px-4 py-3 text-right">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {stats.activeVisitors.slice(0, 3).map((visit: any) => (
                        <tr
                          key={visit.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                                {visit.person?.photoUrl ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={visit.person.photoUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Users className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">
                                  {visit.person?.fullName}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {visit.person?.cnicNumber || visit.person?.phoneNumber || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {visit.person?.category || 'VISITOR'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {visit.hostName}
                            </p>
                            <p className="text-[10px] text-slate-400">{visit.department}</p>
                          </td>

                          <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {visit.visitorCardNo || 'N/A'}
                          </td>

                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {new Date(visit.checkInTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedVisitBadge(visit)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                                title="Print / View Visitor Badge"
                              >
                                {t('view_pass')}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCheckoutVisit(visit);
                                  setIsCheckOutOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                              >
                                {t('checkout_btn')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {stats.activeVisitors.length > 3 && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 px-6">
                      <span>
                        {language === 'ur'
                          ? `${stats.activeVisitors.length} میں سے 3 دکھائے جا رہے ہیں`
                          : `Showing 3 of ${stats.activeVisitors.length} visitors inside`}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCategoryModalConfig({
                            isOpen: true,
                            category: 'ALL',
                            status: 'CHECKED_IN',
                            titleKey: 'currently_inside_facility',
                            defaultTitle: 'Currently Inside Facility',
                            gateId: currentGate?.id,
                          })
                        }
                        className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>
                          {t('view_all')} ({stats.activeVisitors.length})
                        </span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs">
                  {t('no_visitors_inside')}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity (1 col) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                {t('recent_activity')}
              </h2>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3">
              {stats?.recentVisits && stats.recentVisits.length > 0 ? (
                stats.recentVisits.slice(0, 7).map((v: any) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {v.person?.fullName}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          v.status === 'CHECKED_IN'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {v.status === 'CHECKED_IN' ? 'CHECK-IN' : 'CHECK-OUT'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Visiting {v.hostName} ({v.department}) • Gate: {v.entryGate?.name || 'Main Gate'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Card: {v.visitorCardNo || 'N/A'}</span>
                      <span>
                        {new Date(v.checkInTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {t('no_activity_today')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Modals */}
      <CheckInModal
        isOpen={isCheckInOpen}
        defaultCategory={checkInCategory}
        onClose={() => setIsCheckInOpen(false)}
        onSuccess={fetchStats}
      />

      <CheckOutModal
        isOpen={isCheckOutOpen}
        initialVisit={selectedCheckoutVisit}
        onClose={() => {
          setIsCheckOutOpen(false);
          setSelectedCheckoutVisit(null);
        }}
        onSuccess={() => {
          setSelectedCheckoutVisit(null);
          fetchStats();
        }}
      />

      <CheckStatusModal
        isOpen={isCheckStatusOpen}
        onClose={() => setIsCheckStatusOpen(false)}
      />

      {selectedVisitBadge && (
        <VisitorBadgeModal
          isOpen={Boolean(selectedVisitBadge)}
          onClose={() => setSelectedVisitBadge(null)}
          visit={selectedVisitBadge}
        />
      )}

      {/* Full-Screen Category / Status Records Modal */}
      <CategoryRecordsModal
        config={categoryModalConfig}
        onClose={() => setCategoryModalConfig(null)}
        onViewPass={(visit) => setSelectedVisitBadge(visit)}
        onCheckOut={(visit) => {
          setSelectedCheckoutVisit(visit);
          setIsCheckOutOpen(true);
        }}
        onRefreshStats={fetchStats}
      />
    </AppLayout>
  );
}
