const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { colors, success, warn, error, info } = require('../utils');

/**
 * Initialize standard agent workspaces
 * Creates agent directories with templates for:
 * - Lead Developer
 * - Lead Designer
 * - Marketing Lead
 * - Support Lead
 * - Product Manager
 */
async function setupAgents(rl) {
  const ask = (question) => new Promise((resolve) => {
    rl.question(question, resolve);
  });

  console.log(`\n${colors.cyan}Agent Setup${colors.reset}\n`);
  
  info('SuperClaw can create specialized agent sessions for different roles.');
  console.log('These agents will automatically route and handle specific types of tasks.\n');
  
  const setupAgents = await ask('Create standard agent templates? [Y/n]: ');
  
  if (setupAgents.toLowerCase().startsWith('n')) {
    console.log(`${colors.dim}Skipping agent setup. You can create agents later via the dashboard.${colors.reset}\n`);
    return;
  }

  // Get OpenClaw workspace directory
  let openclawWorkspace;
  try {
    // Try to get workspace from OpenClaw status
    const status = execSync('openclaw status --json', { encoding: 'utf-8' });
    const statusData = JSON.parse(status);
    openclawWorkspace = statusData.workspace;
  } catch (e) {
    // Fall back to default location
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    openclawWorkspace = path.join(homeDir, '.openclaw', 'workspace');
  }

  const agentsDir = path.join(openclawWorkspace, 'agents');
  
  // Create agents directory if it doesn't exist
  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }

  // Standard agents to create
  const standardAgents = [
    {
      label: 'lead-developer',
      name: 'Lead Developer',
      emoji: '🛠️',
      template: 'lead-developer.md'
    },
    {
      label: 'lead-designer',
      name: 'Lead Designer',
      emoji: '🎨',
      template: 'lead-designer.md'
    },
    {
      label: 'marketing-lead',
      name: 'Marketing Lead',
      emoji: '📈',
      template: 'marketing-lead.md'
    },
    {
      label: 'support-lead',
      name: 'Support Lead',
      emoji: '💬',
      template: 'support-lead.md'
    },
    {
      label: 'product-manager',
      name: 'Product Manager',
      emoji: '📋',
      template: 'product-manager.md'
    }
  ];

  console.log(`\n${colors.bright}Creating agent workspaces:${colors.reset}\n`);

  const templatesDir = path.join(__dirname, '..', 'templates', 'agents');
  
  for (const agent of standardAgents) {
    const agentDir = path.join(agentsDir, agent.label);
    
    // Create agent workspace directory
    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }

    // Create memory subdirectory
    const memoryDir = path.join(agentDir, 'memory');
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }

    // Copy agent template to AGENTS.md
    const templatePath = path.join(templatesDir, agent.template);
    const agentsPath = path.join(agentDir, 'AGENTS.md');
    
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, agentsPath);
    }

    // Create empty MEMORY.md
    const memoryPath = path.join(agentDir, 'MEMORY.md');
    if (!fs.existsSync(memoryPath)) {
      fs.writeFileSync(memoryPath, `# ${agent.name} - Long-Term Memory\n\nAgent-specific context and knowledge will be recorded here.\n`);
    }

    // Create agent identity file
    const identityPath = path.join(agentDir, 'IDENTITY.md');
    if (!fs.existsSync(identityPath)) {
      fs.writeFileSync(identityPath, `# IDENTITY.md\n\n- **Name:** ${agent.name}\n- **Label:** ${agent.label}\n- **Emoji:** ${agent.emoji}\n`);
    }

    success(`${agent.emoji} ${agent.name} (${agent.label})`);
  }

  // Copy routing rules to main workspace
  const routingRulesTemplate = path.join(__dirname, '..', 'templates', 'routing-rules.json');
  const routingRulesTarget = path.join(openclawWorkspace, 'routing-rules.json');
  
  if (fs.existsSync(routingRulesTemplate)) {
    fs.copyFileSync(routingRulesTemplate, routingRulesTarget);
    success('Routing rules configured');
  }

  // Create shared knowledge directory
  const sharedDir = path.join(agentsDir, 'shared');
  if (!fs.existsSync(sharedDir)) {
    fs.mkdirSync(sharedDir, { recursive: true });
    
    // Create a sample shared knowledge file
    const sharedReadme = path.join(sharedDir, 'README.md');
    fs.writeFileSync(sharedReadme, `# Shared Agent Knowledge\n\nThis directory contains knowledge that all agents can access:\n\n- Product specifications\n- API credentials and configuration\n- Coding standards and conventions\n- Brand guidelines\n- Common workflows\n\nAgents will read files from here in addition to their own memory.\n`);
    
    info('Created shared knowledge directory');
  }

  console.log(`\n${colors.green}✓ Agent workspaces created!${colors.reset}\n`);
  console.log(`${colors.bright}Location:${colors.reset} ${agentsDir}\n`);
  
  // Update main AGENTS.md with router logic
  const mainAgentsPath = path.join(openclawWorkspace, 'AGENTS.md');
  if (fs.existsSync(mainAgentsPath)) {
    let mainAgents = fs.readFileSync(mainAgentsPath, 'utf-8');
    
    // Check if router logic already exists
    if (!mainAgents.includes('## Message Routing')) {
      // Insert router logic before "## Communication" or at the end
      const routerLogic = `
## Message Routing (Main Session Only)

If you are the **main session** and receive a message, check if it should be routed to a specialized agent:

1. **Load routing rules:** Read \`routing-rules.json\` from workspace root
2. **Analyze the message:**
   - What channel is it from?
   - What keywords does it contain?
   - What's the topic/intent?
3. **Match against rules:** Check rules in priority order
4. **Route if matched:**
   - Check if target agent session exists: \`sessions_list\`
   - If exists: \`sessions_send({ label: agent-label, message })\`
   - If new: \`sessions_spawn({ task: message, label: agent-label, model: rule.model })\`
   - Reply in channel: "👀 routing to [agent name]..."
5. **Monitor and report:**
   - Check agent progress periodically
   - When agent completes, report results back to original channel
6. **Fallback:** If no rule matches, handle the message yourself

**Example flow:**
\`\`\`
Message in #dev: "Fix the CRM pricing bug"
→ Matches "Lead Developer" rule (keywords: fix, bug, CRM)
→ Spawn/route to lead-developer agent
→ Reply: "👀 routing to Lead Developer..."
→ Monitor until complete
→ Reply when done: "✓ Lead Developer finished: [summary]"
\`\`\`

`;
      
      if (mainAgents.includes('## Communication')) {
        mainAgents = mainAgents.replace('## Communication', routerLogic + '## Communication');
      } else {
        mainAgents += '\n' + routerLogic;
      }
      
      fs.writeFileSync(mainAgentsPath, mainAgents);
      success('Updated main AGENTS.md with router logic');
    } else {
      info('Router logic already in main AGENTS.md');
    }
  }
  
  console.log(`\n${colors.bright}Next steps:${colors.reset}`);
  console.log(`  • Agents will automatically route messages based on keywords and channels`);
  console.log(`  • Customize routing rules in: ${colors.cyan}${routingRulesTarget}${colors.reset}`);
  console.log(`  • Add custom agents via the SuperClaw dashboard\n`);
}

module.exports = { setupAgents };
