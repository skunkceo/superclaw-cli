#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import shared utilities (must be first to avoid circular deps)
const { colors, success, warn, error, info, showLogo } = require('../lib/utils');

// Import command handlers
const initCommand = require('../lib/commands/init');
const soulCommand = require('../lib/commands/soul');
const connectCommand = require('../lib/commands/connect');
const memoryCommand = require('../lib/commands/memory');
const moduleCommand = require('../lib/commands/module');
const statusCommand = require('../lib/commands/status');
const costsCommand = require('../lib/commands/costs');
const doctorCommand = require('../lib/commands/doctor');
const setupCommand = require('../lib/commands/setup');
const updateCommand = require('../lib/commands/update');
const localModelCommand = require('../lib/commands/localmodel');
const proCommand = require('../lib/commands/pro');
const setupAgentsCommand = require('../lib/commands/setup-agents');

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
  case 'setup':
    if (subArgs[0] === 'agents') {
      setupAgentsCommand.run(subArgs.slice(1));
    } else {
      setupCommand.run(subArgs);
    }
    break;
  case 'update':
  case 'upgrade':
    updateCommand.run(subArgs);
    break;
  case 'pro':
  case 'license':
    proCommand.run(subArgs);
    break;
  case 'localmodel':
  case 'local':
    const subcommand = subArgs[0] || 'setup';
    if (subcommand === 'setup') {
      localModelCommand.setupLocalModel();
    } else if (subcommand === 'list') {
      localModelCommand.listLocalModels();
    } else if (subcommand === 'test') {
      localModelCommand.testLocalModel();
    } else {
      console.log(`${colors.red}Unknown localmodel subcommand: ${subcommand}${colors.reset}`);
      console.log('Available: setup, list, test');
    }
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
  superclaw setup                   Create dashboard admin user
  superclaw setup agents            Configure specialized agents
  superclaw setup user add <email>  Add dashboard user
  superclaw setup user list         List all users
  superclaw setup user delete <e>   Delete user by email
  superclaw setup user reset <e>    Reset user password
  superclaw soul                    Configure AI personality  
  superclaw connect                 Add channels (slack, discord, telegram)
  superclaw memory                  Set up memory system
  superclaw module <name>           Install capability modules
  superclaw localmodel setup        Install local AI model (Ollama)
  superclaw localmodel list         List installed local models
  superclaw localmodel test         Test local model
  superclaw status                  Health check + diagnostics
  superclaw costs                   Token usage + optimization tips
  superclaw update                  Update CLI and dashboard
  superclaw update --check          Check for available updates
  superclaw pro status              Check Pro license status
  superclaw pro install <key>       Install Pro features
  superclaw doctor                  Troubleshoot common issues
  superclaw help                    Show this help
  superclaw version                 Show version

${colors.bright}Examples:${colors.reset}
  superclaw init                    # Start here! Full setup wizard
  superclaw setup                   # Create first dashboard admin
  superclaw setup user add joe@x.com --role edit  # Add user
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

// Re-export utilities for backwards compatibility
module.exports = require('../lib/utils');