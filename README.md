# app-logo skill

A [Claude Code](https://docs.claude.com/en/docs/claude-code) skill that designs a website or app logo
by combining two ideas:

- **antirez's icon method** ([video](https://youtu.be/ArfhdGDy9QM)): ask an image model for one sheet
  with dozens of small numbered icons "drawn by different artists", let a human pick a few numbers by
  eye, then ask for a second sheet of variations of those numbers.
- **[Vitrum](https://usevitrum.com/studio)**: a free in-browser tool that turns a flat logo into a 3D
  icon, driven here from headless Chromium.

It then checks the picks at 32 and 180 px, builds the favicon, apple-touch and PWA icons with a hybrid
setup (flat favicon, 3D everywhere else), and renders a 5:1 wide logo for the Google AdSense cookie
consent banner.

The method was run end to end on a live site: from two boards of 36 icons to a new logo in production
in one evening.

## Install

```sh
git clone https://github.com/tedin7/app-logo-skill.git
ln -s "$PWD/app-logo-skill/app-logo" ~/.claude/skills/app-logo
```

Then ask Claude Code for a logo, or type `/app-logo`.

## What is inside

| File | What it does |
|---|---|
| `app-logo/SKILL.md` | The method, step by step, with the prompts that worked |
| `app-logo/scripts/vitrum.js` | Drives Vitrum: upload, Stack + Color finish, front view, PNG export |
| `app-logo/scripts/transparent_bg.py` | Makes the white outside a rounded-square icon transparent |
| `app-logo/scripts/site_icons.js` | favicon.ico from the flat icon; PWA and apple-touch icons from the 3D render |
| `app-logo/scripts/wide_logo.js` | Icon + site name in the site's own font, 5:1, for cookie banners |

## Requirements

- An image model that can draw numbered boards. The skill uses Codex CLI's `image_generation` feature.
- Node with `playwright-core` and a Chromium build (`PLAYWRIGHT_CORE`, `CHROME_PATH` to point at them),
  `sharp` for `site_icons.js`, Python with Pillow and numpy for `transparent_bg.py`.

Only upload artwork you own to Vitrum.

## License

MIT
