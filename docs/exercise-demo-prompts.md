# Exercise Demo Asset Prompts

Hardcoded exercise sources found:
- `src/app/(dashboard)/workout/page.tsx`: `DEFAULT_EXERCISES` and `EXERCISE_LIBRARY`
- `src/app/(dashboard)/schedule/page.tsx`: `DAY_EXERCISES`
- `src/app/api/exercises/route.ts`: `SYSTEM_EXERCISES`
- `src/app/(dashboard)/settings/page.tsx`: `EXERCISE_MUSCLE`
- `src/app/(dashboard)/progress/page.tsx`: `EXERCISE_MUSCLE`

Demo assets should be placed in `public/assets/exercises/`.

The app keeps the future animated demo path at:

```text
/assets/exercises/exercise-name.gif
```

The in-app start/end preview now prefers user-supplied PNG stills:

```text
/assets/exercises/exercise-name/start.png
/assets/exercises/exercise-name/end.png
```

Each exercise also keeps lightweight generated SVG pair files as backups:

```text
/assets/exercises/exercise-name/start.svg
/assets/exercises/exercise-name/end.svg
```

Fallback for every exercise:

```text
/assets/exercises/fallback.svg
```

| Exercise | Short description | Step-by-step instructions | Target muscles | Difficulty | Demo asset path | Fallback image path | Simple 2D drawing/GIF prompt |
|---|---|---|---|---|---|---|---|
| Push-ups | Bodyweight press for chest, triceps, shoulders, and core. | Start in a straight plank; lower chest under control; press back up. | Chest, Triceps, Shoulders, Core | BEGINNER | `/assets/exercises/push-ups.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, side view, cyan guide lines, athlete lowers from plank and presses up. |
| Diamond Push-ups | Close-hand push-up emphasizing triceps. | Hands close under chest; keep body straight; lower and press through palms. | Triceps, Chest, Core | INTERMEDIATE | `/assets/exercises/diamond-push-ups.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, top/side angle, narrow diamond hand position, controlled push-up loop. |
| Wide Push-ups | Wider push-up that emphasizes chest. | Hands wider than shoulders; lower chest between arms; press up without hips sagging. | Chest, Shoulders, Triceps | BEGINNER | `/assets/exercises/wide-push-ups.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, wide hand placement, chest lowering and pressing up with cyan motion arrows. |
| Incline Push-ups | Elevated push-up for beginners. | Hands on bench; body straight; lower chest to surface and press up. | Chest, Triceps, Shoulders | BEGINNER | `/assets/exercises/incline-push-ups.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, hands on raised bench, slanted push-up motion. |
| Decline Push-ups | Feet-elevated push-up for upper chest and shoulders. | Feet on bench; brace core; lower toward floor and press up. | Upper Chest, Shoulders, Triceps, Core | INTERMEDIATE | `/assets/exercises/decline-push-ups.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, feet elevated, body angled downward, push-up loop. |
| Bench Press | Weighted chest press on a bench. | Lie with feet planted; lower weight to mid chest; press to straight arms. | Chest, Triceps, Shoulders | INTERMEDIATE | `/assets/exercises/bench-press.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, athlete on bench pressing bar from chest to lockout. |
| Dumbbell Fly | Chest isolation using a wide arm arc. | Start weights above chest; open arms with soft elbows; squeeze arms together. | Chest, Shoulders | INTERMEDIATE | `/assets/exercises/dumbbell-fly.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, dumbbells open wide then close above chest. |
| Chest Fly | Chest-opening fly with bands, cables, or weights. | Open arms with soft elbows; bring hands together; return slowly to stretch. | Chest, Shoulders | BEGINNER | `/assets/exercises/chest-fly.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, standing fly motion, arms sweep inward with cyan path lines. |
| Chest Dips | Forward-leaning dip for lower chest. | Support on bars; lean forward and lower; press down to rise. | Chest, Triceps, Shoulders | ADVANCED | `/assets/exercises/chest-dips.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, body between bars, forward-lean dip and press. |
| Pull-ups | Overhand vertical pull for back strength. | Hang from bar; pull chin above bar; lower to full hang. | Back, Biceps, Core | INTERMEDIATE | `/assets/exercises/pull-ups.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, athlete pulls from dead hang to chin over bar. |
| Chin-ups | Underhand vertical pull for biceps and lats. | Grip palms facing you; pull chest toward bar; lower with control. | Back, Biceps | INTERMEDIATE | `/assets/exercises/chin-ups.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, underhand grip pull-up loop with cyan elbow path. |
| Bent-over Row | Hip-hinged row for mid-back. | Hinge with flat back; pull weight to ribs; lower under control. | Back, Lats, Rear Shoulders | INTERMEDIATE | `/assets/exercises/bent-over-row.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, hinged torso rowing weight to ribs. |
| Dumbbell Row | Single-arm row for lats and upper back. | Brace one hand; pull dumbbell to hip; lower until arm is straight. | Back, Lats, Biceps | BEGINNER | `/assets/exercises/dumbbell-row.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, one arm braced, dumbbell rows toward hip. |
| Superman Hold | Floor hold for lower back and glutes. | Lie face down; lift arms, chest, and legs; hold with neutral neck. | Lower Back, Glutes, Shoulders | BEGINNER | `/assets/exercises/superman-hold.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, prone body lifts into superman hold and pulses gently. |
| Reverse Fly | Rear-shoulder and upper-back raise. | Hinge forward; raise arms out to sides; lower without shrugging. | Rear Shoulders, Upper Back | BEGINNER | `/assets/exercises/reverse-fly.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, bent-over arms sweep out like wings. |
| Deadlift | Hip hinge for posterior-chain strength. | Weight close to feet; hinge and brace; drive hips through to stand. | Hamstrings, Glutes, Back, Core | ADVANCED | `/assets/exercises/deadlift.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, bar travels close to legs through hinge and stand. |
| Lat Pulldown | Overhead pull for lats. | Grip bar wide; pull elbows down to ribs; return bar upward slowly. | Lats, Back, Biceps | BEGINNER | `/assets/exercises/lat-pulldown.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, seated pulldown from overhead to upper chest. |
| Pike Push-ups | Bodyweight shoulder press. | Hips high; lower head toward floor; press back through shoulders. | Shoulders, Triceps, Core | INTERMEDIATE | `/assets/exercises/pike-push-ups.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, inverted V body bends elbows and presses up. |
| Lateral Raises | Side raise for shoulder caps. | Weights at sides; raise arms to shoulder height; lower slowly. | Shoulders | BEGINNER | `/assets/exercises/lateral-raises.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, arms lift sideways to shoulder height with cyan arcs. |
| Front Raises | Front shoulder raise. | Weights in front; raise arms forward to shoulder height; lower with control. | Front Shoulders | BEGINNER | `/assets/exercises/front-raises.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, straight arms raise forward and lower. |
| Overhead Press | Vertical press for shoulders and triceps. | Weights at shoulders; brace core; press overhead and lower. | Shoulders, Triceps, Core | INTERMEDIATE | `/assets/exercises/overhead-press.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, weights press from shoulders to overhead. |
| Arnold Press | Rotating shoulder press. | Palms face in; rotate while pressing overhead; reverse to start. | Shoulders, Triceps | INTERMEDIATE | `/assets/exercises/arnold-press.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, dumbbells rotate from front rack into overhead press. |
| Face Pull | Rear-shoulder pull for posture. | Cable at face height; pull toward face with elbows high; return slowly. | Rear Shoulders, Upper Back | BEGINNER | `/assets/exercises/face-pull.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, rope pulls toward face with elbows flared. |
| Shrugs | Vertical shoulder lift for traps. | Hold weights at sides; lift shoulders upward; lower without rolling. | Traps, Upper Back | BEGINNER | `/assets/exercises/shrugs.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, shoulders lift and lower while arms stay straight. |
| Bicep Curls | Basic curl for biceps. | Palms forward; curl weights to shoulders; lower to straight arms. | Biceps, Forearms | BEGINNER | `/assets/exercises/bicep-curls.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, elbows pinned, dumbbells curl up and down. |
| Hammer Curls | Neutral-grip curl for biceps and forearms. | Palms face each other; curl without elbow drift; lower slowly. | Biceps, Forearms | BEGINNER | `/assets/exercises/hammer-curls.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, neutral grip dumbbells curl like hammers. |
| Tricep Dips | Bench dip for the back of the arms. | Hands on bench; bend elbows to lower hips; press back up. | Triceps, Chest, Shoulders | INTERMEDIATE | `/assets/exercises/tricep-dips.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, hands behind on bench, elbows bend and extend. |
| Tricep Extension | Overhead elbow extension. | Weight overhead; bend elbows behind head; extend to top. | Triceps | BEGINNER | `/assets/exercises/tricep-extension.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, overhead dumbbell lowers behind head and extends. |
| Close-grip Push-ups | Narrow push-up for triceps. | Hands just inside shoulders; elbows track back; lower and press. | Triceps, Chest, Core | INTERMEDIATE | `/assets/exercises/close-grip-push-ups.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, narrow hands, elbows tight, controlled push-up. |
| Preacher Curl | Supported curl with limited swinging. | Upper arms on pad; curl weight upward; lower nearly straight. | Biceps | INTERMEDIATE | `/assets/exercises/preacher-curl.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, arms on angled pad curling weight. |
| Concentration Curl | Strict single-arm seated curl. | Elbow braced on inner thigh; curl to shoulder; lower slowly. | Biceps | BEGINNER | `/assets/exercises/concentration-curl.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, seated elbow pinned, single dumbbell curl. |
| Curl to Press | Curl followed by overhead press. | Curl to shoulders; press overhead; lower back through same path. | Biceps, Shoulders, Triceps | INTERMEDIATE | `/assets/exercises/curl-to-press.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, dumbbells curl then press overhead in sequence. |
| Bodyweight Squats | Basic squat pattern. | Feet shoulder width; sit hips back; drive up to stand. | Quads, Glutes, Hamstrings | BEGINNER | `/assets/exercises/bodyweight-squats.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, bodyweight squat down and stand with cyan knee path. |
| Squats | Lower-body squat for legs and glutes. | Feet under hips; lower toward parallel; push floor away to stand. | Quads, Glutes, Hamstrings | BEGINNER | `/assets/exercises/squats.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, clean squat from standing to parallel and back. |
| Walking Lunges | Traveling alternating lunge. | Step forward; lower back knee; push through front foot to next step. | Quads, Glutes, Hamstrings | BEGINNER | `/assets/exercises/walking-lunges.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, alternating lunges moving across the frame. |
| Lunges | Single-leg lunge pattern. | Step forward; lower both knees; push back and switch sides. | Quads, Glutes, Hamstrings | BEGINNER | `/assets/exercises/lunges.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, forward lunge down and return, alternating legs. |
| Glute Bridges | Floor hip extension. | Lie with knees bent; lift hips through heels; squeeze and lower. | Glutes, Hamstrings, Core | BEGINNER | `/assets/exercises/glute-bridges.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, hips lift from floor into bridge and lower. |
| Wall Sit | Isometric leg hold. | Back against wall; slide down; hold knees over ankles. | Quads, Glutes | BEGINNER | `/assets/exercises/wall-sit.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, athlete holds seated position against wall. |
| Calf Raises | Heel raise for calves. | Stand tall; rise onto balls of feet; lower heels slowly. | Calves | BEGINNER | `/assets/exercises/calf-raises.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, heels rise and lower with cyan ankle path. |
| Bulgarian Split Squats | Rear-foot-elevated single-leg squat. | Rear foot on bench; lower back knee; stand through front foot. | Quads, Glutes, Hamstrings | ADVANCED | `/assets/exercises/bulgarian-split-squats.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, rear foot elevated, front leg split squat. |
| Romanian Deadlift | Hamstring-focused hinge. | Weight in front; push hips back; stand by squeezing glutes. | Hamstrings, Glutes, Back | ADVANCED | `/assets/exercises/romanian-deadlift.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, hips hinge back while weights slide down thighs. |
| Goblet Squats | Squat holding one weight at chest. | Hold weight close; squat with elbows inside knees; stand tall. | Quads, Glutes, Core | INTERMEDIATE | `/assets/exercises/goblet-squats.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, front-held dumbbell stays at chest through squat. |
| Step-ups | Single-leg step onto a platform. | Foot fully on step; drive up to stand; step down with control. | Quads, Glutes, Hamstrings | BEGINNER | `/assets/exercises/step-ups.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, athlete steps onto box and returns to floor. |
| Jump Squats | Explosive squat jump. | Squat down; jump upward; land softly and reset. | Quads, Glutes, Calves | INTERMEDIATE | `/assets/exercises/jump-squats.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, squat descent, vertical jump, soft landing. |
| Plank | Static core hold. | Elbows under shoulders; body straight; brace and breathe. | Core, Shoulders | BEGINNER | `/assets/exercises/plank.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, straight forearm plank with subtle breathing motion. |
| Russian Twist | Seated core rotation. | Knees bent; lean back; rotate hands side to side. | Obliques, Core | BEGINNER | `/assets/exercises/russian-twist.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, seated torso rotates left and right. |
| Leg Raises | Lower-core leg lift. | Lie on back; lift legs toward vertical; lower without arching. | Lower Abs, Hip Flexors | BEGINNER | `/assets/exercises/leg-raises.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, straight legs raise from floor to vertical and lower. |
| Bicycle Crunches | Alternating crunch with rotation. | Hands near head; knee meets opposite elbow; alternate smoothly. | Abs, Obliques | BEGINNER | `/assets/exercises/bicycle-crunches.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, opposite elbow and knee meet while legs pedal. |
| Mountain Climbers | Plank with fast knee drives. | Start high plank; drive one knee in; switch legs quickly. | Core, Shoulders, Cardio | INTERMEDIATE | `/assets/exercises/mountain-climbers.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, high plank alternating knee drives. |
| Hanging Knee Raises | Hanging bent-knee core raise. | Hang from bar; raise knees to chest; lower without swinging. | Abs, Hip Flexors, Grip | INTERMEDIATE | `/assets/exercises/hanging-knee-raises.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, athlete hangs and lifts knees toward chest. |
| Plank Reaches | Plank with alternating arm reach. | Start high plank; reach one arm forward; return and switch. | Core, Shoulders | BEGINNER | `/assets/exercises/plank-reaches.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, plank with one arm reaching forward at a time. |
| Dead Bug | Controlled floor core drill. | Arms and knees up; extend opposite arm and leg; return and switch. | Core, Hip Flexors | BEGINNER | `/assets/exercises/dead-bug.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, opposite arm and leg extend while back stays flat. |
| Burpees | Full-body conditioning move. | Squat to floor; move feet back to plank; return and stand or jump. | Full Body, Chest, Legs, Core | INTERMEDIATE | `/assets/exercises/burpees.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, drop to plank, return to squat, jump up. |
| Jumping Jacks | Cardio move with arms and legs opening together. | Stand tall; jump feet out and arms overhead; jump back in. | Full Body, Shoulders, Calves | BEGINNER | `/assets/exercises/jumping-jacks.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, arms and legs open wide then close. |
| High Knees | Running in place with high knee drive. | Stand tall; drive one knee to hip height; switch quickly. | Cardio, Hip Flexors, Core | BEGINNER | `/assets/exercises/high-knees.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, running in place with knees lifting high. |
| Squat Thrusts | Burpee-style plank kick without jump. | Hands to floor; kick feet back to plank; bring feet forward. | Full Body, Core, Legs | INTERMEDIATE | `/assets/exercises/squat-thrusts.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, feet jump back to plank then forward to squat. |
| Bear Crawl | Low crawl with knees hovering. | Hands and feet on floor; move opposite hand and foot; keep hips steady. | Core, Shoulders, Quads | INTERMEDIATE | `/assets/exercises/bear-crawl.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, low crawl forward with knees hovering. |
| Tuck Jumps | Explosive jump with knees toward chest. | Dip into squat; jump and tuck knees; land softly. | Legs, Core, Cardio | ADVANCED | `/assets/exercises/tuck-jumps.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, vertical jump with knees tucking toward chest. |
| Box Jumps | Power jump onto a stable box. | Stand near box; jump onto box; stand tall and step down. | Glutes, Quads, Calves | ADVANCED | `/assets/exercises/box-jumps.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, athlete jumps from floor onto box and steps down. |
| Sprints | Short high-effort running interval. | Lean forward; drive knees and arms fast; slow down after interval. | Cardio, Glutes, Hamstrings, Calves | INTERMEDIATE | `/assets/exercises/sprints.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, side view runner accelerates with strong arm drive. |
| Sprint | Single short high-effort run interval. | Lean forward; drive knees and arms; finish and recover. | Cardio, Glutes, Hamstrings, Calves | INTERMEDIATE | `/assets/exercises/sprint.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, one fast sprint interval with cyan speed lines. |
| Jump Rope | Rhythmic cardio drill with rope pattern. | Elbows near ribs; turn wrists; hop lightly in rhythm. | Cardio, Calves, Shoulders | BEGINNER | `/assets/exercises/jump-rope.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, athlete hops while rope loops around body. |
| Battle Ropes | Heavy rope conditioning waves. | Hold rope ends; hinge and brace; drive alternating waves. | Cardio, Shoulders, Arms, Core | INTERMEDIATE | `/assets/exercises/battle-ropes.gif` | `/assets/exercises/fallback.svg` | Simple 2D app GIF, athletic stance creating alternating rope waves. |
