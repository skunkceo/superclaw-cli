// Shared utilities for Superclaw CLI

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

function success(msg) { console.log(`${colors.green}✓${colors.reset} ${msg}`); }
function warn(msg) { console.log(`${colors.yellow}!${colors.reset} ${msg}`); }
function error(msg) { console.log(`${colors.red}✗${colors.reset} ${msg}`); }
function info(msg) { console.log(`${colors.blue}i${colors.reset} ${msg}`); }

// ASCII Art Logo
function showLogo() {
  console.log(`${colors.cyan}
   ╔═════════════════════════════════════════╗
   ║                                         ║
   ║   ███████ ██    ██ ██████  ███████     ║
   ║   ██      ██    ██ ██   ██ ██          ║
   ║   ███████ ██    ██ ██████  █████       ║
   ║        ██ ██    ██ ██      ██          ║
   ║   ███████  ██████  ██      ███████     ║
   ║                                         ║
   ║          ██████ ██       █████ ██     ██║
   ║         ██      ██      ██   ██ ██     ██║
   ║         ██      ██      ███████ ██  █  ██║
   ║         ██      ██      ██   ██ ██ ███ ██║
   ║          ██████ ███████ ██   ██  ███ ███ ║
   ║                                         ║
   ╚═════════════════════════════════════════╝${colors.reset}
   
   ${colors.bright}Your AI Companion Setup Tool${colors.reset}
   
`);
}

module.exports = {
  colors,
  success,
  warn,
  error,
  info,
  showLogo
};
