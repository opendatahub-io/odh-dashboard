---
name: jira-evaluate-blockers
description: Analyze issues to apply needs-* labels and blocking state, and evaluate existing blockers for resolution signals.
---

# Evaluate Blockers

Analysis skill for the [jira-triage infrastructure](../jira-triage/SKILL.md). Operates in two modes: **Tag** (apply needs-\* labels and blocking state during triage) and **Evaluate** (check whether existing blockers have been resolved). Produces operations that flow into the triage Apply capability.

Implements [RHOAIENG-52419](https://redhat.atlassian.net/browse/RHOAIENG-52419).

**Before running this skill, read [`persona.md`](../jira-triage/persona.md) and [`jira-project-reference.md`](../jira-triage/jira-project-reference.md).** The persona defines the execution protocol (thoroughness, verification, no assumptions, **fresh start**). The project reference provides needs-\* label criteria, blocking mechanism rules, and field IDs. Every invocation starts from scratch -- see `persona.md` § Fresh Start.

## Dashboard ownership prerequisite

This skill applies only to issues **owned by the RHOAI Dashboard** program team. **Full Triage:** run only after `jira-triage` Step 2a passes. If the issue **belongs to another team**, produce **no operations** for that issue. See `jira-project-reference.md` § Dashboard ownership (triage scope).

## Scope

All issue types. Both bugs and stories/tasks can be blocked or require input from other roles.

---

## Required Fields

When fetching issues (via the triage Fetch capability or directly), request these fields:

| Field | ID | Why |
|---|---|---|
| Summary | `summary` | Readability in operations output |
| Status | `status` | Context for blocking evaluation |
| Labels | `labels` | Detect existing needs-\* labels |
| Description | `description` | Content analysis for tagging |
| Blocked | `customfield_10517` | Check current blocked state |
| Blocked Reason | `customfield_10483` | Understand what the blocker is |
| Issue Links | `issuelinks` | Check blocked-by links and their targets |
| Created | `created` | Age context |
| Updated | `updated` | Staleness signal |

**Comments are required** for conversation thread analysis (Tag mode Step 4) and all resolution evaluations (Evaluate mode). If the issue data you received does not include a `comments` field, that means comments **were not fetched** — it does NOT mean the issue has zero comments. Before any step that reads comments, check whether they are present in the issue data; if not, fetch them via `jira_get_issue` with `fields=comment` and `comment_limit=20`.

For **Evaluate mode**, fetch comments via per-issue `jira_get_issue` calls with `comment_limit=20` (if not already loaded) to check for resolution signals. This is O(N) API calls -- scope the issue set first using the JQL patterns below.

---

## Mode A: Tag

Given a set of issues (typically from triage Fetch), analyze each issue and produce operations to apply the appropriate blocking mechanisms.

### Procedure

For each issue, read the description **and the comment thread** and evaluate against the criteria in `jira-project-reference.md` § Needs-\* Labels and § Blocking Mechanisms.

**Chronological comment evaluation (applies to all steps).** Comments must be read in chronological order and evaluated for outstanding unanswered questions — this is a first-class signal for `needs-*` labels, not just a Step 4 concern. An unanswered question is a blocking signal regardless of the status of any referenced issues. The resolution of a blocking issue does not resolve questions that arose after — or independently of — that closure. Place comments, blocking issue closures, and field changes on a single timeline; evaluate what is still outstanding based on the sequence of events. See `persona.md` § Temporal Rigor.

#### Step 1: Check for needs-\* label applicability

Evaluate in order. An issue may qualify for multiple labels.

**needs-info:**
The generic catch-all for when we need information from a specific person we are pinging. Use when the block is conversational — someone needs to answer a question, confirm a decision, or provide missing context.
- A clarifying question has been asked (in comments) with no response
- Reporter was asked for information but hasn't responded
- Stale blocking references where specific people need to confirm whether to proceed (see Step 4)

**Important:** Description completeness (missing reproduction steps, environment details, expected behavior) is owned by the [validate-description](../jira-validate-description/SKILL.md) skill, which runs earlier in the Full Triage pipeline and applies `needs-info` when required sections are missing. Tag mode should **not** duplicate that assessment. Only apply `needs-info` here for conversational/interaction-level gaps (unanswered questions, requested info not yet provided).

**needs-ux:**
Anything UI design related. Use when the issue needs UX input before engineering can proceed.
- Issue involves UI changes but has no mockups, wireframes, or design references
- Description mentions visual or interaction changes without specifying the design
- Issue explicitly calls out a need for UX review or design work
- A discussion about whether/how something should look or behave from a design perspective is unresolved
- Issue references or depends on a `RHOAIUX` project issue (see `jira-project-reference.md` § External Jira Projects) where the design question is unresolved. **Important:** A design question can be unresolved on the *current* issue even when the referenced RHOAIUX issue is Closed/Done. The RHOAIUX closure means the design exploration is complete — but if no one has confirmed on this issue how the outcome applies (e.g., whether the feature is included in the final design, or how the resolved designs affect this work), the question remains open. Evaluate the comment thread chronologically to determine whether the question has been answered.
- An open question about layout, visual arrangement, card/column counts, or section composition exists — these are design decisions even when they feel like scope questions. This includes unanswered questions in the comment thread about design outcomes, even when the original blocking design issue has been resolved.

**needs-pm:**
Requires product direction, scope clarification, priority call, or acceptance criteria from Product Management; the team cannot determine what to build without PM input. This includes questions about whether customer need or business justification exists, or whether product direction has shifted making the work potentially irrelevant.
- Scope or requirements are ambiguous and the team cannot determine what to build
- Acceptance criteria are missing or contradictory
- Issue involves a product-level trade-off (feature scope, priority call, customer impact)
- Customer need or business justification is unclear
- Product direction may have shifted, making the work potentially irrelevant

**Guard rail:** Phrases like "disagreement about whether to do this" or "need final decision" can look like PM territory but often aren't. Before applying `needs-pm`, apply these checks in order:

1. **Check the Jira project of any referenced blocker.** If the open question points to an issue in `RHOAIUX` or another role-specific project (see `jira-project-reference.md` § External Jira Projects), classify the dependency by that project's role — not as PM.
2. **Check who the decision-maker is.** If the person asked to decide is a UX designer (or lives in the UX project), it's `needs-ux`. If it's a specific named individual in a non-PM role, it may be `needs-info`.
3. **Check the nature of the decision.** Layout decisions (how many cards, columns, or items to show), visual arrangement, component placement, section composition, and interaction behavior are **design decisions** → `needs-ux`. Product direction, business justification, customer-need validation, feature scope trade-offs, and "should we build this at all" are **product decisions** → `needs-pm`.
4. **If it's a conversation between specific people that went unanswered**, use `needs-info` with targeted pings — not a role-based label.

**needs-advisor:**
Architectural questions where the implementation path is unclear.
- Multiple viable technical approaches exist with significant trade-offs
- Implementation touches cross-cutting concerns (architecture, shared infrastructure)
- Issue describes a problem but the solution path is unclear even to experienced developers

For each applicable label not already present on the issue, produce an `ADD_LABEL` operation:

```json
{
  "action": "ADD_LABEL",
  "params": { "labels": ["needs-ux"] },
  "reason": "UI changes described without mockups or design references"
}
```

#### Step 2: Check for blocked-by link applicability

Look for signals that the issue depends on a specific other Jira issue:
- Description references another issue key (e.g., "depends on RHOAIENG-12345", "waiting for RHOAIENG-12345")
- Description contains inline Jira card links (common in ADF content)
- Blocked Reason field references a specific issue

**Before creating a link, check the referenced issue's status.** The status of the referenced issue determines the correct action:

- **Open/In Progress:** The dependency is still active. Produce a `LINK_BLOCKED_BY` operation.
- **Closed/Resolved:** The dependency may have been satisfied. **Do not** automatically assume the block is cleared — the resolution may not have addressed the specific concern. Instead, this is a signal that the block is **stale** and needs follow-up (see Step 4).

If a dependency is identified, the referenced issue is still open, and no blocked-by link already exists for that target, produce a `LINK_BLOCKED_BY` operation:

```json
{
  "action": "LINK_BLOCKED_BY",
  "params": { "blockedBy": "RHOAIENG-12345" },
  "reason": "Description states dependency on backend API in RHOAIENG-12345"
}
```

Do **not** auto-set the Blocked field when creating a link. The link itself communicates the dependency.

#### Step 3: Check for Blocked field applicability

Look for signals of external/structural blockers that are not a single Jira issue:
- Waiting on a release or z-stream
- Waiting on infrastructure or environment provisioning
- Waiting on an external team outside the Jira project
- Waiting on a vendor or third-party dependency

If an external blocker is identified and Blocked is not already True, produce a `SET_FIELDS` operation:

```json
{
  "action": "SET_FIELDS",
  "params": {
    "fields": {
      "customfield_10517": { "value": "True" },
      "customfield_10483": "Waiting on new z-stream release for the fix to ship"
    }
  },
  "reason": "Issue requires a z-stream release that has not yet been cut"
}
```

#### Step 4: Check for stale blocking references

When the description or Blocked Reason references specific Jira issues, **check those issues' statuses** (available from the issue links or via a quick lookup). If the referenced issues are **Closed/Resolved** but the current issue still appears blocked or has unresolved questions about whether to proceed:

1. **Ensure comments are loaded.** If the issue data does not include a `comments` field, fetch them now via `jira_get_issue` with `fields=comment` and `comment_limit=20`. Do not assume an absent `comments` field means zero comments — it means comments were not requested in the original fetch.
2. **Run the conversation thread analysis** (see § Conversation thread analysis below) using the issue's comments. This identifies unanswered questions, pending parties, and the full context needed to compose an actionable ping.
3. **Identify the relevant parties.** Who filed the blocking issue? Who filed the current issue? Who participated in the discussion? **Fetch the reporter and assignee of each referenced blocking issue** (via `jira_get_issue` with `fields=reporter,assignee`) — they have direct context on the resolution and whether it addresses the current issue's dependency. These are the people who can answer whether the block is cleared.
4. **Determine the actual nature of the gap.** Classify the unanswered question using the same criteria and guard rail checks as Step 1 — the nature of the *question* determines the label, not the fact that it arose from a stale blocking reference:
   - If the unanswered question is about **design, layout, visual arrangement, or section composition**, or the referenced blocking issue is in a **UX project** (e.g. `RHOAIUX`) → `needs-ux`
   - If it's about **product direction, scope, or business justification** → `needs-pm`
   - If it's about **technical approach** → `needs-advisor`
   - If it's a **generic information request** or **confirmation whether to proceed** from a specific person with no role-specific nature → `needs-info`
5. **Produce an `ADD_COMMENT`** pinging the specific people who can confirm whether the issue should proceed or be closed, citing the resolved blocking issues with full clickable URLs. Use the conversation thread analysis output to identify unanswered parties and frame the ping as a re-ping when a prior question went unanswered.
6. **Produce an `ADD_LABEL`** with the appropriate `needs-*` label from step 4 to signal the issue is waiting on a response.

**When to apply:** This step fires when ALL of the following are true:
- The description or Blocked Reason explicitly references another Jira issue as a blocker or dependency
- That referenced issue is now Closed/Resolved
- The current issue has not been updated to reflect the resolution (still in New, no comments acknowledging the closure)
- No one has confirmed whether the current issue should proceed

**Distinguishing `needs-info` from `needs-pm`/`needs-ux`:** Phrases like "disagreement about whether to do this", "need final decision", or "blocked until resolved" in the description can look like a PM or UX decision is needed. **Before assigning a role-based `needs-*` label, trace who the actual parties in the conversation are.** If the unresolved question is between specific named individuals (e.g., a UX designer and the reporter), it's `needs-info` with targeted pings — not a generic role-based label. Role-based labels (`needs-pm`, `needs-ux`, `needs-advisor`) are for when the issue genuinely requires input from a role that has not yet been engaged.

#### Step 5: Check for close suggestions in recent activity

When the comment thread contains recent activity suggesting the issue should be closed — e.g., "this can be closed," "no longer relevant," "already fixed," "recommend closing," "this is a duplicate" — the issue should not be silently moved to Backlog. Instead, surface the suggestion by pinging the reporter and relevant parties for confirmation.

**Detection criteria:** Look for comments (typically within the most recent ~5 comments or the last 30 days) where someone:
- Explicitly suggests closure ("can be closed," "recommend closing," "should be resolved")
- States the issue is no longer relevant ("no longer needed," "not applicable anymore," "outdated")
- Claims the issue is already fixed without code-level verification ("I think this was fixed," "seems fixed now")
- Suggests the issue is a duplicate or is covered by other work

The suggestion must be **substantive** — a bare "close?" or "+1 close" is not sufficient. Evaluate who made the suggestion: comments from the reporter, assignee, a domain expert, or a team lead carry more weight than a drive-by comment from an uninvolved party.

**When to apply:** This step fires when ALL of the following are true:
- A comment contains a substantive close suggestion as described above
- The suggestion is in the recent activity (within the most recent ~5 comments or last 30 days)
- The issue has not already been acted on (no subsequent comment confirming or rejecting the suggestion, no status change reflecting it)
- The reporter has not already confirmed closure in a subsequent comment

**Producing operations:**

1. **Run conversation thread analysis** before composing the comment. Trace the conversation flow to understand the close suggestion in context:
   - **Who prompted the close suggestion?** If the close suggestion is a reply to someone's question (e.g., "is this still needed?" → "no, it can be closed"), the question-asker is a key party.
   - **Who has already stated their position?** The close suggester has already given a clear recommendation. Do not re-ask them to "confirm or provide more detail" when their suggestion was already substantive — their position is on record.
   - **Who hasn't acknowledged the suggestion?** If the suggestion was directed at (or prompted by) someone who hasn't responded, that person is the primary unanswered party.

2. Identify the parties to ping based on the conversation analysis:
   - **Reporter** — always include; they filed the issue and should confirm whether it's still needed
   - **Unanswered question-asker** — if the close suggestion was a reply to someone's question and that person hasn't acted on or acknowledged the answer, ping them to act. This is often the most important ping — they initiated the inquiry and received an answer but haven't followed through.
   - **Assignee** — if present, they have context on the work
   - **Close suggester** — only re-ping if their suggestion was ambiguous, uncertain, or if they asked a question in the same comment that remains unanswered. Do **not** re-ping someone who already gave a clear, substantive close recommendation — asking them to repeat themselves is noise.
   - **Other relevant participants** — anyone else in the thread with direct context on the close rationale who hasn't weighed in

3. Produce an `ADD_COMMENT` citing the close suggestion, pinging the **unanswered parties** (not the already-answered suggester), and asking for confirmation or action:

   ```json
   {
     "action": "ADD_COMMENT",
     "params": { "comment": "### AI Triage\n\nRecent activity suggests this issue may be ready to close. [Suggester] commented on [date]: \"[quote or paraphrase].\"\n\n@[Reporter Name](accountid:...) — can you confirm whether this issue is still needed, or should it be closed?\n\n@[Unanswered Party](accountid:...) — [Suggester] recommended closing this issue on [date]. Can you confirm or take action?" },
     "reason": "Close suggestion detected in recent activity — pinging unanswered parties for confirmation"
   }
   ```

3. Produce an `ADD_LABEL` with `needs-info` to block the Backlog transition:

   ```json
   {
     "action": "ADD_LABEL",
     "params": { "labels": ["needs-info"] },
     "reason": "Close suggestion in recent activity — awaiting reporter/stakeholder confirmation before proceeding"
   }
   ```

**Why `needs-info` and not immediate closure:** The triage pipeline is not authorized to close issues based on comment suggestions alone. A suggestion to close is a signal, not a decision. The reporter and stakeholders must confirm. The `needs-info` label ensures the issue stays in New (not silently moved to Backlog) while awaiting that confirmation. If confirmed, the issue can be closed in a subsequent pass or manually.

### Tagging Guidelines

- **Do not over-tag.** Only apply labels/state when there is clear evidence the issue cannot proceed without the input. If the description is reasonably complete, don't add `needs-info` just because it could be more detailed.
- **Prefer the most specific mechanism.** If you can identify a specific blocking Jira issue, use a link rather than the Blocked field. If the blocker is a role's input, use a needs-\* label rather than the Blocked field.
- **ADD_COMMENT in Tag mode.** Tag mode generally produces label and link operations only. The exceptions are **Step 4 (stale blocking references)** and **Step 5 (close suggestions)**: when Tag mode identifies stale blocking references with specific unanswered parties, or recent comments suggesting the issue should be closed, it produces an `ADD_COMMENT` to make the `needs-info` label actionable. A bare `needs-info` label with no comment leaves no one knowing what input is needed or who to ask.
- **Do not ping the reporter for non-info blockers.** The reporter is the right person to ask for missing description details (`needs-info`), but they are not UX, PM, or a tech advisor. Adding `needs-ux`, `needs-pm`, or `needs-advisor` is a signal to the triage team, not a request to the reporter.
- **Keep reasons concise** -- one sentence citing the specific signal that drives the assessment.
- **Skip issues that already have the appropriate labels/state.** If an issue already has `needs-ux` and you agree it needs UX input, don't produce a duplicate operation.

---

## Mode B: Evaluate

Find issues with existing needs-\* labels or Blocked=True, and check whether the blocking condition has been resolved.

### Discovery JQL Patterns

All values come from `jira-project-reference.md`. Include `resolution = Unresolved` by default.

All queries include the standard filters from `jira-project-reference.md` § Standard Query Filters (type, epic link, team).

**Issues with needs-\* labels:**
```jql
project = {project_key}
  AND component = "{component}"
  AND resolution = Unresolved
  AND type in ({triage_types})
  AND "Epic Link" is EMPTY
  AND Team = {jql_team_id}
  AND labels in (needs-info, needs-ux, needs-pm, needs-advisor)
```

**Issues with Blocked=True:**
```jql
project = {project_key}
  AND component = "{component}"
  AND resolution = Unresolved
  AND type in ({triage_types})
  AND "Epic Link" is EMPTY
  AND Team = {jql_team_id}
  AND "Blocked" = "True"
```

**Combined (all potentially blocked issues):**
```jql
project = {project_key}
  AND component = "{component}"
  AND resolution = Unresolved
  AND type in ({triage_types})
  AND "Epic Link" is EMPTY
  AND Team = {jql_team_id}
  AND (labels in (needs-info, needs-ux, needs-pm, needs-advisor) OR "Blocked" = "True")
```

The user may also provide a pre-fetched issue set or specific issue keys to evaluate.

### Evaluation Procedure

#### Step 0: Build Issue Inventory (CRITICAL)

After fetching all pages from the JQL search, build a **complete, verified inventory** before evaluating any issue. The inventory is a flat list of every issue with its key, summary, and blocking signals extracted from the lightweight fetch fields (labels, Blocked field, Blocked Reason, issue links). This step ensures no issue is lost in large search responses.

**Procedure:**

1. Read the **entire** search response for each page. Jira search responses can be thousands of lines; read them in full -- do not skip or skim sections. Extract every issue key, summary, and blocking signal from every page.
2. After all pages are read, count the inventory. **Verify** the count matches the total number of issues returned across all pages (sum of issues arrays). If the counts don't match, re-read the search results until they do.
3. Report the verified count to the user: "Found N issues with blocking signals. Building inventory..."
4. Classify each issue in the inventory by its blocking mechanism(s): `needs-*` labels present, `Blocked=True`, blocked-by links, and any Blocked Reason references (extract issue keys from ADF content and URLs in the Blocked Reason field).

This inventory is the single source of truth for the rest of the evaluation. Every issue in the inventory must be evaluated -- none may be skipped or deferred without explicit reporting.

**Per-issue processing:** After the inventory and changelog analysis are complete, process issues **one at a time**. For each issue, call `jira_get_issue` with `fields=summary,status,priority,labels,assignee,issuetype,created,updated,description,reporter,comment,customfield_10840,customfield_10517,customfield_10483,customfield_10001,customfield_10464,issuelinks,components` and `comment_limit=20` to get full details including comments, evaluate all blocking mechanisms, produce operations, **verify operations** (see below), write them to the operations file on disk, and report progress (`[N/total] RHOAIENG-XXXXX -- summary: outcome`). Then move to the next issue. This bounds context usage to one issue's details at a time.

**Per-issue operation verification (required):** After producing operations for an issue and before writing them, verify every mention (`@[Display Name](accountid:...)`) in any `ADD_COMMENT` operation against the issue's known data sources. Each pinged person must be traceable to at least one of:

- **Changelog** — they set the blocker (label or Blocked field)
- **Assignee** — they are currently assigned to the issue
- **Reporter** — they filed the issue
- **Comment author** — they wrote a comment on the issue
- **Linked issue** — they are the assignee/reporter on a linked blocking issue referenced in the comment

If a pinged person cannot be traced to any of these sources for **this specific issue**, remove them from the comment and replace with the correct person from the data. This guards against cross-issue contamination and hallucinated references. Never ping someone based on assumptions or pattern-matching from other issues in the batch.

#### Preliminary: Changelog Analysis

Before evaluating individual blocking mechanisms, determine **when** each blocker was set and **who** set it. This establishes the timeline for evaluating whether resolution activity has occurred since.

1. Call `jira_batch_get_changelogs` with `fields=labels` for all issues with `needs-*` labels. Find the changelog entry where the specific `needs-*` label first appeared in the `to_string`. Record the **author** and **date**.
2. Call `jira_batch_get_changelogs` with `fields=Blocked,customfield_10517` for all issues with `Blocked=True`. Find the changelog entry where Blocked changed from False to True. Record the **author** and **date**.
3. Use these timestamps as the baseline for all subsequent evaluation: only comments, description edits, status changes, and other activity **after** the blocker was set count as resolution signals.

**Fallback when no changelog entry exists:** If the changelog returns no matching entry for a blocker (label or Blocked field), the value was likely set at **issue creation time**. In this case, use the **issue creation date** as the baseline and the **reporter** as the person to ping. This commonly happens when the reporter files an issue with `Blocked=True` already set or with `needs-*` labels applied in the initial description.

**Clone detection (critical):** When no changelog entry exists for a blocker, also check whether the issue was **cloned** from another issue. Cloned issues inherit labels, fields, and other metadata from the source. If the blocker (label or `Blocked=True`) was inherited via cloning:

1. Check the issue links for a "cloned from" / "is cloned by" relationship to identify the source issue.
2. Compare the current issue's description against the blocking signal. If the description has been **substantially rewritten** since cloning and the blocking signal (e.g., `needs-ux`) has no relevance to the current content (no UX questions, no linked UX issues, no design references), then the label is stale from the clone — not an intentional blocker.
3. In this case, **remove the inherited label** with an audit comment explaining it was inherited from the clone and is unrelated to the current issue. Do **not** treat it as a stale blocker ping — the label was never intentionally set on this issue, so there is no one to ping about it.
4. If the description has NOT changed significantly from the clone source, evaluate the blocker normally using the clone date as the baseline.

This data is used throughout the evaluation:
- **Resolution evaluation:** Only activity after the blocker date is relevant. A comment from before the label was added cannot be a resolution signal.
- **Stale detection:** The blocker age is measured from the changelog date (or issue creation date as fallback), not an arbitrary reference point.
- **Stale/unjustified blocker comments:** Ping the **person who set the blocker** (the changelog author, or the reporter as fallback) with an **action ping** — they have the most context on what the blocker means and whether it has been addressed. Use the mention syntax `@[Display Name](accountid:ACCOUNT_ID)` **only for action requests** (see `jira-triage` SKILL § User References in Comments). When citing someone for historical context (e.g., "set by Jane Doe on 2024-11-14"), use their plain display name without mention syntax — this avoids unnecessary notifications. Look up account IDs via `jira_get_user_profile` for changelog authors when composing action pings.

#### Preliminary: Status-Based Resolution Signal

Before evaluating individual blocking mechanisms, check the issue's current workflow status. Certain statuses are **strong evidence** that the blocking condition has been overcome, because the issue has progressed into active development or beyond:

| Status | Signal strength | Interpretation |
|---|---|---|
| **In Review** (Code Review) | High | A PR exists and is being reviewed. The work is done; any `needs-*` input was either provided or deemed unnecessary. |
| **In Testing** (QE) | High | Implementation is complete and being verified. Same reasoning as In Review. |
| **In Progress** | Moderate | Someone is actively working on the issue. The blocker may have been resolved informally without updating the label. Treat as a confidence booster, not conclusive on its own. |

**How to use this signal:**

- **High-signal statuses (In Review, In Testing):** Treat any `needs-*` label as almost certainly stale. The per-label evaluation below still runs, but the status alone is sufficient evidence to recommend removal even when no explicit resolution comment exists. The reason should cite the status as the primary signal (e.g., "Issue is In Review -- needs-ux label is stale; the blocking input was resolved or bypassed").
- **Moderate-signal status (In Progress):** Use as a confidence booster alongside other signals. If the per-label evaluation finds partial or ambiguous evidence of resolution, the In Progress status tips it toward "resolved." On its own, In Progress is not enough to recommend removal.
- **Blocked field (`Blocked=True`):** Status-based signals apply to `needs-*` labels but NOT to the Blocked field. An issue can be In Review while still structurally blocked (e.g., waiting on a z-stream to ship the fix). Evaluate the Blocked field independently using the standard criteria below.

#### Evaluating needs-info

**Check:** Has the reporter or another knowledgeable party provided the requested information?

1. From the changelog analysis, identify the exact date the `needs-info` label was added and who added it. Only activity **after** that date is relevant.
2. Read the comments chronologically from that date forward. Look for comments from the reporter or other contributors that address the open questions.
3. Check if the description has been updated with the requested details (compare `updated` timestamp against the label addition date from the changelog).
4. If `needs-info` was applied due to incomplete description (look for a validate-description comment with a missing-sections checklist), re-evaluate the description against `jira-project-reference.md` § Description Quality Criteria for the issue's type. If the previously missing required sections are now present in the description, treat it as resolved.
5. **Resolved if:** A comment substantively answers the questions or provides the missing details (reproduction steps, environment info, expected behavior), **or** the description has been updated to include the previously missing required sections. A simple "bump" or "any update?" does not count.
6. **Not resolved if:** No new substantive comments since the label was applied, and the description still lacks the requested information.

#### Evaluating needs-ux

**Check:** Has UX guidance been provided with confidence?

1. Look for comments from UX team members that include:
   - Links to design deliverables (Figma, Miro, Google Docs, or similar)
   - Links to UX issues that have been closed/resolved
   - Clear written design decisions with enough detail to implement
2. Check linked issues: if the issue has links to UX-related issues, check if those linked issues are resolved.
3. **Resolved if:** A comment provides a concrete design deliverable or a clear, confident design decision. The guidance must be actionable -- not just "we'll look into it" or "acknowledged".
4. **Not resolved if:** No design input, or only tentative/questioning responses that lack the confidence needed to proceed.

#### Evaluating needs-pm

**Check:** Has PM provided direction with confidence?

1. Look for comments from PM that include:
   - Clear scope decisions or acceptance criteria
   - Product direction statements
   - Links to PRDs, product docs, or PM issues that have been resolved
2. Check linked issues: if the issue has links to PM-related issues, check if those linked issues are resolved.
3. **Resolved if:** A comment provides a clear, confident product decision or scope clarification. Must be actionable guidance, not just acknowledgement.
4. **Not resolved if:** No PM input, or only tentative responses without clear direction.

#### Evaluating needs-advisor

**Check:** Has a technical lead provided an implementation recommendation?

1. Look for comments from senior engineers or architects that include:
   - A recommended technical approach
   - Architecture decisions or design patterns to follow
   - Links to resolved spike/investigation issues
2. Check linked issues: if the issue has links to spike or investigation issues, check if those are resolved.
3. **Resolved if:** A comment provides a clear technical recommendation with enough detail to unblock implementation.
4. **Not resolved if:** No technical guidance, or only partial analysis without a recommendation.

#### Evaluating Blocked-by Links

**Check:** Has the blocking issue been resolved?

1. For each "is blocked by" link on the issue, fetch the linked issue's status.
2. **Resolved if:** The linked issue's status category is "Done" (resolved/closed).
3. **Partially resolved:** If the issue has multiple blocked-by links, some may be resolved while others are not. Report each independently.
4. Note: Do not produce operations to remove the link itself -- links serve as history. Instead, if the Blocked field is also True and all blocked-by links are resolved, produce an operation to clear it.

#### Evaluating Blocked=True (Blocked Reason)

**Check:** Has the external/structural blocker been resolved?

1. Read the Blocked Reason field for context on what the blocker is.
2. Check comments for signals that the condition has been addressed (e.g., "z-stream has been released", "environment is now available").
3. Check if the Blocked Reason references a specific issue -- if so, check that issue's status.
4. **Resolved if:** Comments or linked issue status indicate the blocking condition no longer applies.
5. **Not resolved if:** No signal that the external condition has changed, or insufficient confidence.

### Producing Resolution Operations

When a blocker appears resolved, produce operations to clear it:

**For needs-\* labels:**

```json
[
  {
    "action": "REMOVE_LABEL",
    "params": { "labels": ["needs-ux"] },
    "reason": "UX guidance provided: Figma link in comment by Jane Smith (Mar 20)"
  },
    {
      "action": "ADD_COMMENT",
      "params": { "comment": "### AI Triage\n\nRemoving `needs-ux` — design guidance provided in comment by Jane Smith (Mar 20) with Figma mockups covering the notification panel layout." },
      "reason": "Audit trail for label removal"
    }
]
```

**For Blocked field:**

```json
[
  {
    "action": "SET_FIELDS",
    "params": {
      "fields": {
        "customfield_10517": { "value": "False" }
      }
    },
    "reason": "Blocking condition resolved: z-stream 2.24.1 released per comment from Mar 22"
  },
  {
    "action": "ADD_COMMENT",
    "params": { "comment": "### AI Triage\n\nClearing blocked status -- the z-stream release has shipped." },
    "reason": "Audit trail for blocked field change"
  }
]
```

#### Detecting Stale or Unjustified Blockers

In addition to checking whether blockers have been resolved, Evaluate mode proactively detects blockers that appear stale, unjustified, or unclear.

**Stale blockers:** A `needs-*` label or `Blocked=True` state that has been present for an extended period with no activity suggesting progress toward resolution. Use the changelog date (not issue creation date) to measure staleness.

##### Conversation thread analysis (required for stale blocker pings)

Before composing a stale-blocker ping comment, **trace the comment thread** to build a picture of who was asked for what, and whether they answered. This produces a richer, more actionable ping than simply pinging the label-setter alone.

**Procedure:**

1. Read all comments chronologically from the date the blocker was set (changelog date or issue creation as fallback).
2. For each comment, identify:
   - **Author** (who wrote it)
   - **Mentions / directed questions** — look for @mentions, "cc @name", direct questions addressed to a named person, or phrases like "waiting on [name]", "[name] can you..."
   - **Content** — is it asking a question, providing information, or a status bump?
3. Build a **pending questions list**: for each question or request directed at a specific person, check whether a later comment by that person (or someone acting on their behalf) substantively answers it. A "bump" or "+1" is not an answer.
4. Evaluate **relevance** — has the project, feature, or context changed enough that the original question may no longer apply? If so, note that in the ping.
5. **Look up referenced blocking issue parties.** When the Blocked Reason, description, or issue links reference specific Jira issues as blockers or dependencies, fetch each referenced issue's **reporter** and **assignee** (via `jira_get_issue` with `fields=reporter,assignee`). These people worked on the blocking issue and know what the resolution means for the current issue's dependency. This step is critical when the current issue has few or no comments — the relevant decision-makers may exist only on the blocking issues, not on the current issue's thread.
6. Identify the **best-directed audience** for the follow-up ping:
   - **Label-setter** — always include; they have context on why the blocker was set.
   - **Referenced blocking issue parties** — the reporter and/or assignee of each referenced blocking issue that is now Closed/Resolved. Ping them with a **specific question** about the outcome: what was the decision, does the resolution address the current issue's dependency, should the current issue proceed? These people are often the most important to ping because they hold the answer — especially for design explorations, scope decisions, or technical spikes that the current issue was waiting on.
   - **Unanswered parties** — anyone who was asked a question in the comment thread and has not responded. Note what specific question or information is pending from them.
   - **Reporter** — include only for `needs-info` (they can provide missing details). Do not ping the reporter for `needs-ux`, `needs-pm`, or `needs-advisor`.

**Comment structure for stale pings:**

The `ADD_COMMENT` for a stale blocker should:
- **Link every Jira issue key.** Every occurrence of a Jira issue key in the comment must be a clickable markdown link: `[KEY](https://redhat.atlassian.net/browse/KEY)`. This applies to *every* mention — not just the first. See `jira-triage` SKILL § Issue and External References in Comments for the full rule covering both Jira and GitHub references.
- State the staleness context using **plain names** for historical attribution (e.g., "set by Jane Smith on 2024-11-14") — no @mention for context
- **Action-ping** the label-setter for overall status using `@[Display Name](accountid:...)` — this is a request for them to respond
- **Action-ping** each referenced blocking issue party with a **specific question about the outcome** of their issue (e.g., "@[Kyle Walker](accountid:...) — you filed [RHOAIUX-296](https://redhat.atlassian.net/browse/RHOAIUX-296) to explore options for the 'enable your team' section. What was the outcome? Should the 4th column be added?"). Tailor the question to what the blocking issue was about — design decision, scope exploration, technical spike, etc.
- Separately **action-ping** each unanswered party from the comment thread, stating what is pending from them (e.g., "@[Jane Smith](accountid:...) — UX mockups for the notification panel were requested on Feb 12 and haven't been provided")
- Note the total staleness duration
- Ask whether the blocker is still relevant or if the issue should be closed/re-scoped

##### Per-label stale rules

- If a `needs-*` label has been present for **30+ days** with no comments addressing it, produce an `ADD_COMMENT` using the conversation thread analysis above:
  - `needs-info`: Ping the label-setter, unanswered parties from the thread, **and** the reporter. `needs-info` is the **only** `needs-*` label where pinging the reporter is appropriate -- they are the person who can provide the missing details.
  - `needs-ux`: Ping the label-setter and any unanswered UX contacts from the thread. Do **not** ping the reporter -- they are not UX.
  - `needs-pm`: Ping the label-setter and any unanswered PM contacts from the thread. Do **not** ping the reporter.
  - `needs-advisor`: Ping the label-setter and any unanswered technical contacts from the thread. Do **not** ping the reporter.

- If `Blocked=True` has been set for **30+ days** with no update to the Blocked Reason or relevant comments, produce an `ADD_COMMENT` pinging **the person who set Blocked=True** (from changelog analysis), plus any unanswered parties identified in the thread, asking whether the external condition has changed.

**Unjustified blockers:** A `needs-*` label or `Blocked=True` state where the rationale is unclear or missing. Apply conversation thread analysis here too — the thread may contain context that the fields lack.

- If `Blocked=True` but the Blocked Reason field is empty and no `needs-*` labels explain why, produce an `ADD_COMMENT` pinging **the person who set the blocked state** (from changelog analysis) and asking them to provide a reason. If the thread reveals unanswered parties or context, include them.
- If a `needs-*` label is present but there is no comment or description text explaining what input is needed, produce an `ADD_COMMENT` pinging **the person who added the label** and asking for clarification. If a later comment directed a question to someone specific who hasn't responded, ping them too with the pending question.

**Blocked-by link to resolved issues with "Won't Do" resolution:**

When evaluating blocked-by links, check the resolution of the linked issue:

- **Done:** The blocker is genuinely resolved. Clear the Blocked field if all blocked-by links are resolved.
- **Won't Do / Won't Fix:** The blocking dependency will NOT be delivered. This does NOT automatically unblock the issue -- it means the original plan is no longer viable. Produce an `ADD_COMMENT` flagging that the dependency was closed as "Won't Do" and asking the assignee/reporter to determine next steps (re-scope, find alternative, or close the blocked issue too). Additionally, check whether the closed issue was the **delivery vehicle for role-specific input** (see § Won't Do and needs-\* label re-application below).
- **Duplicate:** Check the duplicate target's status. If the target is resolved, treat as if the original blocking issue was resolved. If the target is still open, the blocker is not yet resolved.

**Won't Do and needs-\* label re-application:**

When a blocking dependency (blocked-by link, Blocked Reason reference, or inline issue reference) is closed as **Won't Do**, **Not a Bug**, or **Obsolete**, check whether that dependency was the **delivery vehicle for a specific role's input** -- e.g., a UX design issue, a PM requirements issue, or an architectural spike. If the blocked issue's feature still requires that role's input and the corresponding `needs-*` label is not already present, produce an `ADD_LABEL` operation to surface the unresolved need.

| Closed issue type | needs-\* to apply | Condition |
|---|---|---|
| UX design issue (Figma, mockups, interaction design) | `needs-ux` | The blocked issue still involves UI changes that require design guidance |
| PM requirements / scope issue | `needs-pm` | The blocked issue still needs product direction or acceptance criteria |
| Architecture spike / technical investigation | `needs-advisor` | The blocked issue still has unclear technical approach |

**Why this matters:** When someone blocks an issue on a UX/PM/arch dependency, they are implicitly saying "this issue needs that role's input, and we're tracking it via that other issue." If the other issue is closed without delivering, the need doesn't disappear -- it just lost its tracking vehicle. Re-applying the `needs-*` label ensures the need remains visible in the triage queue.

**Do not re-apply** if the blocked issue itself has been re-scoped to no longer require that input, or if a comment indicates the role's input was obtained through other means. The `ADD_COMMENT` should explain the reasoning (e.g., "Re-adding `needs-ux` — the UX design issue [RHOAIUX-1408](https://redhat.atlassian.net/browse/RHOAIUX-1408) was closed as Won't Do, but this feature still requires design guidance for the settings UI").

### Evaluation Guidelines

- **Every issue in the inventory must be evaluated.** Do not skip, defer, or batch-summarize issues. Each issue gets its own per-issue detail fetch, evaluation, and progress report. If an issue has no actionable finding, report it as "no change" in the progress line -- do not silently omit it. The final progress line must be `[N/N]`.
- **Err on the side of caution.** Only flag a blocker as resolved when there is clear, confident evidence. If ambiguous, leave it in place and note the uncertainty in the dry-run output.
- **Audit trail is mandatory.** Every label removal or blocked field change must be paired with an `ADD_COMMENT` explaining what resolved the blocker and citing the specific signal (comment author, date, link).
- **Link every Jira issue key in comments.** Every `ADD_COMMENT` operation — audit trail, stale ping, or resolution — must link every occurrence of a Jira issue key as `[KEY](https://redhat.atlassian.net/browse/KEY)`. This includes repeated mentions of the same key. See `jira-triage` SKILL § Issue and External References in Comments.
- **Order operations correctly.** The comment explaining the change should come before label removal or field update so the audit trail is in place first.
- **Report uncertain cases.** If a blocker might be resolved but confidence is low, include the issue in the dry-run summary with a note explaining the uncertainty. Let the user decide.
- **Linked issue-key summaries.** When presenting dry-run or execution summaries from this skill's output (directly or via `jira-triage` Apply), group by Jira issue key and render each key as a clickable markdown link: `[RHOAIENG-12345](https://redhat.atlassian.net/browse/RHOAIENG-12345)`.
- **Evaluate each mechanism independently.** An issue may have `needs-ux` resolved (mockups provided) but still be Blocked=True (waiting on infrastructure). Clear the resolved mechanism without touching the unresolved one.
- **Stale blocker comments are informational, not auto-clearing.** When flagging stale or unjustified blockers, produce `ADD_COMMENT` only -- never auto-remove labels or clear Blocked state based on staleness alone.
- **Every confirmation request must address someone.** If a comment asks for confirmation (e.g., "Please confirm whether this issue is still needed"), it **must** mention a specific person with `@[Display Name](accountid:ACCOUNT_ID)`. A dangling ask with no addressee is not actionable. Fallback chain for who to ping: (1) the **assignee**, if present — they have direct context on the work; (2) the person who **set the blocker** (from changelog); (3) the **reporter**. When multiple people have relevant context (e.g., an assignee exists AND someone else set the blocker), ping both. Never leave a "please confirm" without a named recipient.

---

## Output

Output MUST validate against [`operations-schema.json`](../jira-triage/operations-schema.json). Comment visibility (`Red Hat Employee`) is enforced at execution time by the Apply step -- see `jira-triage` SKILL § Comment Visibility. Actions by mode:

| Mode | Actions produced |
|---|---|
| Tag | `ADD_LABEL`, `LINK_BLOCKED_BY`, `SET_FIELDS`, `ADD_COMMENT` (Steps 4 and 5 — stale blocking references and close suggestions) |
| Evaluate | `REMOVE_LABEL`, `SET_FIELDS`, `ADD_COMMENT`, `ADD_LABEL` (`needs-*` re-application per § Won't Do) |

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

The output flows into the Apply capability of the triage infrastructure. When invoked standalone (outside Full Triage), Apply defaults to **dry-run mode**: it validates, presents the summary, writes the operations file to `.artifacts/triage/`, and stops. The user reviews the file and explicitly applies it later. To execute immediately, the user must request it (e.g., "evaluate blockers and apply"). Summary presentation must follow `jira-triage` Step 2/Step 7 formatting: group by issue key and hyperlink each key to Jira.

---

## Example: Tag Mode

Given issue RHOAIENG-54966 ("Add Subscription column to the API Keys table") with no needs labels and a description referencing dependency on RHOAIENG-54596:

```json
{
  "metadata": {
    "generated": "2026-03-25T14:00:00Z",
    "query": "Triage batch of 5 new issues",
    "issueCount": 1
  },
  "operations": [
    {
      "issueKey": "RHOAIENG-54966",
      "summary": "Add Subscription column to the API Keys table",
      "action": "LINK_BLOCKED_BY",
      "params": { "blockedBy": "RHOAIENG-54596" },
      "reason": "Description states dependency on backend API work in RHOAIENG-54596"
    }
  ]
}
```

## Example: Evaluate Mode

Given issue RHOAIENG-12345 with `needs-ux` label and a recent comment from a UX designer with a Figma link:

```json
{
  "metadata": {
    "generated": "2026-03-25T14:00:00Z",
    "query": "project = RHOAIENG AND component = \"AI Core Dashboard\" AND resolution = Unresolved AND labels in (needs-ux)",
    "issueCount": 1
  },
  "operations": [
    {
      "issueKey": "RHOAIENG-12345",
      "summary": "Redesign notification panel layout",
      "action": "ADD_COMMENT",
      "params": { "comment": "### AI Triage\n\nRemoving `needs-ux` — design guidance provided in comment by Sarah Chen (Mar 20) with Figma mockups covering the notification panel layout." },
      "reason": "Audit trail for label removal"
    },
    {
      "issueKey": "RHOAIENG-12345",
      "summary": "Redesign notification panel layout",
      "action": "REMOVE_LABEL",
      "params": { "labels": ["needs-ux"] },
      "reason": "UX designer Sarah Chen provided Figma mockups in comment on Mar 20"
    }
  ]
}
```
