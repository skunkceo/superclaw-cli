#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import command handlers
const initCommand = require('../lib/commands/init');
const soulCommand = require('../lib/commands/soul');
const connectCommand = require('../lib/commands/connect');
const memoryCommand = require('../lib/commands/memory');
const moduleCommand = require('../lib/commands/module');
const statusCommand = require('../lib/commands/status');
const costsCommand = require('../lib/commands/costs');
const doctorCommand = require('../lib/commands/doctor');

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

// Parse arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';
const subArgs = args.slice(1);

// Route commands
switch (command) {
  case 'init':
    initCommand.run(subArgs);
    break;
  case 'soul':
    soulCommand.run(subArgs);
    break;
  case 'connect':
    connectCommand.run(subArgs);
    break;
  case 'memory':
    memoryCommand.run(subArgs);
    break;
  case 'module':
    moduleCommand.run(subArgs);
    break;
  case 'status':
    statusCommand.run(subArgs);
    break;
  case 'costs':
    costsCommand.run(subArgs);
    break;
  case 'doctor':
    doctorCommand.run(subArgs);
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  case 'version':
  case '--version':
  case '-v':
    showVersion();
    break;
  default:
    console.log(`${colors.red}Unknown command: ${command}${colors.reset}`);
    console.log('');
    showHelp();
    process.exit(1);
}

function showHelp() {
  showLogo();
  console.log(`${colors.bright}Usage:${colors.reset}
  superclaw init                    Guided first-time setup
  superclaw soul                    Configure AI personality  
  superclaw connect                 Add channels (slack, discord, telegram)
  superclaw memory                  Set up memory system
  superclaw module <name>           Install capability modules
  superclaw status                  Health check + diagnostics
  superclaw costs                   Token usage + optimization tips
  superclaw doctor                  Troubleshoot common issues
  superclaw help                    Show this help
  superclaw version                 Show version

${colors.bright}Examples:${colors.reset}
  superclaw init                    # Start here! Full setup wizard
  superclaw soul                    # Customize your AI's personality
  superclaw connect                 # Set up Slack, Discord, etc.
  superclaw status                  # Check if everything's working
  superclaw doctor                  # Fix common problems

${colors.bright}Getting Started:${colors.reset}
  Run ${colors.cyan}superclaw init${colors.reset} to create your AI workspace and get started.
  This will guide you through setting up your AI companion step-by-step.

${colors.dim}Documentation: https://github.com/skunkceo/superclaw-cli${colors.reset}
`);
}

function showVersion() {
  const packageJson = require('../package.json');
  console.log(`${colors.cyan}Superclaw CLI${colors.reset} v${packageJson.version}`);
}

// Export utilities for commands
module.exports = {
  colors,
  success,
  warn,
  error,
  info,
  showLogo
};