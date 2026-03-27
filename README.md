# Waste Management System (WMS)

> A Progressive Web App (PWA) for logging, tracking, and managing hazardous and solid waste across construction packages — built on Google Apps Script and Google Sheets, installable on Android and iOS without an app store.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Security](#security)
- [Deployment](#deployment)
- [Installing the PWA](#installing-the-pwa)

---

## Overview

The WMS allows field workers to log waste disposal activities per construction package (P4, P5, P6) for two waste categories: **Hazardous** and **Solid**. Admins manage user access, view analytics, and export reports — all backed by Google Sheets as the data store and Google Apps Script as the serverless backend.

The app is deployed as a **Progressive Web App** on GitHub Pages and can be installed directly to the home screen on Android (via Chrome) and iOS (via Safari) without going through any app store.

## 🧪 Live Demo
**[Try the demo here](https://francisalbertespina-spec.github.io/Waste-log-sandbox/)** — no login required. Click "Try Demo" on the login screen to explore all features including admin dashboard, analytics, and waste logging.

---

## Architecture

![WMS Architecture](docs/architecture.svg)

> Full interactive diagram: [Open in draw.io](https://viewer.diagrams.net/?url=https://raw.githubusercontent.com/francisalbertespina-spec/Waste-log-sandbox/main/docs/architecture.drawio)

---

## Features

| Feature | Description |
|---|---|
| 🔐 Google Sign-In | OAuth 2.0 via Google Identity Services with session token (7-day expiry) |
| 📦 Package Selection | Supports packages P4, P5, P6 with isolated data per package |
| ☣️ Hazardous Waste Logging | Date, volume (liters), waste name, GPS-stamped photo upload |
| 🗑️ Solid Waste Logging | Date, dump location (pier number), waste name, GPS-stamped photo upload |
| 🖼️ Photo Watermarking | Canvas-based watermark with GPS coordinates, timestamp, user email and package |
| 📍 GPS Location Stamping | Geolocation API stamps lat/lng onto every photo at capture time |
| ✏️ Edit & Delete Entries | Users can edit/delete their own entries; admins can edit/delete any entry |
| 📊 Analytics Dashboard | KPI cards, trend charts, waste breakdown charts, contributor leaderboard |
| 📄 PDF Export | jsPDF-powered reports with embedded photos (fetched via backend proxy) |
| 📥 Excel Export | XLSX export of history records via SheetJS |
| 🖼️ Image Viewer | In-app image modal with loading spinner; images fetched as base64 via backend to bypass CORS |
| 👥 User Management | Approve/reject/delete users, assign roles (admin only) |
| 🔔 Push Notifications | Service Worker–based admin alerts for pending user approvals |
| 🌙 Theme Support | Default, Dark, and Compact themes — user-selectable, persisted in localStorage |
| 📱 Mobile Bottom Tab Bar | Fixed bottom navigation (Home, Log, Records, Settings) shown after login on mobile |
| 🔄 Pull-to-Refresh | Touch gesture refreshes records on mobile |
| 💾 Form Auto-fill | Last used waste type and location pre-filled on next form open |
| ⚡ Skeleton Loading | Animated shimmer rows while records load |
| 📶 Rate Limiting | Per-user 100 requests/hour enforced server-side |
| 📋 Audit Logging | All API actions logged to an `Access_Log` sheet |
| 🔁 Idempotent Submissions | `requestId` prevents duplicate waste log submissions on retry |
| 📡 Offline Banner | Orange strip shown when device loses network connectivity |
| 📲 PWA Installable | Chrome install prompt on Android; Add to Home Screen on iOS Safari |

---

## Tech Stack

### Frontend
- **Vanilla JavaScript** — no framework
- **CSS3** — custom design system with CSS variables for theming (default, dark, compact)
- **Chart.js** — trend and breakdown charts
- **jsPDF** — PDF report generation with embedded images
- **SheetJS (xlsx)** — Excel export
- **Canvas API** — GPS-stamped photo watermarking
- **Geolocation API** — GPS coordinates for photo watermarks
- **Service Worker** — push notifications, background sync, offline caching

### Backend
- **Google Apps Script** — serverless REST API (`doGet` / `doPost`)
- **Google Sheets** — data persistence (Users, waste logs, access logs, rate limits)
- **Google Drive** — photo file storage per package folder; images served as base64 via backend proxy
- **Gmail / MailApp** — HTML email notifications for access approval/rejection and new user registrations

---

## Project Structure

```
/
├── index.html          # Main SPA shell — all sections rendered here
├── style.css           # All UI styles, themes, animations (~1800 lines)
├── script.js           # All client-side logic (~2200+ lines)
├── sw.js               # Service Worker for caching, push notifications, offline support
├── manifest.json       # PWA manifest — enables install prompt on Android/iOS
├── logo.png            # App icon (192x192 and 512x512)
├── docs/
│   ├── architecture.svg      # Architecture diagram (rendered)
│   └── architecture.drawio   # Architecture diagram (editable source)
└── Code.gs             # Google Apps Script backend (deployed as Web App)
```

### Google Sheets Structure

| Sheet | Purpose |
|---|---|
| `Users` | Email, Status, Token, Last Login, Role, Token Expiry |
| `RateLimits` | Per-user request counters and window timestamps |
| `Requests` | Idempotency log — request IDs to prevent duplicate submissions |
| `Access_Log` | Full audit trail of all API actions with timestamps |

Per-package waste data is stored in **separate Google Sheets** (one per package per waste type), configured via Script Properties in `Code.gs`.

---

## User Roles

| Role | Permissions |
|---|---|
| `user` | Log waste entries, view own history, export own records, edit/delete own entries |
| `admin` | All user permissions + approve/reject pending users, view all records, view analytics, manage users |
| `super_admin` | All admin permissions + change user roles, delete users, full user list including other admins |

---

## Getting Started

### Prerequisites
- A Google Account
- Access to Google Sheets and Google Drive
- The web app hosted on GitHub Pages or any static host

### 1. Set Up Google Sheets

Create the following sheets:
- **Users Sheet** — columns: `Email`, `Status`, `Token`, `Last Login`, `Role`, `Token Expiry`
- **Per-package waste sheets** — for P4, P5, P6 (both hazardous and solid) — each with a `Sheet1` tab

Copy each Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`

### 2. Set Up Google Drive Folders

Create a Google Drive folder per package (P4, P5, P6) for each waste type to store uploaded photos. Copy each folder ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID`

### 3. Configure the Backend Script (Script Properties)

All sensitive IDs are stored as **Script Properties** — never hardcoded in source.

In the Apps Script editor → **Project Settings → Script Properties**, add:

| Property | Value |
|---|---|
| `USER_SHEET_ID` | ID of your Users sheet |
| `P4_HAZ_SHEET_ID` | ID of P4 hazardous sheet |
| `P4_HAZ_FOLDER_ID` | ID of P4 hazardous Drive folder |
| `P5_HAZ_SHEET_ID` | ID of P5 hazardous sheet |
| `P5_HAZ_FOLDER_ID` | ID of P5 hazardous Drive folder |
| `P6_HAZ_SHEET_ID` | ID of P6 hazardous sheet |
| `P6_HAZ_FOLDER_ID` | ID of P6 hazardous Drive folder |
| `P4_SOLID_SHEET_ID` | ID of P4 solid sheet |
| `P4_SOLID_FOLDER_ID` | ID of P4 solid Drive folder |
| `P5_SOLID_SHEET_ID` | ID of P5 solid sheet |
| `P5_SOLID_FOLDER_ID` | ID of P5 solid Drive folder |
| `P6_SOLID_SHEET_ID` | ID of P6 solid sheet |
| `P6_SOLID_FOLDER_ID` | ID of P6 solid Drive folder |

Alternatively, uncomment and run `setScriptProperties_RUN_ONCE()` in `Code.gs` after filling in your IDs, then delete it.

### 4. Deploy the Google Apps Script

1. Open the script in the Apps Script editor
2. Click **Deploy → New Deployment**
3. Type: **Web App**
4. Execute as: **Me**
5. Access: **Anyone**
6. Click **Deploy** and copy the deployment URL

### 5. Configure the Frontend

In `script.js`, update the Apps Script URL near the top of the file:

```javascript
const scriptURL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
```

Also update the Google OAuth Client ID if needed:

```javascript
const GOOGLE_CLIENT_ID = "YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com";
```

### 6. Deploy the Frontend

Push all files to GitHub Pages or any static host. Ensure `manifest.json` and `sw.js` are served from the same origin as `index.html`.

---

## API Reference

All requests go to the deployed Apps Script URL.

### Authentication

All protected endpoints require a `token` query parameter obtained at login.

### Endpoints (GET)

| Action | Parameters | Auth Required | Description |
|---|---|---|---|
| Login | `email` | ❌ | Checks user status; returns token if approved |
| `validateToken` | `token` | ✅ | Validates session token and returns role |
| `refreshToken` | `token` | ✅ | Extends token expiry by 7 days |
| `logout` | `token` | ✅ | Clears token from sheet |
| `getUsers` | `token` | ✅ Admin | Returns user list based on caller's role |
| `approveUser` | `token`, `email` | ✅ Admin | Sets user status to Approved |
| `rejectUser` | `token`, `email` | ✅ Admin | Sets user status to Rejected |
| `updateUserStatus` | `token`, `email`, `status` | ✅ Admin | Sets user status to any value |
| `updateUserRole` | `token`, `email`, `role` | ✅ Super Admin | Updates user role |
| `deleteUser` | `token`, `email` | ✅ Super Admin | Deletes user row |
| `getRequests` | `token` | ✅ Admin | Returns request ID log |
| `getImageBase64` | `token`, `id` | ✅ | Returns Drive image as base64 (used for PDF export and image viewer) |
| `deleteEntry` | `token`, `package`, `wasteType`, `rowIndex` | ✅ | Deletes a waste entry row |
| `editEntry` | `token`, `package`, `wasteType`, `rowIndex`, `date`, `valueField`, `waste` | ✅ | Edits a waste entry row |
| Fetch records | `token`, `package`, `wasteType`, `from`, `to` | ✅ | Returns waste log rows with optional date filter |

### Endpoints (POST)

| Body Fields | Description |
|---|---|
| `token`, `package`, `date`, `volume`, `waste`, `imageByte`, `requestId`, `wasteType: "hazardous"` | Appends a hazardous waste entry |
| `token`, `package`, `date`, `location`, `waste`, `imageByte`, `requestId`, `wasteType: "solid"` | Appends a solid waste entry |

---

## Security

- **Google OAuth 2.0** — sign-in handled via Google Identity Services; only the verified email is used
- **Token-based sessions** — UUID tokens stored in Google Sheets, validated server-side on every request
- **Token expiry** — 7-day rolling window; expired tokens are cleared automatically on validation
- **Rate limiting** — 100 requests/hour per user, enforced server-side in a dedicated Sheets tab
- **Role-based access control** — enforced on all admin and super-admin endpoints
- **Idempotency** — `requestId` (UUID per submission) prevents duplicate entries on network retry
- **Formula injection prevention** — all user input sanitised before writing to Sheets
- **Audit log** — every API action, email, and success/failure outcome logged to `Access_Log`
- **No secrets in source** — all Sheet IDs, folder IDs stored in Script Properties, never in code
- **Email notifications** — users notified on approval/rejection; admins notified on new registrations

---

## Deployment

The app is a static SPA deployable to any host. The backend is a Google Apps Script Web App — no server infrastructure required.

**Live URL**:  [https://francisalbertespina-spec.github.io/Waste-log-sandbox/](https://francisalbertespina-spec.github.io/Waste-log-sandbox/)

To deploy updates:
1. Edit `script.js`, `style.css`, or `index.html`
2. Push to the `main` branch on GitHub
3. GitHub Pages auto-deploys within ~60 seconds
4. For backend changes, redeploy `Code.gs` as a **New Version** in Apps Script → Deploy → Manage Deployments

---

## Installing the PWA

### Android (Chrome)
1. Open the app URL in Chrome
2. Tap the **"Install"** banner at the bottom, or use the Chrome menu → **"Add to Home screen"**
3. The app installs with a native icon and opens in standalone mode (no browser UI)

### iOS (Safari)
1. Open the app URL in Safari
2. Tap the **Share** button (box with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add** — the app appears on your home screen and opens in standalone mode

> **Note:** iOS does not support the automatic install prompt — users must manually use "Add to Home Screen" via Safari.

---

## License

MIT License — feel free to use this project as a reference or learning resource.

Built by **E. Francis Albert** as a portfolio project demonstrating full-stack PWA development with Google Apps Script and Google Sheets.

> Note: The Google Sheets IDs, Drive folder IDs, and Apps Script deployment URL in any live instance are private configuration — not included in this repository. See Getting Started to set up your own instance.
