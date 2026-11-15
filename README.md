# BLSSNVJ21 Pathology Report Creator

A free, static, browser-based pathology report editor for GitHub Pages. The original report editor, styles, templates, IndexedDB storage, print layout and PWA assets are retained; the Flask server has been removed.

## Open the application

- Landing page: https://shreebalaji767.github.io/PATHOLOGY-REPORT-APP/
- Report editor: https://shreebalaji767.github.io/PATHOLOGY-REPORT-APP/app.html

Enable GitHub Pages in Settings → Pages → Deploy from a branch → main → /(root). The repository includes a .nojekyll file so GitHub Pages serves the static assets as-is.

## Preserved application features

- Live report preview and A4-ready printing
- Patient, sample, collection and report details
- Multiple report sections and investigations
- Add, duplicate, reorder and remove report sections/tests
- Quick templates: CBC, FPG, calcium, vitamin B12, vitamin D, LFT, KFT, lipid profile, thyroid profile and urine routine/microscopy
- Result flags, values, units, reference ranges and per-test remarks
- Interpretation/remarks and report formatting
- Save draft, save report, saved reports and local IndexedDB storage
- Keyboard shortcuts and responsive editor
- Installable PWA, offline asset caching and update handling

## Data and privacy

Patient/report records remain in the browser's IndexedDB on the device and browser profile where they were created. GitHub Pages does not provide a server database or automatic synchronization between devices. Clearing browser site data can remove locally stored reports. Use an appropriate device lock and browser profile for confidential patient information.

## Technology

- HTML5, CSS3 and vanilla JavaScript
- IndexedDB for local report storage
- Service worker + web app manifest for PWA/offline support
- GitHub Pages static hosting; no Flask, backend, database service, paid API, subscription or ads

## Run locally

Serve the repository root with any local static HTTP server (service workers require localhost or HTTPS). For example, with Python installed:

    python -m http.server 8000

Then open http://localhost:8000/.

## Clinical use notice

This tool supports report preparation, preview and printing. It does not replace laboratory quality-control procedures, result verification, clinical judgment or review by an authorized healthcare professional. Verify patient details, units, reference intervals and every result before issuing a report.
