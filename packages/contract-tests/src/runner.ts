import { spawnSync } from 'child_process';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

export interface ContractTestOptions {
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

export function runContractTests(options: ContractTestOptions = {}): Promise<number> {
  return new Promise((res) => {
    const cwd = process.cwd();

    // Auto-discover directories if not provided
    const bffDir = options.bffDir || findBffDir(cwd);
    const consumerDir = options.consumerDir || findContractTestsDir(cwd);
    const packageName = options.packageName || 'unknown';

    if (!bffDir) {
      console.error('❌ Could not find BFF directory (upstream/bff)');
      console.error('   Please run this command from a package directory or specify bffDir');
      res(1);
      return;
    }

    if (!consumerDir) {
      console.error('❌ Could not find contract-tests directory');
      console.error('   Please run this command from a package directory or specify consumerDir');
      res(1);
      return;
    }

    console.log(`🚀 Running contract tests for ${packageName}`);
    console.log(`   BFF: ${bffDir}`);
    console.log(`   Tests: ${consumerDir}`);

    // Build the BFF if needed
    console.log('🔨 Building BFF...');
    const buildResult = spawnSync('make', ['build'], {
      cwd: bffDir,
      stdio: 'inherit',
      shell: true,
    });

    if (buildResult.status !== 0) {
      console.error('❌ Failed to build BFF');
      res(buildResult.status || 1);
      return;
    }

    // Start BFF in background
    console.log('🚀 Starting BFF server...');
    const bffProcess = spawnSync('make', ['run'], {
      cwd: bffDir,
      stdio: 'pipe',
      shell: true,
    });

    if (bffProcess.status !== 0) {
      console.error('❌ Failed to start BFF');
      res(bffProcess.status || 1);
      return;
    }

    // Wait a bit for BFF to start
    setTimeout(() => {
      // Run Jest tests
      console.log('🧪 Running contract tests...');
      const jestArgs = [
        '--config',
        join(__dirname, '..', 'jest.preset.js'),
        '--testPathPattern',
        consumerDir,
        '--setupFilesAfterEnv',
        join(__dirname, '..', 'setup.preset.js'),
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
        shell: true,
      });

      // Clean up BFF process
      try {
        if (bffProcess.pid) {
          process.kill(-bffProcess.pid, 'SIGTERM');
        }
      } catch (e) {
        // Ignore errors
      }

      res(testResult.status || 0);
    }, 2000);
  });
}
