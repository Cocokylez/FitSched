export type WorkoutEnvironment = "home_bodyweight" | "home_dumbbells" | "gym"
export type ExerciseAccess = "BODYWEIGHT" | "DUMBBELLS" | "GYM"
export type ExerciseDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
export type MuscleGroup = "CHEST" | "BACK" | "LEGS" | "SHOULDERS" | "CORE" | "ARMS" | "FULL_BODY" | "CARDIO"

export interface ExerciseDef {
  name: string
  muscleGroup: MuscleGroup
  difficulty: ExerciseDifficulty
  goalTypes: string[]
  access: ExerciseAccess
}

export type ExercisePlanItem = [string, string]

function exercise(
  name: string,
  muscleGroup: MuscleGroup,
  difficulty: ExerciseDifficulty,
  access: ExerciseAccess,
  goalTypes: string[],
): ExerciseDef {
  return { name, muscleGroup, difficulty, access, goalTypes }
}

export const EXERCISE_LIBRARY: ExerciseDef[] = [
  exercise("Push-ups", "CHEST", "BEGINNER", "BODYWEIGHT", ["stay_active", "lose_weight", "build_muscle", "improve_endurance"]),
  exercise("Knee Push-ups", "CHEST", "BEGINNER", "BODYWEIGHT", ["stay_active", "lose_weight", "build_muscle"]),
  exercise("Wide Push-ups", "CHEST", "BEGINNER", "BODYWEIGHT", ["stay_active", "lose_weight", "build_muscle"]),
  exercise("Incline Push-ups", "CHEST", "BEGINNER", "BODYWEIGHT", ["stay_active", "lose_weight"]),
  exercise("Decline Push-ups", "CHEST", "INTERMEDIATE", "BODYWEIGHT", ["build_muscle"]),
  exercise("Tempo Push-ups", "CHEST", "INTERMEDIATE", "BODYWEIGHT", ["build_muscle", "stay_active"]),
  exercise("Shoulder Tap Push-ups", "CHEST", "INTERMEDIATE", "BODYWEIGHT", ["build_muscle", "improve_endurance"]),
  exercise("Bench Press", "CHEST", "INTERMEDIATE", "GYM", ["build_muscle"]),
  exercise("Dumbbell Floor Press", "CHEST", "BEGINNER", "DUMBBELLS", ["build_muscle", "stay_active"]),
  exercise("Dumbbell Fly", "CHEST", "INTERMEDIATE", "DUMBBELLS", ["build_muscle"]),
  exercise("Chest Fly", "CHEST", "INTERMEDIATE", "DUMBBELLS", ["build_muscle"]),
  exercise("Chest Dips", "CHEST", "ADVANCED", "GYM", ["build_muscle"]),

  exercise("Pull-ups", "BACK", "INTERMEDIATE", "GYM", ["build_muscle"]),
  exercise("Chin-ups", "BACK", "INTERMEDIATE", "GYM", ["build_muscle"]),
  exercise("Bent-over Row", "BACK", "INTERMEDIATE", "DUMBBELLS", ["build_muscle"]),
  exercise("Dumbbell Row", "BACK", "BEGINNER", "DUMBBELLS", ["stay_active", "build_muscle"]),
  exercise("Dumbbell Pullover", "BACK", "INTERMEDIATE", "DUMBBELLS", ["build_muscle"]),
  exercise("Superman Hold", "BACK", "BEGINNER", "BODYWEIGHT", ["stay_active", "lose_weight"]),
  exercise("Prone Y Raises", "BACK", "BEGINNER", "BODYWEIGHT", ["stay_active"]),
  exercise("Prone T Raises", "BACK", "BEGINNER", "BODYWEIGHT", ["stay_active"]),
  exercise("Reverse Snow Angels", "BACK", "BEGINNER", "BODYWEIGHT", ["stay_active"]),
  exercise("Towel Rows", "BACK", "INTERMEDIATE", "BODYWEIGHT", ["build_muscle", "stay_active"]),
  exercise("Reverse Fly", "BACK", "BEGINNER", "DUMBBELLS", ["stay_active", "build_muscle"]),
  exercise("Deadlift", "BACK", "ADVANCED", "GYM", ["build_muscle"]),
  exercise("Lat Pulldown", "BACK", "BEGINNER", "GYM", ["build_muscle", "stay_active"]),

  exercise("Pike Push-ups", "SHOULDERS", "INTERMEDIATE", "BODYWEIGHT", ["build_muscle"]),
  exercise("Arm Circles", "SHOULDERS", "BEGINNER", "BODYWEIGHT", ["stay_active", "lose_weight"]),
  exercise("Scapular Push-ups", "SHOULDERS", "BEGINNER", "BODYWEIGHT", ["stay_active", "build_muscle"]),
  exercise("Wall Handstand Hold", "SHOULDERS", "ADVANCED", "BODYWEIGHT", ["build_muscle"]),
  exercise("Lateral Raises", "SHOULDERS", "BEGINNER", "DUMBBELLS", ["stay_active", "build_muscle"]),
  exercise("Front Raises", "SHOULDERS", "BEGINNER", "DUMBBELLS", ["stay_active"]),
  exercise("Overhead Press", "SHOULDERS", "INTERMEDIATE", "DUMBBELLS", ["build_muscle"]),
  exercise("Arnold Press", "SHOULDERS", "INTERMEDIATE", "DUMBBELLS", ["build_muscle"]),
  exercise("Face Pull", "SHOULDERS", "BEGINNER", "GYM", ["stay_active", "build_muscle"]),
  exercise("Shrugs", "SHOULDERS", "BEGINNER", "DUMBBELLS", ["stay_active", "build_muscle"]),

  exercise("Bicep Curls", "ARMS", "BEGINNER", "DUMBBELLS", ["build_muscle", "stay_active"]),
  exercise("Hammer Curls", "ARMS", "BEGINNER", "DUMBBELLS", ["build_muscle"]),
  exercise("Tricep Dips", "ARMS", "INTERMEDIATE", "BODYWEIGHT", ["build_muscle"]),
  exercise("Chair Dips", "ARMS", "BEGINNER", "BODYWEIGHT", ["build_muscle", "stay_active"]),
  exercise("Tricep Extension", "ARMS", "BEGINNER", "DUMBBELLS", ["build_muscle"]),
  exercise("Close-grip Push-ups", "ARMS", "INTERMEDIATE", "BODYWEIGHT", ["build_muscle"]),
  exercise("Plank Up-Downs", "ARMS", "INTERMEDIATE", "BODYWEIGHT", ["improve_endurance", "stay_active"]),
  exercise("Preacher Curl", "ARMS", "INTERMEDIATE", "GYM", ["build_muscle"]),
  exercise("Concentration Curl", "ARMS", "BEGINNER", "DUMBBELLS", ["build_muscle"]),
  exercise("Curl to Press", "ARMS", "INTERMEDIATE", "DUMBBELLS", ["build_muscle", "improve_endurance"]),

  exercise("Bodyweight Squats", "LEGS", "BEGINNER", "BODYWEIGHT", ["lose_weight", "stay_active", "build_muscle", "improve_endurance"]),
  exercise("Squats", "LEGS", "BEGINNER", "BODYWEIGHT", ["lose_weight", "stay_active", "build_muscle", "improve_endurance"]),
  exercise("Walking Lunges", "LEGS", "BEGINNER", "BODYWEIGHT", ["lose_weight", "stay_active", "build_muscle"]),
  exercise("Lunges", "LEGS", "BEGINNER", "BODYWEIGHT", ["lose_weight", "stay_active", "build_muscle"]),
  exercise("Reverse Lunges", "LEGS", "BEGINNER", "BODYWEIGHT", ["stay_active", "build_muscle"]),
  exercise("Split Squats", "LEGS", "INTERMEDIATE", "BODYWEIGHT", ["build_muscle", "stay_active"]),
  exercise("Side Lunges", "LEGS", "BEGINNER", "BODYWEIGHT", ["stay_active", "lose_weight"]),
  exercise("Curtsy Lunges", "LEGS", "INTERMEDIATE", "BODYWEIGHT", ["build_muscle", "stay_active"]),
  exercise("Glute Bridges", "LEGS", "BEGINNER", "BODYWEIGHT", ["stay_active", "build_muscle"]),
  exercise("Single-leg Glute Bridges", "LEGS", "INTERMEDIATE", "BODYWEIGHT", ["build_muscle"]),
  exercise("Wall Sit", "LEGS", "BEGINNER", "BODYWEIGHT", ["lose_weight", "stay_active", "build_muscle"]),
  exercise("Calf Raises", "LEGS", "BEGINNER", "BODYWEIGHT", ["stay_active", "build_muscle"]),
  exercise("Step-ups", "LEGS", "BEGINNER", "BODYWEIGHT", ["lose_weight", "stay_active", "build_muscle"]),
  exercise("Jump Squats", "LEGS", "INTERMEDIATE", "BODYWEIGHT", ["lose_weight", "improve_endurance"]),
  exercise("Hamstring Walkouts", "LEGS", "INTERMEDIATE", "BODYWEIGHT", ["build_muscle", "stay_active"]),
  exercise("Frog Pumps", "LEGS", "BEGINNER", "BODYWEIGHT", ["build_muscle", "stay_active"]),
  exercise("Donkey Kicks", "LEGS", "BEGINNER", "BODYWEIGHT", ["build_muscle", "stay_active"]),
  exercise("Fire Hydrants", "LEGS", "BEGINNER", "BODYWEIGHT", ["stay_active"]),
  exercise("Bulgarian Split Squats", "LEGS", "ADVANCED", "BODYWEIGHT", ["build_muscle"]),
  exercise("Romanian Deadlift", "LEGS", "ADVANCED", "DUMBBELLS", ["build_muscle"]),
  exercise("Goblet Squats", "LEGS", "INTERMEDIATE", "DUMBBELLS", ["build_muscle"]),
  exercise("Dumbbell Squats", "LEGS", "BEGINNER", "DUMBBELLS", ["build_muscle", "stay_active"]),
  exercise("Dumbbell Reverse Lunges", "LEGS", "INTERMEDIATE", "DUMBBELLS", ["build_muscle"]),
  exercise("Dumbbell Step-ups", "LEGS", "INTERMEDIATE", "DUMBBELLS", ["build_muscle", "stay_active"]),

  exercise("Plank", "CORE", "BEGINNER", "BODYWEIGHT", ["stay_active", "lose_weight"]),
  exercise("Side Plank", "CORE", "BEGINNER", "BODYWEIGHT", ["stay_active", "build_muscle"]),
  exercise("Russian Twist", "CORE", "BEGINNER", "BODYWEIGHT", ["stay_active", "lose_weight"]),
  exercise("Leg Raises", "CORE", "BEGINNER", "BODYWEIGHT", ["build_muscle", "stay_active"]),
  exercise("Bicycle Crunches", "CORE", "BEGINNER", "BODYWEIGHT", ["lose_weight", "stay_active"]),
  exercise("Mountain Climbers", "CORE", "INTERMEDIATE", "BODYWEIGHT", ["lose_weight", "improve_endurance"]),
  exercise("Hanging Knee Raises", "CORE", "INTERMEDIATE", "GYM", ["build_muscle"]),
  exercise("Plank Reaches", "CORE", "BEGINNER", "BODYWEIGHT", ["stay_active"]),
  exercise("Dead Bug", "CORE", "BEGINNER", "BODYWEIGHT", ["stay_active", "lose_weight"]),
  exercise("Heel Taps", "CORE", "BEGINNER", "BODYWEIGHT", ["stay_active", "lose_weight"]),
  exercise("Flutter Kicks", "CORE", "INTERMEDIATE", "BODYWEIGHT", ["improve_endurance", "stay_active"]),

  exercise("Burpees", "FULL_BODY", "INTERMEDIATE", "BODYWEIGHT", ["lose_weight", "improve_endurance"]),
  exercise("Jumping Jacks", "FULL_BODY", "BEGINNER", "BODYWEIGHT", ["lose_weight", "improve_endurance"]),
  exercise("High Knees", "FULL_BODY", "BEGINNER", "BODYWEIGHT", ["lose_weight", "improve_endurance"]),
  exercise("Squat Thrusts", "FULL_BODY", "INTERMEDIATE", "BODYWEIGHT", ["lose_weight", "improve_endurance"]),
  exercise("Bear Crawl", "FULL_BODY", "INTERMEDIATE", "BODYWEIGHT", ["stay_active"]),
  exercise("Tuck Jumps", "FULL_BODY", "ADVANCED", "BODYWEIGHT", ["improve_endurance", "lose_weight"]),
  exercise("Box Jumps", "FULL_BODY", "ADVANCED", "GYM", ["build_muscle", "improve_endurance"]),
  exercise("Sprints", "CARDIO", "INTERMEDIATE", "BODYWEIGHT", ["improve_endurance", "lose_weight"]),
  exercise("Sprint", "CARDIO", "INTERMEDIATE", "BODYWEIGHT", ["improve_endurance", "lose_weight"]),
  exercise("Jump Rope", "CARDIO", "BEGINNER", "BODYWEIGHT", ["lose_weight", "improve_endurance"]),
  exercise("Battle Ropes", "CARDIO", "INTERMEDIATE", "GYM", ["improve_endurance", "lose_weight"]),
]

const DAY_GROUPS: Record<number, MuscleGroup[]> = {
  0: [],
  1: ["CHEST", "ARMS"],
  2: ["BACK", "ARMS"],
  3: ["LEGS"],
  4: ["SHOULDERS", "CORE"],
  5: ["FULL_BODY", "LEGS", "CARDIO"],
  6: ["ARMS", "CORE"],
}

const CAUTION_EXERCISES = new Set(["Burpees", "Jump Squats", "Tuck Jumps", "Box Jumps", "Sprints", "Sprint", "Battle Ropes"])

function uniqueExercises(exercises: ExerciseDef[]) {
  const seen = new Set<string>()
  return exercises.filter((exerciseDef) => {
    const key = exerciseDef.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function hashName(name: string, seed: number) {
  return Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), seed * 31) % 997
}

function getWeekSeed() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  return Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000))
}

export function getAllowedExerciseAccess(environment?: string | null): ExerciseAccess[] {
  if (environment === "home_bodyweight") return ["BODYWEIGHT"]
  if (environment === "home_dumbbells") return ["BODYWEIGHT", "DUMBBELLS"]
  return ["BODYWEIGHT", "DUMBBELLS", "GYM"]
}

export function getExerciseAccess(name: string): ExerciseAccess {
  return EXERCISE_LIBRARY.find((exerciseDef) => exerciseDef.name === name)?.access || "BODYWEIGHT"
}

export function getMuscleGroupsForDay(day: number): { groups: MuscleGroup[]; isRestDay: boolean } {
  const groups = DAY_GROUPS[day] || []
  return { groups, isRestDay: groups.length === 0 }
}

export function parseSetsReps(label: string) {
  const normalized = label.replace(/Ã—/g, "x").replace(/×/g, "x")
  const explicit = normalized.match(/(\d+)\s*x\s*(\d+)/i)
  if (explicit) {
    return {
      sets: Number(explicit[1]) || 3,
      reps: Number(explicit[2]) || 12,
    }
  }

  const numbers = normalized.match(/\d+/g) || []
  return {
    sets: Number(numbers[0]) || 3,
    reps: Number(numbers[1]) || 12,
  }
}

function getAllowedDifficulties(experienceLevel?: string | null, hasInjury = false): ExerciseDifficulty[] {
  if (hasInjury) return ["BEGINNER"]
  if (experienceLevel === "beginner") return ["BEGINNER"]
  if (experienceLevel === "advanced") return ["BEGINNER", "INTERMEDIATE", "ADVANCED"]
  return ["BEGINNER", "INTERMEDIATE"]
}

function getPrescription(exerciseDef: ExerciseDef, experienceLevel?: string | null, fitnessGoal?: string | null) {
  const endurance = fitnessGoal === "improve_endurance" || fitnessGoal === "lose_weight"
  const hard = experienceLevel === "advanced" || exerciseDef.difficulty === "ADVANCED"

  if (exerciseDef.muscleGroup === "CARDIO" || endurance) {
    if (experienceLevel === "beginner") return "3 x 15"
    return hard ? "4 x 20" : "4 x 15"
  }

  if (experienceLevel === "beginner") return "3 x 10"
  return hard ? "4 x 12" : "3 x 12"
}

export function getSmartExercisePlan({
  selectedDay,
  fitnessGoal = "stay_active",
  experienceLevel = "intermediate",
  workoutEnvironment = "gym",
  hasInjury = false,
  targetMuscles = [],
  recentNames = [],
  limit = 5,
}: {
  selectedDay: number
  fitnessGoal?: string | null
  experienceLevel?: string | null
  workoutEnvironment?: string | null
  hasInjury?: boolean
  targetMuscles?: string[]
  recentNames?: string[]
  limit?: number
}): ExercisePlanItem[] {
  const { groups, isRestDay } = getMuscleGroupsForDay(selectedDay)
  if (isRestDay) return []

  const allowedAccess = getAllowedExerciseAccess(workoutEnvironment)
  const allowedDifficulties = getAllowedDifficulties(experienceLevel, hasInjury)
  const recentSet = new Set(recentNames)
  const targetForToday = targetMuscles.find((target) => groups.includes(target as MuscleGroup)) || null

  const baseFilter = (exerciseDef: ExerciseDef) =>
    allowedAccess.includes(exerciseDef.access) &&
    (!hasInjury || !CAUTION_EXERCISES.has(exerciseDef.name))

  const pools = [
    EXERCISE_LIBRARY.filter((exerciseDef) =>
      baseFilter(exerciseDef) &&
      groups.includes(exerciseDef.muscleGroup) &&
      allowedDifficulties.includes(exerciseDef.difficulty) &&
      (fitnessGoal === "stay_active" || exerciseDef.goalTypes.includes(fitnessGoal || "stay_active"))
    ),
    EXERCISE_LIBRARY.filter((exerciseDef) =>
      baseFilter(exerciseDef) &&
      groups.includes(exerciseDef.muscleGroup) &&
      allowedDifficulties.includes(exerciseDef.difficulty)
    ),
    EXERCISE_LIBRARY.filter((exerciseDef) =>
      baseFilter(exerciseDef) &&
      groups.includes(exerciseDef.muscleGroup)
    ),
    EXERCISE_LIBRARY.filter((exerciseDef) =>
      baseFilter(exerciseDef) &&
      allowedDifficulties.includes(exerciseDef.difficulty)
    ),
    EXERCISE_LIBRARY.filter(baseFilter),
  ]

  const combined = uniqueExercises(pools.flat())
  const recentFiltered = combined.filter((exerciseDef) => !recentSet.has(exerciseDef.name))
  const pool = recentFiltered.length >= limit ? recentFiltered : combined
  const seed = getWeekSeed() + selectedDay

  const sorted = [...pool].sort((a, b) => {
    const aGroup = groups.includes(a.muscleGroup) ? groups.indexOf(a.muscleGroup) : 9
    const bGroup = groups.includes(b.muscleGroup) ? groups.indexOf(b.muscleGroup) : 9
    if (aGroup !== bGroup) return aGroup - bGroup

    if (targetForToday) {
      const aTarget = a.muscleGroup === targetForToday ? 0 : 1
      const bTarget = b.muscleGroup === targetForToday ? 0 : 1
      if (aTarget !== bTarget) return aTarget - bTarget
    }

    const aGoal = fitnessGoal === "stay_active" || a.goalTypes.includes(fitnessGoal || "stay_active") ? 0 : 1
    const bGoal = fitnessGoal === "stay_active" || b.goalTypes.includes(fitnessGoal || "stay_active") ? 0 : 1
    if (aGoal !== bGoal) return aGoal - bGoal

    const aDifficulty = allowedDifficulties.includes(a.difficulty) ? 0 : 1
    const bDifficulty = allowedDifficulties.includes(b.difficulty) ? 0 : 1
    if (aDifficulty !== bDifficulty) return aDifficulty - bDifficulty

    return hashName(a.name, seed) - hashName(b.name, seed)
  })

  return sorted.slice(0, limit).map((exerciseDef) => [
    exerciseDef.name,
    getPrescription(exerciseDef, experienceLevel, fitnessGoal),
  ])
}

export function toWorkoutExercises(items: ExercisePlanItem[]) {
  return items.map(([name, label]) => ({
    name,
    ...parseSetsReps(label),
  }))
}
