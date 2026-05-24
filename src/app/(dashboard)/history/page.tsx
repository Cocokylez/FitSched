"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Trophy,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonCard } from "@/components/Skeleton";
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
  const [view, setView] = useState<"overview" | "chart" | "prs">("overview");
  const [showAll, setShowAll] = useState(false);
  const [expandedPr, setExpandedPr] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/register");
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
  const ratedLogs = logs.filter((l) => l.rating);
  const avgRating = ratedLogs.length > 0
    ? ratedLogs.reduce((acc, l) => acc + (l.rating || 0), 0) / ratedLogs.length
    : null;

  const weekStart = new Date();
  const dow = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (dow === 0 ? 6 : dow - 1));
  weekStart.setHours(0, 0, 0, 0);
  const thisWeekCount = logs.filter((l) => new Date(l.date) >= weekStart).length;

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

  const personalRecords = useMemo(() => {
    const byExercise: Record<string, typeof logs> = {};
    logs.forEach((log) => {
      const name = log.exercise.name;
      if (!byExercise[name]) byExercise[name] = [];
      byExercise[name].push(log);
    });

    return Object.entries(byExercise)
      .map(([name, exerciseLogs]) => {
        const sorted = [...exerciseLogs].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const progression = sorted.map((log) => {
          const weightSets = log.sets.filter(
            (s) => s.weight != null && s.weight > 0
          );
          if (weightSets.length > 0) {
            const best = weightSets.reduce((a, b) =>
              b.weight! > a.weight! ? b : a
            );
            return {
              date: new Date(log.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              maxWeight: best.weight as number,
              maxReps: best.reps,
              rawDate: log.date,
            };
          }
          const best = log.sets.reduce(
            (a, b) => (b.reps > a.reps ? b : a),
            log.sets[0]
          );
          return {
            date: new Date(log.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            maxWeight: null as number | null,
            maxReps: best?.reps || 0,
            rawDate: log.date,
          };
        });

        const prEntry = progression.reduce(
          (best, cur) => {
            if (
              cur.maxWeight != null &&
              (best.maxWeight == null || cur.maxWeight > best.maxWeight)
            )
              return cur;
            if (
              cur.maxWeight == null &&
              best.maxWeight == null &&
              cur.maxReps > best.maxReps
            )
              return cur;
            return best;
          },
          progression[0]
        );

        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const isRecent = prEntry
          ? new Date(prEntry.rawDate).getTime() > sevenDaysAgo
          : false;

        return {
          name,
          pr: prEntry,
          isRecent,
          progression,
          sessionCount: sorted.length,
        };
      })
      .sort((a, b) => {
        if (a.isRecent && !b.isRecent) return -1;
        if (!a.isRecent && b.isRecent) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [logs]);

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
            {t.history}
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
          <button
            onClick={() => setView("prs")}
            className={`text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-all ${
              view === "prs"
                ? "bg-[var(--bg1)] text-[var(--t1)] shadow-sm"
                : "text-[var(--t3)]"
            }`}
          >
            PRs
          </button>
        </div>
      </motion.div>

      {view === "prs" ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="space-y-2"
        >
          <p className="text-[12px] font-semibold text-[var(--text-muted)] mb-3 px-1 tracking-tight uppercase">
            Personal Records
          </p>
          {personalRecords.length === 0 ? (
            <div className="ios-inset-grouped p-8 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>
                Log some workouts to see your PRs
              </p>
            </div>
          ) : (
            personalRecords.map((record, i) => {
              const isOpen = expandedPr === record.name;
              const hasWeight = record.pr?.maxWeight != null;
              const prLabel = hasWeight
                ? `${record.pr!.maxWeight}kg × ${record.pr!.maxReps}`
                : `${record.pr?.maxReps ?? 0} reps`;
              const prDate = record.pr
                ? new Date(record.pr.rawDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "";
              const progressionWithWeight = record.progression.filter(
                (p) => p.maxWeight != null
              );
              const showChart =
                (hasWeight ? progressionWithWeight : record.progression).length > 1;

              return (
                <motion.div
                  key={record.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="ios-inset-grouped overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedPr(isOpen ? null : record.name)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                        style={{
                          background: record.isRecent
                            ? "rgba(245, 158, 11, 0.15)"
                            : "var(--surface-2)",
                        }}
                      >
                        <Trophy
                          className="w-4 h-4"
                          style={{
                            color: record.isRecent
                              ? "var(--orange, #f59e0b)"
                              : "var(--text-muted)",
                          }}
                        />
                      </div>
                      <div>
                        <div
                          className="text-[14px] font-semibold"
                          style={{ color: "var(--text)" }}
                        >
                          {record.name}
                        </div>
                        <div
                          className="text-[11px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {record.sessionCount} session
                          {record.sessionCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div
                          className="text-[14px] font-bold"
                          style={{ color: "var(--text)" }}
                        >
                          {prLabel}
                        </div>
                        <div
                          className="text-[11px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {record.isRecent && (
                            <span
                              className="font-bold mr-1"
                              style={{ color: "var(--orange, #f59e0b)" }}
                            >
                              NEW ·{" "}
                            </span>
                          )}
                          {prDate}
                        </div>
                      </div>
                      {showChart &&
                        (isOpen ? (
                          <ChevronDown
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: "var(--text-muted)" }}
                          />
                        ) : (
                          <ChevronRight
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: "var(--text-muted)" }}
                          />
                        ))}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && showChart && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <div
                          className="px-4 pb-4"
                          style={{
                            borderTop: "1px solid var(--border)",
                            paddingTop: 12,
                          }}
                        >
                          <p
                            className="text-[11px] font-semibold mb-2"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {hasWeight ? "WEIGHT OVER TIME" : "REPS OVER TIME"}
                          </p>
                          <ResponsiveContainer width="100%" height={130}>
                            <LineChart
                              data={
                                hasWeight ? progressionWithWeight : record.progression
                              }
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="var(--border)"
                              />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                                axisLine={false}
                                tickLine={false}
                                interval="preserveStartEnd"
                              />
                              <YAxis
                                tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                                axisLine={false}
                                tickLine={false}
                                width={32}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: "var(--surface)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 8,
                                  fontSize: 11,
                                }}
                                formatter={(val: number) =>
                                  hasWeight
                                    ? [`${val}kg`, "Weight"]
                                    : [`${val}`, "Reps"]
                                }
                              />
                              <Line
                                type="monotone"
                                dataKey={hasWeight ? "maxWeight" : "maxReps"}
                                stroke="var(--accent)"
                                strokeWidth={2}
                                dot={{ fill: "var(--accent)", r: 3 }}
                                activeDot={{ r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </motion.div>
      ) : view === "overview" ? (
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
                  { icon: Flame, color: "orange", label: t.avgRating, value: avgRating !== null ? avgRating.toFixed(1) : "--" },
                  { icon: TrendingUp, color: "purple", label: t.thisWeek, value: thisWeekCount },
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
                  {(showAll ? logs : logs.slice(0, 10)).map((log, i) => (
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
                          {log.sets.length} {t.setsCount}
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
              {logs.length > 10 && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="w-full mt-2 py-3 text-[13px] font-semibold text-[var(--t3)] bg-transparent border border-[var(--border)] rounded-[12px]"
                >
                  {showAll ? t.showLess : t.showAll.replace('{n}', String(logs.length))}
                </button>
              )}
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
