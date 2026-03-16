# Tracks

Tracks is a lightweight single-page activity tracker and insights dashboard built as a self-contained `index.html` file. It is designed for quick manual time logging in the browser, with charts and timeline views for reviewing recent activity.

## What It Does

- Start and stop activity tracking directly in the page
- Store current activity, history, habits, and UI state in `localStorage`
- Show summaries, category breakdowns, daily totals, and a timeline view
- Export tracked activity as CSV

The page uses [Chart.js](https://www.chartjs.org/) from a CDN for visualizations and does not require a build step.

## Local Development

Serve the repository with a simple static server:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`.

Opening `index.html` directly may work for some edits, but using a local server is the safer default for browser testing.

## Repository Layout

```text
.
|-- index.html
|-- README.md
`-- TODO.md
```

All application logic, styles, and markup currently live in `index.html`.

## Development Notes

- Keep changes self-contained unless there is a clear reason to split the file.
- Follow the existing style: semantic HTML, 4-space indentation, and plain JavaScript.
- Manually verify the main flows after edits: tracking, tab switching, filtering, chart rendering, and CSV export.

## Deployment

This repository is structured for simple static hosting, including GitHub Pages. Keep dependencies minimal and avoid introducing tooling unless the project is intentionally expanded.
