---
name: verify
description: Drive the tankz PixiJS game headlessly and capture screenshot evidence
---

# Verifying tankz (PixiJS browser game)

## Launch

```bash
npm run dev -- --port 5199 --strictPort   # background; serves http://localhost:5199
```

## Drive headlessly

Playwright browsers are cached at `~/.cache/ms-playwright/` (no project dep).
Install `playwright-core` in a scratch dir and launch the cached Chromium
directly:

```js
import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: '/home/irakli/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome',
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
```

## Flows worth driving

- Boot: `canvas` exists, arena tiles render, no `pageerror` console entries.
- Drive: `page.keyboard.down('KeyW')` ~1s → camera scrolls (screenshot diff).
- Steer: hold `KeyD`+`KeyW` → hull rotates diagonally in screenshots.
- Turret: `page.mouse.move(...)` off-center, wait ~800ms (capped turn rate) →
  barrel visibly rotates independently of hull.
- Fire: `page.mouse.down()` ~120ms then screenshot → yellow 3px shell dot
  visible along the aim line.
- Resize: `page.setViewportSize(...)` → canvas resizes, camera re-centers.

## Gotchas

- Screenshots stall the GL pipeline (`ReadPixels` warnings) — environment
  noise, not a game bug.
- `/favicon.ico` 404s in console (index.html declares none) — pre-existing.
- Turret turn rate is capped (TANK.turretTurnRate) — wait several hundred ms
  after moving the mouse before screenshotting the new aim.
