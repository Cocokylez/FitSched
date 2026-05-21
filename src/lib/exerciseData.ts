export const EXERCISE_MUSCLE: Record<string, string> = {
  "Push-ups": "Chest", "Diamond Push-ups": "Chest", "Wide Push-ups": "Chest",
  "Incline Push-ups": "Chest", "Decline Push-ups": "Chest", "Bench Press": "Chest",
  "Dumbbell Fly": "Chest", "Chest Dips": "Chest",
  "Pull-ups": "Back", "Chin-ups": "Back", "Bent-over Row": "Back",
  "Dumbbell Row": "Back", "Superman Hold": "Back", "Reverse Fly": "Back",
  "Deadlift": "Back", "Lat Pulldown": "Back",
  "Pike Push-ups": "Shoulders", "Lateral Raises": "Shoulders", "Front Raises": "Shoulders",
  "Overhead Press": "Shoulders", "Arnold Press": "Shoulders", "Face Pull": "Shoulders",
  "Shrugs": "Shoulders",
  "Bicep Curls": "Arms", "Hammer Curls": "Arms", "Tricep Dips": "Arms",
  "Tricep Extension": "Arms", "Close-grip Push-ups": "Arms", "Preacher Curl": "Arms",
  "Concentration Curl": "Arms",
  "Bodyweight Squats": "Legs", "Walking Lunges": "Legs", "Glute Bridges": "Legs",
  "Wall Sit": "Legs", "Calf Raises": "Legs", "Bulgarian Split Squats": "Legs",
  "Romanian Deadlift": "Legs", "Goblet Squats": "Legs", "Step-ups": "Legs",
  "Jump Squats": "Legs", "Squats": "Legs", "Lunges": "Legs",
  "Plank": "Core", "Russian Twist": "Core", "Leg Raises": "Core",
  "Bicycle Crunches": "Core", "Mountain Climbers": "Core", "Hanging Knee Raises": "Core",
  "Plank Reaches": "Core", "Dead Bug": "Core",
  "Burpees": "Full Body", "Jumping Jacks": "Full Body", "High Knees": "Full Body",
  "Squat Thrusts": "Full Body", "Bear Crawl": "Full Body", "Tuck Jumps": "Full Body",
  "Box Jumps": "Full Body", "Curl to Press": "Arms",
  "Sprints": "Cardio", "Sprint": "Cardio", "Jump Rope": "Cardio", "Battle Ropes": "Cardio",
}

export const MUSCLE_GROUPS = [
  "Rest", "Chest & Triceps", "Back & Biceps", "Legs",
  "Shoulders & Core", "Full Body", "Arms & Core",
]

export function getMuscleGroup(name: string): string {
  return EXERCISE_MUSCLE[name] ?? "Other"
}
