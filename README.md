# BLSSNVJ21 Pathology Report Creator

A free, static, browser-based pathology report editor for GitHub Pages. It uses HTML5, CSS3 and vanilla JavaScript, with browser-local storage and JSON backup/restore. The original Flask server is not required.

## Open the application

- **Landing page:** https://shreebalaji767.github.io/PATHOLOGY-REPORT-APP/
- **Report editor:** https://shreebalaji767.github.io/PATHOLOGY-REPORT-APP/app.html

The site is designed for GitHub Pages project hosting under the `/PATHOLOGY-REPORT-APP/` path. To publish it, open **Settings → Pages**, choose **Deploy from a branch**, select `main` and the repository root (`/(root)`). Keep the `.nojekyll` file in the repository.

## Features

### Report creation
- Patient, sample, collection and report details
- Multiple report sections and investigations
- Add, duplicate, reorder and remove sections/tests
- Test values, units, reference ranges, result flags and remarks
- Live report generation and preview
- A4-oriented print layout
- Quick templates: CBC, fasting plasma glucose (FPG), calcium, vitamin B12, vitamin D, liver function (LFT), kidney function (KFT), lipid profile, thyroid profile and urine routine/microscopy
- Interpretation and report remarks

### Actions and workflow
- Split **New Report** action with a menu for preview, saving drafts/reports, opening saved reports, installing the app and printing
- Save and restore the current draft
- Save, reopen and delete reports stored in this browser
- Export a JSON backup and import a backup
- Keyboard shortcuts, including **Ctrl/Cmd + P** to print and **Ctrl/Cmd + Enter** to refresh the report preview

### Responsive and offline support
- Responsive layout for desktop, tablets and small mobile screens
- Touch-friendly controls and horizontally scrollable investigation tables where needed
- Installable Progressive Web App (PWA)
- Service-worker caching for the app shell and static assets
- Offline access after the app and its assets have been cached successfully

## Data storage, backup and privacy

- Drafts and saved reports are stored in the browser's `localStorage` on the current device and browser profile.
- There is no cloud database, account-based synchronization or automatic transfer between devices/browsers.
- Clearing this site's browser storage, using private browsing, or removing the browser profile can permanently erase locally stored records.
- **Export JSON backups regularly** and keep copies in a secure location. An imported backup is merged with the reports already stored in the browser; review the resulting records after import.
- Older records may be migrated from the previous app's browser storage when that legacy data is available. Keep an independent backup before clearing browser data or changing devices.
- Treat patient information as confidential health data. Use an appropriately secured device and browser profile, restrict access to exported backup files, and follow applicable privacy and record-retention requirements.

## Technology and hosting

- HTML5, CSS3 and vanilla JavaScript
- `localStorage` for drafts and saved reports
- JSON file import/export for backup and restore
- Service worker and web app manifest for PWA/offline support
- GitHub Pages static hosting

The application does not require Flask, a backend server, a database service, paid APIs, subscriptions or advertising services.

## Run locally

Service workers require HTTPS or a localhost origin. With Python installed, run this command from the repository root:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/ in your browser.

## Troubleshooting

### The browser still shows an old version
1. Reload the page with the browser cache disabled in Developer Tools.
2. In Developer Tools → **Application** → **Service Workers**, unregister the service worker for this site.
3. In **Application** → **Storage**, clear this site's stored data only after exporting any reports you need to keep.
4. Reload the GitHub Pages URL and allow the app shell to cache again.

Do not clear site storage before exporting saved reports and drafts you want to preserve.

### The install banner does not appear automatically
The app handles the browser's `beforeinstallprompt` event for its own **Install App** control. The browser's automatic install banner may therefore be suppressed. Availability of installation depends on browser and platform support.

### Reports are missing on another device
Reports are stored locally, not synchronized. Export a JSON backup from the original browser and import it on the other device.

## Clinical use notice

This application assists with report preparation, preview and printing. It does not validate the medical correctness of results or replace laboratory quality-control procedures, clinical judgment, or review by an authorized healthcare professional. Verify patient identifiers, specimen details, units, reference intervals and every result before issuing a report.
