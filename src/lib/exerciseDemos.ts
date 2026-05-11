export const FALLBACK_EXERCISE_IMAGE_PATH = "/assets/exercises/fallback.svg"

export type ExerciseDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED"

export interface ExerciseDemo {
  name: string
  description: string
  instructions: string[]
  targetMuscles: string[]
  difficulty: ExerciseDifficulty
  demoAssetPath: string
  startAssetPath: string
  endAssetPath: string
  fallbackImagePath: string
  prompt: string
}

export function slugifyExerciseName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizeExerciseName(name: string) {
  return name.trim().toLowerCase()
}

function makePrompt(name: string, cue: string) {
  return `Simple 2D app-friendly exercise demo GIF, clean dark fitness app background, cyan motion guide lines, side or three-quarter view athlete, loopable 3 second movement, no text, show ${name}: ${cue}.`
}

function demo(
  name: string,
  description: string,
  instructions: string[],
  targetMuscles: string[],
  difficulty: ExerciseDifficulty,
  cue: string,
): ExerciseDemo {
  const slug = slugifyExerciseName(name)

  return {
    name,
    description,
    instructions,
    targetMuscles,
    difficulty,
    demoAssetPath: `/assets/exercises/${slug}.gif`,
    startAssetPath: `/assets/exercises/${slug}/start.svg`,
    endAssetPath: `/assets/exercises/${slug}/end.svg`,
    fallbackImagePath: FALLBACK_EXERCISE_IMAGE_PATH,
    prompt: makePrompt(name, cue),
  }
}

export const EXERCISE_DEMOS: ExerciseDemo[] = [
  demo("Push-ups", "A bodyweight press that trains the chest, triceps, shoulders, and core.", ["Start in a straight high plank.", "Lower your chest toward the floor with elbows controlled.", "Press back up without letting your hips sag."], ["Chest", "Triceps", "Shoulders", "Core"], "BEGINNER", "body lowers from plank and presses back up with a straight torso"),
  demo("Diamond Push-ups", "A close-hand push-up variation that emphasizes triceps control.", ["Place your hands close together under your chest.", "Keep your body in a straight plank.", "Lower slowly, then press through your palms."], ["Triceps", "Chest", "Core"], "INTERMEDIATE", "hands form a narrow diamond under the chest while the body presses up and down"),
  demo("Wide Push-ups", "A wider push-up variation that puts more work on the chest.", ["Set your hands wider than shoulder width.", "Keep your ribs and hips aligned.", "Lower with control and press back up."], ["Chest", "Shoulders", "Triceps"], "BEGINNER", "wide hand position with chest lowering between the arms"),
  demo("Incline Push-ups", "A beginner-friendly push-up using an elevated surface.", ["Place hands on a bench or sturdy surface.", "Walk feet back until your body is straight.", "Lower your chest to the surface and press up."], ["Chest", "Triceps", "Shoulders"], "BEGINNER", "hands on a raised bench while the body performs a slanted push-up"),
  demo("Decline Push-ups", "A harder push-up with feet elevated to bias upper chest and shoulders.", ["Place your feet on a stable elevated surface.", "Keep hands under shoulders and brace your core.", "Lower toward the floor and press back up."], ["Upper Chest", "Shoulders", "Triceps", "Core"], "INTERMEDIATE", "feet elevated on a bench while the athlete performs a downward angled push-up"),
  demo("Bench Press", "A weighted press for building chest and triceps strength.", ["Lie back with feet planted.", "Lower the bar or dumbbells to mid chest.", "Press upward until arms are extended."], ["Chest", "Triceps", "Shoulders"], "INTERMEDIATE", "athlete lying on bench pressing a bar from chest to straight arms"),
  demo("Dumbbell Fly", "A chest isolation movement with a wide arc.", ["Lie back with dumbbells above your chest.", "Open arms wide with a slight elbow bend.", "Squeeze the chest to bring weights together."], ["Chest", "Shoulders"], "INTERMEDIATE", "arms open in a wide arc then close above the chest"),
  demo("Chest Fly", "A chest-opening fly pattern that can be done with dumbbells, bands, or cables.", ["Start with arms open and elbows softly bent.", "Bring your hands together in front of your chest.", "Return slowly until the chest stretches."], ["Chest", "Shoulders"], "BEGINNER", "standing or lying fly motion with arms sweeping inward in a controlled arc"),
  demo("Chest Dips", "A dip variation that leans forward to target the lower chest.", ["Hold parallel bars with arms straight.", "Lean slightly forward as you lower.", "Press down through your hands to rise."], ["Chest", "Triceps", "Shoulders"], "ADVANCED", "body suspended between bars, torso leaning forward through a dip"),
  demo("Pull-ups", "An overhand vertical pull for back and arm strength.", ["Hang from a bar with overhand grip.", "Pull elbows down until your chin clears the bar.", "Lower with control to a full hang."], ["Back", "Biceps", "Core"], "INTERMEDIATE", "athlete pulls from dead hang to chin over bar and lowers smoothly"),
  demo("Chin-ups", "An underhand vertical pull that emphasizes biceps and lats.", ["Hang with palms facing you.", "Pull your chest toward the bar.", "Lower until arms are long again."], ["Back", "Biceps"], "INTERMEDIATE", "underhand grip pull from full hang to chin above bar"),
  demo("Bent-over Row", "A hip-hinged row for mid-back strength.", ["Hinge at the hips with a flat back.", "Pull the weight toward your ribs.", "Lower with shoulders controlled."], ["Back", "Lats", "Rear Shoulders"], "INTERMEDIATE", "torso hinged forward while elbows row weight toward the ribs"),
  demo("Dumbbell Row", "A single-arm row for lats and upper back.", ["Brace one hand on a bench or thigh.", "Pull the dumbbell toward your hip.", "Lower until your arm is straight."], ["Back", "Lats", "Biceps"], "BEGINNER", "one arm braced while the other rows a dumbbell to the hip"),
  demo("Superman Hold", "A floor hold that strengthens the lower back and glutes.", ["Lie face down with arms extended.", "Lift arms, chest, and legs slightly.", "Hold while keeping your neck neutral."], ["Lower Back", "Glutes", "Shoulders"], "BEGINNER", "prone athlete lifts arms and legs into a controlled superman hold"),
  demo("Reverse Fly", "A rear-shoulder and upper-back raise.", ["Hinge forward with a flat back.", "Raise arms out to the sides.", "Lower slowly without shrugging."], ["Rear Shoulders", "Upper Back"], "BEGINNER", "bent-over arms sweep out to the sides like wings"),
  demo("Deadlift", "A hip hinge lift for posterior-chain strength.", ["Stand with weight close to your feet.", "Hinge and grip with a braced back.", "Drive through legs and hips to stand tall."], ["Hamstrings", "Glutes", "Back", "Core"], "ADVANCED", "weight travels close to legs as athlete hinges down and stands tall"),
  demo("Lat Pulldown", "A machine or band pull that targets the lats.", ["Grip the bar wider than shoulders.", "Pull elbows down toward your ribs.", "Let the bar rise under control."], ["Lats", "Back", "Biceps"], "BEGINNER", "seated athlete pulls a bar from overhead to upper chest"),
  demo("Pike Push-ups", "A bodyweight shoulder press from a piked position.", ["Set hips high with hands on the floor.", "Lower the top of your head toward the floor.", "Press back up through your shoulders."], ["Shoulders", "Triceps", "Core"], "INTERMEDIATE", "hips high in inverted V while elbows bend and press"),
  demo("Lateral Raises", "A side raise that trains the shoulder caps.", ["Stand tall with weights at your sides.", "Raise arms to shoulder height.", "Lower slowly without swinging."], ["Shoulders"], "BEGINNER", "arms lift out to each side until level with shoulders"),
  demo("Front Raises", "A front shoulder raise with controlled arm lift.", ["Hold weights in front of your thighs.", "Raise arms forward to shoulder height.", "Lower slowly with ribs down."], ["Front Shoulders"], "BEGINNER", "straight arms lift forward from thighs to shoulder height"),
  demo("Overhead Press", "A vertical press for shoulders and triceps.", ["Start with weights at shoulder height.", "Brace your core and press overhead.", "Lower back to shoulders under control."], ["Shoulders", "Triceps", "Core"], "INTERMEDIATE", "weights press from shoulders to overhead lockout"),
  demo("Arnold Press", "A rotating shoulder press that moves through a large range.", ["Start with palms facing you near shoulders.", "Rotate palms out as you press overhead.", "Reverse the path back to start."], ["Shoulders", "Triceps"], "INTERMEDIATE", "dumbbells rotate from front rack into overhead press"),
  demo("Face Pull", "A pull-apart motion for rear shoulders and posture.", ["Set the band or cable at face height.", "Pull handles toward your face with elbows high.", "Squeeze shoulder blades and return slowly."], ["Rear Shoulders", "Upper Back"], "BEGINNER", "rope or band pulls toward the face with elbows flared"),
  demo("Shrugs", "A trap-focused lift using vertical shoulder elevation.", ["Hold weights at your sides.", "Lift shoulders straight up toward ears.", "Lower slowly without rolling forward."], ["Traps", "Upper Back"], "BEGINNER", "shoulders rise and lower while arms stay straight"),
  demo("Bicep Curls", "A basic arm curl for biceps strength.", ["Hold weights with palms forward.", "Curl weights toward shoulders.", "Lower until elbows are straight."], ["Biceps", "Forearms"], "BEGINNER", "forearms curl dumbbells upward while elbows stay near ribs"),
  demo("Hammer Curls", "A neutral-grip curl that trains biceps and forearms.", ["Hold dumbbells with palms facing each other.", "Curl without letting elbows drift forward.", "Lower with control."], ["Biceps", "Forearms"], "BEGINNER", "neutral grip dumbbells curl up like holding hammers"),
  demo("Tricep Dips", "A bodyweight dip focused on the back of the arms.", ["Place hands on a bench behind you.", "Lower hips by bending elbows.", "Press back up until arms are straight."], ["Triceps", "Chest", "Shoulders"], "INTERMEDIATE", "hands behind on bench while elbows bend and extend"),
  demo("Tricep Extension", "An overhead extension that isolates the triceps.", ["Hold a weight overhead.", "Bend elbows to lower the weight behind your head.", "Extend elbows to return overhead."], ["Triceps"], "BEGINNER", "overhead dumbbell lowers behind head then extends up"),
  demo("Close-grip Push-ups", "A narrow push-up that emphasizes triceps.", ["Set hands just inside shoulder width.", "Keep elbows tracking back.", "Lower and press while staying braced."], ["Triceps", "Chest", "Core"], "INTERMEDIATE", "narrow hand push-up with elbows tight to the body"),
  demo("Preacher Curl", "A supported curl that limits swinging.", ["Rest upper arms on a preacher pad.", "Curl the weight toward your shoulders.", "Lower until arms are nearly straight."], ["Biceps"], "INTERMEDIATE", "arms supported on angled pad while weight curls upward"),
  demo("Concentration Curl", "A strict single-arm curl for biceps control.", ["Sit and brace your elbow against inner thigh.", "Curl the dumbbell toward your shoulder.", "Lower slowly without swinging."], ["Biceps"], "BEGINNER", "seated single arm curl with elbow pinned to inner thigh"),
  demo("Curl to Press", "A curl followed by an overhead press.", ["Curl weights from your sides to shoulders.", "Press the weights overhead.", "Lower to shoulders, then back to sides."], ["Biceps", "Shoulders", "Triceps"], "INTERMEDIATE", "dumbbells curl up then press overhead in one smooth sequence"),
  demo("Bodyweight Squats", "A basic lower-body squat pattern.", ["Stand with feet about shoulder width.", "Sit hips back and bend knees.", "Drive through feet to stand tall."], ["Quads", "Glutes", "Hamstrings"], "BEGINNER", "athlete squats down with hips back then stands tall"),
  demo("Squats", "A knee-and-hip bend for legs and glutes.", ["Set feet comfortably under hips.", "Lower until thighs approach parallel.", "Stand by pushing the floor away."], ["Quads", "Glutes", "Hamstrings"], "BEGINNER", "simple bodyweight squat from standing to parallel and back"),
  demo("Walking Lunges", "A traveling lunge that trains single-leg control.", ["Step forward into a long stance.", "Lower the back knee toward the floor.", "Push through the front foot and step into the next rep."], ["Quads", "Glutes", "Hamstrings"], "BEGINNER", "alternating forward lunges moving across the frame"),
  demo("Lunges", "A single-leg squat pattern for legs and balance.", ["Step one foot forward.", "Lower both knees with torso tall.", "Push back to standing and switch sides."], ["Quads", "Glutes", "Hamstrings"], "BEGINNER", "forward lunge down and back to standing, alternating legs"),
  demo("Glute Bridges", "A floor hip extension for glutes and hamstrings.", ["Lie on your back with knees bent.", "Drive through heels to lift hips.", "Squeeze glutes, then lower slowly."], ["Glutes", "Hamstrings", "Core"], "BEGINNER", "hips lift from floor into bridge and lower under control"),
  demo("Wall Sit", "An isometric leg hold against a wall.", ["Lean your back against a wall.", "Slide down until knees are bent.", "Hold with knees over ankles."], ["Quads", "Glutes"], "BEGINNER", "athlete holds seated position against wall without moving"),
  demo("Calf Raises", "A lower-leg raise for calf strength.", ["Stand tall with feet hip width.", "Rise onto the balls of your feet.", "Lower heels slowly."], ["Calves"], "BEGINNER", "heels lift high then lower to the floor"),
  demo("Bulgarian Split Squats", "A rear-foot-elevated single-leg squat.", ["Place rear foot on a bench.", "Lower the back knee toward the floor.", "Drive through the front foot to stand."], ["Quads", "Glutes", "Hamstrings"], "ADVANCED", "rear foot elevated while front leg performs a split squat"),
  demo("Romanian Deadlift", "A hinge lift that emphasizes hamstrings.", ["Hold weights in front of thighs.", "Push hips back with a soft knee bend.", "Stand by squeezing glutes and hamstrings."], ["Hamstrings", "Glutes", "Back"], "ADVANCED", "hips hinge back while weights slide down thighs then return"),
  demo("Goblet Squats", "A squat holding one weight at the chest.", ["Hold a dumbbell close to your chest.", "Squat with elbows inside knees.", "Stand tall while keeping the weight close."], ["Quads", "Glutes", "Core"], "INTERMEDIATE", "front-held dumbbell stays at chest through a squat"),
  demo("Step-ups", "A single-leg step onto a raised platform.", ["Place one foot fully on a box or step.", "Drive through that foot to stand on the platform.", "Step down with control and switch sides."], ["Quads", "Glutes", "Hamstrings"], "BEGINNER", "athlete steps onto a box and returns to floor"),
  demo("Jump Squats", "An explosive squat jump for power and conditioning.", ["Squat down with chest tall.", "Jump upward with arms controlled.", "Land softly and reset."], ["Quads", "Glutes", "Calves"], "INTERMEDIATE", "squat descends then jumps vertically and lands softly"),
  demo("Plank", "A static core hold from elbows or hands.", ["Set elbows under shoulders.", "Keep body straight from head to heels.", "Brace your core and breathe."], ["Core", "Shoulders"], "BEGINNER", "athlete holds a straight forearm plank position"),
  demo("Russian Twist", "A seated rotation for obliques.", ["Sit with knees bent and torso leaned back.", "Rotate your hands from side to side.", "Keep your chest lifted and core braced."], ["Obliques", "Core"], "BEGINNER", "seated torso rotates left and right with hands together"),
  demo("Leg Raises", "A lower-core movement lifting straight legs.", ["Lie on your back with legs long.", "Lift legs toward vertical.", "Lower slowly without arching your back."], ["Lower Abs", "Hip Flexors"], "BEGINNER", "straight legs raise from floor to vertical and lower"),
  demo("Bicycle Crunches", "An alternating crunch with rotation.", ["Lie on your back with hands near head.", "Bring one knee toward opposite elbow.", "Alternate sides in a steady rhythm."], ["Abs", "Obliques"], "BEGINNER", "opposite elbow and knee meet while legs pedal"),
  demo("Mountain Climbers", "A dynamic plank that drives knees toward the chest.", ["Start in a high plank.", "Drive one knee toward your chest.", "Switch legs quickly while hips stay low."], ["Core", "Shoulders", "Cardio"], "INTERMEDIATE", "high plank with alternating fast knee drives"),
  demo("Hanging Knee Raises", "A hanging core raise using bent knees.", ["Hang from a bar with shoulders active.", "Raise knees toward your chest.", "Lower with control without swinging."], ["Abs", "Hip Flexors", "Grip"], "INTERMEDIATE", "athlete hangs and lifts knees toward chest"),
  demo("Plank Reaches", "A plank variation with alternating arm reaches.", ["Start in a high plank.", "Reach one arm forward without shifting hips.", "Return and alternate sides."], ["Core", "Shoulders"], "BEGINNER", "plank hold with one arm reaching forward at a time"),
  demo("Dead Bug", "A controlled core drill from the floor.", ["Lie on your back with arms and knees up.", "Extend opposite arm and leg.", "Return to center and switch sides."], ["Core", "Hip Flexors"], "BEGINNER", "opposite arm and leg extend while back stays flat"),
  demo("Burpees", "A full-body conditioning movement from squat to plank to jump.", ["Squat and place hands on the floor.", "Step or jump feet back to plank.", "Return feet forward and stand or jump."], ["Full Body", "Chest", "Legs", "Core"], "INTERMEDIATE", "athlete drops to plank, returns to squat, and jumps up"),
  demo("Jumping Jacks", "A simple cardio move with arms and legs opening together.", ["Stand tall with arms at sides.", "Jump feet out while arms rise overhead.", "Jump back to the start position."], ["Full Body", "Shoulders", "Calves"], "BEGINNER", "arms and legs open wide then close in a steady loop"),
  demo("High Knees", "A running-in-place drill with high knee drive.", ["Stand tall with elbows bent.", "Drive one knee toward hip height.", "Switch quickly while staying light on feet."], ["Cardio", "Hip Flexors", "Core"], "BEGINNER", "running in place with knees lifting high"),
  demo("Squat Thrusts", "A burpee-style plank kick without the jump.", ["Place hands on the floor from a squat.", "Kick or step feet back to plank.", "Bring feet forward and stand or reset."], ["Full Body", "Core", "Legs"], "INTERMEDIATE", "feet jump back to plank then forward to squat"),
  demo("Bear Crawl", "A crawling core drill with knees hovering.", ["Start on hands and feet with knees low.", "Move opposite hand and foot forward.", "Keep hips steady and back flat."], ["Core", "Shoulders", "Quads"], "INTERMEDIATE", "low crawl forward with knees hovering just above floor"),
  demo("Tuck Jumps", "An explosive jump bringing knees toward the chest.", ["Dip into a small squat.", "Jump and pull knees upward.", "Land softly and reset before the next rep."], ["Legs", "Core", "Cardio"], "ADVANCED", "vertical jump with knees tucking toward chest and soft landing"),
  demo("Box Jumps", "A power jump onto a stable box or platform.", ["Stand close to a box.", "Swing arms and jump onto the box.", "Land softly, stand tall, and step down."], ["Glutes", "Quads", "Calves"], "ADVANCED", "athlete jumps from floor onto a box and steps down"),
  demo("Sprints", "A short high-effort running interval.", ["Start tall with a forward lean.", "Drive knees and pump arms fast.", "Slow down with control after the interval."], ["Cardio", "Glutes", "Hamstrings", "Calves"], "INTERMEDIATE", "side view runner accelerates with strong arm drive"),
  demo("Sprint", "A single short high-effort run interval.", ["Lean slightly forward.", "Drive knees and arms hard.", "Finish the interval and recover."], ["Cardio", "Glutes", "Hamstrings", "Calves"], "INTERMEDIATE", "side view runner performs one fast sprint interval"),
  demo("Jump Rope", "A rhythmic cardio drill using a rope pattern.", ["Stand tall with elbows near ribs.", "Turn wrists as the rope passes under feet.", "Hop lightly and keep a steady rhythm."], ["Cardio", "Calves", "Shoulders"], "BEGINNER", "athlete lightly hops while a rope loops around the body"),
  demo("Battle Ropes", "A conditioning move using heavy rope waves.", ["Hold one rope end in each hand.", "Hinge slightly and brace your core.", "Drive alternating waves through the ropes."], ["Cardio", "Shoulders", "Arms", "Core"], "INTERMEDIATE", "athlete creates alternating rope waves from a strong athletic stance"),
]

const DEMO_BY_NAME = new Map(
  EXERCISE_DEMOS.map((exerciseDemo) => [normalizeExerciseName(exerciseDemo.name), exerciseDemo]),
)

export function getExerciseDemo(name: string): ExerciseDemo {
  const normalizedName = normalizeExerciseName(name)
  const existingDemo = DEMO_BY_NAME.get(normalizedName)
  if (existingDemo) return existingDemo

  return demo(
    name,
    "Custom exercise saved by the user.",
    ["Review your saved notes before starting.", "Move with control through the full range.", "Stop if the movement causes pain."],
    ["Custom"],
    "BEGINNER",
    "generic safe movement loop with neutral pose and controlled range of motion",
  )
}
