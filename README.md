# Exercise Tracker

A daily exercise tracker for two people (Mom and Dad). Open a profile, follow the animated stick figure guide with your camera on, mark done, and build a streak.

## Live

**https://exercise-tracker-nine-xi.vercel.app**

Works on any phone or tablet — no install, no account, no tracking.

---

## Features

| Feature | Detail |
|---------|--------|
| **Two profiles** | Mom and Dad each have their own streak and completion state, stored independently. |
| **Live camera** | Front-facing camera fills the background so you can see yourself while exercising. Can be skipped. |
| **Animated stick figure** | A stick figure drawn in real time over the camera demonstrates the current exercise in a looping animation. |
| **Exercise library** | 5 exercises. Navigate with Previous / Next. Each shows name, reps/duration, and plain-English instructions. |
| **Mark done** | One button logs the day, increments the streak, and fires a confetti celebration. |
| **Streak tracking** | Daily completions increment the streak, with a one-day grace period. |
| **Offline / no server** | Data lives in `localStorage`. The service worker caches the app shell and pose model after first load. |

---

## Exercises included

| # | Exercise | Target |
|---|----------|--------|
| 1 | Standing March | 30 seconds |
| 2 | Arm Circles | 10 each direction |
| 3 | Sit-to-Stand | 10 times |
| 4 | Side Bend Stretch | 5 each side |
| 5 | Calf Raises | 15 times |

More can be added — see below.

---

## Running locally

**Direct file (no server needed):**

```bash
open index.html
```

**Local HTTP server (required for camera on some browsers):**

```bash
python3 -m http.server 8765
# open http://localhost:8765
```

**On a phone over local Wi-Fi:**

```bash
ipconfig getifaddr en0   # your machine's local IP
# open http://<ip>:8765 on the phone
```

Camera requires HTTPS or `localhost`. For local network use, tunnel with:

```bash
npx localtunnel --port 8765
```

---

## Adding exercises

Exercises are split into `MOM_EXERCISES` and `DAD_EXERCISES` inside `index.html`. Each entry:

```js
{
  id:   'unique_id',
  name: 'Display Name',
  desc: 'Instructions shown below the camera view. (Reps or duration)',
  reps: '10 reps',
  draw: drawFunctionName
}
```

The `draw` function signature is `(ctx, canvasWidth, canvasHeight, time)` where `time` is a monotonically increasing float. Use `Math.sin(time * speed)` to animate joints. The `drawStick` helper takes a `parts` object of named joint positions in a local unit coordinate system (scaled by `s = Math.min(W, H) * 0.1`):

```js
function drawMyExercise(ctx, W, H, t) {
  const cx = W * 0.75, cy = H * 0.45, s = Math.min(W, H) * 0.1;
  const bend = Math.sin(t * 2) * 0.8;
  drawStick(ctx, cx, cy, s, {
    headY: -3.5,
    neckY: -3,
    shoulderY: -2.3,
    hipY: 0,
    leftElbow:  [-0.8, -1.5 + bend],
    leftHand:   [-1.2, -0.5 + bend],
    rightElbow: [0.8,  -1.5 - bend],
    rightHand:  [1.2,  -0.5 - bend],
    leftKnee:   [-0.5, 1.5],
    leftFoot:   [-0.6, 2.8],
    rightKnee:  [0.5,  1.5],
    rightFoot:  [0.6,  2.8]
  });
  label(ctx, cx, cy - s * 4.2, 'My exercise!');
}
```

---

## Technical notes

- **Camera**: `getUserMedia({ video: { facingMode: 'user' } })`. Video is CSS-flipped (`scaleX(-1)`) to mirror the user.
- **Animation**: `requestAnimationFrame` loop started on profile open, cancelled on back navigation.
- **Canvas sizing**: resized to fill the camera zone on load and on window resize.
- **Streak logic**: if the last completion was within two days, the streak increments; otherwise it resets to 1. Completing twice in one day is a no-op.
- **Notifications**: daily reminder notifications are requested on first profile selection. Android Chrome can show them through the service worker; iOS Safari does not support reliable local scheduled service worker notifications.
- **Storage keys**: `extrack_mom` and `extrack_dad` in `localStorage` — `{ streak, lastDone, best, history[] }`.

---

## Structure

```
exercise-tracker/
├── index.html     # Entire app. No build step, no dependencies.
├── manifest.json  # PWA manifest.
├── icon.svg       # App icon.
├── sw.js          # Service worker cache and reminder support.
└── offline.html   # Offline fallback page.
```

---

## License

MIT
