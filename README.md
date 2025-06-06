# ✨ Gemini History Manager ✨

<p>
  <img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License: GPL v3"/>
  <img src="https://img.shields.io/badge/version-v0.18.3-blue.svg" alt="Version"/>
</p>

Gemini History Manager is a browser extension designed to automatically track, manage, and help you visualize your Google Gemini chat history. It offers tools for organizing, searching, and deriving insights from your interactions with Gemini.

---

## 📸 Screenshots

### Browser Popup Interface

![Popup Interface](screenshots/popup-dark.png)

_Quick overview with recent conversations and key statistics_

### Full Dashboard - History View

![Dashboard History](screenshots/dashboard-conversation-list-dark-2.png)

_Comprehensive list view with search, filtering, and sorting capabilities_

### Dashboard - Visualizations

![Dashboard Visualizations](screenshots/dashboard-visualization-all-time-dark.png)

_Interactive charts showing all time model usage_

![Dashboard Visualizations](screenshots/dashboard-visualization-over-time-dark.png)

_Interactive charts showing model usage over time_

---

## 🚀 Core Features

- **Automatic Chat Tracking**: Effortlessly saves your Gemini chats in the background. It captures the title, timestamp, model (e.g., "2.5 Pro," "Deep Research"), initial prompt, and attached filenames. It even detects custom Gems and prevents duplicates.

- **Interactive Dashboard**: Dive deep into your chat history through a dedicated dashboard page.
  - **View & Organize**: See a comprehensive list of all conversations. Instantly search your history by title or prompt content.
  - **Filter & Sort**: Narrow down your history by model, date range, or plan. Sort by date, title, or model to find exactly what you need.
  - **Visualize Your Data**: See your habits with interactive charts for model usage, plan distribution, and activity over time.
  - **Key Statistics**: Get at-a-glance insights like total conversations, your most-used model, and more.

- **Quick-Access Popup**: Click the extension icon for a quick overview of your stats, a list of recent chats, and one-click access to the full dashboard.

- **Data Management**: You are in full control of your data.
  - **Export**: Save your entire history, or just a filtered view, to a JSON file.
  - **Import**: Merge history from a JSON file, with duplicate prevention.
  - **Delete**: Remove individual chats or clear all data permanently.

- **User-Friendly Interface**:
  - **Light & Dark Themes**: Automatically syncs with your system preference or can be toggled manually.
  - **Status Indicator**: A non-intrusive indicator on the Gemini page lets you know when a chat is being saved.

---

## 📥 Installation

> [!IMPORTANT]
> **Web Store Availability**: This extension is not yet available on the Chrome Web Store or the Mozilla Firefox Add-ons portal. Links will be provided here if and when it is published to any store.

<details>
<summary>Click for installation instructions</summary>

### Download from GitHub Releases

#### For Google Chrome/Chromium-based browsers:

1.  Download the latest Chrome extension package from [GitHub Releases](https://github.com/InvictusNavarchus/gemini-history-manager/releases/latest):
2.  Extract the downloaded ZIP file to a folder on your computer.
3.  Open Chrome and navigate to `chrome://extensions/`.
4.  Enable **Developer mode** (toggle in the top right).
5.  Click on **Load unpacked**.
6.  Select the extracted folder containing the extension files.

#### For Mozilla Firefox:

1.  Download the latest Firefox extension package from [GitHub Releases](https://github.com/InvictusNavarchus/gemini-history-manager/releases/latest):
2.  Extract the downloaded ZIP file to a folder on your computer.
3.  Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
4.  Click on **Load Temporary Add-on...**.
5.  Select the `manifest.json` file located inside the extracted folder.

The extension icon should now appear in your browser's toolbar.

</details>

---

## ⚠️ Limitations & Important Notes

- **Local Data Storage**: All your chat history is stored **only on your computer** within your browser. There is **no cloud sync**. To transfer history between devices or create backups, you must use the manual Export/Import feature.
- **Initial Prompt Only**: The extension currently saves the *initial* prompt of a conversation, not subsequent follow-ups or edits within the same chat.
- **Performance with Large Datasets**: The dashboard may experience slowdowns if you have tens of thousands of conversations stored.
- **Dependency on Gemini's Website**: The extension relies on the structure of the Gemini website. Major updates by Google may temporarily break functionality until the extension is updated.
- **Desktop Only**: This extension is designed for desktop browsers and is not supported on mobile.

---

## 🔐 Permissions & Privacy

This extension is built with privacy as a priority.

- **Data Stays Local**: All your data is stored locally on your machine using the browser's storage. Nothing is ever sent to any external server.
- **`storage` & `unlimitedStorage` Permissions**: These permissions are required to save your chat history. `unlimitedStorage` helps ensure that you can store a large number of conversations without hitting browser limits.

For full details, please read the [Privacy Policy](PRIVACY.md).

---

## 🧑‍💻 For Developers

<details>
<summary>Click to see technical details, development instructions, and the tech stack.</summary>

### How It Works

The extension operates through several key components:

1.  **Content Script (`content-scripts/gemini-tracker/` files)**: Injects into `gemini.google.com` pages, monitors for new chats, and captures all relevant data (model, prompt, account info, etc.). It uses `MutationObserver` to detect when new conversations are created and titled in the sidebar.
2.  **Background Script (`background.js`)**: Manages background tasks, such as updating the browser action badge with the total number of saved conversations and handling requests to open the dashboard.
3.  **Popup & Dashboard (Vue-powered)**: The user interface is built with Vue.js. Both the popup and the full dashboard are single-page applications that retrieve data from `browser.storage.local` to display statistics, conversation lists, and visualizations.
4.  **Shared Libraries (`lib/`)**: Contains shared functions for logging, date formatting (using Day.js), and theme management.

### Development

Note: The extension now supports both Mozilla Firefox and Google Chrome/Chromium-based browsers with separate build targets.

#### Prerequisites

- Node.js (v22 or higher)
- pnpm (recommended) or npm

#### Setup

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd gemini-history-manager
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```

#### Building

- **Build for both browsers**: `pnpm run build:all`
- **Build for Firefox only**: `pnpm run build:firefox`
- **Build for Chrome only**: `pnpm run build:chrome`

Builds are created in the `dist-firefox/` and `dist-chrome/` directories.

#### Development

- **For Firefox**: `pnpm run dev` (starts a watch mode and opens Firefox)
- **For Chrome**: `pnpm run dev:chrome` (starts a watch mode; manually load the `dist-chrome/` folder)

### Technology Stack

- **Core**: JavaScript (ES6+)
- **UI Framework**: Vue.js (v3)
- **Browser API**: WebExtensions API
- **Styling**: HTML5 & CSS3
- **Build Tool**: Vite
- **Date/Time**: Day.js
- **Charts**: Chart.js (v4)

</details>

---

## 📄 License

This project is licensed under the **GPL v3 License**. See the `LICENSE` file for more details.
