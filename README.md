# Exercise Tracker

A zero-install, zero-account PWA that verifies physical therapy exercises with on-device computer vision — built for my parents so I could actually confirm they were doing their prescribed reps instead of taking their word for it.

**Live Demo:** [exercise-tracker-nine-xi.vercel.app](https://exercise-tracker-nine-xi.vercel.app)

## What problem does this solve?

My mom and dad each have prescribed rehab exercises (neck isometric holds and frozen-shoulder shoulder work) they're supposed to do daily. Verbal check-ins don't work — there's no way to know if the reps actually happened, or happened with the correct form. This app puts up a profile, plays an animated demo of the exercise, then turns on the camera and uses real-time pose detection to count reps or time holds automatically. A daily streak only advances when every exercise in the session is machine-verified — tapping through it manually does nothing. Everything runs client-side; no video or data ever leaves the device.

## Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5 Canvas, no framework and no build step — the entire app is one `index.html`
- **Computer Vision:** TensorFlow.js + `@tensorflow-models/pose-detection` (MoveNet SinglePose Lightning), running entirely in-browser
- **Offline/PWA:** Service worker (`sw.js`) caches the app shell and the ~3MB CV model after first load; includes a web app manifest and offline fallback page
- **Infra/Deployment:** Static site on Vercel — no backend, no database, no build pipeline

## Architecture

There is no server. The entire app — UI, exercise logic, and ML inference — runs in a single `index.html` loaded by the browser:

1. **Home screen** — pick a profile (Mom or Dad), each with its own exercise set and streak stored in `localStorage`.
2. **Instructions screen** — a canvas-drawn stick-figure animation demonstrates the exercise before the camera even starts.
3. Tapping "Start camera" loads the MoveNet model (cached by the service worker after the first visit) and opens the device camera.
4. A `requestAnimationFrame` loop feeds video frames to MoveNet, which returns 17 normalized keypoints per frame. Per-exercise detector classes (e.g. a pendulum-swing detector, a forehead-press detector) consume those keypoints and decide when a rep or hold counts.
5. On full completion, streak/history/best-streak update in `localStorage`, and a share button lets them message me that it's done.

## Key Features

- Real-time rep/hold counting via MoveNet pose keypoints — manual tapping never counts toward a streak
- Two independently configured exercise sets: 4 neck isometric holds (Mom), 4 frozen-shoulder rehab movements (Dad)
- Per-exercise visibility gating (shoulder exercises require shoulders + hips in frame; neck exercises don't, so sitting close for neck work doesn't false-trigger a "step back" warning)
- Adjustable sensitivity (Standard / Easy — Easy multiplies movement thresholds by 0.65)
- Optional voice cues via the Web Speech API, reading out rep counts and transitions
- 7-day streak history with a one-day grace period, plus a debug panel (tap the profile name 5x) showing live detector thresholds
- Fully offline-capable after first load via service worker caching of the app shell and the TF.js model
- Screen-awake handling that works around iOS Safari's unreliable Wake Lock API

## Interesting Engineering Decisions

- **No build step, no framework.** The whole app is one `index.html`. For a single-purpose tool used by two people, this removed an entire category of tooling risk (bundler config, dependency drift, deploy pipeline) in exchange for a bigger file.
- **Wake Lock workaround for iOS.** The Wake Lock API is unreliable in iOS Safari, so instead of fighting it, the app runs a silent 20Hz `AudioContext` oscillator at near-zero gain to keep the screen from sleeping mid-workout — initialized inside a user-tap handler so it satisfies the browser's autoplay policy.
- **A concurrency guard on pose inference.** `estimatePoses` takes 30–50ms per call but the render loop fires at 60fps; an `isDetecting` flag prevents overlapping calls from piling up and desyncing detector state.
- **Pluggable detector interface.** Each exercise is a small class implementing `update(keypoints)`, a `done` getter, and a `pct` getter, so adding a new exercise means writing one detector + one draw function, not touching the app shell.

## Running Locally

Camera access requires HTTPS or `localhost`:

```bash
cd exercise-tracker
python3 -m http.server 8766
# open http://localhost:8766
```

To test on a phone over local Wi-Fi:

```bash
ipconfig getifaddr en0   # find your machine's local IP
# visit http://<ip>:8766 in Safari on the phone
```

iOS note: camera access only works in Safari, not Chrome on iOS.

## License

MIT
