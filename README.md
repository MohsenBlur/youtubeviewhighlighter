# YouTube View Highlighter Userscript

A premium browser userscript that dynamically analyzes the view statistics of all loaded video thumbnails on any YouTube page (such as a creator's videos tab, search results, or home feed) and highlights the top-performing videos.

## Quick Install

Click the link below to install the script directly via your userscript manager:

👉 [**Install YouTube View Highlighter**](https://github.com/MohsenBlur/YouTube-View-Highlighter-Userscript/raw/main/youtube-view-highlighter.user.js)

---

## Features

- **Dynamic Highlight Controls**: A floating UI control panel (`− 20% +`) is anchored at the top-right of your page. You can adjust the threshold dynamically in 5% increments using the buttons, or type any custom percentage (1% to 100%) in the text field.
- **Preference Persistence**: Your custom percentage preference is saved using browser `localStorage` and persists automatically across page reloads and browsing sessions.
- **Neon Arcade Highlights**: High-contrast, glowing pill capsule labels (deep-black background) with a rapid, smooth rainbow-cycling animation on both borders and text.
- **Micro-Animations**: Elevates user experience with interactive hover scale micro-animations.
- **TrustedHTML Compliant**: Handcrafted using native DOM APIs to fully bypass Google's Trusted HTML security policies (CSP) on YouTube.
- **Locale-Aware View Parser**: Robustly parses view count strings across various language locales (handles formats like `120K`, `1.2M`, `1,2M`, and localized terms like `тыс` or `mil`).
- **SPA Integration & Debouncing**: Listens to YouTube's Single Page Application router (`yt-navigate-finish`) and debounces layout recalculations to ensure excellent performance without lagging.

## Prerequisites

To use this script, you must first install a userscript manager extension in your browser:

- [**Tampermonkey**](https://www.tampermonkey.net/) (Recommended)
- [**Violentmonkey**](https://violentmonkey.github.io/)

## Installation

1. Install one of the compatible userscript managers listed above.
2. Click the [**Install Link**](https://github.com/MohsenBlur/YouTube-View-Highlighter-Userscript/raw/main/youtube-view-highlighter.user.js) to open the userscript manager's installation screen.
3. Click **Install** (or **Confirm installation**).
4. Navigate to any YouTube page with video lists (e.g. [Harland Highway Podcast Videos](https://www.youtube.com/@HarlandHighwayPodcast/videos)).
5. The script will activate, and you will see the floating control panel and highlighted video view counts.
