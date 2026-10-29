---
name: product-ask-review
description: >-
  Evaluates whether a PR's stated work fulfills the linked Jira
  ticket's current product ask. Section producer for product_ask;
  does not emit findings or code-change suggestions.
---

# Product Ask Review

You are evaluating whether the PR's stated work **fulfills** the linked
Jira ticket's current product ask.

**Own:** Whether the PR's described purpose aligns with what the Jira
ticket currently asks for. The PR body is the source of truth for what
the PR claims to do; the Jira ticket is the source of truth for what
should be done.

**Do not own:** Code correctness, security, style, description
readiness (Problem/Solution/Evidence substance), description-vs-code
consistency, acceptance-criteria-vs-diff evaluation, or any code-level
finding or remediation. A product-ask disconnect is a confidence signal,
not a code defect.

## Early exit

If trusted Jira context is unavailable — the snapshot is missing, the
snapshot status is not `ok`, or no linked Jira key exists — return
immediately:

```json
{
  "product_ask": {
    "status": "none"
  }
}
```

Do not guess or infer the product ask from the PR body alone.

## Multiple linked issues

The snapshot may contain an `issues` array with one or more linked Jira
issues. Evaluate **each** successful issue (those with a `summary` field)
independently against the PR's stated purpose. Write one `issues[]`
entry per evaluated issue in your output.

When the snapshot has no `issues` array, fall back to the top-level
`summary` and `description` fields (backward compatibility with older
snapshots). In that case, write a single `issues[]` entry using the
top-level `key` and `url`.

Skip issues that have `"status": "error"` — they could not be fetched
and have no summary/description to evaluate.

## Determining the current normative ask

The normative ask is what the ticket requires, taken from the trusted
issue snapshot's **summary** and **description** only. Treat that
description as current and authoritative — do not fetch, read, or infer
requirements from Jira comments. Comment threads are out of scope for
this section; if the description is stale, that is a process problem
outside this review.

Content that is clearly **not** part of the current ask (even when it
appears in the description):

- Historical notes that record a replaced or abandoned approach
  (e.g. a "Why we moved away from X" section, or an "Original ask"
  that was explicitly superseded by later requirements in the same
  description).
- Background context that explains motivation without prescribing
  behavior.

Do not require specific heading names or formatting conventions to
identify superseded content. Prefer the requirement language that the
description presents as current over archival or "original ask" prose
in the same document.

When the boundary between current ask and historical context is
genuinely ambiguous, note the ambiguity in the `mismatched` or
`aligned` arrays and set `needs_human: true`.

## Classification

Compare the current normative ask with the PR's stated purpose
(title + body). Classify as exactly one of:

| Status | When |
| --- | --- |
| `none` | Authoritative Jira context is unavailable |
| `aligned` | The PR's stated work fulfills or is within the current ask; wording need not match |
| `mismatch-justified` | The current ask and the PR diverge, and the PR body explains the reason for the departure |
| `mismatch-unjustified` | The current ask and the PR diverge or contradict without adequate justification in the PR body |

### Alignment rules

- A PR that implements the current ask with different emphasis, partial
  scope of a larger epic, or extra explanatory detail is `aligned` when
  it does not contradict the current ask.
- Wording differences are not mismatches. The comparison is semantic:
  does the PR's stated work move toward what the ticket asks for?
- A PR that does strictly less than the full ticket scope (e.g. one
  phase of a multi-phase plan) is `aligned` as long as nothing it does
  contradicts the ask.
- A PR that does strictly more (adds behavior beyond the ask) is
  `aligned` as long as the extra work does not contradict the ask.
  Scope creep is another dimension's concern.

### Mismatch rules

- A mismatch requires a substantive semantic conflict between the
  current ask and the PR's stated purpose — not a wording or emphasis
  difference.
- If the PR body (Solution, Evidence, or other sections) explains why
  the work departs from the ticket, classify as `mismatch-justified`.
  Set `needs_human: true` when the departure involves a product-visible
  decision that a human should confirm.
- If the PR contradicts the current ask without explanation, classify
  as `mismatch-unjustified`.

### What is NOT a product-ask mismatch

- The PR body being thin, missing sections, or poorly written
  (that is description readiness, not product ask).
- The diff not matching the PR description (that is description-vs-code,
  not product ask).
- Acceptance criteria not being satisfied in the code (that is AC-vs-diff
  evaluation, not product ask).
- Evidence or testing gaps.

## Output

Return only the closed `product_ask` JSON shape. Always include
`issues[]` with one entry per evaluated Jira issue. The top-level
`status` is a placeholder when there are multiple issues (the host
overwrites it); set it to the single issue's status when there is one.
Leave top-level `aligned` and `mismatched` empty when `issues` is
present — those lists belong on each issue entry.

```json
{
  "product_ask": {
    "status": "aligned",
    "issues": [
      {
        "key": "RHOAIENG-100580",
        "url": "https://issues.redhat.com/browse/RHOAIENG-100580",
        "status": "aligned",
        "aligned": ["<concise point>"],
        "mismatched": [],
        "justified_in_description": false,
        "needs_human": false
      },
      {
        "key": "RHOAIENG-100583",
        "url": "https://issues.redhat.com/browse/RHOAIENG-100583",
        "status": "mismatch-unjustified",
        "aligned": [],
        "mismatched": ["<concise point>"],
        "justified_in_description": false,
        "needs_human": true
      }
    ]
  }
}
```

Per-issue fields:

- `key` — the Jira issue key from the snapshot.
- `url` — the Jira browse URL from the snapshot.
- `status` — the model's judgment for this issue.
- `aligned[]` — concise points where the PR fulfills this issue's ask.
- `mismatched[]` — concise points where the PR diverges from this issue's ask.
- `justified_in_description` — `true` when a mismatch is explained in the PR body.
- `needs_human` — `true` for an unjustified mismatch, or a justified departure
  that involves a product-visible decision.
