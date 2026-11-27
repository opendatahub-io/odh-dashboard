import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect as assert, it } from '@jest/globals';
import {
  PG_CREDENTIALS_UNREADABLE,
  PG_CREDENTIALS_UNREADABLE_EXIT,
  buildApiKeyDeleteCommand,
  buildApiKeyDeleteStatement,
  classifyOcGet,
  getApiKeyCleanupResult,
  getApiKeyCleanupSkipReason,
  shellSingleQuote,
} from '../maasApiKeyCleanup';

const found = { state: 'found' } as const;
const missing = { state: 'missing' } as const;

describe('classifyOcGet', () => {
  it('treats exit code 0 as found', () => {
    assert(classifyOcGet({ exitCode: 0, stderr: '' })).toEqual({ state: 'found' });
  });

  it('treats NotFound as missing', () => {
    assert(
      classifyOcGet({
        exitCode: 1,
        stderr: 'Error from server (NotFound): secrets "postgres-creds" not found',
      }),
    ).toEqual({ state: 'missing' });
  });

  it('keeps only the reason of other server errors, not the user name', () => {
    assert(
      classifyOcGet({
        exitCode: 1,
        stderr:
          'Error from server (Forbidden): secrets "postgres-creds" is forbidden: User "someone" cannot get resource',
      }),
    ).toEqual({ state: 'error', reason: 'Forbidden' });
  });

  it('falls back to the exit code when oc gives no server reason', () => {
    assert(
      classifyOcGet({ exitCode: 1, stderr: 'error: You must be logged in to the server' }),
    ).toEqual({ state: 'error', reason: 'exit code 1' });
  });
});

describe('getApiKeyCleanupSkipReason', () => {
  it('returns undefined when the secret and the deployment both exist', () => {
    assert(
      getApiKeyCleanupSkipReason('redhat-ods-applications', { secret: found, deployment: found }),
    ).toBeUndefined();
  });

  it('names the missing secret', () => {
    assert(
      getApiKeyCleanupSkipReason('redhat-ods-applications', {
        secret: missing,
        deployment: found,
      }),
    ).toBe(
      'API key cleanup skipped: no secret postgres-creds in redhat-ods-applications; the key stays in the database',
    );
  });

  it('names both when both are missing', () => {
    assert(
      getApiKeyCleanupSkipReason('opendatahub', { secret: missing, deployment: missing }),
    ).toBe(
      'API key cleanup skipped: no secret postgres-creds and no deployment/postgres in opendatahub; the key stays in the database',
    );
  });

  it('says the check failed, with the reason, instead of calling it missing', () => {
    assert(
      getApiKeyCleanupSkipReason('opendatahub', {
        secret: { state: 'error', reason: 'Forbidden' },
        deployment: missing,
      }),
    ).toBe(
      'API key cleanup skipped: could not check secret postgres-creds (Forbidden) in opendatahub; the key may stay in the database',
    );
  });
});

describe('buildApiKeyDeleteStatement', () => {
  it('deletes by display name, escaping single quotes for SQL', () => {
    assert(buildApiKeyDeleteStatement("it's a key")).toBe(
      "DELETE FROM api_keys WHERE name = 'it''s a key';",
    );
  });
});

describe('shellSingleQuote', () => {
  it.each(["it's", 'a"b', '$HOME', '`id`', 'back\\slash', '$(echo hi)'])(
    'keeps %p as one literal shell word',
    (value) => {
      const echoed = execFileSync('sh', ['-c', `printf %s ${shellSingleQuote(value)}`]).toString();
      assert(echoed).toBe(value);
    },
  );
});

describe('buildApiKeyDeleteCommand', () => {
  const command = buildApiKeyDeleteCommand('opendatahub', 'cypress-key-123');

  it('reads the database user and name into shell variables', () => {
    assert(command).toContain(
      "PGUSER_VALUE=$(oc get secret postgres-creds -n opendatahub -o jsonpath='{.data.POSTGRES_USER}' | base64 -d)",
    );
    assert(command).toContain(
      "PGDB_VALUE=$(oc get secret postgres-creds -n opendatahub -o jsonpath='{.data.POSTGRES_DB}' | base64 -d)",
    );
  });

  it('passes only the variable names to psql, and the SQL as one quoted word', () => {
    assert(command).toContain(
      `oc exec -n opendatahub deployment/postgres -- psql -U "$PGUSER_VALUE" -d "$PGDB_VALUE" -c 'DELETE FROM api_keys WHERE name = '\\''cypress-key-123'\\'';'`,
    );
  });

  describe('run in sh against a stub oc', () => {
    let stubDir: string;

    // STUB_MODE controls mock behavior for both credential secret fetches; `oc exec` invocations have their arguments echoed.
    beforeAll(() => {
      stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maas-cleanup-'));
      fs.writeFileSync(
        path.join(stubDir, 'oc'),
        [
          '#!/bin/sh',
          'if [ "$1" = get ]; then',
          '  [ "$STUB_MODE" = fail ] && exit 1',
          '  [ "$STUB_MODE" = empty ] && exit 0',
          '  case "$*" in *POSTGRES_USER*) printf dXNlcg== ;; *POSTGRES_DB*) printf ZGI= ;; esac',
          '  exit 0',
          'fi',
          'for a in "$@"; do printf "[%s]\\n" "$a"; done',
        ].join('\n'),
        { mode: 0o755 },
      );
    });

    afterAll(() => {
      fs.rmSync(stubDir, { recursive: true, force: true });
    });

    const run = (mode: string) =>
      spawnSync('sh', ['-c', command], {
        env: { ...process.env, PATH: `${stubDir}:${process.env.PATH ?? ''}`, STUB_MODE: mode },
        encoding: 'utf8',
      });

    it('runs psql with the values read from the secret', () => {
      const { status, stdout } = run('good');
      assert(status).toBe(0);
      assert(stdout).toContain('[-U]\n[user]\n[-d]\n[db]\n');
    });

    it.each(['fail', 'empty'])(
      'stops before psql when the secret read gives nothing (%s)',
      (mode) => {
        const { status, stdout, stderr } = run(mode);
        assert(status).toBe(PG_CREDENTIALS_UNREADABLE_EXIT);
        assert(stdout).not.toContain('[psql]');
        assert(
          getApiKeyCleanupResult('cypress-key-123', {
            exitCode: status ?? -1,
            stdout,
            stderr,
          }).message,
        ).toBe(
          'API key cleanup skipped: could not read POSTGRES_USER / POSTGRES_DB from secret postgres-creds; the key may stay in the database',
        );
      },
    );
  });
});

describe('getApiKeyCleanupResult', () => {
  it('reports the deleted rows', () => {
    assert(
      getApiKeyCleanupResult('cypress-key', { exitCode: 0, stdout: 'DELETE 1\n', stderr: '' }),
    ).toEqual({
      deleted: true,
      message: 'API key cleanup: deleted 1 row(s) for "cypress-key"',
    });
  });

  it('reports when no key with that name exists', () => {
    assert(
      getApiKeyCleanupResult('cypress-key', { exitCode: 0, stdout: 'DELETE 0\n', stderr: '' }),
    ).toEqual({
      deleted: false,
      message: 'API key cleanup: no API key named "cypress-key" was found',
    });
  });

  it('reports a failed delete command with its exit code', () => {
    assert(getApiKeyCleanupResult('cypress-key', { exitCode: 2, stdout: '', stderr: '' })).toEqual({
      deleted: false,
      message: 'API key cleanup failed for "cypress-key": the delete command exited with code 2',
    });
  });

  it('reports unreadable database credentials without printing any value', () => {
    assert(
      getApiKeyCleanupResult('cypress-key', {
        exitCode: PG_CREDENTIALS_UNREADABLE_EXIT,
        stdout: '',
        stderr: `${PG_CREDENTIALS_UNREADABLE}\n`,
      }),
    ).toEqual({
      deleted: false,
      message:
        'API key cleanup skipped: could not read POSTGRES_USER / POSTGRES_DB from secret postgres-creds; the key may stay in the database',
    });
  });

  it('treats exit code 97 without the marker as an ordinary failure', () => {
    assert(
      getApiKeyCleanupResult('cypress-key', { exitCode: 97, stdout: '', stderr: 'other' }).message,
    ).toBe('API key cleanup failed for "cypress-key": the delete command exited with code 97');
  });
});
