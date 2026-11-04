import { execFile, spawn, type ChildProcess } from 'child_process';
import { once } from 'events';
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
    if (isRunning(child)) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          exited,
          new Promise<void>((resolve) => {
            timer = setTimeout(resolve, shutdownTimeoutMs);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
      if (isRunning(child)) {
        child.kill('SIGKILL');
        await exited;
      }
    }
    await rm(directory, { recursive: true, force: true });
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
        () => reject(new Error('Go fixture did not publish its URL')),
        readinessTimeoutMs,
      );
      const onError = (error: Error): void => {
        clearTimeout(timer);
        reject(error);
      };
      const onExit = (): void =>
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
        fixture.off('exit', onExit);
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
      fixture.once('exit', onExit);
      fixture.stdout.on('data', onData);
    });
    const health = await waitForBffHealth(
      { url, healthEndpoint: '/healthcheck', timeout: 1000, retryDelay: 50 },
      readinessTimeoutMs,
    );
    if (!health.healthy) throw new Error(`Go fixture was not ready: ${diagnostics}`);
    return { url, stop };
  } catch (error) {
    await stop();
    throw error;
  }
}
