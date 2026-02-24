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
  const cliPkg = require(path.join(__dirname, '..', '..', 'package.json'));
  
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║       SuperClaw Dashboard Setup       ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}`);
  console.log(`${colors.dim}CLI version: ${cliPkg.version}${colors.reset}\n`);

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
    output: process.stdout,
    terminal: true
  });

  const ask = (question) => new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });

  try {
    // Find dashboard directory
    if (!dashboardDir) {
      // Try common locations
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const commonPaths = [
        process.cwd(), // Current directory
        './superclaw',
        path.join(process.cwd(), 'superclaw'),
        path.join(homeDir, 'Documents', 'superclaw'),
        path.join(homeDir, 'superclaw'),
        process.env.SUPERCLAW_DIR
      ].filter(Boolean);

      for (const p of commonPaths) {
        const pkgPath = path.join(p, 'package.json');
        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (pkg.name === '@skunkceo/superclaw-dashboard') {
              dashboardDir = p;
              break;
            }
          } catch (e) {
            // Not a valid package.json, try next
          }
        }
      }

      if (!dashboardDir) {
        error('Could not find SuperClaw installation');
        console.log('\nRun this command from the dashboard directory, or specify the path:');
        console.log(`  ${colors.yellow}superclaw setup --dir /path/to/superclaw${colors.reset}\n`);
        rl.close();
        process.exit(1);
      }
    }

    // Show dashboard version
    let dashboardVersion = 'unknown';
    try {
      const dashboardPkg = JSON.parse(fs.readFileSync(path.join(dashboardDir, 'package.json'), 'utf-8'));
      dashboardVersion = dashboardPkg.version;
    } catch (e) {
      // Ignore if can't read package.json
    }
    
    info(`Using dashboard at: ${dashboardDir} ${colors.dim}(v${dashboardVersion})${colors.reset}`);

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
    const searchPaths = [
      path.join(dashboardDir, 'node_modules', 'better-sqlite3'),
      'better-sqlite3',
    ];
    const bcryptPaths = [
      path.join(dashboardDir, 'node_modules', 'bcryptjs'),
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
      error('Dependencies not found.');
      console.log('\nRun this in the dashboard directory:');
      console.log(`  ${colors.cyan}cd ${dashboardDir}${colors.reset}`);
      console.log(`  ${colors.cyan}npm install${colors.reset}\n`);
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
      warn(`User ${email} already exists.`);
      console.log('\nOptions:');
      console.log('  1. Use a different email address');
      console.log('  2. Reset password for this user');
      console.log('  3. Start fresh (delete all users and data)');
      console.log('  4. Cancel\n');
      
      const choice = await ask('Choose an option [1-4]: ');
      
      if (choice === '1') {
        // Loop back to get new email
        db.close();
        email = await ask('\nAdmin email address: ');
        while (!email || !email.includes('@')) {
          error('Please enter a valid email address');
          email = await ask('Admin email address: ');
        }
        
        // Re-open database and check again
        const db2 = new Database(dbPath);
        const existing2 = db2.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing2) {
          error(`User ${email} also exists.`);
          console.log(`\nTo reset password, run: ${colors.cyan}superclaw setup user reset ${email}${colors.reset}\n`);
          db2.close();
          rl.close();
          process.exit(1);
        }
        db2.close();
      } else if (choice === '2') {
        // Reset password
        const password = generatePassword();
        const hash = bcrypt.hashSync(password, 12);
        db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, email);
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
        db.close();
        
        console.log(`\n${colors.green}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.green}║                    Password Reset!                             ║${colors.reset}`);
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
        
        rl.close();
        process.exit(0);
      } else if (choice === '3') {
        // Delete everything and start fresh
        warn('This will delete ALL users and data!');
        const confirm = await ask('Are you sure? Type "yes" to confirm: ');
        
        if (confirm.toLowerCase() === 'yes') {
          db.close();
          fs.unlinkSync(dbPath);
          success('Database deleted. Starting fresh...\n');
          // Re-open fresh database
          const dbNew = new Database(dbPath);
          dbNew.exec(`
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
          dbNew.close();
          // Continue with fresh setup
        } else {
          db.close();
          console.log(`\n${colors.dim}Setup cancelled.${colors.reset}\n`);
          rl.close();
          process.exit(0);
        }
      } else {
        // Cancel
        db.close();
        console.log(`\n${colors.dim}Setup cancelled.${colors.reset}\n`);
        rl.close();
        process.exit(0);
      }
    }

    // Hash password and create user (bcrypt already loaded above)
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(email, hash, 'admin');
    db.close();

    // Detect OpenClaw workspace and create .env
    let openclawWorkspace;
    try {
      const { execSync } = require('child_process');
      const status = execSync('openclaw status --json', { encoding: 'utf-8' });
      const statusData = JSON.parse(status);
      openclawWorkspace = statusData.workspace;
    } catch (e) {
      // Fall back to default location based on current user
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      openclawWorkspace = path.join(homeDir, '.openclaw', 'workspace');
      
      // If we're running as root but workspace doesn't exist in /root, try the user who owns the dashboard
      if (!fs.existsSync(openclawWorkspace)) {
        // Try /root/.openclaw/workspace
        const rootWorkspace = '/root/.openclaw/workspace';
        if (fs.existsSync(rootWorkspace)) {
          openclawWorkspace = rootWorkspace;
        }
      }
    }

    // Create/update .env file
    const envPath = path.join(dashboardDir, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
      // Remove existing OPENCLAW_WORKSPACE if present
      envContent = envContent.split('\n').filter(line => !line.startsWith('OPENCLAW_WORKSPACE=')).join('\n');
    }
    
    envContent += `\nOPENCLAW_WORKSPACE=${openclawWorkspace}\n`;
    fs.writeFileSync(envPath, envContent);
    success(`Configured OpenClaw workspace: ${openclawWorkspace}`);

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
  const homeDir = process.env.HOME || process.env.USERPROFILE || '/root';
  const searchPaths = [
    path.join(homeDir, 'superclaw-dashboard', 'node_modules', 'better-sqlite3'),
    'better-sqlite3',
  ];
  const bcryptPaths = [
    path.join(homeDir, 'superclaw-dashboard', 'node_modules', 'bcryptjs'),
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
