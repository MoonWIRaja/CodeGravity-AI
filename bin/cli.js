#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const command = process.argv[2];
const args = process.argv.slice(3);

const commands = {
  start: 'npm run start',
  dev: 'npm run dev',
  build: 'npm run build',
  'db:push': 'npm run db:push',
  'db:studio': 'npm run db:studio',
  help: null
};

function showHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ░▒▓ CODEGRAVITY AI ▓▒░                                      ║
║  AI-Powered IDE in Your Browser                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  COMMANDS:                                                   ║
║    codegravity start     - Start in production mode          ║
║    codegravity dev       - Start in development mode         ║
║    codegravity build     - Build all apps                    ║
║    codegravity db:push   - Push database schema              ║
║    codegravity db:studio - Open Drizzle Studio               ║
║    codegravity help      - Show this help                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

if (!command || command === 'help' || !commands[command]) {
  showHelp();
  if (command && !commands[command]) {
    console.error(`\n  ❌ Unknown command: ${command}\n`);
    process.exit(1);
  }
  process.exit(0);
}

try {
  console.log(`\n  🚀 Running: ${commands[command]}\n`);
  execSync(commands[command], { 
    cwd: rootDir, 
    stdio: 'inherit' 
  });
} catch (error) {
  process.exit(1);
}
