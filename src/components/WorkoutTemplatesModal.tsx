"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BookMarked, Plus, Trash2, X, ChevronRight } from "lucide-react"
import { ACCENT } from "@/lib/theme"

// ── Types ─────────────────────────────────────────────────────────────────────

export type TemplateExercise = {
  name: string
  setsReps: string
}

export type WorkoutTemplate = {
  id: string
  name: string
  exercises: TemplateExercise[]
  createdAt: string
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  /** Exercises currently in the workout plan (for "save as template") */
  currentExercises: Array<[string, string]>
  /** Called when user picks a template — caller swaps exercises */
  onLoad: (exercises: Array<[string, string]>) => void
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WorkoutTemplatesModal({ currentExercises, onLoad, onClose }: Props) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "save">("list")
  const [saveName, setSaveName] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.ok ? r.json() : [])
      .then((d: WorkoutTemplate[]) => { setTemplates(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave() {
    const name = saveName.trim()
    if (!name || currentExercises.length === 0) return
    setSaving(true)
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          exercises: currentExercises.map(([exName, setsReps]) => ({ name: exName, setsReps })),
        }),
      })
      if (res.ok) {
        const template: WorkoutTemplate = await res.json()
        setTemplates((prev) => [template, ...prev])
        setSaveName("")
        setView("list")
      }
    } catch {}
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" })
      if (res.ok) setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch {}
    setDeletingId(null)
  }

  function handleLoad(template: WorkoutTemplate) {
    const exercises: Array<[string, string]> = template.exercises.map((ex) => [ex.name, ex.setsReps])
    onLoad(exercises)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 600,
          background: "var(--panel)",
          borderRadius: "24px 24px 0 0",
          padding: "0 0 max(24px, env(safe-area-inset-bottom))",
          maxHeight: "80vh",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px 12px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BookMarked size={18} color={ACCENT} strokeWidth={2} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>
                {view === "save" ? "Save Template" : "Workout Templates"}
              </div>
              {view === "list" && (
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {templates.length} saved
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>

          {/* ── Save view ────────────────────────────────────────────────────── */}
          {view === "save" && (
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
                Saving {currentExercises.length} exercise{currentExercises.length !== 1 ? "s" : ""} from today&apos;s workout.
              </div>
              <input
                type="text"
                placeholder="Template name (e.g. Push Day A)"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
                maxLength={80}
                autoFocus
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 14, padding: "13px 16px", fontSize: 15, fontWeight: 700,
                  color: "var(--text)", outline: "none", marginBottom: 12,
                }}
              />

              {/* Preview */}
              <div style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: 14, overflow: "hidden", marginBottom: 16,
              }}>
                {currentExercises.map(([name, setsReps], i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px",
                      borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{setsReps}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setView("list")}
                  style={{
                    flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)",
                    borderRadius: 14, padding: "13px", fontSize: 14, fontWeight: 700,
                    color: "var(--text-muted)", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  disabled={saving || !saveName.trim()}
                  style={{
                    flex: 2, background: saving || !saveName.trim() ? "var(--surface-2)" : ACCENT,
                    border: "none", borderRadius: 14, padding: "13px",
                    fontSize: 14, fontWeight: 800,
                    color: saving || !saveName.trim() ? "var(--text-muted)" : "#0a1412",
                    cursor: saving || !saveName.trim() ? "not-allowed" : "pointer",
                    transition: "background 0.2s, color 0.2s",
                  }}
                >
                  {saving ? "Saving…" : "Save Template"}
                </motion.button>
              </div>
            </div>
          )}

          {/* ── List view ────────────────────────────────────────────────────── */}
          {view === "list" && (
            <>
              {/* Save current workout as template */}
              {currentExercises.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setSaveName(""); setView("save") }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    background: "rgba(107,191,184,0.08)", border: `1px solid rgba(107,191,184,0.28)`,
                    borderRadius: 16, padding: "13px 16px", cursor: "pointer",
                    marginBottom: 14, textAlign: "left",
                  }}
                >
                  <Plus size={16} color={ACCENT} strokeWidth={2.5} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: ACCENT }}>Save today&apos;s workout as template</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                      {currentExercises.length} exercise{currentExercises.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </motion.button>
              )}

              {/* Template list */}
              {loading ? (
                [1,2,3].map((i) => (
                  <div key={i} style={{ height: 64, background: "var(--surface-2)", borderRadius: 14, marginBottom: 10 }} />
                ))
              ) : templates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-muted)" }}>
                  <BookMarked size={32} strokeWidth={1.2} style={{ marginBottom: 12, opacity: 0.4 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>No templates yet</div>
                  <div style={{ fontSize: 12, lineHeight: 1.55 }}>
                    Finish a workout plan and save it as a template to reuse it anytime.
                  </div>
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    style={{
                      background: "var(--surface-2)", border: "1px solid var(--border)",
                      borderRadius: 16, marginBottom: 10, overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "13px 16px", cursor: "pointer",
                      }}
                      onClick={() => handleLoad(template)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 2 }}>
                          {template.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {(template.exercises as TemplateExercise[]).length} exercises
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(template.id) }}
                          disabled={deletingId === template.id}
                          style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            color: "var(--text-muted)", padding: 6, opacity: deletingId === template.id ? 0.4 : 0.65,
                          }}
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                        <div style={{ color: "var(--text-muted)" }}>
                          <ChevronRight size={16} strokeWidth={2} />
                        </div>
                      </div>
                    </div>

                    {/* Exercise preview */}
                    <div style={{ borderTop: "1px solid var(--border)", padding: "8px 16px 10px" }}>
                      {(template.exercises as TemplateExercise[]).slice(0, 3).map((ex, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>
                            {ex.name}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, flexShrink: 0 }}>
                            {ex.setsReps}
                          </span>
                        </div>
                      ))}
                      {(template.exercises as TemplateExercise[]).length > 3 && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, fontStyle: "italic" }}>
                          +{(template.exercises as TemplateExercise[]).length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
