# Gemini History Manager

A browser extension to track, manage, and visualize your Google Gemini chat history. It provides tools for organizing, searching, and gaining insights from your interactions.

## Features

* **Automatic Chat Tracking:**
    * Captures chat URL, title, timestamp (ISO 8601 UTC), and the Gemini model used (e.g., "2.5 Pro", "2.0 Flash").
    * Records the initial prompt and a list of any attached filenames.
    * Attempts to extract the Google account name and email associated with the chat.
    * Prevents duplicate entries based on chat URL.
* **Status Indicator:** Displays a non-intrusive status indicator on the Gemini page during tracking operations (e.g., "Saving chat...", "Chat saved").
* **Browser Action Popup:**
    * Quick overview of total conversations, most used model, and time of the last conversation.
    * Displays a list of the most recent conversations with quick links.
    * Buttons to open the full dashboard, export history, and import history.
    * Theme toggle (Light/Dark).
* **Full Dashboard Page:**
    * **Comprehensive List View:** Displays all saved conversations.
    * **Search & Filtering:**
        * Search by chat title and prompt content.
        * Filter by Gemini model.
        * Filter by date range (All Time, Today, This Week, This Month, Custom Range).
    * **Sorting:** Sort conversations by date (newest/oldest), title, or model.
    * **Detailed View:** Click on a conversation to see full details including title, date, model, account, prompt, and attached files in a modal.
    * **Data Statistics:**
        * Total conversations.
        * Most used model (and count).
        * Average title length.
        * Timestamp of the first and last conversation.
        * Total number of files uploaded across all chats.
    * **Visualizations:**
        * **Model Distribution:** Bar chart showing the usage frequency of different Gemini models.
        * **Activity Over Time:** Line chart showing the number of conversations over time.
    * **Data Management:**
        * **Export History:** Export all or filtered history as a JSON file.
        * **Import History:** Import history from a previously exported JSON file (merges new entries, avoids duplicates).
        * **Clear All History:** Permanently delete all stored conversations.
    * **Theme Toggling:** Switch between Light and Dark themes for the dashboard.
    * **Toast Notifications:** Provides feedback for actions like saving, deleting, importing, or exporting data.

## How it Works

1.  **Content Script (`gemini-tracker.js`):**
    * Injects into `https://gemini.google.com/*` pages.
    * Monitors user interactions, specifically looking for clicks on the "Send" button when a new chat is being initiated (i.e., on the base `https://gemini.google.com/app` URL).
    * When a new chat is detected, it captures the current model, prompt text, and any attached file names.
    * Uses `MutationObserver` to watch the Gemini sidebar for the newly created conversation item and its generated title.
    * Once the title is available and the URL changes to a specific chat URL, it saves the complete chat entry (timestamp, URL, title, model, prompt, files, account info) to `browser.storage.local`.
    * A status indicator is displayed on the Gemini page to provide feedback on tracking.
2.  **Background Script (`background.js`):**
    * Listens for messages from the content script to update the browser action badge with the total number of saved conversations.
    * Handles the `browser.browserAction.onClicked` event to show the popup.
    * Responds to messages to open the full dashboard page (`dashboard/dashboard.html`).
3.  **Popup (`popup/`):**
    * When opened, retrieves history data from `browser.storage.local`.
    * Displays key statistics and a list of recent conversations.
    * Provides buttons for navigating to the full dashboard, exporting, and importing history.
4.  **Dashboard (`dashboard/`):**
    * A full HTML page that loads all history data from `browser.storage.local`.
    * Provides rich UI for viewing, filtering, sorting, visualizing, and managing chat history.
    * Uses Day.js for date/time manipulation and Chart.js for visualizations.

## Installation

### From Web Store (Recommended)

* **(Placeholder)** This extension is not yet available on the Chrome Web Store or Firefox Add-ons. Once published, links will be provided here.

### Manual Installation (Developer Mode)

1.  **Download:**
    * Clone this repository: `git clone https://github.com/yourusername/invictusnavarchus-gemini-history-manager.git`
    * Or download the ZIP and extract it.
2.  **For Google Chrome/Chromium-based browsers:**
    * Open Chrome and navigate to `chrome://extensions`.
    * Enable "Developer mode" using the toggle in the top-right corner.
    * Click on "Load unpacked".
    * Select the `invictusnavarchus-gemini-history-manager` directory (the one containing `manifest.json`).
3.  **For Mozilla Firefox:**
    * Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
    * Click on "Load Temporary Add-on...".
    * Select the `manifest.json` file within the `invictusnavarchus-gemini-history-manager` directory.

The extension icon should now appear in your browser's toolbar.

## Usage

### Tracking

* Simply use Google Gemini as you normally would. The extension will automatically detect when you start a new chat and save its details once the chat is established and a title is generated by Gemini.
* A small status indicator will appear in the bottom-right corner of the Gemini page to inform you about the tracking process (e.g., "Saving chat...", "Chat saved").

### Popup

* Click the Gemini History Manager icon in your browser toolbar.
* The popup will display:
    * Total conversations, most used model, and when the last conversation occurred.
    * A list of your most recent conversations. Clicking any of these will open the respective chat in a new tab.
    * Buttons to:
        * **Open Full View:** Navigates to the comprehensive dashboard page.
        * **Export History:** Downloads your current chat history as a JSON file.
        * **Import History:** Opens the dashboard page with a prompt to select a JSON file for import.
        * **Theme Toggle:** Switches the popup's theme between light and dark.

### Dashboard

* Accessible via the "Open Full View" button in the popup.
* **Viewing History:** Scroll through the list of all your conversations. Click any conversation to see its full details in a modal.
* **Filtering & Sorting:** Use the controls in the sidebar and above the conversation list to narrow down and reorder your history.
* **Statistics & Visualizations:** The sidebar provides an overview and charts related to your chat activity.
* **Data Management:**
    * **Export History:** Click the "Export History" button in the header.
    * **Import History:** Click the "Import History" button. You will be prompted to select a JSON file. The dashboard page also supports an `?action=import` URL parameter to guide users to this function.
    * **Clear All History:** Click the "Clear All History" button. A confirmation will be required.
    * **Theme Toggle:** Click the theme icon in the header to switch between light and dark modes.

## Key Components

* **`manifest.json`**: Defines the extension's name, version, permissions, and specifies the scripts for background, content, and popup.
* **`background.js`**: Manages background tasks, updates the extension's badge with the history count, and handles messages for opening the dashboard.
* **`content-scripts/gemini-tracker.js`**: This is the core script injected into `gemini.google.com`. It observes DOM changes to detect new chats, extracts chat details (title, model, prompt, files, account info), and saves them to local storage. It also displays a status indicator on the page.
* **`dashboard/dashboard.js`**: Powers the full history view page (`dashboard.html`). It loads all history from storage, enables filtering, sorting, detailed views, statistics, visualizations (using Chart.js), and data management (import/export/clear).
* **`popup/popup.js`**: Controls the browser action popup (`popup.html`). It displays a summary of history statistics, recent conversations, and provides navigation to the full dashboard and data management actions.
* **`lib/utils.js`**: Contains shared JavaScript functions for logging, date/time formatting (using Day.js), file operations, and theme management, used by both popup and dashboard.

## Permissions Required

* **`storage`**: To save and retrieve your Gemini chat history locally on your browser.
* **`unlimitedStorage`**: To allow for a larger amount of chat history to be stored, as the default `storage.local` limit might be restrictive for extensive use.
* **`https://gemini.google.com/*`**: To allow the content script (`gemini-tracker.js`) to run on Google Gemini pages, observe DOM changes, and extract chat information.

## Technology Stack

* **JavaScript (ES6+)**: Core programming language.
* **WebExtensions API**: Standard API for browser extension development.
* **HTML5 & CSS3**: For structuring and styling the popup and dashboard pages.
* **Day.js**: A lightweight JavaScript date library for parsing, validating, manipulating, and displaying dates and times.
    * Plugins used: `utc`, `relativeTime`, `isToday`, `localizedFormat`, `calendar`, `timezone`.
* **Chart.js**: A JavaScript library for creating interactive charts and visualizations on the dashboard.

## License

