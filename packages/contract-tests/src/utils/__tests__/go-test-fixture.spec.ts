import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import { execFile, spawn } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { waitForBffHealth } from '../../bff-health';
import { startGoTestFixture } from '../go-test-fixture';

jest.mock('child_process', () => ({ execFile: jest.fn(), spawn: jest.fn() }));
jest.mock('fs/promises', () => ({ mkdtemp: jest.fn(), rm: jest.fn() }));
jest.mock('../../bff-health', () => ({ waitForBffHealth: jest.fn() }));

class FixtureProcess extends EventEmitter {
  pid: number | undefined = 123;

  exitCode: number | null = null;

  signalCode: NodeJS.Signals | null = null;

  stdout = new PassThrough();

  stderr = new PassThrough();

  kill = jest.fn((signal: NodeJS.Signals) => {
    this.signalCode = signal;
    this.emit('exit', null, signal);
    return true;
  });
}

const options = {
  bffDir: '/workspace/bff',
  packagePath: './internal/proxy',
  testName: 'TestContractFixtureServer',
};

describe('startGoTestFixture', () => {
  const build = execFile as unknown as jest.Mock;
  const launch = spawn as unknown as jest.Mock;
  let child: FixtureProcess;

  beforeEach(() => {
    jest.clearAllMocks();
    child = new FixtureProcess();
    jest.mocked(mkdtemp).mockResolvedValue('/tmp/contract-go-fixture-test');
    jest.mocked(rm).mockResolvedValue();
    jest.mocked(waitForBffHealth).mockResolvedValue({ healthy: true });
    build.mockImplementation((...args: unknown[]) => {
      const callback = args.at(-1) as (error: Error | null, stdout: string, stderr: string) => void;
      callback(null, '', '');
    });
    launch.mockImplementation(() => {
      queueMicrotask(() => child.stdout.write('http://127.0.0.1:12345\n'));
      return child;
    });
  });

  it('should build the selected test and stop its process on teardown', async () => {
    const fixture = await startGoTestFixture(options);
    expect(build).toHaveBeenCalledWith(
      'go',
      expect.arrayContaining(['test', '-c', './internal/proxy']),
      expect.objectContaining({ cwd: options.bffDir }),
      expect.any(Function),
    );
    expect(launch).toHaveBeenCalledWith(
      expect.any(String),
      ['-test.run', '^TestContractFixtureServer$'],
      expect.objectContaining({
        env: expect.objectContaining({ CONTRACT_FIXTURE_SERVER: 'true' }),
      }),
    );
    expect(fixture.url).toBe('http://127.0.0.1:12345');
    await fixture.stop();
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(rm).toHaveBeenCalledWith('/tmp/contract-go-fixture-test', {
      recursive: true,
      force: true,
    });
  });

  it('should clean up when the Go build fails', async () => {
    build.mockImplementation((...args: unknown[]) => {
      const callback = args.at(-1) as (error: Error) => void;
      callback(new Error('controlled build failure'));
    });
    await expect(startGoTestFixture(options)).rejects.toThrow('controlled build failure');
    expect(launch).not.toHaveBeenCalled();
    expect(rm).toHaveBeenCalled();
  });

  it('should include diagnostics and clean up when the process exits before publishing a URL', async () => {
    launch.mockImplementation(() => {
      queueMicrotask(() => {
        child.stderr.write('controlled startup failure');
        child.exitCode = 1;
        child.emit('exit', 1, null);
      });
      return child;
    });
    await expect(startGoTestFixture(options)).rejects.toThrow('controlled startup failure');
    expect(rm).toHaveBeenCalled();
  });

  it('should clean up if spawning the binary fails', async () => {
    launch.mockImplementation(() => {
      child.pid = undefined;
      queueMicrotask(() => child.emit('error', new Error('controlled spawn failure')));
      return child;
    });
    await expect(startGoTestFixture(options)).rejects.toThrow('controlled spawn failure');
    expect(child.kill).not.toHaveBeenCalled();
    expect(rm).toHaveBeenCalled();
  });

  it('should reject a non-loopback URL and terminate the fixture', async () => {
    launch.mockImplementation(() => {
      queueMicrotask(() => child.stdout.write('http://remote.invalid:12345\n'));
      return child;
    });
    await expect(startGoTestFixture(options)).rejects.toThrow('loopback HTTP URL');
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(rm).toHaveBeenCalled();
  });

  it('should terminate a fixture that fails its health check', async () => {
    jest.mocked(waitForBffHealth).mockResolvedValue({ healthy: false });
    await expect(startGoTestFixture(options)).rejects.toThrow('not ready');
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(rm).toHaveBeenCalled();
  });

  it('should force termination after the graceful shutdown deadline', async () => {
    const fixture = await startGoTestFixture(options);
    child.kill.mockImplementation((signal: NodeJS.Signals) => {
      if (signal === 'SIGKILL') {
        child.signalCode = signal;
        child.emit('exit', null, signal);
      }
      return true;
    });
    jest.useFakeTimers();
    try {
      const stopped = fixture.stop();
      await jest.advanceTimersByTimeAsync(2000);
      await stopped;
      expect(child.kill).toHaveBeenCalledWith('SIGKILL');
      expect(rm).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
