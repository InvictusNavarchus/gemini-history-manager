# Gemini History Manager

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Version](https://img.shields.io/github/manifest-json/v/InvictusNavarchus/gemini-history-manager?label=version)](https://github.com/InvictusNavarchus/gemini-history-manager)

A browser extension to track, manage, and visualize your Google Gemini chat history. It provides tools for organizing, searching, and gaining insights from your interactions.

## ✨ Features

### Automatic Chat Tracking
* Captures chat URL, title, timestamp (ISO 8601 UTC), and the Gemini model used (e.g., "2.5 Pro", "2.0 Flash")
* Records the initial prompt and a list of any attached filenames
* Attempts to extract the Google account name and email associated with the chat
* Prevents duplicate entries based on chat URL

### Status Indicator
* Displays a non-intrusive status indicator on the Gemini page during tracking operations (e.g., "Saving chat...", "Chat saved")

### Browser Action Popup
* Quick overview of total conversations, most used model, and time of the last conversation
* Displays a list of the most recent conversations with quick links
* Buttons to open the full dashboard, export history, and import history
* Theme toggle (Light/Dark)

### Full Dashboard Page
* **Comprehensive List View:** Displays all saved conversations
* **Search & Filtering:**
  * Search by chat title and prompt content
  * Filter by Gemini model
  * Filter by date range (All Time, Today, This Week, This Month, Custom Range)
* **Sorting:** Sort conversations by date (newest/oldest), title, or model
* **Detailed View:** Click on a conversation to see full details including title, date, model, account, prompt, and attached files in a modal
* **Data Statistics:**
  * Total conversations
  * Most used model (and count)
  * Average title length
  * Timestamp of the first and last conversation
  * Total number of files uploaded across all chats
* **Visualizations:**
  * **Model Distribution:** Bar chart showing the usage frequency of different Gemini models
  * **Activity Over Time:** Line chart showing the number of conversations over time
* **Data Management:**
  * **Export History:** Export all or filtered history as a JSON file
  * **Import History:** Import history from a previously exported JSON file (merges new entries, avoids duplicates)
  * **Clear All History:** Permanently delete all stored conversations
* **Theme Toggling:** Switch between Light and Dark themes for the dashboard
* **Toast Notifications:** Provides feedback for actions like saving, deleting, importing, or exporting data

## 🔧 How it Works

1. **Content Script (`gemini-tracker.js`):**
   * Injects into `https://gemini.google.com/*` pages
   * Monitors user interactions, specifically looking for clicks on the "Send" button when a new chat is being initiated
   * Captures the current model, prompt text, and any attached file names
   * Uses `MutationObserver` to watch for the newly created conversation item and its generated title
   * Saves the complete chat entry to `browser.storage.local`
   * Displays a status indicator for feedback

2. **Background Script (`background.js`):**
   * Updates the browser action badge with the total number of saved conversations
   * Handles the `browser.browserAction.onClicked` event to show the popup
   * Responds to messages to open the full dashboard page

3. **Popup (`popup/`):**
   * Retrieves history data from `browser.storage.local`
   * Displays key statistics and a list of recent conversations
   * Provides buttons for navigating to the full dashboard, exporting, and importing history

4. **Dashboard (`dashboard/`):**
   * Loads all history data from `browser.storage.local`
   * Provides rich UI for viewing, filtering, sorting, visualizing, and managing chat history
   * Uses Day.js for date/time manipulation and Chart.js for visualizations

## 📥 Installation

### From Web Store (Recommended)

**(Placeholder)** This extension is not yet available on the Chrome Web Store or Firefox Add-ons. Once published, links will be provided here.

### Manual Installation (Developer Mode)

#### For Google Chrome/Chromium-based browsers:

1. Clone this repository: 
   ```bash
   git clone https://github.com/yourusername/invictusnavarchus-gemini-history-manager.git
   ```
   Or download the ZIP and extract it

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" using the toggle in the top-right corner

4. Click on "Load unpacked"

5. Select the `invictusnavarchus-gemini-history-manager` directory (the one containing `manifest.json`)

#### For Mozilla Firefox:

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`

2. Click on "Load Temporary Add-on..."

3. Select the `manifest.json` file within the directory

The extension icon should now appear in your browser's toolbar.

## 📝 Usage

### Tracking

* Simply use Google Gemini as you normally would. The extension will automatically detect when you start a new chat and save its details once the chat is established and a title is generated by Gemini.
* A small status indicator will appear in the bottom-right corner of the Gemini page to inform you about the tracking process.

### Popup

* Click the Gemini History Manager icon in your browser toolbar
* The popup will display:
  * Total conversations, most used model, and when the last conversation occurred
  * A list of your most recent conversations (clickable to open in a new tab)
  * Buttons for dashboard access, data management, and theme toggle

### Dashboard

* Accessible via the "Open Full View" button in the popup
* **Viewing History:** Scroll through the list of all your conversations
* **Filtering & Sorting:** Use the controls to narrow down and reorder your history
* **Statistics & Visualizations:** The sidebar provides an overview and charts related to your chat activity
* **Data Management:**
  * **Export History:** Click the "Export History" button in the header
  * **Import History:** Click the "Import History" button to select a JSON file
  * **Clear All History:** Click the "Clear All History" button (confirmation required)
  * **Theme Toggle:** Click the theme icon in the header to switch between light and dark modes

## 🧩 Key Components

* **`manifest.json`**: Defines the extension's name, version, permissions, and scripts
* **`background.js`**: Manages background tasks and handles messages
* **`content-scripts/gemini-tracker.js`**: Core script injected into Gemini pages for tracking
* **`dashboard/dashboard.js`**: Powers the full history view page
* **`popup/popup.js`**: Controls the browser action popup
* **`lib/utils.js`**: Contains shared functions for logging, date formatting, and theme management

## 🔒 Permissions Required

* **`storage`**: To save and retrieve your Gemini chat history locally
* **`unlimitedStorage`**: To allow for a larger amount of chat history storage
* **`https://gemini.google.com/*`**: To run the content script on Google Gemini pages

## 🛠️ Technology Stack

* **JavaScript (ES6+)**: Core programming language
* **WebExtensions API**: Standard API for browser extension development
* **HTML5 & CSS3**: For structuring and styling the popup and dashboard
* **Day.js**: Lightweight JavaScript date library
  * Plugins: `utc`, `relativeTime`, `isToday`, `localizedFormat`, `calendar`, `timezone`
* **Chart.js**: JavaScript library for creating interactive charts and visualizations

## 📄 License

This project is licensed under the GPL v3 License - see the `LICENSE` file for details.