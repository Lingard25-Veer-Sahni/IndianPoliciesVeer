// Local dev cron runner: calls POST /api/cron/refresh every hour against a
// locally running `next dev`/`next start` server, using CRON_SECRET from
// the environment (loaded via `-r dotenv/config` — see the "cron:local"
// npm script). Run with: npm run cron:local
import cron from 'node-cron';

const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}/api/cron/refresh`;
const SECRET = process.env.CRON_SECRET;

if (!SECRET) {
  console.error('CRON_SECRET is not set. Check .env.local.');
  process.exit(1);
}

async function runRefresh() {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'x-cron-secret': SECRET },
    });
    const data = await res.json().catch(() => ({}));
    console.log(`[${new Date().toISOString()}] cron/refresh -> ${res.status}`, data);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] cron/refresh failed:`, err.message);
  }
}

console.log(`Local cron started — will POST ${URL} every hour.`);
cron.schedule('0 * * * *', runRefresh);
