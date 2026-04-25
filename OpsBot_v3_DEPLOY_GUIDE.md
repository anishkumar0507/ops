# OpsBot v3 — Tanvi's Deployment Guide
## Estimated time: 45 minutes

---

## STEP 1 — Create Firebase Project (10 min)

1. Go to https://console.firebase.google.com
2. Click "Add project" → name it `nextdot-opsbot`
3. Disable Google Analytics (not needed)
4. Once created, click **"Build"** in the left sidebar

### Enable Authentication
1. Build → Authentication → Get started
2. Sign-in method → Email/Password → Enable → Save

### Enable Realtime Database
1. Build → Realtime Database → Create database
2. Start in **test mode** (we'll lock it down with rules in Step 3)
3. Choose region: `asia-southeast1` (Singapore — closest to India)
4. Copy the database URL — looks like: `https://nextdot-opsbot-default-rtdb.asia-southeast1.firebasedatabase.app`

### Get Config Object
1. Project settings (gear icon) → General → Your apps → Add app → Web (</>)
2. Register app as "OpsBot"
3. Copy the `firebaseConfig` object — you'll need it in Step 2

---

## STEP 2 — Configure the App (5 min)

Open `index.html` and find the `FB_CFG` block near line 10:

```javascript
const FB_CFG = {
  apiKey:            "PASTE_apiKey",
  authDomain:        "PASTE_authDomain",
  databaseURL:       "PASTE_databaseURL",      // ← the URL from above
  projectId:         "PASTE_projectId",
  storageBucket:     "PASTE_storageBucket",
  messagingSenderId: "PASTE_messagingSenderId",
  appId:             "PASTE_appId"
};
```

Replace each `PASTE_*` value with the values from your Firebase config object.

Also update `.firebaserc` — replace `PASTE_YOUR_FIREBASE_PROJECT_ID` with your project ID.

---

## STEP 3 — Create Team Logins in Firebase Auth (10 min)

For each team member, create their Firebase Auth account:

1. Firebase Console → Authentication → Users → Add user
2. Add each person's email + password from the ROSTER in index.html:

| Email                      | Password | Role   |
|----------------------------|----------|--------|
| ayush@nextdot.co.in        | ops2024  | owner  |
| snigdha@nextdot.co.in      | nd2024   | admin  |
| tanvi@nextdot.co.in        | nd2024   | member |
| jatin@nextdot.co.in        | nd2024   | member |
| ravi@nextdot.co.in         | nd2024   | member |
| seema@nextdot.co.in        | nd2024   | member |
| nandika@nextdot.co.in      | nd2024   | intern |
| gauri@nextdot.co.in        | nd2024   | intern |

> **IMPORTANT**: After creating each user in Firebase Auth, note their UID.
> Go to Realtime Database → nd_opsbot/users/ and update each user's `uid` field
> to match their Firebase Auth UID. This is what the security rules use.
> 
> Shortcut: Log in as each user once — the app auto-creates their profile on first login.

---

## STEP 4 — Deploy Security Rules (5 min)

Install Firebase CLI (if not installed):
```bash
npm install -g firebase-tools
firebase login
```

Deploy rules only:
```bash
firebase deploy --only database
```

This activates the server-enforced permission rules from `firebase.rules.json`.

---

## STEP 5 — Deploy to Firebase Hosting (5 min)

```bash
firebase deploy --only hosting
```

Your app will be live at:
`https://nextdot-opsbot.web.app`
or
`https://nextdot-opsbot.firebaseapp.com`

### Custom domain (ops.nextdot.co.in):
1. Firebase Console → Hosting → Add custom domain
2. Enter `ops.nextdot.co.in`
3. Add the DNS records they give you to your domain registrar
4. SSL is automatic — takes 24h to propagate

---

## STEP 6 — Add Claude API Key (2 min)

1. Go to https://console.anthropic.com
2. Create an API key for OpsBot
3. Log in to the deployed app as Ayush
4. Go to OpsBot AI tab → paste the key → Save

The key is stored per-browser session only (not in Firebase).
For a shared key across the team, add it to the ROSTER sync in Firebase:
`nd_opsbot/config/claudeApiKey`

---

## PERMISSION MATRIX

| Feature              | Owner | Admin | Member | Intern |
|----------------------|-------|-------|--------|--------|
| See all tasks        | ✅    | ✅    | Dept only | Own only |
| See all clients      | ✅    | ✅    | Restricted | Restricted |
| Create any task      | ✅    | ✅    | ✅     | ❌     |
| Edit own tasks       | ✅    | ✅    | ✅     | ✅     |
| Edit others' tasks   | ✅    | ✅    | ❌     | ❌     |
| Delete tasks         | ✅    | ✅    | ❌     | ❌     |
| Manage team          | ✅    | ✅    | ❌     | ❌     |
| Escalate to Ayush    | ✅    | ✅    | ❌     | ❌     |
| See reports          | ✅    | ✅    | ❌     | ❌     |
| Drag board cards     | ✅    | ✅    | Own only | ❌ |
| OpsBot AI actions    | All   | All   | Own tasks | View only |

---

## CLIENT ACCESS RESTRICTION (for future account managers)

To restrict a member to specific clients, update their profile in Firebase:
```
nd_opsbot/users/{uid}/clients: ["narayana", "wockhardt"]
```
Leave `clients: null` for full access.

---

## ADDING NEW TEAM MEMBERS (30-person scale)

1. Firebase Auth → Add user (email + password)
2. App auto-creates profile on first login OR manually add to nd_opsbot/users/
3. Set their role, dept, and clients restriction as needed
4. Share the URL + credentials

No redeployment needed for new users.

---

## TROUBLESHOOTING

**"Permission denied" in console**: Security rules are working correctly. Check the user's role in nd_opsbot/users/{uid}/role.

**Tasks not syncing**: Check Firebase Realtime Database is enabled and databaseURL is correct in FB_CFG.

**Login fails on deployed app**: Ensure the domain (ops.nextdot.co.in or web.app URL) is added to Firebase Auth → Authorized domains.

**Offline mode**: If Firebase is unreachable, the app falls back to local seed data. Tasks won't sync until connection restored.
