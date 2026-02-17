const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { colors, success, warn, error, info } = require('../utils');

/**
 * Interactive agent setup
 * Discovers repos and configures agent assignments
 */
async function run(args) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (question) => new Promise((resolve) => {
    rl.question(question, resolve);
  });

  console.log(`\n${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     SuperClaw Agent Configuration    ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`);

  try {
    // Get OpenClaw workspace
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const openclawWorkspace = process.env.OPENCLAW_WORKSPACE || path.join(homeDir, '.openclaw', 'workspace');
    
    if (!fs.existsSync(openclawWorkspace)) {
      error('OpenClaw workspace not found. Install OpenClaw first.');
      process.exit(1);
    }

    const agentsDir = path.join(openclawWorkspace, 'agents');
    if (!fs.existsSync(agentsDir)) {
      fs.mkdirSync(agentsDir, { recursive: true });
    }

    // Step 1: Discover repositories
    console.log(`${colors.bright}Step 1: Repository Discovery${colors.reset}\n`);
    
    const reposPath = await ask('Path to your repositories (e.g., ~/projects, /home/user/apps/websites): ');
    const resolvedReposPath = path.resolve(reposPath.replace(/^~/, homeDir));
    
    if (!fs.existsSync(resolvedReposPath)) {
      error(`Directory not found: ${resolvedReposPath}`);
      process.exit(1);
    }

    info(`Scanning ${resolvedReposPath} for git repositories...`);
    
    const repos = [];
    const items = fs.readdirSync(resolvedReposPath);
    
    for (const item of items) {
      const itemPath = path.join(resolvedReposPath, item);
      const gitPath = path.join(itemPath, '.git');
      
      if (fs.existsSync(gitPath) && fs.statSync(itemPath).isDirectory()) {
        try {
          const remote = execSync('git remote get-url origin', { 
            cwd: itemPath, 
            encoding: 'utf-8' 
          }).trim();
          
          repos.push({
            name: item,
            path: itemPath,
            remote: remote
          });
        } catch (e) {
          // No remote or git error, skip
        }
      }
    }

    if (repos.length === 0) {
      warn('No git repositories found.');
      const continueAnyway = await ask('Continue without repos? [y/N]: ');
      if (!continueAnyway.toLowerCase().startsWith('y')) {
        process.exit(0);
      }
    } else {
      success(`Found ${repos.length} repositories`);
      repos.forEach((repo, i) => {
        console.log(`  ${i + 1}. ${repo.name}`);
      });
    }

    // Step 2: Choose agent types
    console.log(`\n${colors.bright}Step 2: Agent Selection${colors.reset}\n`);
    console.log('Available agent types:');
    console.log('  1. Standard Agents (recommended for most users)');
    console.log('     - Lead Developer, Designer, Marketing, Support, Product Manager');
    console.log('  2. Add Specialized Agents (for advanced workflows)');
    console.log('     - MarTech Engineer, CRM Engineer, SEO Specialist\n');
    
    const agentChoice = await ask('Which agents do you want? [1/2/both]: ');
    
    const createStandard = agentChoice === '1' || agentChoice.toLowerCase() === 'both';
    const createSpecialized = agentChoice === '2' || agentChoice.toLowerCase() === 'both';

    const agentsToCreate = [];

    if (createStandard) {
      agentsToCreate.push(
        { label: 'lead-developer', name: 'Lead Developer', emoji: '🛠️', template: 'lead-developer.md', repos: 'all' },
        { label: 'lead-designer', name: 'Lead Designer', emoji: '🎨', template: 'lead-designer.md', repos: 'all' },
        { label: 'marketing-lead', name: 'Marketing Lead', emoji: '📈', template: 'marketing-lead.md', repos: [] },
        { label: 'support-lead', name: 'Support Lead', emoji: '💬', template: 'support-lead.md', repos: [] },
        { label: 'product-manager', name: 'Product Manager', emoji: '📋', template: 'product-manager.md', repos: [] }
      );
    }

    if (createSpecialized && repos.length > 0) {
      console.log(`\n${colors.bright}Specialized Agent Configuration${colors.reset}\n`);
      
      // MarTech Engineer
      console.log('MarTech Engineer - Marketing site engineering');
      const martechRepos = await selectRepos('Which repos should MarTech Engineer access?', repos, ask);
      if (martechRepos.length > 0) {
        agentsToCreate.push({
          label: 'martech-engineer',
          name: 'MarTech Engineer',
          emoji: '🔧',
          template: 'martech-engineer.md',
          repos: martechRepos,
          branchPrefix: 'martech'
        });
      }

      // CRM Engineer
      console.log('\nCRM Engineer - WordPress plugin development');
      const crmRepos = await selectRepos('Which repos should CRM Engineer access?', repos, ask);
      if (crmRepos.length > 0) {
        agentsToCreate.push({
          label: 'crm-engineer',
          name: 'CRM Engineer',
          emoji: '💼',
          template: 'crm-engineer.md',
          repos: crmRepos,
          branchPrefix: 'crm'
        });
      }

      // SEO Specialist
      console.log('\nSEO Specialist - SEO optimization and content');
      const seoRepos = await selectRepos('Which repos should SEO Specialist access?', repos, ask);
      if (seoRepos.length > 0) {
        agentsToCreate.push({
          label: 'seo-specialist',
          name: 'SEO Specialist',
          emoji: '🔍',
          template: 'seo-specialist.md',
          repos: seoRepos,
          branchPrefix: 'seo'
        });
      }
    }

    // Step 3: Sandbox configuration
    console.log(`\n${colors.bright}Step 3: Sandbox Configuration${colors.reset}\n`);
    
    let volumePath = '/tmp/agent-sandboxes';
    const hasVolume = await ask('Do you have a dedicated volume for sandboxes? [y/N]: ');
    
    if (hasVolume.toLowerCase().startsWith('y')) {
      let validPath = false;
      
      while (!validPath) {
        const customPath = await ask('Volume mount path (e.g., /mnt/volume): ');
        volumePath = path.join(customPath, 'agent-sandboxes');
        
        // Check if path exists and has contents
        if (fs.existsSync(volumePath)) {
          const contents = fs.readdirSync(volumePath);
          
          if (contents.length > 0) {
            warn(`Directory ${volumePath} is not empty (${contents.length} items found)`);
            const confirm = await ask('Remove all contents and use this directory? [y/N]: ');
            
            if (confirm.toLowerCase().startsWith('y')) {
              // Remove contents
              info('Removing existing contents...');
              for (const item of contents) {
                const itemPath = path.join(volumePath, item);
                try {
                  if (fs.statSync(itemPath).isDirectory()) {
                    fs.rmSync(itemPath, { recursive: true, force: true });
                  } else {
                    fs.unlinkSync(itemPath);
                  }
                } catch (e) {
                  error(`Failed to remove ${item}: ${e.message}`);
                }
              }
              success('Directory cleared');
              validPath = true;
            } else {
              warn('Please choose a different path');
              // Loop continues to ask for new path
            }
          } else {
            // Directory exists but is empty - perfect!
            validPath = true;
          }
        } else {
          // Directory doesn't exist - we'll create it
          validPath = true;
        }
      }
    }

    // Step 4: Create agent workspaces
    console.log(`\n${colors.bright}Step 4: Creating Agent Workspaces${colors.reset}\n`);

    const templatesDir = path.resolve(__dirname, '..', 'templates', 'agents');
    
    if (!fs.existsSync(templatesDir)) {
      error(`Templates directory not found at: ${templatesDir}`);
      throw new Error('Templates directory missing. Reinstall SuperClaw CLI.');
    }
    const agentConfig = {
      version: '1.0',
      volumePath,
      maxConcurrentSandboxes: 10,
      maxSandboxSizeGB: 1,
      agents: {},
      sandboxScripts: {
        create: 'scripts/create-agent-sandbox.sh',
        cleanup: 'scripts/cleanup-agent-sandbox.sh',
        monitor: 'scripts/monitor-agent-sandboxes.sh'
      }
    };

    for (const agent of agentsToCreate) {
      const agentDir = path.join(agentsDir, agent.label);
      const memoryDir = path.join(agentDir, 'memory');
      
      // Create directories
      if (!fs.existsSync(agentDir)) {
        fs.mkdirSync(agentDir, { recursive: true });
      }
      if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(memoryDir, { recursive: true });
      }

      // Copy template if exists
      const templatePath = path.join(templatesDir, agent.template);
      const agentsPath = path.join(agentDir, 'AGENTS.md');
      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, agentsPath);
      }

      // Create IDENTITY.md
      const identityPath = path.join(agentDir, 'IDENTITY.md');
      fs.writeFileSync(identityPath, `# IDENTITY.md\n\n- **Name:** ${agent.name}\n- **Label:** ${agent.label}\n- **Emoji:** ${agent.emoji}\n`);

      // Create MEMORY.md
      const memoryPath = path.join(agentDir, 'MEMORY.md');
      if (!fs.existsSync(memoryPath)) {
        fs.writeFileSync(memoryPath, `# ${agent.name} - Long-Term Memory\n\nAgent-specific context and knowledge will be recorded here.\n`);
      }

      // Add to config
      if (agent.repos === 'all') {
        agentConfig.agents[agent.label] = {
          name: agent.name,
          emoji: agent.emoji,
          repositories: 'all'
        };
      } else if (Array.isArray(agent.repos) && agent.repos.length > 0) {
        agentConfig.agents[agent.label] = {
          name: agent.name,
          emoji: agent.emoji,
          repositories: agent.repos.map(repo => ({
            name: repo.name,
            path: repo.path,
            remote: repo.remote,
            branchPrefix: agent.branchPrefix || agent.label
          }))
        };
      } else {
        agentConfig.agents[agent.label] = {
          name: agent.name,
          emoji: agent.emoji,
          repositories: []
        };
      }

      success(`${agent.emoji} ${agent.name}`);
    }

    // Save agent config
    const configPath = path.join(openclawWorkspace, 'agent-repo-config.json');
    fs.writeFileSync(configPath, JSON.stringify(agentConfig, null, 2));
    success('Agent configuration saved');

    // Copy routing rules if exists
    const routingTemplate = path.resolve(__dirname, '..', 'templates', 'routing-rules.json');
    const routingTarget = path.join(openclawWorkspace, 'routing-rules.json');
    if (fs.existsSync(routingTemplate) && !fs.existsSync(routingTarget)) {
      fs.copyFileSync(routingTemplate, routingTarget);
      success('Routing rules configured');
    }

    // Copy sandbox scripts
    const scriptsDir = path.join(openclawWorkspace, 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true});
    }

    const scriptTemplates = path.resolve(__dirname, '..', '..', '..', 'clawd', 'scripts');
    if (fs.existsSync(scriptTemplates)) {
      ['create-agent-sandbox.sh', 'cleanup-agent-sandbox.sh', 'monitor-agent-sandboxes.sh'].forEach(script => {
        const src = path.join(scriptTemplates, script);
        const dest = path.join(scriptsDir, script);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          fs.chmodSync(dest, '755');
        }
      });
      success('Sandbox scripts installed');
    }

    console.log(`\n${colors.green}✓ Agent setup complete!${colors.reset}\n`);
    console.log(`${colors.bright}Created:${colors.reset}`);
    console.log(`  • ${agentsToCreate.length} agent workspace(s)`);
    console.log(`  • Agent configuration: ${configPath}`);
    console.log(`  • Sandbox volume: ${volumePath}\n`);

  } catch (err) {
    error('Setup failed: ' + err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function selectRepos(prompt, repos, ask) {
  console.log(`\n${prompt}`);
  repos.forEach((repo, i) => {
    console.log(`  ${i + 1}. ${repo.name}`);
  });
  console.log('  0. None / Skip\n');
  
  const answer = await ask('Enter numbers separated by commas (e.g., 1,3,5): ');
  
  if (answer.trim() === '0' || answer.trim() === '') {
    return [];
  }

  const indices = answer.split(',').map(n => parseInt(n.trim()) - 1);
  return indices
    .filter(i => i >= 0 && i < repos.length)
    .map(i => repos[i]);
}

module.exports = { run };
