# Holiyay – Japan 2027 Itinerary

A simple, personal holiday itinerary you can use on your phone or in a browser. Built for you and your partner: day-by-day plan, booking reminders, costs in AUD (with exchange rate), and venue dropdowns (bars/restaurants) with addresses and opening hours so you can swap places easily.

**Trip:** 13–31 Jan 2027 · Tokyo → Hakone → Kyoto → Osaka → Nara → Kanazawa → Tokyo

---

## What’s in this folder

| File | Purpose |
|------|--------|
| `index.html` | The single page you see in the browser |
| `styles.css` | Layout and styling (mobile-friendly) |
| `app.js` | Renders the itinerary, exchange rate, venue dropdowns |
| `data.js` | **Your itinerary data** – days, reminders, costs, venue alternatives (edit this to change the trip) |
| `manifest.json` | Lets iPhone “Add to Home Screen” work nicely |
| `DEPLOY.md` | Short deploy reference (optional read) |

To change dates, activities, or venues, edit **`data.js`**.

**Who can view it:** By default anyone with the link can view the page. To restrict to people you share a password with, open `data.js`, find `accessPassword: ""`, and set it to a word or phrase you’ll share only with them (e.g. `accessPassword: "japan2027"`). They’ll see a password screen first; after entering it once per browser, they can use the itinerary as normal.

---

## How to get this up and running

You need to put this folder on the web so you can open it on your iPhone (and add it to your home screen). Two ways:

---

### Option A: Netlify Drop (no account, quick)

**On your computer**

1. Open a browser and go to: **https://app.netlify.com/drop**
2. Open File Explorer and go to the folder that **contains** `Holiyay` (e.g. your Desktop).
3. **Drag the whole `Holiyay` folder** from File Explorer onto the Netlify Drop page (onto the dashed area).
4. Wait a few seconds. Netlify will show a URL like **`https://random-words-123.netlify.app`**.
5. **Copy that URL** (click “Copy link” or select and copy).

**On your iPhone**

6. Open **Safari** (use Safari, not Chrome).
7. Tap the address bar and **paste** the URL you copied. Tap **Go**.
8. When the itinerary page loads, tap the **Share** button (square with arrow pointing up) at the bottom of the screen.
9. Scroll down and tap **“Add to Home Screen”**.
10. Change the name if you want (e.g. “Japan 2027”), then tap **Add** (top right).
11. You’ll see a new icon on your home screen. Tap it anytime to open the itinerary.

Your partner: send them the **same URL**. They open it in Safari on their iPhone and do steps 8–10 to add it to their home screen too.

---

### Option B: GitHub Pages (free account, same URL forever)

**On your computer**

1. Go to **https://github.com** and sign in (or create a free account).
2. Click the **+** (top right) → **New repository**.
3. **Repository name:** type `holiyay` (or any name you like).
4. Leave everything else as is. Click **Create repository**.
5. On the new empty repo page, click the link **“uploading an existing file”**.
6. Drag these files from your **Holiyay** folder into the upload area:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `data.js`
   - `manifest.json`
7. Scroll down and click the green **Commit changes** button.
8. Click **Settings** (top menu of the repo).
9. In the left sidebar, click **Pages** (under “Code and automation” or “Build and deployment”).
10. Under **“Build and deployment”** → **Source**, choose **“Deploy from a branch”**.
11. Under **Branch**, choose **main**, and **Folder** choose **/ (root)**. Click **Save**.
12. Wait 1–2 minutes. Your site will be at:
    - **`https://YOUR-USERNAME.github.io/holiyay/`**
    - Replace `YOUR-USERNAME` with your actual GitHub username (e.g. if your username is `pat`, the URL is `https://pat.github.io/holiyay/`).
13. **Copy that URL.**

**On your iPhone**

14. Open **Safari**.
15. Paste the URL in the address bar and tap **Go**.
16. Tap the **Share** button (square with arrow) at the bottom.
17. Tap **“Add to Home Screen”**.
18. Tap **Add** (top right).

Done. Use that same URL anytime to open or share the itinerary. To update the trip later: in GitHub, open the repo → click `data.js` → click the pencil (Edit) → change the content → **Commit changes**. The same URL will show the new version after a short delay.

---

## After it’s running

- **Exchange rate:** On the page, set “JPY per 1 AUD” and tap **Save**. It’s saved on that device only.
- **Venues:** Use the dropdowns on bars/restaurants to switch to alternatives; your choice is saved on that device.
- **Offline:** After you’ve opened the page once, your phone may show it from cache when you’re offline (no guarantee in all conditions).

---

## Editing the itinerary

Open **`data.js`** in any text editor. You’ll see:

- **`trip`** – title, dates, route, default exchange rate
- **`reminders`** – what to book and “book by” dates
- **`transportSummary`** – transport cost in JPY
- **`mapLayers`** – pins for your custom Google My Maps
- **`venueCategories`** – bars and restaurants with addresses/hours and alternatives
- **`days`** – each day’s activities (morning, afternoon, evening, night), costs, notes

Change any of these, save the file, then re-upload to Netlify (Option A) or commit the change on GitHub (Option B) so the live site updates.
