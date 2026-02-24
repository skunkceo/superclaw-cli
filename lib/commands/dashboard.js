const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { colors, success, warn, error, info } = require('../utils');

/**
 * Dashboard management commands
 * start, stop, restart, status
 */
async function run(args) {
  const subcommand = args[0] || 'help';
  const flags = parseFlags(args.slice(1));
  
  switch (subcommand) {
    case 'start':
      await startDashboard(flags);
      break;
    case 'stop':
      await stopDashboard(flags);
      break;
    case 'restart':
      await restartDashboard(flags);
      break;
    case 'status':
      await checkStatus(flags);
      break;
    case 'help':
    default:
      showHelp();
      break;
  }
}

function parseFlags(args) {
  const flags = {
    dir: null,
    port: null,
    mode: 'dev' // dev or prod
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) {
      flags.dir = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--port' && args[i + 1]) {
      flags.port = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--prod' || args[i] === '--production') {
      flags.mode = 'prod';
    } else if (args[i] === '--dev' || args[i] === '--development') {
      flags.mode = 'dev';
    }
  }
  
  return flags;
}

async function findDashboard(customDir = null) {
  if (customDir) {
    if (!fs.existsSync(customDir)) {
      throw new Error(`Directory not found: ${customDir}`);
    }
    return customDir;
  }
  
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const commonPaths = [
    process.cwd(),
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
          return p;
        }
      } catch (e) {
        // Not a valid package.json, try next
      }
    }
  }
  
  throw new Error('Could not find SuperClaw dashboard. Use --dir to specify location.');
}

async function startDashboard(flags) {
  console.log(`\n${colors.cyan}Starting SuperClaw Dashboard${colors.reset}\n`);
  
  try {
    const dashboardDir = await findDashboard(flags.dir);
    info(`Dashboard location: ${dashboardDir}`);
    
    // Check if already running
    const isRunning = await isDashboardRunning();
    if (isRunning) {
      warn('Dashboard appears to be already running');
      console.log(`\nUse ${colors.cyan}superclaw dashboard restart${colors.reset} to restart it\n`);
      return;
    }
    
    // Determine command and port
    const port = flags.port || 3000;
    const command = flags.mode === 'prod' ? 'start' : 'dev';
    const modeLabel = flags.mode === 'prod' ? 'production' : 'development';
    
    info(`Starting in ${modeLabel} mode on port ${port}...`);
    
    // Set environment variables
    const env = {
      ...process.env,
      PORT: port.toString()
    };
    
    // Start dashboard
    const logPath = path.join(dashboardDir, 'dashboard.log');
    
    const dashboardProcess = spawn('npm', ['run', command], {
      cwd: dashboardDir,
      detached: true,
      stdio: 'ignore',
      env
    });
    
    dashboardProcess.unref();
    
    // Save PID for later stop/restart
    const pidPath = path.join(dashboardDir, '.dashboard.pid');
    fs.writeFileSync(pidPath, dashboardProcess.pid.toString());
    
    console.log(`\n${colors.dim}Waiting for dashboard to start...${colors.reset}`);
    
    // Poll for server to be ready
    const http = require('http');
    let attempts = 0;
    let serverReady = false;
    
    while (attempts < 30 && !serverReady) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      try {
        await new Promise((resolve, reject) => {
          const req = http.get(`http://localhost:${port}`, (res) => {
            serverReady = true;
            resolve();
          });
          req.on('error', reject);
          req.setTimeout(1000, () => {
            req.destroy();
            reject();
          });
        });
      } catch (e) {
        // Server not ready yet
      }
    }
    
    if (serverReady) {
      success('Dashboard started!');
      console.log(`\n${colors.bright}Access your dashboard:${colors.reset}`);
      console.log(`  ${colors.blue}http://localhost:${port}${colors.reset}\n`);
      console.log(`${colors.dim}Logs: ${logPath}${colors.reset}`);
      console.log(`${colors.dim}Stop: superclaw dashboard stop${colors.reset}\n`);
    } else {
      warn('Dashboard started but not responding yet');
      console.log(`\nCheck logs: ${colors.cyan}tail -f ${logPath}${colors.reset}\n`);
    }
    
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
}

async function stopDashboard(flags) {
  console.log(`\n${colors.cyan}Stopping SuperClaw Dashboard${colors.reset}\n`);
  
  try {
    const dashboardDir = await findDashboard(flags.dir);
    const pidPath = path.join(dashboardDir, '.dashboard.pid');
    
    if (!fs.existsSync(pidPath)) {
      warn('No PID file found. Dashboard may not be running.');
      console.log('\nTry manually:');
      console.log(`  ps aux | grep "next dev\\|next start" | grep -v grep | awk '{print $2}' | xargs kill\n`);
      return;
    }
    
    const pid = fs.readFileSync(pidPath, 'utf-8').trim();
    
    try {
      process.kill(parseInt(pid), 'SIGTERM');
      success(`Dashboard stopped (PID ${pid})`);
      fs.unlinkSync(pidPath);
    } catch (e) {
      if (e.code === 'ESRCH') {
        warn('Process not found (already stopped?)');
        fs.unlinkSync(pidPath);
      } else {
        throw e;
      }
    }
    
    console.log('');
    
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
}

async function restartDashboard(flags) {
  console.log(`\n${colors.cyan}Restarting SuperClaw Dashboard${colors.reset}\n`);
  
  try {
    // Stop if running
    const dashboardDir = await findDashboard(flags.dir);
    const pidPath = path.join(dashboardDir, '.dashboard.pid');
    
    if (fs.existsSync(pidPath)) {
      info('Stopping current instance...');
      await stopDashboard(flags);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
    }
    
    // Start
    await startDashboard(flags);
    
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
}

async function checkStatus(flags) {
  console.log(`\n${colors.cyan}Dashboard Status${colors.reset}\n`);
  
  try {
    const dashboardDir = await findDashboard(flags.dir);
    info(`Dashboard location: ${dashboardDir}`);
    
    const pidPath = path.join(dashboardDir, '.dashboard.pid');
    
    if (!fs.existsSync(pidPath)) {
      console.log(`${colors.yellow}Status: Not running${colors.reset}\n`);
      return;
    }
    
    const pid = fs.readFileSync(pidPath, 'utf-8').trim();
    
    try {
      process.kill(parseInt(pid), 0); // Check if process exists
      console.log(`${colors.green}Status: Running${colors.reset}`);
      console.log(`PID: ${pid}\n`);
    } catch (e) {
      console.log(`${colors.red}Status: Stopped (stale PID file)${colors.reset}\n`);
      fs.unlinkSync(pidPath);
    }
    
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
}

async function isDashboardRunning() {
  try {
    const dashboardDir = await findDashboard();
    const pidPath = path.join(dashboardDir, '.dashboard.pid');
    
    if (!fs.existsSync(pidPath)) return false;
    
    const pid = fs.readFileSync(pidPath, 'utf-8').trim();
    process.kill(parseInt(pid), 0);
    return true;
  } catch (e) {
    return false;
  }
}

function showHelp() {
  console.log(`
${colors.bright}SuperClaw Dashboard Management${colors.reset}

${colors.bright}Usage:${colors.reset}
  superclaw dashboard <command> [options]

${colors.bright}Commands:${colors.reset}
  start      Start the dashboard
  stop       Stop the dashboard
  restart    Restart the dashboard
  status     Check if dashboard is running

${colors.bright}Options:${colors.reset}
  --dir <path>      Dashboard directory (auto-detected if omitted)
  --port <number>   Port to run on (default: 3000)
  --dev             Start in development mode (default)
  --prod            Start in production mode

${colors.bright}Examples:${colors.reset}
  superclaw dashboard start
  superclaw dashboard start --port 3077 --prod
  superclaw dashboard restart --dir ~/superclaw
  superclaw dashboard stop
  superclaw dashboard status
`);
}

module.exports = { run };
