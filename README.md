# Exercise Tracker

A daily exercise tracker for Mom and Dad. Open a profile, follow the animated guide, let the camera verify your reps automatically, and build a streak. No install, no account, no server.

**Live:** https://exercise-tracker-nine-xi.vercel.app

---

## How it works

1. Tap a profile card (Mom or Dad)
2. Read the instructions — the stick figure animates immediately, no camera yet
3. Tap **I'm ready — Start camera**
4. The TensorFlow.js MoveNet model loads (~3 MB, cached after first visit)
5. Do the exercises — reps count automatically via pose detection
6. When all exercises are verified, tap **Save Streak**
7. Confetti, checklist, and a "Tell Vinay I'm done" share button

Streak only saves when **all exercises are CV-verified** in one session. Manual tapping does nothing.

---

## Exercises

### Mom — neck isometric holds (4 × 7-second holds)

Prescribed neck isometric exercises. Each exercise is one hold. The progress bar fills live during the hold.

| # | Exercise | What to do | Detection |
|---|----------|-----------|-----------|
| 1 | Forehead Press | Palm flat on forehead, press head forward, resist movement | Right wrist near nose, hold 7 s |
| 2 | Back of Head Press | Both hands clasped behind head, press backwards, resist | Both elbows above shoulders (or wrist near nose fallback), hold 7 s |
| 3 | Left Temple Press | Right palm on left temple, press sideways, resist | Right wrist near nose on correct side, hold 7 s |
| 4 | Right Temple Press | Left palm on right temple, press sideways, resist | Left wrist near nose on correct side, hold 7 s |

### Dad — frozen shoulder rehab (shoulder exercises)

| # | Exercise | Reps | Detection |
|---|----------|------|-----------|
| 1 | Pendulum Swings | 8 swings | Wrist below hip level, direction changes while swinging |
| 2 | Cross-body Stretch | 5 stretches | Wrist crosses body midpoint to opposite side |
| 3 | Forward Arm Raise | 8 raises | Wrist rises above shoulder level, then lowers |
| 4 | External Rotation | 8 rotations | Elbow–wrist X separation (per arm, tracked independently) |

---

## Features

| Feature | Detail |
|---------|--------|
| CV pose verification | TensorFlow.js MoveNet (SinglePose Lightning) runs entirely in the browser. No data leaves the device. |
| Per-exercise visibility check | Neck exercises only require face + shoulders visible. Shoulder exercises require shoulders + hips. Sitting close for neck work no longer triggers the "step back" warning. |
| Animated stick figure | Plays on the instructions screen before camera starts, and overlays the camera zone during the workout. |
| Sensitivity toggle | Standard / Easy. Easy mode multiplies all movement thresholds by 0.65 so less range of motion is needed. |
| Voice cues | Optional speech synthesis reads rep counts and exercise transitions aloud. |
| Streak tracking | Daily completions increment the streak. One-day grace period (missed one day still continues the streak). Completing twice in one day is a no-op. |
| 7-day history dots | Green = completed, blue = today, grey = missed. |
| Debug mode | Tap the profile name 5 times in the exercise screen to show a live panel of detector thresholds and keypoint values. |
| Offline / PWA | Service worker caches the app shell and the TF.js model after first load. Works offline after that. |
| Wake lock | Screen stays on during workouts. Uses the Wake Lock API on Android; uses a silent AudioContext oscillator on iOS Safari. |
| Daily reminders | Notification permission is requested on first profile open. Push notifications scheduled via service worker (Android Chrome only; iOS Safari does not support service worker push). |

---

## Running locally

Camera requires HTTPS or `localhost`. The simplest local setup:

```bash
cd exercise-tracker
python3 -m http.server 8766
# open http://localhost:8766
```

**On a phone over local Wi-Fi:**

```bash
ipconfig getifaddr en0   # your machine's local IP
# visit http://<ip>:8766 in Safari on the phone
```

Or tunnel with:

```bash
npx localtunnel --port 8766
```

> iOS: Safari only. Camera does not work in Chrome on iOS.

---

## Adding exercises

Exercises are defined in `MOM_EXERCISES` and `DAD_EXERCISES` inside `index.html`. Each entry:

```js
{
  id:      'unique-id',
  name:    'Display Name',
  desc:    'Instructions shown below the camera. (rep count or duration)',
  Det:     MyDetectorClass,   // class with update(normKps), done getter, pct getter
  draw:    drawMyExercise,    // animation function (ctx, W, H, t)
  visKps:  [0, 5, 6],        // keypoint indices that must be visible
  visMin:  2,                 // how many of visKps must have score >= 0.3
  warnMsg: 'Move back — face and shoulders must be visible',
}
```

**Detector interface** — your class must implement:

```js
class MyDetector {
  constructor() { this.reset(); }
  reset() {
    this.count = 0;
    this.target = 8;       // reps needed
    this.feedback = '...'; // shown in the CV strip
  }
  update(normKps) {
    // normKps: array of 17 keypoints, each {x, y, score} normalised 0–1
    // return true when a rep is counted, false otherwise
  }
  get done()  { return this.count >= this.target; }
  get pct()   { return this.count / this.target; } // 0–1 for progress bar
}
```

Keypoint coordinate system (MoveNet):
- `x=0` left edge, `x=1` right edge of raw (unmirrored) video frame
- `y=0` top, `y=1` bottom — Y increases downward
- Body perspective: kp5 = person's left shoulder → appears on **right** side of image (large X). kp6 = person's right shoulder → appears on **left** side (small X).
- The video element is CSS-mirrored (`scaleX(-1)`); the skeleton canvas is not — X is flipped manually when drawing.

**Draw function** — signature `(ctx, W, H, t)` where `t` increases each frame. Use `drawStick(ctx, cx, cy, s, parts)`:

```js
function drawMyExercise(ctx, W, H, t) {
  const cx = W * 0.78, cy = H * 0.42, s = Math.min(W, H) * 0.1;
  const swing = Math.sin(t * 2) * 0.8;
  drawStick(ctx, cx, cy, s, {
    headY: -3.5, neckY: -3, shoulderY: -2.3, hipY: 0,
    lEl: [-0.8, -1.5], lWr: [-1.2, -0.5 + swing],
    rEl: [ 0.8, -1.5], rWr: [ 1.2, -0.5 - swing],
    lKn: [-0.5,  1.5], lFt: [-0.6, 2.8],
    rKn: [ 0.5,  1.5], rFt: [ 0.6, 2.8],
  });
  glbl(ctx, cx, cy - s * 4.2, 'My exercise!');
}
```

All coordinates are in `s` units relative to `(cx, cy)`. Negative Y = upward. `glbl` draws a rounded label.

---

## Technical notes

- **Model**: MoveNet SinglePose Lightning via `@tensorflow-models/pose-detection@2.1.3`. Downloaded from TF Hub on first visit (~3 MB), then cached by the service worker.
- **Detection guard**: an `isDetecting` flag prevents concurrent `estimatePoses` calls when the RAF loop fires at 60 fps but inference takes 30–50 ms.
- **Sensitivity**: `SF()` returns `0.65` (easy) or `1.0` (standard). All movement thresholds in detectors are multiplied by `SF()`. Hold durations are not affected.
- **Storage keys**: `extrack_mom`, `extrack_dad` → `{ streak, lastDone, best, history[] }`. Also `extrack_sens`, `extrack_voice`, `extrack_notif_asked`.
- **iOS wake lock**: Wake Lock API is unreliable on iOS Safari. A silent 20 Hz AudioContext oscillator (gain 0.0001) keeps the screen on instead. It is initialised inside `openProfile()` which is always triggered by a user tap.

---

## File structure

```
exercise-tracker/
├── index.html     # Entire app — no build step, no framework, no dependencies.
├── manifest.json  # PWA manifest (name, icons, theme colour).
├── icon.svg       # App icon.
├── sw.js          # Service worker: app shell cache, TF model cache, push reminders.
└── offline.html   # Shown when navigating while offline before model is cached.
```

---

## License

MIT
