# Use Holiyay on your phones

Host the folder online so you and your partner can open the itinerary on your iPhones (or any browser), then **Add to Home Screen** for app-like access.

---

## Option A: Netlify Drop (no account, ~2 min)

1. Go to **[app.netlify.com/drop](https://app.netlify.com/drop)** in your browser.
2. **Drag and drop** your whole `Holiyay` folder onto the page.
3. Netlify will give you a URL like `https://random-name-123.netlify.app`.
4. **On your iPhone:** Open that URL in Safari → Share → **Add to Home Screen**. Name it “Japan 2027” or “Holiyay”.
5. Your partner can use the same URL and add it to their home screen too.

**To update the itinerary later:** edit the files on your PC, then drag and drop the folder again on Netlify Drop. You’ll get a new URL unless you create a free Netlify account and link the same site.

---

## Option B: GitHub Pages (free, same URL forever)

1. **Create a GitHub account** at [github.com](https://github.com) if you don’t have one.
2. **Create a new repository:**  
   - Click **New** → name it e.g. `holiyay` → Public → Create repository.
3. **Upload your Holiyay files:**
   - In the new repo, click **“uploading an existing file”**.
   - Drag in everything from your `Holiyay` folder: `index.html`, `styles.css`, `app.js`, `data.js`, `manifest.json`. (Don’t upload `DEPLOY.md` unless you want it visible.)
   - Click **Commit changes**.
4. **Turn on GitHub Pages:**
   - Repo → **Settings** → **Pages** (left sidebar).
   - Under “Source” choose **Deploy from a branch**.
   - Branch: **main**, folder: **/ (root)** → Save.
5. After a minute, your site will be at:  
   **`https://YOUR-USERNAME.github.io/holiyay/`**
6. **On your iPhone:** Open that URL in Safari → Share → **Add to Home Screen**.

**To update later:** edit files on your PC, then in the repo click the file → Edit → paste new content → Commit. The same URL will show the new version after a short delay.

---

## After it’s online

- **Exchange rate:** Set “JPY per 1 AUD” and tap **Save**. It’s stored per device (in the browser), so each phone keeps its own rate until you change it.
- **Book-by reminders** and **budget** stay in sync for everyone viewing the same hosted page.
- Works offline after the first load on each device (browser may cache the page).

If you tell me whether you prefer “no account” (Netlify Drop) or “same URL and easy updates” (GitHub Pages), I can give you step-by-step tailored to that.
