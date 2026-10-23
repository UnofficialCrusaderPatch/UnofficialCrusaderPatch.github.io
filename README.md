# [Unofficial Crusader Patch - Website](https://unofficialcrusaderpatch.com/)

This repository contains the source code for the official website of the Unofficial Crusader Patch (UCP). The site is designed to be a modern, dynamic, and community-driven resource, built to mirror the look and feel of the UCP3 GUI.

## 1. Local Development & Testing

Because this website fetches data dynamically from local files (`/lang/*.json`) and the GitHub API, you cannot test it by simply opening `index.html` in your browser. You must run it from a local web server to avoid security errors (CORS policy).

Here are a few easy ways to do this:

### Option A: Using Python (Recommended)

If you have Python installed on your system, this is the simplest method.

1.  Open a terminal or command prompt.
2.  Navigate to the root directory of this project (the folder containing `index.html`).
3.  Run the following command:
    ```bash
    python -m http.server
    ```
4.  Open your web browser and navigate to `http://localhost:8000`.

### Option B: Using VS Code's Live Server Extension

If you use Visual Studio Code as your editor:

1.  Install the **Live Server** extension from the VS Code Marketplace.
2.  Open the project folder in VS Code.
3.  Right-click on the `index.html` file in the file explorer and select "Open with Live Server".
4.  A new browser tab will automatically open with the website running.

---

## 2. How to Contribute Translations

The website is fully localizable. Adding a new language is straightforward.

### Step 1: Add the Language to the Manifest

Open the `languages.json` file in the root directory. Add your new language to the list, using the two-letter language code as the key and the native language name as the value.

**Example: Adding French**
```json
{
    "en": "English",
    "de": "Deutsch",
    "fr": "Français"
}
```

### Step 2: Create the Main Translation File

1.  Go to the `/lang/` directory.
2.  Make a copy of `en.json`.
3.  Rename the copy to match your language code (e.g., `fr.json`).
4.  Open the new file and translate all the string values on the right side.

### Step 3: Translate Content Files

The Overview and FAQ tabs load Markdown from `md/overview-<language>.md` and `md/faq-<language>.md`. Copy the English file, translate it, and keep links working. Missing translations fall back to English.

Wiki pages come from the separate [UCP-Wiki repository](https://github.com/UnofficialCrusaderPatch/UCP-Wiki), under `docs/`. They are not maintained in this website repository. The website checks `docs/<language>/` for translated wiki pages and falls back to the default page.

---

## 3. Project Structure & Next Steps

The project is organized to separate structure (HTML), styling (CSS), logic (JS), and content (JSON/Assets).

-   `/index.html`: The main skeleton of the site.
-   `/assets/`: Contains all static assets like images, icons, and fonts used for styling.
-   `/css/`: Contains the main stylesheet (`style.css`).
-   `/js/`: Contains the JavaScript logic.
    -   `api.js`: Handles all calls to the GitHub API.
    -   `ui.js`: Contains functions for rendering HTML content.
    -   `main.js`: The main application controller that ties everything together.
-   `/lang/`: Contains all localization and data files.
-   `/languages.json`: The central manifest of all supported languages.

## Wiki navigation and checks

Write wiki page links relative to their source Markdown file, with the `.md` extension. The site converts them into `#wiki/<page>` routes while preserving section fragments. Relative wiki images resolve against the same source directory. Internal links therefore remain readable on GitHub as well as on the website.

The sidebar is generated from the files in UCP-Wiki's `docs/` tree. To expand a subject, update its existing page and section index first. Add a new page when it covers a distinct topic, and link it from the relevant guide.

Run the focused URL and download-source regression checks with Node.js:

```bash
node --test tests/*.test.cjs
```

Serve the site locally to check real Markdown navigation, browser Back/Forward, language changes, Content selection and mobile layout. Verify documentation changes alongside the matching UCP-Wiki revision; the deployed site otherwise reads the wiki's `main` branch.
