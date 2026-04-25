/**
 * OpsBot v3 — Backend Server
 * - Reads all secrets from .env (Firebase config + Claude API key)
 * - Injects Firebase config into HTML at runtime
 * - Proxies Claude API calls so the API key is NEVER sent to the browser
 * Run: node server.js  (or npm start)
 */

require('dotenv').config();
const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const HTML = path.join(__dirname, 'OpsBot_v3_index.html');

app.use(express.json({ limit: '1mb' }));

// ── Validate required env vars ──────────────────────────────────────────────
const REQUIRED = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_DATABASE_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'CLAUDE_API_KEY',
];
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error('\n❌  Missing required .env variables:\n  ' + missing.join('\n  '));
  console.error('\nCopy .env.example → .env and fill in your credentials.\n');
  process.exit(1);
}

// ── Build the FB_CFG <script> block from .env ───────────────────────────────
function buildConfigScript() {
  return `<script>
/* Injected by server.js from .env — keys never hardcoded in source */
const FB_CFG = {
  apiKey:            "${process.env.FIREBASE_API_KEY}",
  authDomain:        "${process.env.FIREBASE_AUTH_DOMAIN}",
  databaseURL:       "${process.env.FIREBASE_DATABASE_URL}",
  projectId:         "${process.env.FIREBASE_PROJECT_ID}",
  storageBucket:     "${process.env.FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
  appId:             "${process.env.FIREBASE_APP_ID}"
};
</script>`;
}

// ── Main route — serve HTML with Firebase config injected ───────────────────
app.get('/', (req, res) => {
  let html;
  try {
    html = fs.readFileSync(HTML, 'utf8');
  } catch (e) {
    return res.status(500).send('Could not read OpsBot_v3_index.html: ' + e.message);
  }

  html = html.replace(
    '<script src="firebase-config.js"></script>',
    buildConfigScript()
  );

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// ── Claude API proxy — key stays on server, never reaches browser ────────────
app.post('/api/chat', async (req, res) => {
  const { system, messages, max_tokens, model } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':        'application/json',
        'x-api-key':           process.env.CLAUDE_API_KEY,
        'anthropic-version':   '2023-06-01',
      },
      body: JSON.stringify({
        model:      model      || 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 700,
        system:     system     || '',
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Claude API error:', data);
      return res.status(response.status).json({ error: data?.error?.message || 'Claude API error' });
    }

    res.json(data);
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: 'Server error reaching Claude API' });
  }
});

// ── Serve static assets ──────────────────────────────────────────────────────
app.use(express.static(__dirname));

// ── Firebase connectivity check ───────────────────────────────────────────────
function checkFirebase() {
  const https = require('https');
  // Ping the Firebase REST endpoint — no auth needed just to test reachability
  const dbUrl  = process.env.FIREBASE_DATABASE_URL.replace(/\/$/, '');
  const testUrl = `${dbUrl}/.json`;

  https.get(testUrl, (res) => {
    // 200 = open rules, 401/403 = rules blocking (DB is alive), both = connected ✅
    if ([200, 401, 403].includes(res.statusCode)) {
      console.log(`🔥  Firebase connected  →  ${process.env.FIREBASE_PROJECT_ID}`);
    } else if (res.statusCode === 404) {
      console.error(`❌  Firebase Database not found (404)`);
      console.error(`    → Firebase Console mein Realtime Database create karo:`);
      console.error(`      Build → Realtime Database → Create database`);
      console.error(`    → Phir .env mein sahi FIREBASE_DATABASE_URL paste karo\n`);
    } else {
      console.warn(`⚠️   Firebase responded with unexpected status: ${res.statusCode}`);
    }
    console.log(`🔒  Claude API key loaded from .env (never sent to browser)\n`);
  }).on('error', (err) => {
    console.error(`❌  Firebase connection failed: ${err.message}`);
    console.error(`    → Check karo FIREBASE_DATABASE_URL .env mein sahi hai\n`);
    console.log(`🔒  Claude API key loaded from .env (never sent to browser)\n`);
  });
}

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  OpsBot running at http://localhost:${PORT}`);
  checkFirebase();
});
