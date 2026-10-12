# Black Belt Cut

A personal fat-loss tracker that installs like an app on your phone and computers. It has daily eating rules, bodyweight workouts that level up on their own, a craving timer and belt ranks for weight. It also has F- to S+ stat ranks with weekly quests. You use one login on every device, and it works offline.

It needs no app store and no server of your own. The app lives on GitHub Pages and your log lives in Firebase, both free. Until step 3 is done, the app still works and saves on each device only.

## Setup (about 20 minutes, no coding)

### Step 1: Put the app online (GitHub Pages)
1. On github.com, click **+ → New repository**. Name it `black-belt-cut`, keep it **Public**, then click **Create repository**.
2. On the empty repository page, click **uploading an existing file**. Open this folder, select everything inside it (Ctrl+A), and drag it onto the page. Drag the files, not the folder itself, then click **Commit changes**.
3. Go to **Settings → Pages**. Under *Build and deployment*, set Source to **Deploy from a branch**, set Branch to **main** and **/ (root)**, then click **Save**.
4. After 1–2 minutes, your link shows at the top of that page: `https://<your-username>.github.io/black-belt-cut/`

The code is public. Your log is not: it's stored in Firebase behind your login.

### Step 2: Create the Firebase project and turn on email sign-in
1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with your Google account.
2. Click **Create a project** and name it `black-belt-cut`. You can switch Google Analytics off.
3. Go to **Build → Authentication → Get started → Sign-in method**. Choose **Email/Password**, turn on the first switch, then click **Save**.
4. Go to **Authentication → Settings → Authorized domains → Add domain** and add `<your-username>.github.io`.

### Step 3: Connect the app
1. In Firebase, open **Project settings** (gear icon) **→ General → Your apps** and click the **Web** icon `</>`.
2. Nickname it `black-belt-cut`. Don't tick Hosting. Click **Register app**.
3. Firebase shows a `firebaseConfig` with apiKey, authDomain, projectId, storageBucket, messagingSenderId and appId. On GitHub, open `firebase-config.js`, click the pencil (Edit), paste each value between the quotes, then click **Commit changes**.

These values are safe to publish. The database rules in step 4 are what keep your data private.

### Step 4: Create the database
1. In Firebase, go to **Build → Firestore Database → Create database**.
2. Choose **production mode** and a location near you, then click **Create**.
3. Open the **Rules** tab, replace everything with the contents of `firestore.rules`, then click **Publish**.

### Step 5: Install it and create your account
1. Open your link and tap **Create account** (email and password). Then set up day one.
2. Install it on every device:
   - **iPhone:** in Safari, tap **Share → Add to Home Screen**.
   - **Android:** in Chrome, tap **⋮ → Add to Home screen** (or **Install app**).
   - **PC:** in Chrome or Edge, click the install icon in the address bar.
3. Sign in with the same email everywhere. Your log syncs, and it keeps working offline.

### Updating later
Edit a file on GitHub (pencil, then Commit), or clone the repo with git. The site updates within a couple of minutes. After big changes, close and reopen the installed app so it picks up the new version.

### Backups
**Guide → Account and backup → Download backup** saves your whole log as one file, and **Restore a backup** loads it back. Keep one now and then, so your data is never stuck anywhere.

---

## For Claude (context for future sessions)

**Who it's for:** an 18-year-old man, 175 cm, about 100 kg at the start (October 2026). His goal is 70–75 kg in a year while keeping muscle.
- **Training:** bodyweight only, at home, 3 times a week. He has 6 months of kickboxing and 2 years of self-taught taekwondo.
- **Food:** he eats what his mother cooks, refuses salads and won't count calories, so the app uses plate and hand-portion rules plus daily habit checkboxes.
- **Failure modes he described:** he can't stop eating, he stops at random, and he loses motivation. Every feature targets one of these: the craving timer, streaks that allow one missed day, the comeback card, the 12-minute short workout, the extra rule offered after a 2-week stall, belts and ranks.

**Stat ranks (ranks.js):** 21 steps from F- to S+. C is roughly average for his age, A is athletic, S is elite.
- STR is max push-ups, DUR is max plank, SPD is roundhouse kicks in 30 seconds, and END is burpees in 3 minutes. Each keeps his best trial result.
- TEC is a 20-technique checklist, one rank step per technique.
- WIL comes from the last 28 days of logs (60% eating, 40% training), so it can drop.
- POT starts at A and rises one step per 4 weekly quests cleared.
- **His own starting estimates:** STR C-, DUR D+, SPD C, END D-. Claude set TEC to D+ and POT to A.

**Weekly quests:** week 1 and every 4th week after that is a Rank Trial. Other weeks target his lowest stat, never the same one twice in a row, and are scaled from his trial results. He asked for quests that are much harder than regular workouts. He explicitly said no levels and no XP.

**Code layout:** plain HTML/CSS/JS with no build step.
- `logic.js` and `ranks.js` are pure logic.
- `app.js` holds state, storage, the Today tab and the check-in. `sync.js` handles Firebase login and sync (Firebase JS SDK 10.12.2 from gstatic).
- `train.js` is the workout flow, `status.js` the ranks and quests, and `views.js` the progress, guide and backup screens plus startup.
- Data is stored at `users/<uid>/log/{profile,weights,habits,sessions,urges,checkins,ranks,quests}`.

**Tests:** run `node test-logic.js && node test-ranks.js && node test-app.js && node test-sync.js`. On a machine without Node, VS Code's runtime works: set `ELECTRON_RUN_AS_NODE=1`, then run `Code.exe test-app.js`.

**Earlier version:** this replaced a claude.ai artifact version (https://claude.ai/artifact/2YW76wtSs3bDTejZzZbAfe), which he never logged data in.
