# Tracks

Tracks is a lightweight single-page activity tracker and insights dashboard built as a self-contained `index.html` file. It is designed for quick manual time logging in the browser, with charts and timeline views for reviewing recent activity.

## What It Does

- Start and stop activity tracking directly in the page
- Store current activity, history, habits, config, and UI state in `localStorage`
- Show summaries, category breakdowns, daily totals, and a timeline view
- Configure tags and daily habits in-app
- Export tracked activity as CSV

The page uses [Chart.js](https://www.chartjs.org/) from a CDN for visualizations and does not require a build step.

## Local Development

Serve the repository with a simple static server:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`.

Opening `index.html` directly may work for some edits, but using a local server is the safer default for browser testing.

Run the browser smoke suite with:

```powershell
npm.cmd run test:e2e
```

## Configuration Format

Use the `Configure` dialog to edit tags and daily habits.

Tag lines use:

```text
key | #RRGGBB
```

Examples:

```text
work/project | #1976D2
personal/habit | #388E3C
```

The app derives the rest:
- label from the key, for example `work/project` -> `Work/Project`
- category from the key prefix, for example `work/project` -> `work`

Habit lines use:

```text
activity name | icon | tag key | keyword1, keyword2
```

Example:

```text
stretch | St | personal/habit | stretch, mobility
```

The app derives:
- `id` from the activity name
- `label` from the activity name
- the started activity name from the configured activity name itself

## Repository Layout

```text
.
|-- index.html
|-- tests/
|-- README.md
|-- package.json
`-- playwright.config.js
```

All application logic, styles, and markup live in `index.html`. Browser smoke tests live in `tests/smoke.spec.js`.

## Development Notes

- Keep changes self-contained unless there is a clear reason to split the file.
- Follow the existing style: semantic HTML, 4-space indentation, and plain JavaScript.
- Manually verify the main flows after edits: tracking, tab switching, filtering, chart rendering, and CSV export.
- Prefer updating Playwright coverage when changing tracking, rollover, edit, or reset behavior.

## Deployment

This repository is structured for simple static hosting, including GitHub Pages. Keep dependencies minimal and avoid introducing tooling unless the project is intentionally expanded.
