#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

interface ContractTestOptions {
  bffDir?: string;
  consumerDir?: string;
  packageName?: string;
  watch?: boolean;
  report?: boolean;
}

function findBffDir(currentDir: string): string | null {
  // Look for upstream/bff in current directory or parent directories
  let dir = currentDir;
  while (dir !== '/') {
    const bffPath = join(dir, 'upstream', 'bff');
    if (existsSync(bffPath)) {
      return bffPath;
    }
    dir = resolve(dir, '..');
  }
  return null;
}

function findContractTestsDir(currentDir: string): string | null {
  // Look for contract-tests in current directory
  const contractTestsPath = join(currentDir, 'contract-tests');
  if (existsSync(contractTestsPath)) {
    return contractTestsPath;
  }
  return null;
}

function runContractTests(options: ContractTestOptions = {}): number {
  const cwd = process.cwd();
  
  // Auto-discover directories if not provided
  const bffDir = options.bffDir || findBffDir(cwd);
  const consumerDir = options.consumerDir || findContractTestsDir(cwd);
  const packageName = options.packageName || 'unknown';
  
  if (!bffDir) {
    console.error('❌ Could not find BFF directory (upstream/bff)');
    console.error('   Please run this command from a package directory or specify --bff-dir');
    return 1;
  }
  
  if (!consumerDir) {
    console.error('❌ Could not find contract-tests directory');
    console.error('   Please run this command from a package directory or specify --consumer-dir');
    return 1;
  }
  
  console.log(`🚀 Running contract tests for ${packageName}`);
  console.log(`   BFF: ${bffDir}`);
  console.log(`   Tests: ${consumerDir}`);
  
  // Build the BFF if needed
  console.log('🔨 Building BFF...');
  const buildResult = spawnSync('make', ['build'], {
    cwd: bffDir,
    stdio: 'inherit',
    shell: true
  });
  
  if (buildResult.status !== 0) {
    console.error('❌ Failed to build BFF');
    return buildResult.status || 1;
  }
  
  // Start BFF in background
  console.log('🚀 Starting BFF server...');
  const bffProcess = spawnSync('make', ['run'], {
    cwd: bffDir,
    stdio: 'pipe',
    shell: true
  });
  
  if (bffProcess.status !== 0) {
    console.error('❌ Failed to start BFF');
    return bffProcess.status || 1;
  }
  
  // Wait a bit for BFF to start
  setTimeout(() => {
    // Run Jest tests
    console.log('🧪 Running contract tests...');
    const jestArgs = [
      '--config', join(__dirname, '..', 'jest.preset.js'),
      '--testPathPattern', consumerDir,
      '--setupFilesAfterEnv', join(__dirname, '..', 'setup.preset.js')
    ];
    
    if (options.watch) {
      jestArgs.push('--watch');
    }
    
    if (options.report) {
      jestArgs.push('--reporters', 'default', 'jest-html-reporter');
    }
    
    const testResult = spawnSync('npx', ['jest', ...jestArgs], {
      cwd: consumerDir,
      stdio: 'inherit',
      shell: true
    });
    
    // Clean up BFF process
    try {
      process.kill(-bffProcess.pid!, 'SIGTERM');
    } catch (e) {
      // Ignore errors
    }
    
    process.exit(testResult.status || 0);
  }, 2000);
  
  return 0;
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: ContractTestOptions = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  switch (arg) {
    case '--bff-dir':
      options.bffDir = args[++i];
      break;
    case '--consumer-dir':
      options.consumerDir = args[++i];
      break;
    case '--package-name':
      options.packageName = args[++i];
      break;
    case '--watch':
      options.watch = true;
      break;
    case '--report':
      options.report = true;
      break;
    case '--help':
    case '-h':
      console.log(`
Usage: odh-contract-test [options]

Options:
  --bff-dir <path>        Path to BFF directory (auto-detected if not specified)
  --consumer-dir <path>   Path to contract-tests directory (auto-detected if not specified)
  --package-name <name>   Package name for logging
  --watch                 Run tests in watch mode
  --report                Generate HTML test report
  --help, -h             Show this help message

Examples:
  odh-contract-test                    # Auto-detect everything
  odh-contract-test --watch           # Run in watch mode
  odh-contract-test --report          # Generate HTML report
`);
      process.exit(0);
      break;
    default:
      console.error(`Unknown option: ${arg}`);
      console.error('Use --help for usage information');
      process.exit(1);
  }
}

// Run the tests
const exitCode = runContractTests(options);
process.exit(exitCode);
