<!--
Fullsend agent review — use with the fullsend label (pilot).
?template=agentic.md on the web, or: gh pr create --template agentic.md

This description is the sole source of truth for review of this PR.
Review and lander gates re-read this body — not Jira, chat, or comment threads.
Put durable claims here: goals, constraints, and proof. Comments are discussion only;
if a thread changes the ask or the rebuttal, fold it into this body before the next review.

Tracker link when you have one (optional):
  Fixes: https://issues.redhat.com/browse/RHOAIENG-123456
  https://issues.redhat.com/browse/RHOAIENG-123456
Restate what matters for this head in the sections below — the ticket does not replace this body.
A linked Jira is still evaluated for alignment with this description; if you depart from the ask, say so here and why.

Keep sections present-tense and current with the branch head.
Drop unused optional content — no TBD or placeholder text.

PR title: describe the user-visible change, not the implementation.
Allow edits from maintainers: on.
-->

## Problem

<!--
Required:
What is wrong or missing — describe the broken workflow or gap, not the code-level cause.
Enough to check against the diff and any linked ticket acceptance criteria.
-->

## User / product impact

<!--
Required:
What changes for users, operators, or developers.
Call out breaking changes, migrations, or required follow-up here.
For internal-only work, state that there is no user-visible impact.
-->

## Solution

<!--
Required:
What you changed and why you took this approach. Skip file lists; put security/RBAC, API/contract, or migration notes here when they apply.
-->

## Evidence

<!--
Required:
Proof the change works: commands run, test results, CI links, screenshots, cluster checks. Paste log snippets — Fullsend does not read CI for you.
Use <details> for long output; keep a short summary up top.
Redact tokens, passwords, and cluster credentials from pasted logs or screenshots.

Provide enough information for reviewers to understand how this was validated.

If the solution goes against repository guidance or norms and review would otherwise keep flagging it: document the challenge here — which norm applies, why this PR is still correct, and what proof supports that. Update the description when that rationale changes; comment threads alone are not enough.
-->
