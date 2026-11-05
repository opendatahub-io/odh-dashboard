import { execFile, spawn, type ChildProcess } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { waitForBffHealth } from '../bff-health';

export interface GoTestFixtureOptions {
  bffDir: string;
  packagePath: string;
  testName: string;
}

export interface GoTestFixture {
  url: string;
  stop: () => Promise<void>;
}

const execFileAsync = promisify(execFile);
const buildTimeoutMs = 120000;
const readinessTimeoutMs = 15000;
const shutdownTimeoutMs = 2000;
const diagnosticLimit = 8192;

function isRunning(child: ChildProcess | undefined): child is ChildProcess {
  return (
    child !== undefined &&
    child.pid !== undefined &&
    child.exitCode === null &&
    child.signalCode === null
  );
}

/** Bound each signal attempt and detach listeners even if signaling fails. */
function terminate(child: ChildProcess, signal: NodeJS.Signals): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error, exited = true): void => {
      clearTimeout(timer);
      child.off('exit', onExit);
      child.off('error', onError);
      if (error) reject(error);
      else resolve(exited);
    };
    const onExit = (): void => finish();
    const onError = (error: Error): void => finish(error);
    const timer = setTimeout(() => finish(undefined, false), shutdownTimeoutMs);
    child.once('exit', onExit);
    child.once('error', onError);
    try {
      child.kill(signal);
    } catch (error) {
      finish(error instanceof Error ? error : new Error('Could not signal Go fixture'));
    }
  });
}

/** Run an opt-in Go test server without adding production entry points or module scripts. */
export async function startGoTestFixture({
  bffDir,
  packagePath,
  testName,
}: GoTestFixtureOptions): Promise<GoTestFixture> {
  const directory = await mkdtemp(join(tmpdir(), 'contract-go-fixture-'));
  const binary = join(directory, process.platform === 'win32' ? 'fixture.exe' : 'fixture');
  let child: ChildProcess | undefined;
  let diagnostics = '';

  const stop = async (): Promise<void> => {
    try {
      if (isRunning(child) && !(await terminate(child, 'SIGTERM')) && isRunning(child)) {
        if (!(await terminate(child, 'SIGKILL'))) {
          throw new Error('Go fixture did not exit after SIGKILL');
        }
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  };

  try {
    const tags = ['contract', process.env.BFF_GO_BUILD_TAGS].filter(Boolean).join(',');
    await execFileAsync('go', ['test', '-c', '-tags', tags, '-o', binary, packagePath], {
      cwd: bffDir,
      timeout: buildTimeoutMs,
    });
    const selectedTest = testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fixture = spawn(binary, ['-test.run', `^${selectedTest}$`], {
      cwd: bffDir,
      env: { ...process.env, CONTRACT_FIXTURE_SERVER: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child = fixture;
    fixture.stderr.on('data', (data: Buffer) => {
      diagnostics = (diagnostics + data.toString()).slice(-diagnosticLimit);
    });
    const url = await new Promise<string>((resolve, reject) => {
      let output = '';
      const timer = setTimeout(
        () => onError(new Error('Go fixture did not publish its URL')),
        readinessTimeoutMs,
      );
      const onError = (error: Error): void => {
        clearTimeout(timer);
        fixture.stdout.off('data', onData);
        fixture.off('error', onError);
        fixture.off('close', onClose);
        reject(error);
      };
      const onClose = (): void =>
        onError(new Error(`Go fixture exited before readiness: ${diagnostics}`));
      const onData = (data: Buffer): void => {
        output += data.toString();
        if (output.length > diagnosticLimit) {
          onError(new Error('Go fixture URL output exceeded its limit'));
          return;
        }
        const end = output.indexOf('\n');
        if (end < 0) return;
        clearTimeout(timer);
        fixture.stdout.off('data', onData);
        fixture.off('error', onError);
        fixture.off('close', onClose);
        try {
          const published = new URL(output.slice(0, end).trim());
          if (published.protocol !== 'http:' || published.hostname !== '127.0.0.1') {
            throw new Error('Go fixture must publish a loopback HTTP URL');
          }
          resolve(published.origin);
        } catch (error) {
          reject(error);
        }
      };
      fixture.once('error', onError);
      fixture.once('close', onClose);
      fixture.stdout.on('data', onData);
    });
    const health = await waitForBffHealth(
      { url, healthEndpoint: '/healthcheck', timeout: 1000, retryDelay: 50 },
      readinessTimeoutMs,
    );
    if (!health.healthy) throw new Error(`Go fixture was not ready: ${diagnostics}`);
    return { url, stop };
  } catch (error) {
    try {
      await stop();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Go fixture startup and cleanup failed');
    }
    throw error;
  }
}
