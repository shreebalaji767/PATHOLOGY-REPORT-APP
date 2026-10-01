# BLSSNVJ21 Pathology Report Creator

**Latest Version — 2026 Upgrade**

A browser-based pathology report creation, preview, printing and offline PWA application.

## Current Version

**BLSSNVJ21 Pathology Report Creator — Latest**

This repository contains the latest upgraded version with:

- **BLSSNVJ21 branding** throughout the application
- Professional pathology report editor and live preview
- Quick templates for CBC, LFT, KFT, Lipid Profile, Thyroid Profile and Urine Routine / Microscopy
- Browser-only storage using **IndexedDB**
- Automatic local draft saving
- Saved Reports management
- No database
- No Supabase
- No server-side patient/report storage
- PWA installation support
- Offline application support
- Service worker update detection
- A4 print-ready pathology reports
- Browser favicon and application logo
- SEO metadata and Open Graph metadata
- Schema.org structured data
- `robots.txt` and `sitemap.xml`
- Security response headers
- Keyboard shortcuts
- Responsive desktop and mobile interface

## Storage & Privacy

Patient and report data are stored **only in the user's browser**.

The application does not require a server-side patient database. Browser storage can be cleared by the user through the browser's site-data/storage controls.

## PWA

The application can be installed as a Progressive Web App on supported browsers.

It includes:

- Web App Manifest
- Service Worker
- Offline cache
- Install prompt
- Automatic service-worker update detection

## Technology

- Python
- Flask
- HTML5
- CSS3
- JavaScript
- IndexedDB
- Service Worker
- Web App Manifest

## Project Structure

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

## Run Locally

Install Flask:

```bash
pip install flask
```

Start the application:

```bash
python app.py
```

Then open the local address shown by Flask in your browser.

## Important

This application is designed for **local/browser-based report creation and printing**. It is not a replacement for laboratory information systems, diagnostic validation workflows, or clinical review.

---

**BLSSNVJ21 — Latest Version**
