---
name: jira-validate-description
description: Validate issue descriptions for completeness against type-specific criteria, producing ADD_COMMENT and ADD_LABEL operations to request missing information from reporters.
---

# Validate Description Completeness

Analysis skill for the [jira-triage infrastructure](../jira-triage/SKILL.md). Evaluates issue descriptions against type-specific quality criteria defined in `jira-project-reference.md`, producing operations to request missing information from reporters.

Implements [RHOAIENG-52421](https://redhat.atlassian.net/browse/RHOAIENG-52421).

**Before running this skill, read [`persona.md`](../jira-triage/persona.md) and [`jira-project-reference.md`](../jira-triage/jira-project-reference.md).** The persona defines the execution protocol (thoroughness, verification, no assumptions). The project reference provides the Description Quality Criteria section, which defines required and recommended sections per issue type.

## Dashboard ownership prerequisite

This skill applies only to issues **owned by the RHOAI Dashboard** program team. **Full Triage:** run only after `jira-triage` Step 2a passes. If the issue **belongs to another team**, produce **no operations** for that issue (do not request info on behalf of another team's backlog). See `jira-project-reference.md` § Dashboard ownership (triage scope).

## Scope

All issue types: Bug, Story, and Task. Each type has its own required and recommended sections.

---

## Required Fields

When fetching issues (via the triage Fetch capability or directly), request these fields:

| Field | ID | Why |
|---|---|---|
| Summary | `summary` | Readability in operations output |
| Description | `description` | The content being validated |
| Issue type | `issuetype` | Determines which criteria apply |
| Labels | `labels` | Skip issues already tagged `needs-info` |
| Reporter | `reporter` | Tag in the comment |
| Created | `created` | Context for assessment |
| Updated | `updated` | Detect recent edits |

**Note:** Description is excluded from the triage Fetch default field list because it can be large. This skill must explicitly add it.

---

## Procedure

For each issue in the input set:

### Step 1: Skip checks

Skip the issue (produce no operations) if any of the following are true:

- The issue already has the `needs-info` label. Someone has already asked.
- The description is null/empty **and** the issue was created less than 1 hour ago. Give the reporter a brief window to finish filling it in.

### Step 2: Identify the issue type

Map the issue's `issuetype` to one of: Bug, Story, Task. If the type doesn't match any of these (e.g., Epic, Sub-task), skip the issue.

### Test automation and flake tasks (flexibility)

Use this **before** flagging missing **acceptance criteria** or **description of the work** for **Tasks** (not Bugs) when **all** of the following hold:

- The issue clearly concerns a **failing or flaky automated test** (e.g. named test file such as `*.cy.ts`, suite/command output, CI assertion text, timeout message).
- The description states **what fails** (error, assertion, or screenshot reference) sufficiently for an engineer to locate the test.

Then:

- **Description of the work** — Treat as satisfied: the work is to **fix stabilization** of that test (or underlying app behavior the test covers) so it stops flaking or failing.
- **Acceptance criteria / definition of done** — **Implied DoD is acceptable:** the cited test(s) pass **reliably** (or the described failure mode no longer reproduces when re-running the test). Do **not** require an explicit bulleted “AC” section or a formula like “N green runs” unless the issue is otherwise unclear.
- **Do not** add `needs-info` for “missing AC” on this basis alone.

**Bugs** are unchanged: human **steps to reproduce** in the product UI remain mandatory per bug criteria.

### Step 3: Evaluate required sections

Look up the required sections for the issue type from `jira-project-reference.md` § Description Quality Criteria. For each required section, check whether the description contains the substance of that section.

**Evaluate substance, not format.** Read the **entire** description end-to-end before checking template headings. Information often appears in a different section than where a template expects it — e.g., reproduction steps embedded in a "Description of problem" paragraph, or expected behavior stated in the problem narrative rather than under an "Expected results" heading. A section counts as **present** if the substance appears **anywhere** in the description, regardless of which heading (or no heading) it sits under. **Empty template headings do not mean the information is missing** — always check whether the prose, screenshots, or other sections already provide it.

**Bug-specific rules:**
- Missing steps to reproduce is always flagged — but only when the description truly lacks enough context for a developer to understand the trigger. A prose narrative describing what the user did, supported by screenshots, satisfies this even without numbered steps.
- Environment details: product version is always required. Browser version and build type (production vs dev) are required only when the bug involves UI behavior.
- If the description is a single sentence like "X is broken" with no further detail, flag all required sections as missing.

**Story/Task-specific rules:**
- A one-line description may be acceptable if the issue is genuinely self-explanatory (e.g., "Upgrade PatternFly to v6.2"). Exercise judgment.
- Acceptance criteria can take any form: bullet list, numbered list, prose. The key is that there is a testable definition of done.

### Step 4: Evaluate recommended sections

Check for the recommended sections. Note any that are missing but do not produce operations solely for missing recommended sections. Missing recommended sections are included in the comment only when required sections are also missing.

### Step 5: Build the missing-sections list

Collect the missing required sections. If none are missing, proceed to Step 6 to check for external link reliance.

If required sections are missing, also collect missing recommended sections to include as suggestions, then skip to Step 7 to produce operations.

### Step 6: Check for external link reliance

Even when all required sections are present, scan the description for cases where **key substance** -- the proposed solution, approach, requirements, problem details, or other information essential to understanding or acting on the issue -- is conveyed only via an external link without being summarized in the description itself.

**Ephemeral or access-restricted sources** that trigger this check:

- Slack threads or messages
- Google Docs, emails, or other access-restricted documents
- Any link where the content may become unavailable over time or require separate tool access to read

**Sources that do NOT trigger this check:**

- Jira issue links (stable, cross-referenced)
- GitHub PRs, issues, or commits (stable, publicly accessible)
- Design tools (Figma, Miro) when referenced as supplementary context
- Public documentation links

**Judgment:** Not every external link triggers a comment. The link must carry **key substance** that the description delegates to rather than summarizes. A Slack link used as a casual "see also" alongside a self-contained description is fine. A Slack link that *is* the description's primary source of what to do or how to reproduce is not.

If external link reliance is detected, produce a single **ADD_COMMENT** operation (no `ADD_LABEL`) using the External Link Reliance comment template below. This is a quality improvement suggestion, not a blocker -- it does not add `needs-info`.

If no external link reliance is detected, stop -- the description passes validation.

### Step 7: Produce operations

For each issue with missing required sections, produce two operations in this order:

**Operation 1: ADD_COMMENT**

A constructive, professional comment that:
- Tags the reporter using the proper mention syntax `@[{reporter displayName}](accountid:{reporter account_id})` -- this is appropriate here because `needs-info` requests details only the reporter can provide. **This is the only `needs-*` label where pinging the reporter is correct.** Other `needs-*` labels (needs-ux, needs-pm, needs-advisor) signal to the triage team, not the reporter. The reporter's `account_id` is available from the issue's `reporter` field.
- Lists missing required sections as a checklist with brief guidance on what to include
- Lists missing recommended sections as suggestions (not checkboxes)
- Explains why the information is needed

Use the comment template below. Adapt the specific checklist items based on what is actually missing -- do not include sections that are already present.

**Operation 2: ADD_LABEL `needs-info`**

Add the `needs-info` label to signal the issue is waiting on reporter input.

---

## Comment Templates

### Bug

```markdown
### AI Triage

Hi @[{reporter displayName}](accountid:{reporter account_id}), thanks for reporting this bug.

To help us reproduce and fix it, could you update the description with the following?

**Required:**
- [ ] {missing section} -- {guidance}
...

{if recommended sections are missing}
**Helpful to include (if available):**
- {missing recommended section} -- {guidance}
...
{end if}

This information helps the team reproduce the issue and assess its priority. Thanks!
```

**Guidance text per required section:**

| Section | Guidance |
|---|---|
| Problem description | A clear statement of what is broken or behaving incorrectly |
| Steps to reproduce | Numbered steps to trigger the issue, starting from a clean state |
| Observed behavior | What actually happens -- error messages, wrong output, crash details |
| Expected behavior | What should happen instead |
| Environment | Product version (e.g., RHOAI 2.19); browser and version if UI-related; production or dev build |
| Reproducibility | Does this happen every time, sometimes, or was it a one-time occurrence? |

**Guidance text per recommended section:**

| Section | Guidance |
|---|---|
| Screenshots / recordings | Visual evidence of the issue |
| Logs / error messages | Browser console errors, stack traces, or pod logs |
| Workaround | Any known workaround |
| Regression indicator | Was this working in a previous version? If so, which one? |

### Story

```markdown
### AI Triage

Hi @[{reporter displayName}](accountid:{reporter account_id}), thanks for filing this story.

To help us scope and plan the work, could you update the description with the following?

**Required:**
- [ ] {missing section} -- {guidance}
...

{if recommended sections are missing}
**Helpful to include (if available):**
- {missing recommended section} -- {guidance}
...
{end if}

Clear requirements help the team estimate and deliver accurately. Thanks!
```

**Guidance text per required section:**

| Section | Guidance |
|---|---|
| Description of the enhancement | What is being added or changed, and the motivation behind it |
| Acceptance criteria | Measurable conditions that define when this story is complete |

**Guidance text per recommended section:**

| Section | Guidance |
|---|---|
| User story format | "As a [role], I want [goal], so that [benefit]" |
| Design references | Links to Figma, Miro, or design docs if this involves UI changes |

### Task

```markdown
### AI Triage

Hi @[{reporter displayName}](accountid:{reporter account_id}), thanks for filing this task.

To help us understand the scope, could you update the description with the following?

**Required:**
- [ ] {missing section} -- {guidance}
...

{if recommended sections are missing}
**Helpful to include (if available):**
- {missing recommended section} -- {guidance}
...
{end if}

This information helps the team understand what needs to be done and verify completion. Thanks!
```

**Guidance text per required section:**

| Section | Guidance |
|---|---|
| Description of the work | What needs to be done and why |
| Acceptance criteria / definition of done | How to verify the task is complete |

**Guidance text per recommended section:**

| Section | Guidance |
|---|---|
| Technical context | Relevant code areas, approach notes, or dependencies |

### External Link Reliance (all issue types)

Use this template when the description passes required-section validation but delegates key substance to an ephemeral or access-restricted link.

```markdown
### AI Triage

Hi @[{reporter displayName}](accountid:{reporter account_id}), the description references {link description, e.g., "a Slack thread"} for key details about this {issue type}.

Could you summarize the relevant information from that link directly in the description? This keeps the issue self-contained so anyone can understand it without needing access to another tool.

Thanks!
```

**Guidance for `{link description}`:** Use a natural phrase that identifies the source, e.g., "a Slack thread", "a Google Doc", "an internal email thread". If the description has multiple such links, list them (e.g., "a Slack thread and a Google Doc").

---

## Assessment Guidelines

- **Substance over structure (the most important rule).** Read the full description before evaluating any individual section. Information is often in a different section than where a template expects it. Empty template headings ("Steps to Reproduce: #", "Actual results:", "Expected results:") do **not** mean the information is absent — the prose, screenshots, or other sections may already cover it. A description passes if a developer can understand and act on the issue, regardless of how the content is organized.
- **Do not over-flag.** If the description is reasonably complete, don't flag it just because it could be more detailed. The bar is "can another engineer understand and act on this issue?" For older or general UX issues, missing environment version or reproducibility wording is often acceptable when the bug is clearly not environment-specific.
- **Empty or near-empty descriptions always fail.** A description that is null, empty, or just restates the summary title should flag all required sections.
- **Single-sentence descriptions need judgment.** For bugs, a one-liner almost always fails (no repro steps). For stories/tasks, a one-liner may be acceptable if the issue is genuinely self-explanatory.
- **Bug repro steps require developer-sufficient context, not a numbered list.** A narrative describing what the user did, supported by screenshots showing the before/after state, satisfies the reproduction requirement. Only flag when a developer genuinely cannot determine how to trigger the issue.
- **Environment details scale with context.** A backend bug doesn't need browser info. A UI rendering bug does.
- **External links are not a substitute for inline substance.** When the description delegates key information (the solution, approach, repro steps, or requirements) to an ephemeral or access-restricted link (Slack, Google Docs, email) without summarizing it, produce a quality-improvement comment -- even if all required sections technically pass. The issue is not blocked (`needs-info` is not added), but the author should be nudged to make the description self-contained.
- **Keep reasons concise** -- one sentence identifying the most important gap.

---

## Output

Output MUST validate against [`operations-schema.json`](../jira-triage/operations-schema.json). This skill emits `ADD_COMMENT` and `ADD_LABEL` operations. For missing required sections, both operations are emitted together. For external link reliance (Step 6), only a standalone `ADD_COMMENT` is emitted -- no `ADD_LABEL`. Comment visibility (`Red Hat Employee`) is enforced at execution time by the Apply step -- see `jira-triage` SKILL § Comment Visibility.

Wrap the operations in the standard metadata envelope:

```json
{
  "metadata": {
    "generated": "<ISO-8601 timestamp>",
    "query": "<JQL or description of how issues were selected>",
    "issueCount": "<total issues in the evaluated set (static, set from initial query)>"
  },
  "operations": [ ... ]
}
```

The output flows into the Apply capability of the triage infrastructure. When invoked standalone (outside Full Triage), Apply defaults to **dry-run mode**: it validates, presents the summary, writes the operations file to `.artifacts/triage/`, and stops. The user reviews the file and explicitly applies it later. To execute immediately, the user must request it (e.g., "validate descriptions and apply").

---

## Example

Given a bug RHOAIENG-55000 ("Model serving endpoint returns 500") with a description that says only "Model serving endpoint returns 500 error when deploying a model", reporter Jane Doe:

```json
{
  "metadata": {
    "generated": "2026-03-25T14:00:00Z",
    "query": "project = RHOAIENG AND component = \"AI Core Dashboard\" AND issuetype = Bug AND status = New",
    "issueCount": 1
  },
  "operations": [
    {
      "issueKey": "RHOAIENG-55000",
      "summary": "Model serving endpoint returns 500",
      "action": "ADD_COMMENT",
      "params": {
        "comment": "### AI Triage\n\nHi @[Jane Doe](accountid:712020:abcd1234-5678-90ab-cdef-1234567890ab), thanks for reporting this bug.\n\nTo help us reproduce and fix it, could you update the description with the following?\n\n**Required:**\n- [ ] Steps to reproduce -- Numbered steps to trigger the issue, starting from a clean state\n- [ ] Observed behavior -- What actually happens: error messages, wrong output, crash details\n- [ ] Expected behavior -- What should happen instead\n- [ ] Environment -- Product version (e.g., RHOAI 2.19); browser and version if UI-related; production or dev build\n- [ ] Reproducibility -- Does this happen every time, sometimes, or was it a one-time occurrence?\n\n**Helpful to include (if available):**\n- Logs / error messages -- Browser console errors, stack traces, or pod logs\n- Screenshots / recordings -- Visual evidence of the issue\n\nThis information helps the team reproduce the issue and assess its priority. Thanks!"
      },
      "reason": "Bug description lacks steps to reproduce, observed/expected behavior, environment, and reproducibility"
    },
    {
      "issueKey": "RHOAIENG-55000",
      "summary": "Model serving endpoint returns 500",
      "action": "ADD_LABEL",
      "params": { "labels": ["needs-info"] },
      "reason": "Incomplete description -- requesting missing details from reporter"
    }
  ]
}
```
