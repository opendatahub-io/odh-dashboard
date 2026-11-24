# Dashboard review personas

The review runs the stock Fullsend `pr-review` skill (pinned by `base:` in
[`../harness/review.yaml`](../harness/review.yaml)). The files here are added
to, or replace files in, that skill's `sub-agents/` directory through the
`skills:` file overrides in the harness. Nothing else in the stock skill is
copied or changed.

| File | Stock role | What it adds |
| --- | --- | --- |
| `challenger.md` | replaces the stock challenger | Stock text plus PR `## Justifications` handling and the challenger audit |
| `rating.md` | added, always dispatched | Risk and confidence for the host verdict, and the change summary |
| `style-review.md` | added, conditional | Runs `.claude/skills/style-review` |
| `rbac-review.md` | added, conditional | Runs `.claude/skills/rbac-review` |
| `product-ask-review.md` | added, always | Runs `.claude/skills/product-ask-review` against the Jira snapshot |
| `test-impact-review.md` | added, always | Runs `.claude/skills/test-impact-review` |
| `pr-description-review.md` | added, always | Runs `.claude/skills/pr-description-review` |

A persona's `name:` must equal its file name, and each one needs a model in
`../config.yaml` under `agents[].subagents`.

## Findings

The stock orchestrator accepts only findings from a persona, and only with a
`category` from the closed enum in the stock result schema. A persona's
`categories:` frontmatter lists the ones it may use. The dashboard skills'
own category names are mapped to stock ones inside each persona file.

## Side files

The stock result has no place for a check status, the product-ask section,
risk and confidence, the change summary, or what the challenger removed. A persona that produces
one of those writes it as a JSON file under
`/sandbox/workspace/output/odh/`. The runner copies that directory to the
host with the result, and `../scripts/post-review.sh` reads it when it
renders the sticky comment and computes the verdict.

Rules for every side file:

- One file per persona, named `<persona name>.json`, written once with the
  Write tool. This is the only file a persona writes, with one exception:
  `test-impact-review` also extracts the PR image tarball into a temporary
  directory outside the output directory.
- The stock orchestrator never reads it. What the persona returns to the
  orchestrator is still only a findings array (empty for the personas that
  report through a side file).
- Side files are not schema-validated or retried by the runner. The host
  treats a missing or malformed file as that persona not reporting, and still
  posts a review.
- Content is model output derived from untrusted PR text. The host escapes
  it like any other finding text.

| File | Shape | Host use |
| --- | --- | --- |
| `challenger.json` | `{"as_raised": [finding], "adjudicated": [finding + "challenger_action" + "challenger_reason" + optional "merged_into"]}` | Producers table, challenger audit, Justified section |
| `rating.json` | `{"risk": {"level", "why"}, "confidence": {"level", "why"}, "change_summary": string}` | Signal table, verdict policy, change summary |
| `product-ask-review.json` | `{"product_ask": {...}}` | Product ask section |
| `test-impact-review.json` | `{"check": {"id": "test-impact", "status", "summary", "details"}}` | Checks table and verdict policy |
| `pr-description-review.json` | `{"check": {"id": "pr-description", "status", "summary", "details"}}` | Checks table and verdict policy |

Field details:

- `finding` is the stock finding object: `severity`, `category`, `file`,
  optional `line`, `description`, optional `remediation`, `actionable`, and
  `dimension` (the persona that raised it).
- `challenger_action` is one of `kept`, `downgraded`, `merged`, `removed`,
  `justified`. `justified` exists only in the side file: in the answer the
  challenger returns to the orchestrator, a justified finding is dropped like
  a removed one.
- `merged_into` is `{"category", "file", optional "line"}` and identifies
  the surviving finding. It is present only on an input that a merge
  absorbed; the survivor has `challenger_action` `merged` and no
  `merged_into`.
- `challenger.json` exists only when the challenger ran. The stock
  orchestrator skips it when there are no findings to adjudicate.
- `change_summary` is at most 500 characters and describes what the diff
  changes, written from the diff, not from the PR description. It is in
  `rating.json` because the rating persona runs on every review.
- `risk.level` is `low`, `medium`, `high` or `critical`; `confidence.level`
  is `low`, `medium` or `high`. Each `why` is one or two sentences.
- `check.status` is `pass`, `fail`, `warning`, `not-applicable` or
  `could-not-verify`.
- `product_ask` keeps the shape the `product-ask-review` skill defines
  (`status`, `aligned`, `mismatched`, `justified_in_description`,
  `needs_human`, `issues`).

## Host-side findings

CodeRabbit findings are fetched on the host by `pre-review.sh` and merged
into the sticky by `post-review.sh`. They do not enter the sandbox and do not
go through the challenger.
