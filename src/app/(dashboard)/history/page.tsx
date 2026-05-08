"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  Calendar,
  Dumbbell,
  Flame,
} from "lucide-react";
import { motion } from "framer-motion";
import { SkeletonCard } from "@/components/LoadingScreen";
import { useLanguage } from "@/context/LanguageContext";

interface WorkoutLog {
  id: string;
  date: string;
  duration: number | null;
  rating: number | null;
  exercise: {
    name: string;
  };
  sets: Array<{
    reps: number;
    weight: number | null;
  }>;
}

export default function HistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"overview" | "chart">("overview");
  const { t } = useLanguage();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/workouts/log");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchLogs();
  }, [status, fetchLogs]);

  const totalWorkouts = logs.length;
  const totalSets = logs.reduce((acc, log) => acc + log.sets.length, 0);
  const avgRating =
    logs.filter((l) => l.rating).reduce((acc, l) => acc + (l.rating || 0), 0) /
    (logs.filter((l) => l.rating).length || 1);

  const chartData = logs
    .slice(0, 14)
    .reverse()
    .map((log) => ({
      date: new Date(log.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      sets: log.sets.length,
      rating: log.rating || 0,
    }));

  return (
    <div className="px-4 pt-4 pb-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-end justify-between mb-6"
      >
        <div>
          <h1 className="text-[28px] font-bold text-[var(--t1)] tracking-tight">
            {t.progress}
          </h1>
          <p className="text-[14px] text-[var(--t3)] mt-0.5">
            {t.trackJourney}
          </p>
        </div>
        <div className="flex gap-1 bg-[var(--bg2)] rounded-[10px] p-0.5">
          <button
            onClick={() => setView("overview")}
            className={`text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-all ${
              view === "overview"
                ? "bg-[var(--bg1)] text-[var(--t1)] shadow-sm"
                : "text-[var(--t3)]"
            }`}
          >
            {t.overview}
          </button>
          <button
            onClick={() => setView("chart")}
            className={`text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-all ${
              view === "chart"
                ? "bg-[var(--bg1)] text-[var(--t1)] shadow-sm"
                : "text-[var(--t3)]"
            }`}
          >
            {t.charts}
          </button>
        </div>
      </motion.div>

      {view === "overview" ? (
        <>
          {loading ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 mb-6">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.3 }}
                className="grid grid-cols-2 gap-3 mb-6"
              >
                {[
                  { icon: Calendar, color: "brand", label: t.totalWorkouts, value: totalWorkouts },
                  { icon: Dumbbell, color: "green", label: t.totalSets, value: totalSets },
                  { icon: Flame, color: "orange", label: t.avgRating, value: avgRating.toFixed(1) },
                  { icon: TrendingUp, color: "purple", label: t.thisWeek, value: "3" },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.04 }}
                    className="ios-inset-grouped p-4"
                  >
                    <div className={`w-8 h-8 rounded-[8px] bg-[var(--${stat.color}-bg)] flex items-center justify-center mb-2`}>
                      <stat.icon className={`w-4 h-4 text-[var(--${stat.color})]`} />
                    </div>
                    <div className="text-[24px] font-bold text-[var(--t1)] tracking-tight">
                      {stat.value}
                    </div>
                    <div className="text-[12px] text-[var(--t3)] font-medium mt-0.5">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <div className="text-[12px] font-semibold text-[var(--t3)] mb-3 px-1 tracking-tight">
                {t.recentActivity}
              </div>
              <div className="ios-inset-grouped p-0 overflow-hidden">
                <div className="divide-y divide-[var(--border)]">
                  {logs.slice(0, 10).map((log, i) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div>
                        <div className="text-[14px] font-semibold text-[var(--t1)]">
                          {log.exercise.name}
                        </div>
                        <div className="text-[12px] text-[var(--t3)]">
                          {new Date(log.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[14px] font-semibold text-[var(--t1)]">
                          {log.sets.length} sets
                        </div>
                        {log.duration && (
                          <div className="text-[12px] text-[var(--t3)]">
                            {log.duration}m
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {logs.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <Dumbbell className="w-8 h-8 text-[var(--t3)] mx-auto mb-2" />
                      <p className="text-[14px] text-[var(--t3)]">{t.noWorkouts}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="ios-inset-grouped p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart className="w-4 h-4 text-[var(--brand)]" />
              <span className="text-[13px] font-semibold text-[var(--t1)]">{t.setsPerSession}</span>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--t3)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--t3)" }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="sets" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[13px] text-[var(--t3)] text-center py-8">No data yet</p>
            )}
          </div>

          <div className="ios-inset-grouped p-4">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-[var(--orange)]" />
              <span className="text-[13px] font-semibold text-[var(--t1)]">{t.ratingTrend}</span>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--t3)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--t3)" }} axisLine={false} tickLine={false} domain={[0, 5]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="rating" stroke="var(--orange)" strokeWidth={2} dot={{ fill: "var(--orange)" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[13px] text-[var(--t3)] text-center py-8">{t.noData}</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
