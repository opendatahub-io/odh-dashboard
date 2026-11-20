import { spawn, type ChildProcess } from 'child_process';

const PROJECT_NAME = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const PROJECT_UID = /^[A-Za-z0-9-]{1,128}$/;
const PROXY_START_TIMEOUT_MS = 30000;
const API_REQUEST_TIMEOUT_MS = 30000;

type ProxySession = {
  baseUrl: string;
  close: () => Promise<void>;
};

type DeletionDependencies = {
  startProxy: (context?: string) => Promise<ProxySession>;
  fetch: typeof fetch;
};

export type ProjectDeleteOptions = {
  apiVersion: 'v1';
  kind: 'DeleteOptions';
  preconditions: { uid: string };
};

export const buildProjectDeleteRequest = (
  namespace: string,
  namespaceUID: string,
): { path: string; body: ProjectDeleteOptions } => {
  if (!PROJECT_NAME.test(namespace) || namespace.length > 63) {
    throw new Error('Invalid AutoX project name for deletion');
  }
  if (!PROJECT_UID.test(namespaceUID)) {
    throw new Error('Invalid AutoX project UID for deletion');
  }

  return {
    path: `/apis/project.openshift.io/v1/projects/${encodeURIComponent(namespace)}`,
    body: {
      apiVersion: 'v1',
      kind: 'DeleteOptions',
      preconditions: { uid: namespaceUID },
    },
  };
};

const stopProcess = (child: ChildProcess): Promise<void> =>
  new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    const killTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
    child.once('close', () => {
      clearTimeout(killTimer);
      resolve();
    });
    child.kill('SIGTERM');
  });

const startOcProxy = (context?: string): Promise<ProxySession> =>
  new Promise((resolve, reject) => {
    const args = [
      ...(context ? [`--context=${context}`] : []),
      'proxy',
      '--address=127.0.0.1',
      '--port=0',
    ];
    const child = spawn('oc', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        void stopProcess(child);
        reject(new Error('Timed out starting the OpenShift API proxy'));
      }
    }, PROXY_START_TIMEOUT_MS);

    const fail = (error: Error): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      void stopProcess(child);
      reject(error);
    };

    child.on('error', fail);
    child.on('close', (code) => {
      if (!settled) {
        fail(new Error(`OpenShift API proxy exited before startup (exit code ${code ?? 1})`));
      }
    });
    const handleOutput = (chunk: Buffer): void => {
      output = `${output}${chunk.toString()}`.slice(-2000);
      const match = output.match(/127\.0\.0\.1:(\d+)/);
      if (match && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ baseUrl: `http://127.0.0.1:${match[1]}`, close: () => stopProcess(child) });
      }
    };
    child.stdout.on('data', handleOutput);
    child.stderr.on('data', handleOutput);
  });

const defaultDependencies: DeletionDependencies = {
  startProxy: startOcProxy,
  fetch: (input, init) => globalThis.fetch(input, init),
};

/** Delete a project only if its current UID still matches the recorded attempt. */
export const deleteOpenShiftProjectWithUid = async (
  namespace: string,
  namespaceUID: string,
  context?: string,
  dependencies: DeletionDependencies = defaultDependencies,
): Promise<{ deleted: boolean; error?: string }> => {
  const request = buildProjectDeleteRequest(namespace, namespaceUID);
  let proxy: ProxySession;
  try {
    proxy = await dependencies.startProxy(context);
  } catch (error) {
    return {
      deleted: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  try {
    const response = await dependencies.fetch(`${proxy.baseUrl}${request.path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });
    if (response.ok || response.status === 404) {
      return { deleted: true };
    }
    const detail = (await response.text()).slice(0, 1000);
    return {
      deleted: false,
      error: `OpenShift rejected project deletion (${response.status}): ${detail}`,
    };
  } catch (error) {
    return {
      deleted: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
    await proxy.close();
  }
};
