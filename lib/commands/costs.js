const fs = require('fs');
const path = require('path');
const { colors, success, warn, error, info } = require('../utils');

// Token cost estimates (approximate, varies by provider)
const TOKEN_COSTS = {
  'gpt-4': { input: 0.03, output: 0.06 }, // per 1k tokens
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3.5-sonnet': { input: 0.003, output: 0.015 }
};

function run(args) {
  console.log(`${colors.cyan}💰 Token Usage & Cost Optimization${colors.reset}\n`);
  
  const workspaceDir = findWorkspace();
  if (!workspaceDir) {
    error('No Superclaw workspace found.');
    console.log('Run \'superclaw init\' to create a workspace first.\n');
    return;
  }

  if (args[0] === 'estimate') {
    estimateCosts(workspaceDir);
  } else if (args[0] === 'optimize') {
    showOptimizationTips();
  } else if (args[0] === 'models') {
    compareModels();
  } else {
    showCostOverview(workspaceDir);
  }
}

function showCostOverview(workspaceDir) {
  console.log(`${colors.bright}💡 Cost Analysis & Optimization Tips${colors.reset}\n`);
  
  // Analyze workspace for cost factors
  analyzeCostFactors(workspaceDir);
  
  console.log(`${colors.bright}📊 Model Comparison${colors.reset}`);
  compareModels();
  
  console.log(`\n${colors.bright}💡 Optimization Strategies${colors.reset}`);
  showOptimizationTips();
  
  console.log(`\n${colors.bright}📈 Usage Commands${colors.reset}`);
  console.log('  superclaw costs estimate    Estimate costs for your setup');
  console.log('  superclaw costs optimize    Show optimization strategies');
  console.log('  superclaw costs models      Compare model costs\n');
}

function analyzeCostFactors(workspaceDir) {
  console.log(`${colors.bright}Cost Factors in Your Workspace${colors.reset}\n`);
  
  let totalTokens = 0;
  let factorCount = 0;
  
  // Check memory files (each file contributes to context)
  const memoryDir = path.join(workspaceDir, 'memory');
  if (fs.existsSync(memoryDir)) {
    const memoryFiles = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
    let memoryTokens = 0;
    
    memoryFiles.forEach(file => {
      const filePath = path.join(memoryDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const tokens = estimateTokens(content);
      memoryTokens += tokens;
    });
    
    console.log(`  ${colors.yellow}📝${colors.reset} Daily memory files: ${memoryFiles.length} files (~${memoryTokens} tokens)`);
    totalTokens += memoryTokens;
    factorCount++;
  }
  
  // Check main workspace files
  const workspaceFiles = ['SOUL.md', 'USER.md', 'AGENTS.md', 'MEMORY.md'];
  let workspaceTokens = 0;
  
  workspaceFiles.forEach(file => {
    const filePath = path.join(workspaceDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const tokens = estimateTokens(content);
      workspaceTokens += tokens;
      console.log(`  ${colors.green}📄${colors.reset} ${file}: ~${tokens} tokens`);
    }
  });
  
  totalTokens += workspaceTokens;
  factorCount++;
  
  // Check installed modules
  const modulesDir = path.join(workspaceDir, 'modules');
  if (fs.existsSync(modulesDir)) {
    const moduleNames = fs.readdirSync(modulesDir).filter(f => {
      const modulePath = path.join(modulesDir, f);
      return fs.statSync(modulePath).isDirectory();
    });
    
    console.log(`  ${colors.blue}📦${colors.reset} Installed modules: ${moduleNames.length} modules`);
    if (moduleNames.length > 0) {
      console.log(`    ${colors.dim}Each module adds ~500-2000 tokens to context${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.bright}Estimated Context Size:${colors.reset} ~${totalTokens.toLocaleString()} tokens per session\n`);
  
  // Estimate daily cost based on context
  const dailyCost = estimateDailyCost(totalTokens);
  if (dailyCost > 0) {
    console.log(`${colors.yellow}Estimated daily cost: $${dailyCost.toFixed(3)}${colors.reset}`);
    console.log(`${colors.yellow}Monthly estimate: $${(dailyCost * 30).toFixed(2)}${colors.reset}\n`);
  }
}

function estimateTokens(text) {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

function estimateDailyCost(contextTokens) {
  // Assume moderate usage: 20 interactions per day, avg 100 tokens output each
  const interactions = 20;
  const avgOutputTokens = 100;
  const totalInput = contextTokens * interactions;
  const totalOutput = avgOutputTokens * interactions;
  
  // Use Claude 3.5 Sonnet as default model
  const costs = TOKEN_COSTS['claude-3.5-sonnet'];
  const inputCost = (totalInput / 1000) * costs.input;
  const outputCost = (totalOutput / 1000) * costs.output;
  
  return inputCost + outputCost;
}

function compareModels() {
  const models = [
    { name: 'Claude 3.5 Sonnet', key: 'claude-3.5-sonnet', quality: '⭐⭐⭐⭐⭐', speed: '⭐⭐⭐⭐' },
    { name: 'Claude 3 Sonnet', key: 'claude-3-sonnet', quality: '⭐⭐⭐⭐', speed: '⭐⭐⭐⭐' },
    { name: 'Claude 3 Haiku', key: 'claude-3-haiku', quality: '⭐⭐⭐', speed: '⭐⭐⭐⭐⭐' },
    { name: 'Claude 3 Opus', key: 'claude-3-opus', quality: '⭐⭐⭐⭐⭐', speed: '⭐⭐' },
    { name: 'GPT-4', key: 'gpt-4', quality: '⭐⭐⭐⭐⭐', speed: '⭐⭐' },
    { name: 'GPT-4 Turbo', key: 'gpt-4-turbo', quality: '⭐⭐⭐⭐⭐', speed: '⭐⭐⭐' },
    { name: 'GPT-3.5 Turbo', key: 'gpt-3.5-turbo', quality: '⭐⭐⭐', speed: '⭐⭐⭐⭐⭐' }
  ];
  
  console.log(`${'Model'.padEnd(20)} ${'Input ($/1K)'.padEnd(12)} ${'Output ($/1K)'.padEnd(13)} ${'Quality'.padEnd(10)} Speed`);
  console.log('─'.repeat(70));
  
  models.forEach(model => {
    const costs = TOKEN_COSTS[model.key];
    const inputCost = costs.input.toFixed(4);
    const outputCost = costs.output.toFixed(4);
    
    console.log(`${model.name.padEnd(20)} ${('$' + inputCost).padEnd(12)} ${('$' + outputCost).padEnd(13)} ${model.quality.padEnd(10)} ${model.speed}`);
  });
  
  console.log('');
}

function showOptimizationTips() {
  const tips = [
    {
      title: 'Choose the Right Model',
      description: 'Use cheaper models for simple tasks, premium models for complex reasoning',
      savings: 'High',
      examples: [
        'Haiku for quick questions, data extraction',
        'Sonnet for general tasks, coding help', 
        'Opus only for complex analysis, creative work'
      ]
    },
    {
      title: 'Optimize Memory Retention',
      description: 'Reduce how long daily memory files are kept',
      savings: 'Medium',
      examples: [
        'Set retention to 30 days instead of 90',
        'Enable auto-archiving for old files',
        'Clean up redundant or low-value entries'
      ]
    },
    {
      title: 'Streamline Context Files',
      description: 'Keep SOUL.md and USER.md concise and focused',
      savings: 'Medium',
      examples: [
        'Remove unnecessary details from personality',
        'Focus USER.md on current relevant info',
        'Use bullet points instead of long paragraphs'
      ]
    },
    {
      title: 'Smart Module Management',
      description: 'Only install modules you actively use',
      savings: 'Medium',
      examples: [
        'Disable unused modules',
        'Remove modules you no longer need',
        'Use lightweight alternatives when possible'
      ]
    },
    {
      title: 'Efficient Prompting',
      description: 'Be specific and concise in your requests',
      savings: 'Low-Medium',
      examples: [
        'Ask direct questions instead of open-ended',
        'Provide context upfront to avoid back-and-forth',
        'Use bullet points for complex requests'
      ]
    },
    {
      title: 'Batch Similar Tasks',
      description: 'Group related tasks in single conversations',
      savings: 'Low',
      examples: [
        'Review multiple files in one session',
        'Ask related questions together',
        'Plan daily tasks in one conversation'
      ]
    }
  ];
  
  tips.forEach((tip, index) => {
    const savingsColor = tip.savings === 'High' ? colors.green : 
                         tip.savings === 'Medium' ? colors.yellow : colors.blue;
    
    console.log(`${colors.bright}${index + 1}. ${tip.title}${colors.reset} ${savingsColor}[${tip.savings} savings]${colors.reset}`);
    console.log(`   ${tip.description}\n`);
    
    tip.examples.forEach(example => {
      console.log(`   ${colors.dim}• ${example}${colors.reset}`);
    });
    console.log('');
  });
  
  console.log(`${colors.cyan}💡 Pro Tip:${colors.reset} Monitor your usage patterns and adjust based on actual needs.`);
  console.log(`${colors.dim}Most users spend $5-20/month with moderate usage.${colors.reset}`);
}

function estimateCosts(workspaceDir) {
  console.log(`${colors.cyan}📊 Cost Estimation${colors.reset}\n`);
  
  // Get workspace context size
  let contextTokens = 0;
  
  // Count tokens from workspace files
  const workspaceFiles = ['SOUL.md', 'USER.md', 'AGENTS.md', 'MEMORY.md'];
  workspaceFiles.forEach(file => {
    const filePath = path.join(workspaceDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      contextTokens += estimateTokens(content);
    }
  });
  
  // Count memory files
  const memoryDir = path.join(workspaceDir, 'memory');
  if (fs.existsSync(memoryDir)) {
    const memoryFiles = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
    memoryFiles.forEach(file => {
      const filePath = path.join(memoryDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      contextTokens += estimateTokens(content);
    });
  }
  
  console.log(`${colors.bright}Current Context Size:${colors.reset} ~${contextTokens.toLocaleString()} tokens\n`);
  
  // Usage scenarios
  const scenarios = [
    { name: 'Light usage', interactions: 5, outputTokens: 50 },
    { name: 'Moderate usage', interactions: 20, outputTokens: 100 },
    { name: 'Heavy usage', interactions: 50, outputTokens: 150 },
    { name: 'Power user', interactions: 100, outputTokens: 200 }
  ];
  
  console.log(`${'Scenario'.padEnd(15)} ${'Interactions'.padEnd(13)} ${'Daily Cost'.padEnd(12)} Monthly`);
  console.log('─'.repeat(50));
  
  scenarios.forEach(scenario => {
    const dailyCost = calculateDailyCost(contextTokens, scenario.interactions, scenario.outputTokens);
    const monthlyCost = dailyCost * 30;
    
    console.log(
      `${scenario.name.padEnd(15)} ${(scenario.interactions + '/day').padEnd(13)} ${('$' + dailyCost.toFixed(3)).padEnd(12)} $${monthlyCost.toFixed(2)}`
    );
  });
  
  console.log(`\n${colors.dim}Estimates based on Claude 3.5 Sonnet pricing${colors.reset}`);
  console.log(`${colors.dim}Actual costs may vary based on model choice and usage patterns${colors.reset}\n`);
  
  // Show cost breakdown
  console.log(`${colors.bright}Cost Breakdown (Moderate Usage):${colors.reset}`);
  const moderateCost = calculateDailyCost(contextTokens, 20, 100);
  const inputCost = (contextTokens * 20 / 1000) * TOKEN_COSTS['claude-3.5-sonnet'].input;
  const outputCost = (100 * 20 / 1000) * TOKEN_COSTS['claude-3.5-sonnet'].output;
  
  console.log(`  Context (input): $${inputCost.toFixed(3)} (${((inputCost / moderateCost) * 100).toFixed(1)}%)`);
  console.log(`  Responses (output): $${outputCost.toFixed(3)} (${((outputCost / moderateCost) * 100).toFixed(1)}%)`);
  console.log(`  Total: $${moderateCost.toFixed(3)}\n`);
}

function calculateDailyCost(contextTokens, interactions, outputTokens) {
  const totalInput = contextTokens * interactions;
  const totalOutput = outputTokens * interactions;
  
  const costs = TOKEN_COSTS['claude-3.5-sonnet'];
  const inputCost = (totalInput / 1000) * costs.input;
  const outputCost = (totalOutput / 1000) * costs.output;
  
  return inputCost + outputCost;
}

function findWorkspace() {
  const possiblePaths = [
    './superclaw-workspace',
    '../superclaw-workspace',
    process.cwd(),
    path.join(process.env.HOME || process.env.USERPROFILE || '.', 'superclaw-workspace')
  ];

  for (const dir of possiblePaths) {
    if (fs.existsSync(path.join(dir, 'superclaw-config.json'))) {
      return dir;
    }
  }

  return null;
}

module.exports = { run };