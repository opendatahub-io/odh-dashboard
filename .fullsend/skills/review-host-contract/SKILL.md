---
name: review-host-contract
description: >-
  Fill the structured review result. The host writes the durable PR comment
  and chooses the GitHub review action.
---

# Review host contract

The sticky PR comment and GitHub review action are host-rendered from the
validated `$FULLSEND_OUTPUT_DIR/agent-result.json`. This skill constrains that
JSON; it does not replace `pr-review`.

## Produce

- Keep `pr_number`, `repo`, and the exact `head_sha`.
- Set `change_summary` to a short, independent description of what the diff
  does. Do not repeat the file list or copy the PR body.
- Put review issues in `findings[]`. `why` is required for critical, high, and
  medium findings. `remediation` is required for critical and high findings.
- Set `risk` to `{ "level": ..., "why": ... }`. Risk is blast radius if the
  change ships wrong, not finding severity: low is narrow/internal; medium is
  feature-local or sensitive-adjacent; high is wide/product-visible; critical
  crosses a trust boundary or risks data loss.
- Set `confidence` to `{ "level": ..., "why": ... }`. Use the weaker of proof
  quality and patch-review completeness: high when evidence matches and all
  planned producers ran; medium when usable but incomplete; low when the
  review cannot support approval.
- Fill `verification[]` using the fixed IDs `description-vs-code`, `evidence`,
  `security`, `blocking-findings`, and `product-ask`. Every `fail` must map to a
  finding or `decision_needed`.
- Set `decision_needed` only for a concrete human fork, with a question and
  structured options. Use it when `product_ask.needs_human` or an evidenced
  policy/security judgment cannot be cleared by the agent.
- Fill optional `inspected.summary`, `inspected.producers`, and
  `inspected.could_not_verify` with audit evidence and limitations.
- Copy `product_ask` from the description-Jira section LLM, or use
  `{ "status": "none" }` when no sanitized Jira snapshot exists. This compares
  the PR description with Jira; it is not a code-vs-acceptance-criteria review
  and does not go through the challenger.
- Invoke `issue-labels` after findings and all structured sections exist.

CLI findings envelopes come from `.fullsend/.run/collected.json`. Context-only
snapshots such as `.fullsend/.run/jira.json` are fetched by the trusted host.
Do not fetch Jira in the sandbox, copy credentials, start CLI producers, or
scrape GitHub bot comments.

## Host-owned fields

- Do not author `body` for a normal review. The host renders the sticky.
- Do not author `action` for a normal review. The host computes it from
  blocking findings, risk, confidence, product ask, and decisions.
- Do not derive risk from maximum finding severity.
- Do not emit preflight-style markdown reports or invent review types.

## Failure

If the review cannot complete, set `action: failure` and `reason` to one of
`tool-failure`, `missing-context`, `ambiguous-findings`, or `token-limit`.
A missing Jira snapshot is `product_ask.status: none`, not a failed review.
