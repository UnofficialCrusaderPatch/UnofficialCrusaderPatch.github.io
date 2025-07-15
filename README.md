# Unofficial Crusader Patch - Website

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
    "fr": "Français" // Add this line
}
```

### Step 2: Create the Main Translation File

1.  Go to the `/lang/` directory.
2.  Make a copy of `en.json`.
3.  Rename the copy to match your language code (e.g., `fr.json`).
4.  Open the new file and translate all the string values on the right side.

### Step 3: Translate Content Files

The website also uses language-specific files for larger content sections like the FAQ and AI Format pages.

1.  In the `/lang/` directory, make copies of `faq-en.json` and `aic-en.json`.
2.  Rename them to match your language code (e.g., `faq-fr.json` and `aic-fr.json`).
3.  Translate the content within these new files.

**Fallback System:** If a translation file for a specific language is not found (e.g., `faq-fr.json` doesn't exist), the website will automatically fall back to the English (`en`) version for that content. This ensures the site always remains functional even if translations are incomplete.

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

### Next Steps to Complete the Website

1.  **Populate the `/assets/` Folder:** The most critical step is to copy all the necessary image files from the UCP3 GUI into the `/assets/ucp3/` folder. The `css/style.css` file is already set up to use them, which will correctly render the borders, tabs, and backgrounds.

2.  **Complete Data Files:** Finish translating and populating the content for all languages in the `/lang/` directory, especially for the `aic-xx.json` and `faq-xx.json` files.

3.  **Add New Tabs:** To add a new content tab (e.g., "Features" or "Contributing"), you will need to:
    * Add a new button to the `<nav>` in `index.html`.
    * Add a new `case` to the `switchTab` function in `js/main.js`.
    * Create a new render function in `js/ui.js` to generate the HTML for the new tab's content.