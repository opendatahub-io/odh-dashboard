/**
 * Tests for the auto-merge workflow steps that grant or withhold Tide labels:
 * tier-label attribution, commit provenance, the moved-head check, and the
 * label application/cleanup step.
 *
 * These are the safeguards that decide whether a dependency PR merges without a
 * human, so they get the same treatment as the lgtm gate: extract the step's
 * shell from the workflow and execute it with a stubbed `gh`, so the shipped
 * code is what runs and a regression cannot hide behind a duplicate.
 *
 * Run: node --test .github/scripts/__tests__/*.test.js
 * Skips locally when yq or jq is unavailable, but fails in CI.
 */
'use strict';

// Fixtures mirror the GitHub API (snake_case).
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
  throw new Error('yq and jq must be available in CI; the workflow step tests must not skip there');
}
const integration = haveYq && haveJq ? test : test.skip;

const tmpDirs = [];
after(() => {
  tmpDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
});

const APP = 'odh-dashboard-agent[bot]';
const PR = '10416';
const HEAD = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const extractStep = (selector) =>
  JSON.parse(
    execFileSync(
      'yq',
      ['-o=json', `.jobs["auto-merge"].steps[] | select(${selector}) | .run`, WORKFLOW],
      {
        encoding: 'utf8',
      },
    ),
  );

const workflowEnv = () =>
  JSON.parse(execFileSync('yq', ['-o=json', '.', WORKFLOW], { encoding: 'utf8' })).env ?? {};

const EMPTY = { timeline: [], comments: [], labels: [], events: [], commits: [] };

/**
 * Runs one workflow step with a stubbed `gh`.
 *
 * `liveHead` is what `gh api .../pulls/<n>` returns (the step asks for the head
 * SHA); `log` records `gh pr edit` invocations.
 */
const runStep = (selector, fixtures = {}, overrides = {}) => {
  const data = { ...EMPTY, ...fixtures };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'renovate-step-'));
  tmpDirs.push(dir);

  const script = path.join(dir, 'step.sh');
  fs.writeFileSync(script, extractStep(selector));

  const file = (name) => path.join(dir, `${name}.json`);
  fs.writeFileSync(file('timeline'), JSON.stringify(data.timeline));
  fs.writeFileSync(file('comments'), JSON.stringify(data.comments));
  fs.writeFileSync(file('labels'), JSON.stringify(data.labels));
  fs.writeFileSync(file('events'), JSON.stringify(data.events));
  fs.writeFileSync(file('commits'), JSON.stringify(data.commits));
  fs.writeFileSync(file('head'), data.liveHead ?? HEAD);

  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(
    path.join(bin, 'gh'),
    `#!/usr/bin/env bash
set -euo pipefail
case "$*" in
  "pr edit"*) echo "$*" >> "$GH_LOG" ;;
  *"/comments"*) cat "$F_COMMENTS" ;;
  *"/timeline"*) cat "$F_TIMELINE" ;;
  *"/labels"*) cat "$F_LABELS" ;;
  *"/events"*) cat "$F_EVENTS" ;;
  *"/commits"*) cat "$F_COMMITS" ;;
  *"/pulls/$PR_NUMBER"*) cat "$F_HEAD" ;;
  *) echo "null" ;;
esac
`,
    { mode: 0o755 },
  );

  const output = path.join(dir, 'github_output');
  fs.writeFileSync(output, '');
  const summary = path.join(dir, 'summary.md');
  fs.writeFileSync(summary, '');
  const log = path.join(dir, 'gh.log');
  fs.writeFileSync(log, '');

  const res = spawnSync('bash', [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ...workflowEnv(),
      PATH: `${bin}:${process.env.PATH}`,
      F_TIMELINE: file('timeline'),
      F_COMMENTS: file('comments'),
      F_LABELS: file('labels'),
      F_EVENTS: file('events'),
      F_COMMITS: file('commits'),
      F_HEAD: file('head'),
      GH_LOG: log,
      GITHUB_OUTPUT: output,
      GITHUB_STEP_SUMMARY: summary,
      REPO: 'opendatahub-io/odh-dashboard',
      PR_NUMBER: PR,
      PR_URL: 'https://github.com/opendatahub-io/odh-dashboard/pull/10416',
      APP_LOGIN: APP,
      RENOVATE_APP_LOGIN: APP,
      HEAD_SHA: HEAD,
      ...overrides,
    },
  });
  assert.equal(res.status, 0, `step exited ${res.status}:\n${res.stderr}`);
  return {
    out: fs.readFileSync(output, 'utf8'),
    log: fs.readFileSync(log, 'utf8'),
    text: `${res.stdout}${res.stderr}`,
  };
};

const outputValue = (out, key) => {
  const m = new RegExp(`^${key}=(.*)$`, 'm').exec(out);
  return m ? m[1].trim() : '';
};

const labelEvent = (login, name = 'renovate/npm-patch') => ({
  event: 'labeled',
  label: { name },
  actor: { login },
});

// ── tier-label attribution ───────────────────────────────────────────────

const tierStep = '.id == "tier"';

integration('tier: accepts one renovate label added by the app', () => {
  const { out } = runStep(tierStep, {
    labels: [{ name: 'renovate/npm-patch' }],
    events: [labelEvent(APP)],
  });
  assert.equal(outputValue(out, 'tier'), 'npm-patch', out);
});

integration('tier: refuses when two tier labels are present', () => {
  const { out } = runStep(tierStep, {
    labels: [{ name: 'renovate/npm-patch' }, { name: 'renovate/go-patch' }],
    events: [labelEvent(APP)],
  });
  assert.equal(outputValue(out, 'tier'), '', out);
});

integration('tier: refuses a tier label a human added', () => {
  const { out } = runStep(tierStep, {
    labels: [{ name: 'renovate/npm-patch' }],
    events: [labelEvent('jessiehuff')],
  });
  assert.equal(outputValue(out, 'tier'), '', out);
});

integration('tier: refuses a label name that could inject another output', () => {
  const injected = 'renovate/npm-patch\napproved=1';
  const { out } = runStep(tierStep, {
    labels: [{ name: injected }],
    events: [labelEvent(APP, injected)],
  });
  assert.equal(outputValue(out, 'tier'), '', out);
  assert.doesNotMatch(out, /approved=1/);
});

// ── commit provenance ────────────────────────────────────────────────────

const provenanceStep = '.id == "provenance"';
const commit = ({ author = APP, committer = 'web-flow', verified = true }) => ({
  sha: HEAD,
  author: { login: author },
  committer: { login: committer },
  commit: { verification: { verified } },
});

integration('provenance: verified app-authored commit passes', () => {
  const { out } = runStep(provenanceStep, { commits: [commit({})] });
  assert.equal(outputValue(out, 'provenance'), 'true', out);
});

integration('provenance: unsigned commit fails closed', () => {
  const { out } = runStep(provenanceStep, { commits: [commit({ verified: false })] });
  assert.equal(outputValue(out, 'provenance'), 'false', out);
});

integration('provenance: forged app author with a personal signer fails', () => {
  // author=app, committer=attacker, verified by the attacker's own key.
  const { out } = runStep(provenanceStep, {
    commits: [commit({ author: APP, committer: 'attacker', verified: true })],
  });
  assert.equal(outputValue(out, 'provenance'), 'false', out);
});

integration('provenance: one bad commit among good ones fails', () => {
  const { out } = runStep(provenanceStep, {
    commits: [commit({}), commit({ verified: false })],
  });
  assert.equal(outputValue(out, 'provenance'), 'false', out);
});

// ── moved head ───────────────────────────────────────────────────────────

const headStep = '.id == "head"';

integration('head: reports not moved when the live head matches', () => {
  const { out } = runStep(headStep, { liveHead: HEAD });
  assert.equal(outputValue(out, 'moved'), 'false', out);
});

integration('head: reports moved when the live head changed', () => {
  const { out } = runStep(headStep, { liveHead: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' });
  assert.equal(outputValue(out, 'moved'), 'true', out);
});

integration('head: refuses a non-SHA value instead of echoing it', () => {
  const { out, text } = runStep(headStep, { liveHead: 'garbage::warning::pwn' });
  assert.equal(outputValue(out, 'moved'), 'true', out);
  assert.doesNotMatch(text, /pwn/);
});

integration('labels: refuses to act on a non-SHA head', () => {
  const { log, text } = runStep(labelStep, { liveHead: 'garbage::warning::pwn' }, eligible);
  assert.doesNotMatch(log, /--add-label/);
  assert.doesNotMatch(text, /pwn/);
});

// ── label application and cleanup ────────────────────────────────────────

const labelStep = '.name == "Apply or remove merge labels"';
const eligible = { ELIGIBLE: 'true', MOVED: 'false', TIER: 'npm-patch' };

integration('labels: applies lgtm and approved to an eligible, unmoved head', () => {
  const { log } = runStep(labelStep, {}, eligible);
  assert.match(log, /--add-label lgtm,approved/);
});

integration('labels: does not apply when the diff is ineligible', () => {
  const { log } = runStep(
    labelStep,
    {
      events: [
        labelEvent('github-actions[bot]', 'lgtm'),
        labelEvent('github-actions[bot]', 'approved'),
      ],
    },
    { ...eligible, ELIGIBLE: 'false' },
  );
  assert.doesNotMatch(log, /--add-label/);
  assert.match(log, /--remove-label lgtm/);
});

integration('labels: keeps a human label on cleanup', () => {
  const { log } = runStep(
    labelStep,
    { events: [labelEvent('jessiehuff', 'lgtm'), labelEvent('jessiehuff', 'approved')] },
    { ...eligible, ELIGIBLE: 'false' },
  );
  assert.doesNotMatch(log, /--remove-label/);
});

integration('labels: backs off when a human removes lgtm after the last push', () => {
  const { log } = runStep(
    labelStep,
    {
      timeline: [
        { event: 'committed', created_at: '2026-11-04T10:00:00Z' },
        {
          event: 'unlabeled',
          label: { name: 'lgtm' },
          actor: { login: 'jessiehuff' },
          created_at: '2026-11-04T10:05:00Z',
        },
      ],
      events: [labelEvent('jessiehuff', 'lgtm')],
    },
    eligible,
  );
  assert.doesNotMatch(log, /--add-label/);
});

integration('labels: backs off when a cancellation command follows the last push', () => {
  const { log } = runStep(
    labelStep,
    {
      timeline: [{ event: 'committed', created_at: '2026-11-04T10:00:00Z' }],
      comments: [
        {
          body: '/lgtm cancel',
          author_association: 'MEMBER',
          created_at: '2026-11-04T10:05:00Z',
        },
      ],
      events: [labelEvent('jessiehuff', 'lgtm')],
    },
    eligible,
  );
  assert.doesNotMatch(log, /--add-label/);
});

integration('labels: withdraws a workflow-added approved on cancellation', () => {
  // Prow removes lgtm on /lgtm cancel but leaves approved; the cleanup path must
  // remove the workflow's own approved so the Tide pair cannot be restored by a
  // later /lgtm without re-validation.
  const { log } = runStep(
    labelStep,
    {
      timeline: [{ event: 'committed', created_at: '2026-11-04T10:00:00Z' }],
      comments: [
        {
          body: '/lgtm cancel',
          author_association: 'MEMBER',
          created_at: '2026-11-04T10:05:00Z',
        },
      ],
      events: [
        labelEvent('github-actions[bot]', 'lgtm'),
        labelEvent('github-actions[bot]', 'approved'),
      ],
    },
    eligible,
  );
  assert.doesNotMatch(log, /--add-label/);
  assert.match(log, /--remove-label approved/);
});

integration('labels: defers when the head moved after the last read', () => {
  const { log } = runStep(
    labelStep,
    { liveHead: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    eligible,
  );
  assert.doesNotMatch(log, /--add-label/);
});
