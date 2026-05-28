/**
 * Exercise category utilities shared between the workout plan view and the
 * live exercise session page.
 */
import { ACCENT } from "@/lib/theme"

export function getCategory(name: string, index: number): string {
  if (index === 0) return "WARM"
  const n = name.toLowerCase()
  if (n.includes("plank") || n.includes("crunch") || n.includes("twist") || n.includes("climb") || n.includes("leg raise") || n.includes("bicycle")) return "CORE"
  if (n.includes("squat") || n.includes("lunge") || n.includes("glute") || n.includes("calf") || n.includes("jump") || n.includes("step")) return "LEGS"
  if (n.includes("pull") || n.includes("row") || n.includes("curl") || n.includes("hammer") || n.includes("superman")) return "PULL"
  if (n.includes("push") || n.includes("press") || n.includes("fly") || n.includes("dip") || n.includes("pike")) return "PUSH"
  if (n.includes("burpee") || n.includes("sprint") || n.includes("high knee") || n.includes("rope") || n.includes("battle")) return "CARDIO"
  if (n.includes("raise") || n.includes("shrug") || n.includes("face pull") || n.includes("lateral") || n.includes("front")) return "SHOULDER"
  return "CORE"
}

export const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  WARM:     { bg: "rgba(246,211,101,0.18)", color: "#c8960a" },
  CORE:     { bg: "rgba(18,101,254,0.18)", color: ACCENT },
  LEGS:     { bg: "rgba(138,180,255,0.18)", color: "#5b8fff" },
  PULL:     { bg: "rgba(160,100,255,0.18)", color: "#a064ff" },
  PUSH:     { bg: "rgba(249,115,115,0.18)", color: "#e85555" },
  CARDIO:   { bg: "rgba(255,165,50,0.18)",  color: "#e08010" },
  SHOULDER: { bg: "rgba(18,101,254,0.14)", color: ACCENT },
}
