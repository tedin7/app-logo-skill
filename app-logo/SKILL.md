---
name: app-logo
description: Design a website or app logo the antirez way (numbered boards of many icons drawn by an image model, the owner picks by eye) and turn the winner into a 3D icon with Vitrum. Covers small-size checks, favicon, apple-touch and PWA icons, header logo, and the wide logo for the Google AdSense cookie consent banner. Use when the user asks for a logo, icon, favicon, 3D icon, app icon or cookie banner logo.
---

# App logo: antirez boards + Vitrum 3D

A method that was run end to end on a live site: from a blank page to a new logo in production in
one evening. It combines two ideas:

- **antirez's icon method** (video: https://youtu.be/ArfhdGDy9QM): never ask an image model for one
  icon. Ask for ONE image with dozens of small numbered icons "drawn by different artists", let a human
  pick a few numbers by eye, then ask for a second board of variations of those numbers.
- **Vitrum** (https://usevitrum.com/studio): a free in-browser tool that turns a flat logo into a 3D
  icon. No account, no API, so it is driven from a headless browser.

## Ground rules
- The owner picks. Do not tell them which icon you like on the boards (antirez's blind judgment).
  Once they have narrowed it down and ask "which one would you use?", give one answer and the reason.
- Look at every image yourself before showing it. A file that exists proves nothing.
- Show the work on one page that you keep updating (boards, picks, 3D renders, small-size checks), so
  the owner can open it from a phone or tablet.
- No new costs. Use an image model the owner already pays for. Codex CLI has an `image_generation`
  feature (`codex features list`) that works with a ChatGPT plan. If Vitrum ever asks for an account or
  a payment, stop and say so.

## Steps
1. **Brief** (5 lines): site name, what it does, audience, 2-3 visual ideas, colors to avoid.
2. **Board 1: 36 numbered icons.** One prompt, one image. Run it in a scratch folder outside any repo:
   ```
   codex exec --skip-git-repo-check -s workspace-write "Use your image generation tool to create ONE
   square image (1024x1024 or larger) saved as board1.png: a single sheet with 36 different app icons
   in a 6x6 grid, each with a small clear number 1-36 under it, as if drawn by 36 different artists,
   all minimal, flat, one simple symbol each, rounded-square app icon shape. The app is <name>: <what it
   does>. The icons should evoke: <ideas>. Graphic ideas to explore: <list>. Vary colors across icons.
   No text other than the numbers."
   ```
   Takes 1-5 minutes. Show it and ask the owner for 1-3 numbers.
3. **Board 2: variations of the picked numbers.** Attach board 1. Careful: `-i` swallows every
   argument after it, so the prompt must come after `--`, or codex starts with no instructions:
   ```
   codex exec --skip-git-repo-check -s workspace-write -i board1.png -- "The owner picked 7, 24 and 17.
   Create ONE image saved as board2.png: 36 numbered icons, rows 1-2 variations of icon 7 (<describe>),
   rows 3-4 variations of 24, rows 5-6 variations of 17. Same subjects, different colors, backgrounds,
   line weights and ideas. Also try mixing the ideas."
   ```
   Ask the owner for 1-4 numbers again.
4. **Clean redraw of each pick.** One codex call with board 2 attached: redraw each picked number as
   its own 1024x1024 icon, faithful to the original, no number, plain white outside the rounded
   square (`pick-NN.png`). Slow: about 45 minutes for 4 icons. Run it in the background.
5. **Transparent background** outside the rounded square (`scripts/transparent_bg.py`), otherwise
   Vitrum extrudes the white too.
6. **3D with Vitrum** (`scripts/vitrum.js`, usage at the top of the file). The recipe that keeps the
   original colors: geometry `Stack`, finish `Color`, view `Front`. The Front view sometimes does not
   stick and the icon comes out turned sideways: look at the render and redo it, or take a screenshot
   with `SHOT=1 SCALE=1.5` and crop it. About 10 minutes per icon with retries on a server without a GPU.
7. **Small-size check.** Show every pick at 1024, 180 and 32 px, on a light and a dark background, side
   by side. Also show a fake browser tab bar with the icon at 16 and 32 px next to other tabs. Thin
   lines and small details disappear at 32 px: say which picks survive.
8. **Apply to the site** after the owner's final pick. A hybrid setup works best:
   - **Browser favicon (16/32 px, `favicon.ico` + `favicon.svg`) from the FLAT icon.** At 16 px the 3D
     bevel and shadows eat the space and the contrast.
   - **From the 3D icon:** apple-touch-icon 180 (full bleed, no transparency, iOS rounds it), PWA icons
     192/512 (transparent corners; drop `maskable`, or Android crops the rounded square), header logo.
   - `scripts/site_icons.js` builds all sizes from the 3D render and the flat icon (needs `sharp`,
     installed outside the repo). Vitrum exports the gray scene background: the script removes it.
   - Update the site's icon tests, release, then check the live site: fetch the favicon and icons,
     screenshot the home page at 390 px and 1280 px, and look at the header.
9. **Cookie consent banner (Google AdSense / Funding Choices).** The logo there is set only in the
   AdSense UI: Privacy & messaging > European regulations > the site's message > Your sites > Edit logo.
   It wants PNG or JPG, at most 150 KB, about 5:1. `scripts/wide_logo.js` renders flat icon + site name
   with the header's real font (download the site's own woff2; Google Fonts often fails from a server
   and you silently get Arial). Upload, then "Publish changes".
10. **Save** boards, picks, renders and checks in the project's design folder. Watch for a `.gitignore`
    that drops `*.png`.

## Ideas that fit, used with care
- The 3D icon spinning (`rotateY`) instead of loading spinners where the site already waits for data.
  Never a full-screen splash: it delays every page, and page speed is measured by search engines.

## Requirements
- Codex CLI with `image_generation`, or another image model with numbered-board output.
- Node with `playwright-core` and a Chromium build (set `PLAYWRIGHT_CORE` and `CHROME_PATH` if they are
  not in the default places), `sharp` for `site_icons.js`, Python with Pillow and numpy for
  `transparent_bg.py`.
- Only upload artwork you own to Vitrum. Its exports are declared free to use.
