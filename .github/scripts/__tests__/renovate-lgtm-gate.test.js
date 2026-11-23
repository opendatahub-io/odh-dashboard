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

/** Workflow-level env, which the step inherits in Actions. */
const workflowEnv = () =>
  JSON.parse(execFileSync('yq', ['-o=json', '.', WORKFLOW], { encoding: 'utf8' })).env ?? {};

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
const runGateRaw = (fixture, overrides = {}) => {
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
  const reviewsFile = path.join(dir, 'reviews.json');
  fs.writeFileSync(reviewsFile, JSON.stringify(fixture.reviews ?? []));
  const reviewCommentsFile = path.join(dir, 'review_comments.json');
  fs.writeFileSync(reviewCommentsFile, JSON.stringify(fixture.review_comments ?? []));

  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(
    path.join(bin, 'gh'),
    '#!/usr/bin/env bash\ncase "$*" in\n  *"/issues/$PR_NUMBER/comments"*) cat "$COMMENTS" ;;\n  *"/pulls/$PR_NUMBER/reviews"*) cat "$REVIEWS" ;;\n  *"/pulls/$PR_NUMBER/comments"*) cat "$REVIEW_COMMENTS" ;;\n  *) cat "$TIMELINE" ;;\nesac\n',
    { mode: 0o755 },
  );

  const output = path.join(dir, 'github_output');
  fs.writeFileSync(output, '');

  const res = spawnSync('bash', [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ...workflowEnv(),
      PATH: `${bin}:${process.env.PATH}`,
      TIMELINE: timelineFile,
      COMMENTS: commentsFile,
      REVIEWS: reviewsFile,
      REVIEW_COMMENTS: reviewCommentsFile,
      GITHUB_OUTPUT: output,
      REPO: 'opendatahub-io/odh-dashboard',
      PR_NUMBER: '10416',
      ACTION: 'unlabeled',
      LABEL: 'lgtm',
      ...overrides,
    },
  });
  assert.equal(res.status, 0, `gate exited ${res.status}:\n${res.stderr}`);
  return {
    // Read what the step actually wrote, not the console output.
    out: fs.readFileSync(output, 'utf8'),
    // The gate explains which branch it took. Asserting the message keeps a
    // case from passing through a different branch that also writes run=true.
    text: `${res.stdout}${res.stderr}`,
  };
};

/** Output-only shorthand for cases that do not inspect the decision message. */
const runGate = (fixture, overrides = {}) => runGateRaw(fixture, overrides).out;

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
  user: { type: 'User' },
});

integration('revalidates when Prow removes lgtm after our label (the race)', () => {
  // Push, we re-apply lgtm, then Prow processes the push and removes it. The
  // original timestamp comparison read this as a human cancel and left the PR
  // stuck without lgtm.
  const { out, text } = runGateRaw([pushed, ourLgtm, prowRemoval('2026-10-27T10:02:00Z')]);
  assert.equal(decision(out), 'true', out);
  assert.match(text, /stale review/);
});

integration('routes an authorized cancellation to label cleanup', () => {
  const { out, text } = runGateRaw({
    timeline: [pushed, ourLgtm, prowRemoval('2026-10-27T10:04:00Z')],
    comments: [comment('/lgtm cancel', 'MEMBER', '2026-10-27T10:03:00Z')],
  });
  assert.equal(decision(out), 'true', out);
  assert.match(text, /approval withdrawn after the last push/);
});

integration('routes /remove-lgtm to label cleanup', () => {
  const { out, text } = runGateRaw({
    timeline: [pushed, ourLgtm, prowRemoval('2026-10-27T10:04:00Z')],
    comments: [comment('/remove-lgtm', 'MEMBER', '2026-10-27T10:03:00Z')],
  });
  assert.equal(decision(out), 'true', out);
  assert.match(text, /approval withdrawn after the last push/);
});

integration('recognizes the cancellation command regardless of case', () => {
  const { out, text } = runGateRaw({
    timeline: [pushed, ourLgtm, prowRemoval('2026-10-27T10:04:00Z')],
    comments: [comment('/LGTM CANCEL', 'MEMBER', '2026-10-27T10:03:00Z')],
  });
  assert.equal(decision(out), 'true', out);
  assert.match(text, /approval withdrawn after the last push/);
});

integration('ignores /lgtm cancel from someone without write access', () => {
  // A commenter with no authority must not be able to suppress revalidation.
  const { out, text } = runGateRaw({
    timeline: [pushed, ourLgtm, prowRemoval('2026-10-27T10:04:00Z')],
    comments: [comment('/lgtm cancel', 'NONE', '2026-10-27T10:03:00Z')],
  });
  assert.equal(decision(out), 'true', out);
  assert.doesNotMatch(text, /approval withdrawn/);
  assert.match(text, /stale review/);
});

integration('ignores prose that merely mentions the cancel command', () => {
  // "Use `/lgtm cancel` to withdraw the review" is discussion, not a command.
  const { out, text } = runGateRaw({
    timeline: [pushed, ourLgtm, prowRemoval('2026-10-27T10:04:00Z')],
    comments: [
      comment('Use `/lgtm cancel` to withdraw the review.', 'MEMBER', '2026-10-27T10:03:00Z'),
    ],
  });
  assert.equal(decision(out), 'true', out);
  assert.doesNotMatch(text, /approval withdrawn/);
  assert.match(text, /stale review/);
});

integration('revalidates when a cancel is older than the latest push', () => {
  // The cancellation applied to a previous revision, so the current head is
  // still eligible for evaluation.
  const { out, text } = runGateRaw({
    timeline: [pushed, prowRemoval('2026-10-27T10:06:00Z')],
    comments: [comment('/lgtm cancel', 'OWNER', '2026-10-27T09:00:00Z')],
  });
  assert.equal(decision(out), 'true', out);
  assert.doesNotMatch(text, /approval withdrawn/);
  assert.match(text, /stale review/);
});

integration('routes a human removal to label cleanup', () => {
  const { out, text } = runGateRaw([
    pushed,
    {
      event: 'unlabeled',
      label: { name: 'lgtm' },
      actor: { login: 'jessiehuff' },
      created_at: '2026-10-27T10:06:00Z',
    },
  ]);
  assert.equal(decision(out), 'true', out);
  // A human removal after the last push is a withdrawal, so the early branch
  // handles it. The message proves HUMAN_WITHDRAWAL_QUERY matched, which the
  // decision alone cannot: the case fallback also returns run=true.
  assert.match(text, /approval withdrawn after the last push/);
});

integration('routes a human removal of approved to label cleanup', () => {
  // Removing `approved` directly is the same withdrawal as `/approve cancel`,
  // otherwise a later event on the same head restores the Tide pair.
  const { out, text } = runGateRaw(
    [
      pushed,
      {
        event: 'unlabeled',
        label: { name: 'approved' },
        actor: { login: 'jessiehuff' },
        created_at: '2026-10-27T10:06:00Z',
      },
    ],
    { LABEL: 'approved' },
  );
  assert.equal(decision(out), 'true', out);
  assert.match(text, /approval withdrawn after the last push/);
});

integration('ignores a bot removal of approved', () => {
  // Prow does not remove approved, but a bot doing so must not be read as a
  // human withdrawal that permanently refuses to re-label.
  const { out, text } = runGateRaw(
    [
      pushed,
      {
        event: 'unlabeled',
        label: { name: 'approved' },
        actor: { login: 'openshift-ci[bot]' },
        created_at: '2026-10-27T10:06:00Z',
      },
    ],
    { LABEL: 'approved' },
  );
  assert.equal(decision(out), 'false', out);
  assert.doesNotMatch(text, /approval withdrawn/);
});

integration('respects its own label cleanup', () => {
  const { out, text } = runGateRaw([
    pushed,
    {
      event: 'unlabeled',
      label: { name: 'lgtm' },
      actor: { login: 'github-actions[bot]' },
      created_at: '2026-10-27T10:06:00Z',
    },
  ]);
  assert.equal(decision(out), 'false', out);
  assert.match(text, /lgtm removed by this workflow/);
});

integration('routes a queued synchronize cancellation to label cleanup', () => {
  // A maintainer cancels after the push; a queued synchronize run must not
  // restore labels on the same revision.
  const { out, text } = runGateRaw(
    {
      timeline: [pushed],
      comments: [comment('/lgtm cancel', 'MEMBER', '2026-10-27T10:03:00Z')],
    },
    { ACTION: 'synchronize' },
  );
  assert.equal(decision(out), 'true', out);
  assert.match(text, /approval withdrawn after the last push/);
});

integration('routes a re-applied tier label cancellation to label cleanup', () => {
  const { out, text } = runGateRaw(
    {
      timeline: [pushed],
      comments: [comment('/remove-lgtm', 'OWNER', '2026-10-27T10:03:00Z')],
    },
    { ACTION: 'labeled', LABEL: 'renovate/npm-patch' },
  );
  assert.equal(decision(out), 'true', out);
  assert.match(text, /approval withdrawn after the last push/);
});

integration('routes a review-body cancellation to label cleanup', () => {
  const out = runGate({
    timeline: [pushed],
    reviews: [
      {
        body: '/lgtm cancel',
        author_association: 'MEMBER',
        submitted_at: '2026-10-27T10:03:00Z',
        user: { type: 'User' },
      },
    ],
  });
  assert.equal(decision(out), 'true', out);
});

integration('routes /approve cancel to label cleanup', () => {
  const out = runGate({
    timeline: [pushed],
    comments: [comment('/approve cancel', 'MEMBER', '2026-10-27T10:03:00Z')],
  });
  assert.equal(decision(out), 'true', out);
});

integration('routes an inline review-comment cancellation to label cleanup', () => {
  const out = runGate({
    timeline: [pushed],
    review_comments: [
      {
        body: '/remove-lgtm',
        author_association: 'OWNER',
        created_at: '2026-10-27T10:03:00Z',
        user: { type: 'User' },
      },
    ],
  });
  assert.equal(decision(out), 'true', out);
});

integration('re-evaluates when a tier label is removed', () => {
  const { out, text } = runGateRaw([pushed, ourLgtm], { LABEL: 'renovate/npm-patch' });
  assert.equal(decision(out), 'true', out);
  assert.match(text, /tier label renovate\/npm-patch removed/);
});

integration('evaluates on events other than unlabeled', () => {
  const out = runGate([pushed], { ACTION: 'synchronize' });
  assert.equal(decision(out), 'true', out);
});

integration('handles an empty timeline without iterating null', () => {
  const { out, text } = runGateRaw([]);
  assert.equal(decision(out), 'false', out);
  assert.match(text, /no lgtm removal event found/);
});
