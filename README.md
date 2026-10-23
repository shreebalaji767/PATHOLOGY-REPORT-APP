# BLSSNVJ21 Pathology Report Creator

A browser-based pathology report editor for creating, previewing, saving, and printing professional laboratory reports. The responsive interface supports offline use as a Progressive Web App (PWA).

## ✨ Highlights

- **Neon Cyberpunk Dark Mode** — near-black surfaces, neon cyan accents, subtle glow effects, and magenta focus highlights.
- **Light and dark interface styling** for comfortable use in different environments.
- **Live report preview** while editing report details and results.
- **Quick templates** for common panels, including CBC, LFT, KFT, Lipid Profile, Thyroid Profile, and Urine Routine / Microscopy.
- **A4-ready report printing** designed to keep the printed report white and readable, even when the app is in dark mode.
- **Saved Reports** stored locally in the browser.
- **Automatic local draft saving** to help preserve in-progress work.
- **IndexedDB browser storage** — no server-side patient/report database is required.
- **Installable PWA** with a web app manifest and service worker.
- **Offline support** through cached application assets.
- **Responsive layout** for desktop and mobile screens.
- **Keyboard shortcuts**, application branding, favicon, and SEO/Open Graph metadata.
- `robots.txt`, `sitemap.xml`, and security response headers.

## 🌌 Neon Dark Mode

The dark theme is designed as a coordinated neon interface rather than a simple dark background:

| UI element | Theme |
| --- | --- |
| Main background | Deep black |
| Panels and cards | Dark charcoal |
| Headings and interactive accents | Neon cyan |
| Focus outlines | Neon magenta |
| Normal result indicators | Neon green |
| High / abnormal result indicators | Red / amber |
| Form controls and tables | Dark surfaces with contrasting borders |

To load the latest deployed styling, refresh the app with **Ctrl + F5**. If an installed PWA still shows an older version, close and reopen it after refreshing the website.

## 🔐 Storage & Privacy

- Patient and report data are stored in the user's browser using local browser storage.
- The app does not require a server-side patient/report database.
- Clearing the browser's site data may delete locally saved reports and drafts.
- Use an appropriate device lock and browser profile when handling confidential patient information.

## 📲 Progressive Web App

The application includes:

- Web App Manifest
- Service Worker and offline asset cache
- Install support on compatible browsers
- Service-worker update handling

Offline availability can depend on whether the app has already been loaded and its required assets cached.

## 🧰 Technology

- **Python / Flask** — application server
- **HTML5** — page structure
- **CSS3** — responsive layout, print styles, and neon theme
- **JavaScript** — report editor and interface behavior
- **IndexedDB** — browser-side report storage
- **Service Worker** — caching and offline support
- **Web App Manifest** — installable PWA metadata

## 📁 Project Structure

```text
PATHOLOGY-REPORT-APP/
├── app.py
├── templates/
│   └── index.html
├── static/
│   ├── css/
│   │   └── pathology.css
│   ├── js/
│   │   └── pathology.js
│   ├── icons/
│   │   └── icon.svg
│   ├── manifest.webmanifest
│   └── sw.js
└── README.md
```

## 🚀 Run Locally

1. Install Python, if it is not already installed.
2. Install Flask:

   ```bash
   pip install flask
   ```

3. Start the application from the repository directory:

   ```bash
   python app.py
   ```

4. Open the local URL printed by Flask in your browser.

## 🩺 Clinical Use Notice

This tool supports report preparation, preview, and printing. It does **not** replace laboratory quality-control procedures, result verification, clinical judgment, or review by an authorized healthcare professional. Verify patient details, units, reference intervals, and all results before issuing a report.

## 📄 License

No license is specified in this repository. Unless a license is added, reuse and redistribution are not automatically granted.

---

**BLSSNVJ21 Pathology Report Creator**
