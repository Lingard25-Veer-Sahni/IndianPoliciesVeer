// Local hourly scheduler. This keeps running on YOUR machine (not Vercel)
// and, every hour, directly invokes scripts/ai-refresh.ts — the script that
// actually edits src/data/policies.ts (the file the live site is built
// from) and logs each applied change into Supabase's `changes` table so
// the Recent Changes feed reflects it.
//
// This has to run as a long-lived local process because a static file
// edit has no equivalent on Vercel's serverless platform — see the header
// comment in scripts/ai-refresh.ts for the full explanation of what is and
// isn't actually automated end-to-end.
//
// Run with: npm run cron:local  (leave this terminal/process running)
import cron from 'node-cron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function runAiRefresh() {
  console.log(`[${new Date().toISOString()}] local-cron: starting ai-refresh run`);
  const child = spawn('npx', ['tsx', 'scripts/ai-refresh.ts'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => {
    console.log(`[${new Date().toISOString()}] local-cron: ai-refresh exited with code ${code}`);
  });
  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] local-cron: failed to spawn ai-refresh:`, err.message);
  });
}

console.log('Local cron started — will run scripts/ai-refresh.ts every hour while this process stays running.');
console.log('Running an initial pass now...');
runAiRefresh();
cron.schedule('0 * * * *', runAiRefresh);
