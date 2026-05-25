"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Plus, Search, Trash2, Dumbbell, X, Pencil } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { SkeletonCard } from "@/components/Skeleton"
import { useLanguage } from "@/context/LanguageContext"
import { ExerciseDemoPanel } from "@/components/ExerciseDemoPanel"
import { ACCENT } from "@/lib/theme"

interface Exercise {
  id: string
  name: string
  description: string | null
  muscleGroup: string
  equipment: string
  difficulty: string
  isSystem: boolean
}

const MUSCLE_OPTIONS = [
  "CHEST", "BACK", "LEGS", "SHOULDERS", "CORE", "ARMS", "FULL_BODY", "CARDIO",
]

const EQUIPMENT_OPTIONS = [
  "BODYWEIGHT", "DUMBBELLS", "BARBELL", "MACHINE", "CABLES", "BANDS", "KETTLEBELL",
]

const DIFFICULTY_OPTIONS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"]

const DIFFICULTY_STYLE: Record<string, { bg: string; color: string }> = {
  BEGINNER:     { bg: "rgba(74,222,128,0.1)",  color: "#4ade80" },
  INTERMEDIATE: { bg: "rgba(245,158,11,0.1)",  color: "#f59e0b" },
  ADVANCED:     { bg: "rgba(248,113,113,0.1)", color: "#f87171" },
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 11, padding: "11px 14px",
  fontSize: 14, color: "var(--text)", outline: "none", fontFamily: "inherit",
}

const selectStyle: React.CSSProperties = {
  width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 9, padding: "9px 8px",
  fontSize: 11, color: "var(--text)", outline: "none", cursor: "pointer",
}

export default function ExercisesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [editForm, setEditForm] = useState({ name: "", description: "", muscleGroup: "CHEST", equipment: "BODYWEIGHT", difficulty: "BEGINNER" })
  const [saving, setSaving] = useState(false)
  const [filterMuscle, setFilterMuscle] = useState("")
  const { t } = useLanguage()
  const [newExercise, setNewExercise] = useState({
    name: "",
    description: "",
    muscleGroup: "CHEST",   // fixed: was "BODYWEIGHT" (an equipment value)
    equipment: "BODYWEIGHT",
    difficulty: "BEGINNER",
  })

  useEffect(() => {
    if (status === "unauthenticated") router.push("/register")
  }, [status, router])

  const fetchExercises = useCallback(async () => {
    try {
      const res = await fetch("/api/exercises")
      if (res.ok) setExercises(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === "authenticated") fetchExercises()
  }, [status, fetchExercises])

  const addExercise = async () => {
    if (!newExercise.name) return
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExercise),
      })
      if (res.ok) {
        const created = await res.json()
        setExercises((prev) => [...prev, created])
        setShowAdd(false)
        setNewExercise({ name: "", description: "", muscleGroup: "CHEST", equipment: "BODYWEIGHT", difficulty: "BEGINNER" })
      }
    } catch {}
  }

  const deleteExercise = async (id: string) => {
    try {
      const res = await fetch(`/api/exercises?id=${id}`, { method: "DELETE" })
      if (res.ok) setExercises((prev) => prev.filter((e) => e.id !== id))
    } catch {}
  }

  const openEdit = (ex: Exercise) => {
    setEditForm({ name: ex.name, description: ex.description ?? "", muscleGroup: ex.muscleGroup, equipment: ex.equipment, difficulty: ex.difficulty })
    setEditingExercise(ex)
  }

  const updateExercise = async () => {
    if (!editingExercise || !editForm.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/exercises", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingExercise.id, ...editForm }),
      })
      if (res.ok) {
        const updated = await res.json()
        setExercises((prev) => prev.map((e) => e.id === updated.id ? updated : e))
        setEditingExercise(null)
      }
    } catch {}
    setSaving(false)
  }

  const filtered = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    const matchesMuscle = filterMuscle ? ex.muscleGroup === filterMuscle : true
    return matchesSearch && matchesMuscle
  })

  const formatLabel = (s: string) =>
    s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div style={{ padding: "16px 16px 100px" }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.5px", margin: 0 }}>
            {t.exercises}
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2, marginBottom: 0 }}>
            {exercises.length} exercises
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAdd(true)}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: ACCENT, color: "#0a1412",
            border: "none", borderRadius: 12, padding: "10px 16px",
            fontSize: 14, fontWeight: 800, cursor: "pointer",
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          {t.add}
        </motion.button>
      </motion.div>

      {/* Search + filter row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.3 }}
        style={{ display: "flex", gap: 8, marginBottom: 16 }}
      >
        <div style={{ flex: 1, position: "relative" }}>
          <Search
            size={14}
            strokeWidth={2}
            style={{
              position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
              color: "var(--text-muted)", pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchExercises}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "10px 12px 10px 32px",
              fontSize: 14, color: "var(--text)", outline: "none", fontFamily: "inherit",
            }}
          />
        </div>
        <select
          value={filterMuscle}
          onChange={(e) => setFilterMuscle(e.target.value)}
          style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "10px 12px",
            fontSize: 12, color: "var(--text-muted)", outline: "none", cursor: "pointer",
          }}
        >
          <option value="">{t.all}</option>
          {MUSCLE_OPTIONS.map((m) => (
            <option key={m} value={m}>{formatLabel(m)}</option>
          ))}
        </select>
      </motion.div>

      {/* Exercise list */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} height="76px" />
          ))}
        </div>
      ) : (
        <div style={{
          background: "var(--panel)", border: "1px solid var(--border)",
          borderRadius: 18, overflow: "hidden",
        }}>
          <AnimatePresence>
            {filtered.map((ex, i) => {
              const diffStyle = DIFFICULTY_STYLE[ex.difficulty] ?? DIFFICULTY_STYLE.BEGINNER
              return (
                <motion.div
                  key={ex.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                  transition={{ delay: i * 0.02, duration: 0.2 }}
                  style={{
                    padding: "12px 16px",
                    borderTop: i > 0 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    {/* Left: icon + details */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 9, flexShrink: 0, marginTop: 1,
                        background: "rgba(107,191,184,0.1)", border: "1px solid rgba(107,191,184,0.18)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Dumbbell size={16} strokeWidth={2} color={ACCENT} />
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 700, color: "var(--text)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {ex.name}
                        </div>
                        {ex.description && (
                          <div style={{
                            fontSize: 12, color: "var(--text-muted)", marginTop: 2,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {ex.description}
                          </div>
                        )}

                        {/* Tag chips */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
                            background: "rgba(107,191,184,0.1)", color: ACCENT,
                          }}>
                            {formatLabel(ex.muscleGroup)}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
                            background: "var(--surface-2)", color: "var(--text-muted)",
                          }}>
                            {formatLabel(ex.equipment)}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
                            background: diffStyle.bg, color: diffStyle.color,
                          }}>
                            {formatLabel(ex.difficulty)}
                          </span>
                          {ex.isSystem && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
                              background: "var(--surface-2)", color: "var(--text-muted)",
                            }}>
                              {t.defaultLabel}
                            </span>
                          )}
                        </div>

                        <ExerciseDemoPanel exerciseName={ex.name} compact />
                      </div>
                    </div>

                    {/* Edit + Delete — custom exercises only */}
                    {!ex.isSystem && (
                      <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => openEdit(ex)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--text-muted)", padding: 4,
                            display: "flex", alignItems: "center", transition: "color 0.15s",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = ACCENT }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)" }}
                        >
                          <Pencil size={14} strokeWidth={2} />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => deleteExercise(ex.id)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--text-muted)", padding: 4,
                            display: "flex", alignItems: "center", transition: "color 0.15s",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171" }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)" }}
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Empty state */}
          {filtered.length === 0 && !loading && (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 12px",
              }}>
                <Dumbbell size={22} strokeWidth={1.6} color="var(--text-muted)" />
              </div>
              <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>{t.noExercises}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Edit exercise modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {editingExercise && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingExercise(null)}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              background: "rgba(0,0,0,0.52)",
              backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              padding: "0 16px 28px",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 480,
                background: "var(--panel)", border: "1px solid var(--border)",
                borderRadius: 22, overflow: "hidden",
                boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
              }}
            >
              {/* Modal header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 18px 12px",
              }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: "var(--text)" }}>Edit Exercise</div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setEditingExercise(null)}
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "var(--text-muted)",
                  }}
                >
                  <X size={14} strokeWidth={2} />
                </motion.button>
              </div>

              {/* Form */}
              <div style={{ padding: "0 18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Name */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 7 }}>
                    {t.name}
                  </div>
                  <input
                    autoFocus
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter" && editForm.name) updateExercise() }}
                    placeholder={t.exerciseName}
                    style={inputStyle}
                  />
                </div>

                {/* Description */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 7 }}>
                    {t.description}
                  </div>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder={t.optionalDescription}
                    style={inputStyle}
                  />
                </div>

                {/* Three dropdowns */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 6 }}>
                      {t.muscle}
                    </div>
                    <select
                      value={editForm.muscleGroup}
                      onChange={(e) => setEditForm((p) => ({ ...p, muscleGroup: e.target.value }))}
                      style={selectStyle}
                    >
                      {MUSCLE_OPTIONS.map((m) => (
                        <option key={m} value={m}>{formatLabel(m)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 6 }}>
                      {t.equipment}
                    </div>
                    <select
                      value={editForm.equipment}
                      onChange={(e) => setEditForm((p) => ({ ...p, equipment: e.target.value }))}
                      style={selectStyle}
                    >
                      {EQUIPMENT_OPTIONS.map((eq) => (
                        <option key={eq} value={eq}>{formatLabel(eq)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 6 }}>
                      {t.difficulty}
                    </div>
                    <select
                      value={editForm.difficulty}
                      onChange={(e) => setEditForm((p) => ({ ...p, difficulty: e.target.value }))}
                      style={selectStyle}
                    >
                      {DIFFICULTY_OPTIONS.map((d) => (
                        <option key={d} value={d}>{formatLabel(d)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Submit */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={updateExercise}
                  disabled={!editForm.name.trim() || saving}
                  style={{
                    width: "100%", padding: "13px 0",
                    background: editForm.name.trim() && !saving ? ACCENT : "var(--surface-2)",
                    color: editForm.name.trim() && !saving ? "#0a1412" : "var(--text-muted)",
                    border: "none", borderRadius: 12,
                    fontSize: 14, fontWeight: 800,
                    cursor: editForm.name.trim() && !saving ? "pointer" : "default",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </motion.button>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add exercise modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAdd(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              background: "rgba(0,0,0,0.52)",
              backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              padding: "0 16px 28px",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 480,
                background: "var(--panel)", border: "1px solid var(--border)",
                borderRadius: 22, overflow: "hidden",
                boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
              }}
            >
              {/* Modal header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 18px 12px",
              }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: "var(--text)" }}>
                  {t.addExercise}
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAdd(false)}
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "var(--text-muted)",
                  }}
                >
                  <X size={14} strokeWidth={2} />
                </motion.button>
              </div>

              {/* Form */}
              <div style={{ padding: "0 18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Name */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 7 }}>
                    {t.name}
                  </div>
                  <input
                    autoFocus
                    type="text"
                    value={newExercise.name}
                    onChange={(e) => setNewExercise((p) => ({ ...p, name: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter" && newExercise.name) addExercise() }}
                    placeholder={t.exerciseName}
                    style={inputStyle}
                  />
                </div>

                {/* Description */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 7 }}>
                    {t.description}
                  </div>
                  <input
                    type="text"
                    value={newExercise.description}
                    onChange={(e) => setNewExercise((p) => ({ ...p, description: e.target.value }))}
                    placeholder={t.optionalDescription}
                    style={inputStyle}
                  />
                </div>

                {/* Three dropdowns */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 6 }}>
                      {t.muscle}
                    </div>
                    <select
                      value={newExercise.muscleGroup}
                      onChange={(e) => setNewExercise((p) => ({ ...p, muscleGroup: e.target.value }))}
                      style={selectStyle}
                    >
                      {MUSCLE_OPTIONS.map((m) => (
                        <option key={m} value={m}>{formatLabel(m)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 6 }}>
                      {t.equipment}
                    </div>
                    <select
                      value={newExercise.equipment}
                      onChange={(e) => setNewExercise((p) => ({ ...p, equipment: e.target.value }))}
                      style={selectStyle}
                    >
                      {EQUIPMENT_OPTIONS.map((eq) => (
                        <option key={eq} value={eq}>{formatLabel(eq)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 6 }}>
                      {t.difficulty}
                    </div>
                    <select
                      value={newExercise.difficulty}
                      onChange={(e) => setNewExercise((p) => ({ ...p, difficulty: e.target.value }))}
                      style={selectStyle}
                    >
                      {DIFFICULTY_OPTIONS.map((d) => (
                        <option key={d} value={d}>{formatLabel(d)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Submit */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={addExercise}
                  disabled={!newExercise.name}
                  style={{
                    width: "100%", padding: "13px 0",
                    background: newExercise.name ? ACCENT : "var(--surface-2)",
                    color: newExercise.name ? "#0a1412" : "var(--text-muted)",
                    border: "none", borderRadius: 12,
                    fontSize: 14, fontWeight: 800,
                    cursor: newExercise.name ? "pointer" : "default",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {t.addExercise}
                </motion.button>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
