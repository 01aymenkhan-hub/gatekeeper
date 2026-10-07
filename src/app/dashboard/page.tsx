'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
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
  CheckCircle,
  TrendingUp,
} from 'lucide-react';
import CheckInModal from '@/components/modals/CheckInModal';
import CheckOutModal from '@/components/modals/CheckOutModal';
import CheckStatusModal from '@/components/modals/CheckStatusModal';
import VisitorBadgeModal from '@/components/modals/VisitorBadgeModal';

export default function DashboardPage() {
  const { currentGate } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInCategory, setCheckInCategory] = useState('VISITOR');
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isCheckStatusOpen, setIsCheckStatusOpen] = useState(false);
  const [selectedVisitBadge, setSelectedVisitBadge] = useState<any>(null);

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
        {/* Welcome & Quick Action Banner */}
        <div className="rounded-2xl bg-linear-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-full inline-block mb-1">
              Active Gate: {currentGate?.name || 'All Gates'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Gate Control Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
              Live visitor tracking, instant CNIC &amp; Driving License OCR check-in, and security access logs.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full xl:w-auto">
            {/* Mobile Row 1: Check Status (50%) + Check Out (50%) | Tablet/Desktop: inline flex buttons */}
            <div className="grid grid-cols-2 gap-2.5 w-full sm:w-auto sm:flex sm:items-center">
              <button
                onClick={() => setIsCheckStatusOpen(true)}
                className="w-full sm:w-auto sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-xs font-bold transition-all border border-white/20 cursor-pointer min-h-[42px] whitespace-nowrap"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>Check Status</span>
              </button>

              <button
                onClick={() => setIsCheckOutOpen(true)}
                className="w-full sm:w-auto sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md transition-all cursor-pointer min-h-[42px] whitespace-nowrap"
              >
                <DoorClosed className="w-4 h-4 shrink-0" />
                <span>Check Out</span>
              </button>
            </div>

            {/* Add Vendor (Desktop & Tablet only, hidden on mobile action layout) */}
            <button
              onClick={() => openCheckIn('VENDOR')}
              className="hidden sm:flex sm:flex-initial items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold shadow-md transition-all cursor-pointer min-h-[42px] whitespace-nowrap"
            >
              <Briefcase className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>+ Vendor</span>
            </button>

            {/* Mobile Row 2: Add Visitor (100% full width on mobile) | Tablet/Desktop: inline flex button */}
            <button
              onClick={() => openCheckIn('VISITOR')}
              className="w-full sm:w-auto sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer min-h-[42px] whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>+ Add Visitor</span>
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Total Today */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Visitors Today
              </span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {stats?.totalToday || 0}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> Live
              </span>
            </div>
          </div>

          {/* 2. Currently Inside */}
          <div
            onClick={() => {
              const el = document.getElementById('currently-inside-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-800 transition-all group"
            title="Click to view visitors currently inside"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Currently Inside
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <DoorOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {stats?.currentlyInside || 0}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active on site
              </span>
            </div>
          </div>

          {/* 3. Check-outs */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Check-Outs
              </span>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <DoorClosed className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {stats?.totalCheckOutsToday || 0}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Exited premises
              </span>
            </div>
          </div>

          {/* 4. Overstay Alert */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Overstay Alerts (&gt;8h)
              </span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {stats?.overstayCount || 0}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                Flagged badges
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Category Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Vendors</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {stats?.vendorsToday || 0}
              </span>
            </div>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Interviews</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {stats?.interviewsToday || 0}
              </span>
            </div>
            <UserCheck className="w-4 h-4 text-slate-400" />
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Special Guests</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {stats?.specialGuestsToday || 0}
              </span>
            </div>
            <Award className="w-4 h-4 text-slate-400" />
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Deliveries</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {stats?.deliveriesToday || 0}
              </span>
            </div>
            <DoorClosed className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Main Content Grid: Currently Inside Table + Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Currently Inside (Full width on tablet, 2 cols on xl) */}
          <div id="currently-inside-section" className="xl:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs min-w-0">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                  Currently Inside Facility ({stats?.activeVisitors?.length || 0})
                </h2>
              </div>
              <span className="text-xs text-slate-400">Real-time occupancy</span>
            </div>

            <div className="overflow-x-auto">
              {stats?.activeVisitors && stats.activeVisitors.length > 0 ? (
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Visitor</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Host &amp; Dept</th>
                      <th className="px-4 py-3">Card / Badge</th>
                      <th className="px-4 py-3">Entry Time</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {stats.activeVisitors.map((visit: any) => (
                      <tr
                        key={visit.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                              {visit.person?.photoUrl ? (
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
                              onClick={() => setSelectedVisitBadge(visit)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                              title="Print / View Visitor Badge"
                            >
                              View Pass
                            </button>
                            <button
                              onClick={() => setIsCheckOutOpen(true)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            >
                              Check Out
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No visitors currently inside the facility.
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity (1 col) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                Recent Activity
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
                  No activity recorded today yet.
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
        onClose={() => setIsCheckOutOpen(false)}
        onSuccess={fetchStats}
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
    </AppLayout>
  );
}
