"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Trash2,
  Dumbbell,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SkeletonCard } from "@/components/LoadingScreen";
import { useLanguage } from "@/context/LanguageContext";
import { ExerciseDemoPanel } from "@/components/ExerciseDemoPanel";

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  muscleGroup: string;
  equipment: string;
  difficulty: string;
  isSystem: boolean;
}

const MUSCLE_OPTIONS = [
  "CHEST", "BACK", "LEGS", "SHOULDERS", "CORE", "ARMS", "FULL_BODY", "CARDIO",
];

const EQUIPMENT_OPTIONS = [
  "BODYWEIGHT", "DUMBBELLS", "BARBELL", "MACHINE", "CABLES", "BANDS", "KETTLEBELL",
];

const DIFFICULTY_OPTIONS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

export default function ExercisesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [filterMuscle, setFilterMuscle] = useState("");
  const { t } = useLanguage();
  const [newExercise, setNewExercise] = useState({
    name: "",
    description: "",
    muscleGroup: "BODYWEIGHT",
    equipment: "BODYWEIGHT",
    difficulty: "BEGINNER",
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchExercises = useCallback(async () => {
    try {
      const res = await fetch("/api/exercises");
      if (res.ok) {
        const data = await res.json();
        setExercises(data);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchExercises();
  }, [status, fetchExercises]);

  const addExercise = async () => {
    if (!newExercise.name) return;
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExercise),
      });
      if (res.ok) {
        const created = await res.json();
        setExercises((prev) => [...prev, created]);
        setShowAdd(false);
        setNewExercise({
          name: "",
          description: "",
          muscleGroup: "BODYWEIGHT",
          equipment: "BODYWEIGHT",
          difficulty: "BEGINNER",
        });
      }
    } catch {}
  };

  const deleteExercise = async (id: string) => {
    try {
      const res = await fetch(`/api/exercises?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setExercises((prev) => prev.filter((e) => e.id !== id));
      }
    } catch {}
  };

  const filtered = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = filterMuscle ? ex.muscleGroup === filterMuscle : true;
    return matchesSearch && matchesMuscle;
  });

  const formatLabel = (s: string) =>
    s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="px-4 pt-4 pb-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-end justify-between mb-4"
      >
        <div>
          <h1 className="text-[28px] font-bold text-[var(--t1)] tracking-tight">
            {t.exercises}
          </h1>
          <p className="text-[14px] text-[var(--t3)] mt-0.5">
            {exercises.length} exercises
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[var(--brand)] text-white text-[14px] font-semibold active:opacity-80 transition-all"
        >
          <Plus className="w-4 h-4" />
          {t.add}
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.3 }}
        className="flex gap-2 mb-4"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t3)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchExercises}
            className="w-full bg-[var(--bg1)] border border-[var(--border)] rounded-[10px] pl-10 pr-4 py-2.5 text-[14px] text-[var(--t1)] outline-none focus:border-[var(--brand)] transition-all placeholder:text-[var(--t3)]"
          />
        </div>
        <select
          value={filterMuscle}
          onChange={(e) => setFilterMuscle(e.target.value)}
          className="appearance-none bg-[var(--bg1)] border border-[var(--border)] rounded-[10px] pl-3 pr-8 py-2.5 text-[12px] text-[var(--t2)] outline-none focus:border-[var(--brand)] transition-all"
        >
          <option value="">{t.all}</option>
          {MUSCLE_OPTIONS.map((m) => (
            <option key={m} value={m}>{formatLabel(m)}</option>
          ))}
        </select>
      </motion.div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="ios-inset-grouped p-0 overflow-hidden divide-y divide-[var(--border)]">
          <AnimatePresence>
            {filtered.map((ex, i) => (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: i * 0.02, duration: 0.2 }}
                className="px-4 py-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-[8px] bg-[var(--brand-bg)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Dumbbell className="w-4 h-4 text-[var(--brand)]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-[var(--t1)] truncate">
                        {ex.name}
                      </div>
                      {ex.description && (
                        <div className="text-[12px] text-[var(--t3)] mt-0.5 truncate">
                          {ex.description}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--brand-bg)] text-[var(--brand)]">
                          {formatLabel(ex.muscleGroup)}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg2)] text-[var(--t2)]">
                          {formatLabel(ex.equipment)}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          ex.difficulty === "BEGINNER" ? "bg-[var(--green-bg)] text-[var(--green)]" :
                          ex.difficulty === "INTERMEDIATE" ? "bg-[var(--orange-bg)] text-[var(--orange)]" :
                          "bg-[var(--red-bg)] text-[var(--red)]"
                        }`}>
                          {formatLabel(ex.difficulty)}
                        </span>
                        {ex.isSystem && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg2)] text-[var(--t3)]">
                            {t.defaultLabel}
                          </span>
                        )}
                      </div>
                      <ExerciseDemoPanel exerciseName={ex.name} compact />
                    </div>
                  </div>
                  {!ex.isSystem && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteExercise(ex.id)}
                      className="text-[var(--t3)] hover:text-[var(--red)] transition-colors p-1 ml-2 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && !loading && (
            <div className="px-4 py-8 text-center">
              <Dumbbell className="w-8 h-8 text-[var(--t3)] mx-auto mb-2" />
              <p className="text-[14px] text-[var(--t3)]">{t.noExercises}</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="ios-inset-grouped w-full max-w-md p-0 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h2 className="text-[17px] font-bold text-[var(--t1)]">{t.addExercise}</h2>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAdd(false)}
                  className="w-7 h-7 rounded-full bg-[var(--bg2)] flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-[var(--t2)]" />
                </motion.button>
              </div>

              <div className="px-4 pb-4 space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[var(--t3)] mb-1.5">{t.name}</label>
                  <input
                    type="text"
                    value={newExercise.name}
                    onChange={(e) => setNewExercise((p) => ({ ...p, name: e.target.value }))}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[10px] px-4 py-2.5 text-[14px] text-[var(--t1)] outline-none focus:border-[var(--brand)] transition-all"
                    placeholder={t.exerciseName}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[var(--t3)] mb-1.5">{t.description}</label>
                  <input
                    type="text"
                    value={newExercise.description}
                    onChange={(e) => setNewExercise((p) => ({ ...p, description: e.target.value }))}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[10px] px-4 py-2.5 text-[14px] text-[var(--t1)] outline-none focus:border-[var(--brand)] transition-all"
                    placeholder={t.optionalDescription}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--t3)] mb-1.5">{t.muscle}</label>
                    <select
                      value={newExercise.muscleGroup}
                      onChange={(e) => setNewExercise((p) => ({ ...p, muscleGroup: e.target.value }))}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[10px] px-3 py-2.5 text-[12px] text-[var(--t1)] outline-none focus:border-[var(--brand)] transition-all"
                    >
                      {MUSCLE_OPTIONS.map((m) => (
                        <option key={m} value={m}>{formatLabel(m)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--t3)] mb-1.5">{t.equipment}</label>
                    <select
                      value={newExercise.equipment}
                      onChange={(e) => setNewExercise((p) => ({ ...p, equipment: e.target.value }))}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[10px] px-3 py-2.5 text-[12px] text-[var(--t1)] outline-none focus:border-[var(--brand)] transition-all"
                    >
                      {EQUIPMENT_OPTIONS.map((e) => (
                        <option key={e} value={e}>{formatLabel(e)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--t3)] mb-1.5">{t.difficulty}</label>
                    <select
                      value={newExercise.difficulty}
                      onChange={(e) => setNewExercise((p) => ({ ...p, difficulty: e.target.value }))}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[10px] px-3 py-2.5 text-[12px] text-[var(--t1)] outline-none focus:border-[var(--brand)] transition-all"
                    >
                      {DIFFICULTY_OPTIONS.map((d) => (
                        <option key={d} value={d}>{formatLabel(d)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={addExercise}
                  disabled={!newExercise.name}
                  className="w-full py-3 rounded-[10px] bg-[var(--brand)] text-white font-semibold text-[14px] active:opacity-80 transition-all disabled:opacity-50"
                >
                  {t.addExercise}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
