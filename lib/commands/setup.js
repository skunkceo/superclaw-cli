const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
// bcrypt is loaded dynamically from dashboard's node_modules

// Define colors and helpers directly (avoid circular dependency with main module)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};
const success = (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`);
const warn = (msg) => console.log(`${colors.yellow}!${colors.reset} ${msg}`);
const error = (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`);
const info = (msg) => console.log(`${colors.blue}i${colors.reset} ${msg}`);

// Generate a secure random password
function generatePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const array = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

function run(args) {
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║       SuperClaw Dashboard Setup       ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`);

  // Parse args for --dir flag
  let dashboardDir = null;
  const dirIndex = args.indexOf('--dir');
  if (dirIndex !== -1 && args[dirIndex + 1]) {
    dashboardDir = path.resolve(args[dirIndex + 1]);
    // Remove --dir and its value from args
    args = args.filter((arg, i) => i !== dirIndex && i !== dirIndex + 1);
  }

  // Check for subcommand
  const subcommand = args[0];
  
  if (subcommand === 'user') {
    return userManagement(args.slice(1), dashboardDir);
  }
  
  return setupDashboard(dashboardDir);
}

async function setupDashboard(dashboardDir = null) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (question) => new Promise((resolve) => {
    rl.question(question, resolve);
  });

  try {
    // Find dashboard directory
    if (!dashboardDir) {
      // Try common locations
      const commonPaths = [
        './superclaw',
        path.join(process.cwd(), 'superclaw'),
        process.env.SUPERCLAW_DIR
      ].filter(Boolean);

      for (const p of commonPaths) {
        if (fs.existsSync(path.join(p, 'package.json'))) {
          dashboardDir = p;
          break;
        }
      }

      if (!dashboardDir) {
        error('Could not find SuperClaw installation');
        console.log('\nRun this command from the dashboard directory, or specify the path:');
        console.log(`  ${colors.yellow}superclaw setup --dir /path/to/superclaw${colors.reset}\n`);
        process.exit(1);
      }
    }

    info(`Using dashboard at: ${dashboardDir}`);

    // Find or create data directory  
    const dataDir = process.env.SUPERCLAW_DATA_DIR || path.join(dashboardDir, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'superclaw.db');

    // Check if we already have users
    if (fs.existsSync(dbPath)) {
      // Try to load better-sqlite3 from dashboard's node_modules
      let Database;
      try {
        Database = require(path.join(dashboardDir, 'node_modules', 'better-sqlite3'));
      } catch (e) {
        error('Dashboard dependencies not installed. Run: npm install');
        console.log(`  in directory: ${dashboardDir}\n`);
        process.exit(1);
      }

      const db = new Database(dbPath);
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
      db.close();

      if (userCount.count > 0) {
        warn('Dashboard already has users configured.');
        const proceed = await ask('Create another admin user? [y/N]: ');
        if (!proceed.toLowerCase().startsWith('y')) {
          console.log(`\n${colors.dim}Setup cancelled.${colors.reset}\n`);
          rl.close();
          process.exit(0);
        }
      }
    }

    // Get email
    console.log(`${colors.bright}Create Admin Account${colors.reset}\n`);
    
    let email = await ask('Admin email address: ');
    while (!email || !email.includes('@')) {
      error('Please enter a valid email address');
      email = await ask('Admin email address: ');
    }

    // Generate password
    const password = generatePassword();

    // Create data directory
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Load dependencies and create user
    // Try multiple locations for dependencies
    let Database, bcrypt;
    const dashboardPath = '/home/mike/apps/websites/superclaw-dashboard/node_modules';
    const searchPaths = [
      path.join(dashboardPath, 'better-sqlite3'),
      'better-sqlite3',
    ];
    const bcryptPaths = [
      path.join(dashboardPath, 'bcryptjs'),
      'bcryptjs',
    ];
    
    for (const p of searchPaths) {
      try {
        Database = require(p);
        break;
      } catch { /* try next */ }
    }
    for (const p of bcryptPaths) {
      try {
        bcrypt = require(p);
        break;
      } catch { /* try next */ }
    }
    
    if (!Database || !bcrypt) {
      error('Dependencies not found. Make sure superclaw-dashboard is installed,');
      error('or run: npm install better-sqlite3 bcryptjs');
      rl.close();
      process.exit(1);
    }

    const db = new Database(dbPath);

    // Initialize schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'view',
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        last_login INTEGER,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    `);

    // Check if email exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      error(`User ${email} already exists.`);
      db.close();
      rl.close();
      process.exit(1);
    }

    // Load bcrypt from dashboard's node_modules
    let bcrypt;
    try {
      bcrypt = require(path.join(dashboardDir, 'node_modules', 'bcryptjs'));
    } catch (e) {
      error('Dashboard dependencies not installed. Run: npm install');
      console.log(`  in directory: ${dashboardDir}\n`);
      process.exit(1);
    }

    // Hash password and create user
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(email, hash, 'admin');
    db.close();

    // Success message
    console.log(`\n${colors.green}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.green}║                    Admin User Created!                         ║${colors.reset}`);
    console.log(`${colors.green}╠═══════════════════════════════════════════════════════════════╣${colors.reset}`);
    console.log(`${colors.green}║${colors.reset}                                                                 ${colors.green}║${colors.reset}`);
    console.log(`${colors.green}║${colors.reset}  ${colors.bright}Email:${colors.reset}    ${email.padEnd(49)}${colors.green}║${colors.reset}`);
    console.log(`${colors.green}║${colors.reset}  ${colors.bright}Password:${colors.reset} ${colors.yellow}${password}${colors.reset}${''.padEnd(45 - password.length)}${colors.green}║${colors.reset}`);
    console.log(`${colors.green}║${colors.reset}                                                                 ${colors.green}║${colors.reset}`);
    console.log(`${colors.green}║${colors.reset}  ${colors.dim}Save this password - it will not be shown again!${colors.reset}              ${colors.green}║${colors.reset}`);
    console.log(`${colors.green}║${colors.reset}                                                                 ${colors.green}║${colors.reset}`);
    console.log(`${colors.green}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.bright}Next steps:${colors.reset}`);
    console.log(`  1. Start the dashboard: ${colors.cyan}npm start${colors.reset} (in superclaw-dashboard/)`);
    console.log(`  2. Open in browser: ${colors.cyan}http://localhost:3077${colors.reset}`);
    console.log(`  3. Log in with your credentials above\n`);

  } catch (err) {
    error('Setup failed: ' + err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function userManagement(args, dashboardDir = null) {
  const action = args[0];
  
  if (!action || action === 'help') {
    console.log(`${colors.bright}User Management Commands:${colors.reset}\n`);
    console.log('  superclaw setup user add <email> [--role <view|edit|admin>]');
    console.log('  superclaw setup user list');
    console.log('  superclaw setup user delete <email>');
    console.log('  superclaw setup user reset <email>');
    console.log('');
    return;
  }

  const dataDir = process.env.SUPERCLAW_DATA_DIR || path.join(process.env.HOME || '/root', '.superclaw');
  const dbPath = path.join(dataDir, 'superclaw.db');

  if (!fs.existsSync(dbPath)) {
    error('No database found. Run `superclaw setup` first.');
    process.exit(1);
  }

  // Try multiple locations for dependencies
  let Database, bcrypt;
  const dashboardPath = '/home/mike/apps/websites/superclaw-dashboard/node_modules';
  const searchPaths = [
    path.join(dashboardPath, 'better-sqlite3'),
    'better-sqlite3',
  ];
  const bcryptPaths = [
    path.join(dashboardPath, 'bcryptjs'),
    'bcryptjs',
  ];
  
  for (const p of searchPaths) {
    try {
      Database = require(p);
      break;
    } catch { /* try next */ }
  }
  for (const p of bcryptPaths) {
    try {
      bcrypt = require(p);
      break;
    } catch { /* try next */ }
  }
  
  if (!Database || !bcrypt) {
    error('Dependencies not found. Make sure superclaw-dashboard is installed.');
    process.exit(1);
  }

  const db = new Database(dbPath);

  try {
    switch (action) {
      case 'add': {
        const email = args[1];
        if (!email || !email.includes('@')) {
          error('Valid email required');
          process.exit(1);
        }
        
        const roleIndex = args.indexOf('--role');
        let role = 'view';
        if (roleIndex !== -1 && args[roleIndex + 1]) {
          role = args[roleIndex + 1];
          if (!['view', 'edit', 'admin'].includes(role)) {
            error('Role must be view, edit, or admin');
            process.exit(1);
          }
        }

        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
          error(`User ${email} already exists`);
          process.exit(1);
        }

        const password = generatePassword();
        const hash = bcrypt.hashSync(password, 12);
        db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(email, hash, role);

        console.log(`\n${colors.green}✓ User created${colors.reset}\n`);
        console.log(`  Email:    ${email}`);
        console.log(`  Role:     ${role}`);
        console.log(`  Password: ${colors.yellow}${password}${colors.reset}\n`);
        console.log(`${colors.dim}Save this password - it will not be shown again!${colors.reset}\n`);
        break;
      }

      case 'list': {
        const users = db.prepare('SELECT id, email, role, created_at, last_login FROM users').all();
        
        if (users.length === 0) {
          console.log('No users found.\n');
        } else {
          console.log(`\n${colors.bright}Users:${colors.reset}\n`);
          console.log('  ID    Email                              Role     Last Login');
          console.log('  ──────────────────────────────────────────────────────────────');
          
          for (const user of users) {
            const lastLogin = user.last_login 
              ? new Date(user.last_login).toLocaleDateString() 
              : 'Never';
            console.log(`  ${String(user.id).padEnd(5)} ${user.email.padEnd(35)} ${user.role.padEnd(8)} ${lastLogin}`);
          }
          console.log('');
        }
        break;
      }

      case 'delete': {
        const email = args[1];
        if (!email) {
          error('Email required');
          process.exit(1);
        }

        const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (!user) {
          error(`User ${email} not found`);
          process.exit(1);
        }

        db.prepare('DELETE FROM users WHERE email = ?').run(email);
        success(`User ${email} deleted\n`);
        break;
      }

      case 'reset': {
        const email = args[1];
        if (!email) {
          error('Email required');
          process.exit(1);
        }

        const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (!user) {
          error(`User ${email} not found`);
          process.exit(1);
        }

        const password = generatePassword();
        const hash = bcrypt.hashSync(password, 12);
        db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, email);
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

        console.log(`\n${colors.green}✓ Password reset${colors.reset}\n`);
        console.log(`  Email:        ${email}`);
        console.log(`  New Password: ${colors.yellow}${password}${colors.reset}\n`);
        console.log(`${colors.dim}Save this password - it will not be shown again!${colors.reset}\n`);
        break;
      }

      default:
        error(`Unknown action: ${action}`);
        console.log('Run `superclaw setup user help` for available commands\n');
    }
  } finally {
    db.close();
  }
}

module.exports = { run };
