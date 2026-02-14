const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { colors, success, warn, error, info } = require('../utils');

function run(args) {
  console.log(`${colors.cyan}🧠 Memory System Setup${colors.reset}\n`);
  console.log('Configure how your AI handles memory and context.\n');
  
  const workspaceDir = findWorkspace();
  if (!workspaceDir) {
    error('No Superclaw workspace found.');
    console.log('Run \'superclaw init\' to create a workspace first.\n');
    return;
  }

  if (args[0] === 'clean') {
    cleanMemory(workspaceDir);
  } else if (args[0] === 'backup') {
    backupMemory(workspaceDir);
  } else if (args[0] === 'stats') {
    showMemoryStats(workspaceDir);
  } else {
    setupMemorySystem(workspaceDir);
  }
}

async function setupMemorySystem(workspaceDir) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (question) => new Promise((resolve) => {
    rl.question(question, resolve);
  });

  try {
    console.log(`${colors.bright}Memory System Options:${colors.reset}\n`);
    console.log('1. Configure retention settings');
    console.log('2. Set up automatic cleanup');
    console.log('3. Export/backup memory');
    console.log('4. View memory statistics');
    console.log('5. Reset memory system');
    console.log('0. Exit\n');

    const choice = await ask('Choose an option [0-5]: ');

    switch (choice) {
      case '1':
        await configureRetention(workspaceDir, ask);
        break;
      case '2':
        await setupAutoCleanup(workspaceDir, ask);
        break;
      case '3':
        await exportMemory(workspaceDir, ask);
        break;
      case '4':
        showMemoryStats(workspaceDir);
        break;
      case '5':
        await resetMemorySystem(workspaceDir, ask);
        break;
      case '0':
        console.log('Memory setup cancelled.\n');
        break;
      default:
        error('Invalid choice.');
    }

  } catch (err) {
    error('Memory setup failed: ' + err.message);
  } finally {
    rl.close();
  }
}

async function configureRetention(workspaceDir, ask) {
  console.log(`\n${colors.cyan}Memory Retention Settings${colors.reset}\n`);
  
  const configPath = path.join(workspaceDir, 'superclaw-config.json');
  let config = {};
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  if (!config.memory) {
    config.memory = {};
  }

  console.log('How long should daily memory files be kept?');
  console.log('1. 30 days (recommended)');
  console.log('2. 90 days');
  console.log('3. 1 year');  
  console.log('4. Forever');
  console.log('5. Custom\n');

  const retentionChoice = await ask('Choose retention period [1-5]: ');
  let retentionDays;

  switch (retentionChoice) {
    case '1':
      retentionDays = 30;
      break;
    case '2':
      retentionDays = 90;
      break;
    case '3':
      retentionDays = 365;
      break;
    case '4':
      retentionDays = -1; // Forever
      break;
    case '5':
      const customDays = await ask('Enter number of days (0 for forever): ');
      retentionDays = parseInt(customDays) || 30;
      if (retentionDays === 0) retentionDays = -1;
      break;
    default:
      retentionDays = 30;
  }

  const autoArchive = await ask('Auto-archive old files instead of deleting? [Y/n]: ');
  const compressArchives = await ask('Compress archived files? [Y/n]: ');

  config.memory.retentionDays = retentionDays;
  config.memory.autoArchive = !autoArchive.toLowerCase().startsWith('n');
  config.memory.compressArchives = !compressArchives.toLowerCase().startsWith('n');

  // Create memory directory if it doesn't exist
  const memoryDir = path.join(workspaceDir, 'memory');
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }

  // Create archive directory if auto-archive is enabled
  if (config.memory.autoArchive) {
    const archiveDir = path.join(workspaceDir, 'memory', 'archive');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  success('Memory retention settings saved!');

  const retentionText = retentionDays === -1 ? 'Forever' : `${retentionDays} days`;
  console.log(`\n${colors.cyan}Settings:${colors.reset}`);
  console.log(`Retention: ${retentionText}`);
  console.log(`Auto-archive: ${config.memory.autoArchive ? 'Yes' : 'No'}`);
  console.log(`Compress: ${config.memory.compressArchives ? 'Yes' : 'No'}`);
}

async function setupAutoCleanup(workspaceDir, ask) {
  console.log(`\n${colors.cyan}Automatic Cleanup${colors.reset}\n`);
  
  warn('Automatic cleanup requires a cron job or scheduled task.');
  console.log('This will create a cleanup script you can run periodically.\n');

  const enableCleanup = await ask('Enable automatic memory cleanup? [y/N]: ');
  if (!enableCleanup.toLowerCase().startsWith('y')) {
    return;
  }

  const cleanupScript = generateCleanupScript(workspaceDir);
  const scriptPath = path.join(workspaceDir, 'cleanup-memory.sh');
  
  fs.writeFileSync(scriptPath, cleanupScript, { mode: 0o755 });
  success(`Cleanup script created: ${scriptPath}`);

  console.log(`\n${colors.yellow}To enable automatic cleanup:${colors.reset}`);
  console.log(`1. Make the script executable: chmod +x ${scriptPath}`);
  console.log(`2. Add to crontab (daily): 0 2 * * * ${scriptPath}`);
  console.log(`3. Or run manually when needed\n`);

  info('The script respects your retention settings from superclaw-config.json');
}

async function exportMemory(workspaceDir, ask) {
  console.log(`\n${colors.cyan}Memory Export/Backup${colors.reset}\n`);

  const timestamp = new Date().toISOString().slice(0, 10);
  const defaultBackup = path.join(workspaceDir, `memory-backup-${timestamp}.tar.gz`);
  
  const backupPath = await ask(`Backup file path [${defaultBackup}]: `) || defaultBackup;
  const includeArchive = await ask('Include archived files? [y/N]: ');

  try {
    const { execSync } = require('child_process');
    const memoryDir = path.join(workspaceDir, 'memory');
    
    if (!fs.existsSync(memoryDir)) {
      error('Memory directory not found.');
      return;
    }

    let tarCommand = `tar -czf "${backupPath}" -C "${workspaceDir}" memory`;
    
    if (!includeArchive.toLowerCase().startsWith('y')) {
      tarCommand += ' --exclude="memory/archive"';
    }

    execSync(tarCommand);
    success(`Memory backup created: ${backupPath}`);

    const stats = fs.statSync(backupPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    info(`Backup size: ${sizeMB} MB`);

  } catch (err) {
    error('Backup failed: ' + err.message);
  }
}

function showMemoryStats(workspaceDir) {
  console.log(`\n${colors.cyan}Memory Statistics${colors.reset}\n`);

  const memoryDir = path.join(workspaceDir, 'memory');
  
  if (!fs.existsSync(memoryDir)) {
    warn('Memory directory not found.');
    return;
  }

  const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
  const archiveDir = path.join(memoryDir, 'archive');
  let archivedFiles = 0;
  
  if (fs.existsSync(archiveDir)) {
    archivedFiles = fs.readdirSync(archiveDir).filter(f => f.endsWith('.md') || f.endsWith('.gz')).length;
  }

  // Calculate total size
  let totalSize = 0;
  const fileSizes = [];
  
  for (const file of files) {
    const filePath = path.join(memoryDir, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
    fileSizes.push({ name: file, size: stats.size, date: stats.mtime });
  }

  // Find oldest and newest
  fileSizes.sort((a, b) => a.date - b.date);
  const oldest = fileSizes[0];
  const newest = fileSizes[fileSizes.length - 1];

  console.log(`${colors.bright}Current Memory:${colors.reset}`);
  console.log(`Daily files: ${files.length}`);
  console.log(`Archived files: ${archivedFiles}`);
  console.log(`Total size: ${(totalSize / 1024).toFixed(2)} KB`);
  
  if (oldest && newest) {
    console.log(`Date range: ${oldest.date.toISOString().slice(0, 10)} to ${newest.date.toISOString().slice(0, 10)}`);
  }

  // Check for MEMORY.md
  const longTermMemory = path.join(workspaceDir, 'MEMORY.md');
  if (fs.existsSync(longTermMemory)) {
    const memStats = fs.statSync(longTermMemory);
    console.log(`\n${colors.bright}Long-term Memory:${colors.reset}`);
    console.log(`Size: ${(memStats.size / 1024).toFixed(2)} KB`);
    console.log(`Last updated: ${memStats.mtime.toISOString().slice(0, 10)}`);
  }

  // Load config to show settings
  const configPath = path.join(workspaceDir, 'superclaw-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.memory) {
      console.log(`\n${colors.bright}Settings:${colors.reset}`);
      const retention = config.memory.retentionDays === -1 ? 'Forever' : `${config.memory.retentionDays} days`;
      console.log(`Retention: ${retention}`);
      console.log(`Auto-archive: ${config.memory.autoArchive ? 'Yes' : 'No'}`);
    }
  }

  console.log('');
}

async function resetMemorySystem(workspaceDir, ask) {
  console.log(`\n${colors.red}Reset Memory System${colors.reset}\n`);
  warn('This will delete all memory files except MEMORY.md');
  
  const confirm = await ask('Are you sure? Type "yes" to confirm: ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Reset cancelled.\n');
    return;
  }

  const memoryDir = path.join(workspaceDir, 'memory');
  
  if (fs.existsSync(memoryDir)) {
    const files = fs.readdirSync(memoryDir);
    let deletedCount = 0;
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        fs.unlinkSync(path.join(memoryDir, file));
        deletedCount++;
      }
    }
    
    // Remove archive directory if it exists
    const archiveDir = path.join(memoryDir, 'archive');
    if (fs.existsSync(archiveDir)) {
      fs.rmSync(archiveDir, { recursive: true, force: true });
    }
    
    success(`Deleted ${deletedCount} memory files`);
  }

  // Create a new daily memory file
  const today = new Date().toISOString().slice(0, 10);
  const initialContent = `# Memory Log - ${today}\n\n## Reset\n\n- Memory system was reset\n- Starting fresh\n\n## Notes\n\n*Daily events and context go here*\n`;
  
  fs.writeFileSync(path.join(memoryDir, `${today}.md`), initialContent);
  success('Created new daily memory file');

  console.log('');
}

function generateCleanupScript(workspaceDir) {
  return `#!/bin/bash

# Superclaw Memory Cleanup Script
# Generated by superclaw memory command

WORKSPACE_DIR="${workspaceDir}"
CONFIG_FILE="$WORKSPACE_DIR/superclaw-config.json"
MEMORY_DIR="$WORKSPACE_DIR/memory"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Configuration file not found"
    exit 1
fi

# Read retention days from config (requires jq)
if command -v jq >/dev/null 2>&1; then
    RETENTION_DAYS=$(jq -r '.memory.retentionDays // 30' "$CONFIG_FILE")
    AUTO_ARCHIVE=$(jq -r '.memory.autoArchive // false' "$CONFIG_FILE")
else
    echo "Warning: jq not found, using default retention of 30 days"
    RETENTION_DAYS=30
    AUTO_ARCHIVE="false"
fi

if [ "$RETENTION_DAYS" -eq -1 ]; then
    echo "Retention set to forever, no cleanup needed"
    exit 0
fi

echo "Cleaning up memory files older than $RETENTION_DAYS days"

find "$MEMORY_DIR" -name "*.md" -type f -mtime +$RETENTION_DAYS | while read file; do
    if [ "$AUTO_ARCHIVE" = "true" ]; then
        ARCHIVE_DIR="$MEMORY_DIR/archive"
        mkdir -p "$ARCHIVE_DIR"
        echo "Archiving: $(basename "$file")"
        gzip -c "$file" > "$ARCHIVE_DIR/$(basename "$file").gz"
    else
        echo "Deleting: $(basename "$file")"
    fi
    rm "$file"
done

echo "Memory cleanup completed"
`;
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