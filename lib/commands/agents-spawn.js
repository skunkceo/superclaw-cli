const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { colors, success, warn, error, info } = require('../utils');

/**
 * Spawn agent sessions in OpenClaw (for testing/initialization)
 * Note: Agents are normally spawned on-demand when messages match routing rules
 */
async function run(args) {
  console.log(`\n${colors.cyan}Agent Session Management${colors.reset}\n`);
  
  console.log(`${colors.dim}Note: Agents are normally spawned automatically when messages`);
  console.log(`match routing rules. This command is for testing/verification.${colors.reset}\n`);
  
  // Check if OpenClaw is running
  try {
    execSync('openclaw status', { stdio: 'ignore' });
  } catch (e) {
    error('OpenClaw is not running');
    console.log('\nStart OpenClaw first:');
    console.log(`  ${colors.cyan}openclaw gateway start${colors.reset}\n`);
    process.exit(1);
  }
  
  success('OpenClaw is running');
  
  // Get workspace path
  let openclawWorkspace;
  try {
    const status = execSync('openclaw status --json', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const statusData = JSON.parse(status);
    openclawWorkspace = statusData.workspace;
  } catch (e) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;
    openclawWorkspace = path.join(homeDir, '.openclaw', 'workspace');
  }
  
  if (!fs.existsSync(openclawWorkspace)) {
    error('OpenClaw workspace not found');
    console.log(`\nExpected at: ${openclawWorkspace}\n`);
    process.exit(1);
  }
  
  const agentsDir = path.join(openclawWorkspace, 'agents');
  
  if (!fs.existsSync(agentsDir)) {
    error('No agents directory found');
    console.log(`\nRun ${colors.cyan}superclaw setup agents${colors.reset} first\n`);
    process.exit(1);
  }
  
  // Get all agent directories
  const agentLabels = fs.readdirSync(agentsDir)
    .filter(name => {
      const fullPath = path.join(agentsDir, name);
      return fs.statSync(fullPath).isDirectory() && name !== 'shared';
    });
  
  if (agentLabels.length === 0) {
    warn('No agents found in workspace');
    console.log(`\nRun ${colors.cyan}superclaw setup agents${colors.reset} to create agents\n`);
    process.exit(0);
  }
  
  info(`Found ${agentLabels.length} agent workspace(s)`);
  console.log('');
  
  // Check which agents are already spawned
  let existingSessions = [];
  try {
    const sessionsRaw = execSync('openclaw sessions list --json', { encoding: 'utf-8' });
    const sessionsData = JSON.parse(sessionsRaw);
    if (Array.isArray(sessionsData)) {
      existingSessions = sessionsData.map(s => s.label).filter(Boolean);
    }
  } catch (e) {
    // No sessions or error - continue
  }
  
  // Spawn each agent that doesn't already have a session
  let spawned = 0;
  let skipped = 0;
  
  for (const label of agentLabels) {
    const agentPath = path.join(agentsDir, label);
    const identityPath = path.join(agentPath, 'IDENTITY.md');
    
    // Read agent name
    let agentName = label;
    if (fs.existsSync(identityPath)) {
      const identity = fs.readFileSync(identityPath, 'utf-8');
      const nameMatch = identity.match(/\*\*Name:\*\*\s*(.+)/);
      if (nameMatch) agentName = nameMatch[1].trim();
    }
    
    // Check if already spawned
    if (existingSessions.includes(label)) {
      console.log(`${colors.dim}⊙${colors.reset} ${agentName} (${label}) - already spawned`);
      skipped++;
      continue;
    }
    
    // Spawn the agent session
    try {
      const spawnCmd = `openclaw sessions spawn --label ${label} --task "Agent ${agentName} initialized" --cleanup keep`;
      execSync(spawnCmd, { stdio: 'pipe' });
      success(`${agentName} (${label})`);
      spawned++;
    } catch (e) {
      error(`Failed to spawn ${agentName}: ${e.message}`);
    }
  }
  
  console.log(`\n${colors.green}✓ Agent initialization complete!${colors.reset}\n`);
  console.log(`Test spawned: ${spawned}`);
  console.log(`Already active: ${skipped}`);
  console.log('');
  
  console.log(`${colors.bright}How Agents Work:${colors.reset}\n`);
  console.log(`${colors.dim}SuperClaw Dashboard${colors.reset} - Shows agent ${colors.cyan}workspaces${colors.reset} (potential agents)`);
  console.log(`${colors.dim}OpenClaw Gateway${colors.reset} - Shows ${colors.cyan}active sessions${colors.reset} (agents currently working)\n`);
  console.log(`Agents are spawned ${colors.yellow}on-demand${colors.reset} when messages match routing rules.`);
  console.log(`They don't appear in OpenClaw until actively working on a task.\n`);
  
  console.log(`${colors.bright}To trigger routing:${colors.reset}`);
  console.log(`  1. Send a message in Slack/Discord that matches a routing rule`);
  console.log(`     Example: "fix the bug in CRM" in #dev channel`);
  console.log(`  2. Main session will spawn the appropriate agent`);
  console.log(`  3. Agent will appear in OpenClaw gateway while working`);
  console.log(`  4. Agent cleans up when task completes\n`);
  
  console.log(`${colors.bright}Verify Setup:${colors.reset}`);
  console.log(`  • Agent workspaces: ${colors.cyan}ls ${agentsDir}${colors.reset}`);
  console.log(`  • Routing rules: ${colors.cyan}cat ${openclawWorkspace}/routing-rules.json${colors.reset}`);
  console.log(`  • Main session AGENTS.md should have router logic`);
  console.log(`  • Test routing: ${colors.cyan}https://superclaw.skunkglobal.com/router${colors.reset}\n`);
}

module.exports = { run };
