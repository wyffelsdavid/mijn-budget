# Mijn Budget – installation and user guide

A private budget app for iPhone. It is a Progressive Web App: plain files you host for free, which then install on the iPhone like a normal app. All financial data stays on the iPhone. No account, no login, no subscription, no cloud database, no tracking, and no connection to Claude.

## What's in the folder

```
index.html          the app page
styles.css          the look
manifest.json       app name and icon for "Add to Home Screen"
service-worker.js   makes the app work offline
js/db.js            the local database (IndexedDB)
js/logic.js         all calculations
js/charts.js        the charts (no external libraries)
js/app.js           screens, forms, backup
icons/              app icons
```

## 1. Publish the app for free (GitHub Pages, about 10 minutes)

Hosting needs a free GitHub account. That account is only for publishing the files; the person using the app never logs in anywhere.

1. Go to https://github.com and create a free account (or sign in).
2. Click the **+** at the top right, then **New repository**.
3. Name it, for example, `mijn-budget`. Choose **Public** (free GitHub Pages requires this). The *code* becomes public; the *financial data* never leaves the iPhone, so nothing personal is published.
4. Click **Create repository**, then the link **uploading an existing file**.
5. Unzip the downloaded file on your computer. Open the `mijn-budget` folder, select **everything inside it** (including the `js` and `icons` folders) and drag it into the GitHub page. Check that `index.html` sits at the top level, not inside another folder.
6. Click **Commit changes**.
7. Go to **Settings** (tab at the top of the repository) → **Pages** (left menu). Under *Branch* choose **main** and **/(root)**, then **Save**.
8. Wait 1–2 minutes and refresh. The address appears at the top, for example `https://your-name.github.io/mijn-budget/`.

## 2. Install on the iPhone

1. Open the address in **Safari** (not Chrome; on iPhone only Safari can install web apps reliably).
2. Tap the **Share** button (square with arrow).
3. Scroll down and tap **Add to Home Screen** (*Zet op beginscherm*), then **Add**.
4. Open Mijn Budget from the new icon. It opens full screen, without the Safari bars.

Important: always use the app from the home screen icon. On iPhone, the installed app keeps its own data, separate from Safari. Data entered in a Safari tab will not appear in the installed app.

## 3. Offline use

Open the app once with internet after installing. From then on it works without a connection; all data and screens are on the phone.

## 4. Backups (please read)

The data lives only on this iPhone. It is lost if the app icon is removed from the home screen, if Safari website data is cleared (Settings → Safari → Clear History and Website Data), or if the phone is replaced without a backup.

Make a backup: open the gear icon → **Mijn gegevens & back-up** → **Back-up maken** → choose **Save to Files** (*Bewaar in Bestanden*) and pick iCloud Drive or *On My iPhone*. The app shows the date of the last backup and reminds you after 30 days.

Restore: same screen → **Back-upbestand kiezen** → choose the `.json` file. The app checks the file first and then lets you choose:
- **Samenvoegen** (merge): only adds what is missing, nothing is overwritten.
- **Alles vervangen** (replace all): clears the iPhone data and restores the backup. Asks for confirmation.

**CSV exporteren** creates a file for Excel (semicolon-separated, comma decimals, opens correctly in Belgian/Dutch Excel).

## 5. Updating the app without losing data

The data is tied to the web address, not to the files. As long as the address stays the same, updates never touch the data.

1. In the repository, upload the changed files over the old ones (same drag and drop, **Commit changes**).
2. In `service-worker.js`, raise the number on the line `const VERSION = '1.0.0';` (for example to `'1.0.1'`). You can edit it on GitHub with the pencil icon. Without this step, iPhones keep showing the old cached version.
3. Next time the app opens with internet, a bar appears: **Er is een nieuwe versie** → **Vernieuwen**.

Never rename the repository or GitHub account: a new address means a new, empty app. If you ever must move, make a backup first and restore it in the new app.

## 6. Daily use

- **+ button**: amount, tap a category, **Toevoegen**. Optional details (subcategory, fixed/variable, payment method, notes, repeat) are under *Meer details*.
- **Budget** tab: monthly limits per category (colours at 75%, 90% and over budget) and **Vaste lasten & inkomen** for rent, subscriptions and salary. These are booked automatically on their due date, never twice.
- Holiday pay (*vakantiegeld*) and 13th month (*13de maand*) are separate income categories marked as extra income, so they are not counted as monthly salary.
- **Sparen** tab: savings goals with deposits and withdrawals, plus the savings calculator. Deposits move money from the available balance to savings; they don't count as spending.
- **Rapporten** tab: month and year reports with charts.
- Tap any transaction in **Historiek** to edit, duplicate or delete it.

## 7. Triple tap on the back of the iPhone to add an expense

1. In the app: gear icon → **Snel toevoegen** → turn on **Openen met nieuwe uitgave**. From then on the app opens straight on the "new expense" screen, with remaining budget (this month and this year) and amount saved (this month and last 12 months) shown at the top.
2. Open the **Shortcuts** app (*Opdrachten*) → **+** → add the action **Open App** → choose **Mijn Budget** → name the shortcut **Uitgave toevoegen**.
3. iPhone **Settings → Accessibility → Touch → Back Tap → Triple Tap** → choose **Uitgave toevoegen**.

Triple tap now opens the app on the add screen. The same shortcut can also go on the home screen as a Shortcuts widget, or in Control Center, as a one-tap "add expense" button.

Note: iOS doesn't pop up the keyboard by itself when an app opens; tap the amount once to start typing.

## Known limits (honest list)

- A home screen widget that *shows numbers* (remaining budget, savings) is not possible for a web app. Apple only allows widgets from native App Store apps, and the widget would have no way to read the app's private data. The add screen's summary at the top is the closest free alternative.

- iOS only allows installing web apps through Safari's *Add to Home Screen*; there is no App Store listing.
- iOS can clear website storage for sites not used for a while; installed home screen apps are exempt, which is why using the icon matters. Backups remain the only real guarantee.
- The language setting currently offers Dutch only.
- The date fields use the iPhone's own date picker, which follows the iPhone's region setting. With a Belgian or Dutch region it shows DD/MM/YYYY; everywhere else in the app dates are shown as DD/MM/YYYY.
