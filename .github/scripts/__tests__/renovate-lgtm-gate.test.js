/**
 * Tests for the lgtm gate in renovate-auto-merge.yml.
 *
 * The gate decides whether a removed `lgtm` is re-applied. It is shell inside
 * a workflow, so a regression is invisible until an eligible PR gets stuck or,
 * worse, a maintainer's `/lgtm cancel` is reverted. Rather than duplicating the
 * logic here, these tests extract the step's `run:` block from the workflow and
 * execute it with a stubbed `gh`, so the shipped shell is what gets tested.
 *
 * Run: node --test .github/scripts/__tests__/*.test.js
 * Skips when yq or jq is unavailable (both are present on GitHub runners).
 */
'use strict';

// Fixtures mirror the GitHub issue-timeline API, which uses snake_case.
/* eslint-disable camelcase */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const WORKFLOW = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '.github',
  'workflows',
  'renovate-auto-merge.yml',
);

const haveYq = spawnSync('yq', ['--version']).status === 0;
const haveJq = spawnSync('jq', ['--version']).status === 0;
const integration = haveYq && haveJq ? test : test.skip;

const GATE_QUERY = '.jobs["auto-merge"].steps[] | select(.id == "gate") | .run';

/** The gate's shell, straight from the workflow, so tests cannot drift from it. */
const gateScript = () =>
  // yq emits a JSON string; parse it to recover the shell, newlines included.
  JSON.parse(execFileSync('yq', ['-o=json', GATE_QUERY, WORKFLOW], { encoding: 'utf8' }));

/**
 * Runs the gate against a fixture timeline. `gh` is stubbed to return the
 * fixture for every call, which is enough because the step only reads the
 * issue timeline.
 */
const runGate = (events, overrides = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lgtm-gate-'));
  const script = path.join(dir, 'gate.sh');
  fs.writeFileSync(script, gateScript());

  const timeline = path.join(dir, 'timeline.json');
  fs.writeFileSync(timeline, JSON.stringify(events));

  // Emulate `gh api --paginate`: one JSON array per page.
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'gh'), '#!/usr/bin/env bash\ncat "$TIMELINE"\n', {
    mode: 0o755,
  });

  const output = path.join(dir, 'github_output');
  fs.writeFileSync(output, '');

  const res = spawnSync('bash', [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      TIMELINE: timeline,
      GITHUB_OUTPUT: output,
      REPO: 'opendatahub-io/odh-dashboard',
      PR_NUMBER: '10416',
      ACTION: 'unlabeled',
      LABEL: 'lgtm',
      ...overrides,
    },
  });
  assert.equal(res.status, 0, `gate exited ${res.status}:\n${res.stderr}`);
  // Read what the step actually wrote, not the console output.
  return fs.readFileSync(output, 'utf8');
};

const decision = (stdout) => {
  const m = /run=(true|false)/.exec(stdout);
  assert.ok(m, `no run= line in:\n${stdout}`);
  return m[1];
};

const pushed = { event: 'committed', created_at: '2026-10-27T10:00:00Z' };
const ourLgtm = {
  event: 'labeled',
  label: { name: 'lgtm' },
  actor: { login: 'github-actions[bot]' },
  created_at: '2026-10-27T10:01:00Z',
};
const prowRemoval = (at) => ({
  event: 'unlabeled',
  label: { name: 'lgtm' },
  actor: { login: 'openshift-ci[bot]' },
  created_at: at,
});

integration('revalidates when Prow removes lgtm after our label (the race)', () => {
  // Push, we re-apply lgtm, then Prow processes the push and removes it. The
  // old timestamp comparison read this as a human cancel and left the PR stuck.
  const out = runGate([pushed, ourLgtm, prowRemoval('2026-10-27T10:02:00Z')]);
  assert.equal(decision(out), 'true', out);
});

integration('respects /lgtm cancel even though Prow removes the label as a bot', () => {
  const out = runGate([
    pushed,
    ourLgtm,
    { event: 'commented', body: '/lgtm cancel', created_at: '2026-10-27T10:03:00Z' },
    prowRemoval('2026-10-27T10:04:00Z'),
  ]);
  assert.equal(decision(out), 'false', out);
});

integration('revalidates when a cancel is older than the latest push', () => {
  // The cancellation applied to a previous revision, so the current head is
  // still eligible for evaluation.
  const out = runGate([
    { event: 'commented', body: '/lgtm cancel', created_at: '2026-10-27T09:00:00Z' },
    pushed,
    prowRemoval('2026-10-27T10:06:00Z'),
  ]);
  assert.equal(decision(out), 'true', out);
});

integration('respects a human removing lgtm', () => {
  const out = runGate([
    pushed,
    {
      event: 'unlabeled',
      label: { name: 'lgtm' },
      actor: { login: 'jessiehuff' },
      created_at: '2026-10-27T10:06:00Z',
    },
  ]);
  assert.equal(decision(out), 'false', out);
});

integration('respects its own label cleanup', () => {
  const out = runGate([
    pushed,
    {
      event: 'unlabeled',
      label: { name: 'lgtm' },
      actor: { login: 'github-actions[bot]' },
      created_at: '2026-10-27T10:06:00Z',
    },
  ]);
  assert.equal(decision(out), 'false', out);
});

integration('re-evaluates when a tier label is removed', () => {
  const out = runGate([pushed, ourLgtm], { LABEL: 'renovate/npm-patch' });
  assert.equal(decision(out), 'true', out);
});

integration('evaluates on events other than unlabeled', () => {
  const out = runGate([pushed], { ACTION: 'synchronize' });
  assert.equal(decision(out), 'true', out);
});

integration('handles an empty timeline without iterating null', () => {
  const out = runGate([]);
  assert.equal(decision(out), 'false', out);
});
