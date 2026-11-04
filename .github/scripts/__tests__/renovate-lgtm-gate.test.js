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
 * Skips locally when yq or jq is unavailable, but fails in CI: the dedicated
 * workflow asserts both tools, and a silent skip there would hide regressions.
 */
'use strict';

// Fixtures mirror the GitHub issue-timeline and comment APIs (snake_case).
/* eslint-disable camelcase */

const { after, test } = require('node:test');
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
if (process.env.CI && (!haveYq || !haveJq)) {
  throw new Error('yq and jq must be available in CI; the gate tests must not skip there');
}
const integration = haveYq && haveJq ? test : test.skip;

const tmpDirs = [];
after(() => {
  tmpDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
});

const GATE_QUERY = '.jobs["auto-merge"].steps[] | select(.id == "gate") | .run';

/** The gate's shell, straight from the workflow, so tests cannot drift from it. */
const gateScript = () =>
  // yq emits a JSON string; parse it to recover the shell, newlines included.
  JSON.parse(execFileSync('yq', ['-o=json', GATE_QUERY, WORKFLOW], { encoding: 'utf8' }));

/**
 * Runs the gate against fixture API responses. `gh` is stubbed: it answers
 * `/comments` with the comments fixture and everything else with the timeline,
 * which covers every call the step makes.
 *
 * `fixture` is either a timeline array or `{ timeline, comments }`.
 */
const runGate = (fixture, overrides = {}) => {
  const { timeline, comments } = Array.isArray(fixture)
    ? { timeline: fixture, comments: [] }
    : { comments: [], ...fixture };

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lgtm-gate-'));
  tmpDirs.push(dir);

  const script = path.join(dir, 'gate.sh');
  fs.writeFileSync(script, gateScript());

  const timelineFile = path.join(dir, 'timeline.json');
  fs.writeFileSync(timelineFile, JSON.stringify(timeline));
  const commentsFile = path.join(dir, 'comments.json');
  fs.writeFileSync(commentsFile, JSON.stringify(comments));

  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(
    path.join(bin, 'gh'),
    '#!/usr/bin/env bash\ncase "$*" in\n  *"/comments"*) cat "$COMMENTS" ;;\n  *) cat "$TIMELINE" ;;\nesac\n',
    { mode: 0o755 },
  );

  const output = path.join(dir, 'github_output');
  fs.writeFileSync(output, '');

  const res = spawnSync('bash', [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      TIMELINE: timelineFile,
      COMMENTS: commentsFile,
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

const decision = (output) => {
  const m = /run=(true|false)/.exec(output);
  assert.ok(m, `no run= line in:\n${output}`);
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
const comment = (body, association, at) => ({
  body,
  author_association: association,
  created_at: at,
});

integration('revalidates when Prow removes lgtm after our label (the race)', () => {
  // Push, we re-apply lgtm, then Prow processes the push and removes it. The
  // original timestamp comparison read this as a human cancel and left the PR
  // stuck without lgtm.
  const out = runGate([pushed, ourLgtm, prowRemoval('2026-10-27T10:02:00Z')]);
  assert.equal(decision(out), 'true', out);
});

integration('respects an authorized /lgtm cancel even though a bot removes the label', () => {
  const out = runGate({
    timeline: [pushed, ourLgtm, prowRemoval('2026-10-27T10:04:00Z')],
    comments: [comment('/lgtm cancel', 'MEMBER', '2026-10-27T10:03:00Z')],
  });
  assert.equal(decision(out), 'false', out);
});

integration('recognizes /remove-lgtm as a cancellation', () => {
  const out = runGate({
    timeline: [pushed, ourLgtm, prowRemoval('2026-10-27T10:04:00Z')],
    comments: [comment('/remove-lgtm', 'MEMBER', '2026-10-27T10:03:00Z')],
  });
  assert.equal(decision(out), 'false', out);
});

integration('recognizes the cancellation command regardless of case', () => {
  const out = runGate({
    timeline: [pushed, ourLgtm, prowRemoval('2026-10-27T10:04:00Z')],
    comments: [comment('/LGTM CANCEL', 'MEMBER', '2026-10-27T10:03:00Z')],
  });
  assert.equal(decision(out), 'false', out);
});

integration('ignores /lgtm cancel from someone without write access', () => {
  // A commenter with no authority must not be able to suppress revalidation.
  const out = runGate({
    timeline: [pushed, ourLgtm, prowRemoval('2026-10-27T10:04:00Z')],
    comments: [comment('/lgtm cancel', 'NONE', '2026-10-27T10:03:00Z')],
  });
  assert.equal(decision(out), 'true', out);
});

integration('ignores prose that merely mentions the cancel command', () => {
  // "Use `/lgtm cancel` to withdraw the review" is discussion, not a command.
  const out = runGate({
    timeline: [pushed, ourLgtm, prowRemoval('2026-10-27T10:04:00Z')],
    comments: [
      comment('Use `/lgtm cancel` to withdraw the review.', 'MEMBER', '2026-10-27T10:03:00Z'),
    ],
  });
  assert.equal(decision(out), 'true', out);
});

integration('revalidates when a cancel is older than the latest push', () => {
  // The cancellation applied to a previous revision, so the current head is
  // still eligible for evaluation.
  const out = runGate({
    timeline: [pushed, prowRemoval('2026-10-27T10:06:00Z')],
    comments: [comment('/lgtm cancel', 'OWNER', '2026-10-27T09:00:00Z')],
  });
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
