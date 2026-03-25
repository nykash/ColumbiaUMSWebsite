## Columbia Undergraduate Math Society Website

This repository contains the static frontend for the Columbia Undergraduate Math Society (UMS) website. The site is intentionally simple: `index.html` + `styles.css` + `script.js` render the UI, and the JavaScript fetches data and media from JSON/PDF/image files inside the repo.

## Local development

Because the frontend uses `fetch()` with relative paths (e.g. `events/index.json`), serve the directory with any static server and then open `index.html` in your browser.

Example:
`python3 -m http.server 8000`
Then open: `http://localhost:8000/index.html`

No build step is required.

## Repo Structure (detailed)

### Top-level files

- `index.html`: single-page layout (nav + sections) with empty containers populated by `script.js`.
- `styles.css`: styling for all sections (nav, cards, calendar, etc.).
- `script.js`: client-side logic (fetching JSON, rendering the events calendar, proofwriting workshop cards, and leadership cards).
- `jsonifyer.py`: helper script to convert old HTML event tables into the `_events.json` format used by the frontend.
- `README.md`: this document.

### Top-level directories

- `events/`: per-semester lecture/event calendar JSON.
- `data/`: leadership JSON data.
- `proofwriting_workshop_data/`: proofwriting workshop schedule JSON and workshop handout PDFs.
- `resources/`: static images and PDFs referenced by the frontend.
- `legacy/`: older generated HTML event pages (useful as input when regenerating event JSON).

---

### `events/` (lecture/event calendar data)

- `index.json`: list of available semesters in the form:
  - `year` (number)
  - `term` (`spring` / `summer` / `fall`)
  - `json_file` (the corresponding `*_events.json` filename)
- `*_events.json`: per-semester event arrays. Each event is an object with:
  - `date` (string, often like `Jan 21` / `February 4`)
  - `speaker` (string; may be empty)
  - `title` (string)
  - `abstract` (string; may be empty)

Examples of files:
- `2026_spring_events.json`
- `2025_fall_events.json`
- `2025_summer_events.json`
- `2025_spring_events.json`
- `2024_fall_events.json`
- `2024_spring_events.json`
- `2023_summer_events.json`

---

### `data/` (leadership data)

- `leadership_2025.json`: current leadership roster used to populate the “Leadership” section.
  - Each entry contains fields like `title`, `name`, `image`, and `bio`.
- `previous_leadership.json`: historical leadership by year (used by the “Previous Leadership” view).

---

### `proofwriting_workshop_data/` (workshop schedule + handouts)

- `2025_fall_pw.json`: workshop schedule for Fall 2025.
  - Top-level `title`
  - `material[]` entries with:
    - `week` (number)
    - `date` (string)
    - `time` (string)
    - `pdf_link` (relative path to a PDF)
    - `title` (string)
- `legacy_2022_weeks.json`, `legacy_2023_weeks.json`, `legacy_2024_weeks.json`:
  - small metadata files that indicate which week handouts exist for each year.
- `legacy/UMSProofsWeek{week}_{year}.pdf`:
  - the workshop handouts used by the UI for earlier years.
  - Example paths:
    - `proofwriting_workshop_data/legacy/UMSProofsWeek1_2022.pdf`
    - `proofwriting_workshop_data/legacy/UMSProofsWeek3_2024.pdf`

---

### `resources/` (static media)

- `resources/images/`: profile images used in leadership cards (referenced from `data/leadership_2025.json`).
- `resources/pdfs/`: PDFs referenced by the website.
  - `resources/pdfs/fall_2025/`: proofwriting workshop handouts for Fall 2025 (referenced from `proofwriting_workshop_data/2025_fall_pw.json`).

---

### `legacy/` (older generated event HTML)

This folder contains older HTML pages for specific semesters (for example `2024spring.html`, `2024fall.html`, and IntroToProofs pages). These pages follow a table-like structure with columns like `Date`, `Speaker`, `Title`, and `Abstract`.

`jsonifyer.py` was written to parse HTML in that format and generate the `events/*_events.json` JSON used by the frontend.

