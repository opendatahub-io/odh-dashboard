# Step 6b: Review mode

When all proposed tickets match existing children, review the existing tickets for accuracy against the current prototype.

## Per-ticket assessment

For each active (non-Closed) child ticket:

1. **Read the full ticket** — summary, description, ACs, status, assignee
2. **Cross-reference ACs against prototype** — for each AC:
   - Does the prototype still support it?
   - Is the AC specific enough for `/prototype-spec` to scope against?
   - Does it match current PF components and props?
3. **Identify gaps** — prototype elements not covered by any ticket
4. **Identify staleness** — ACs referencing changed or removed features
5. **Identify scope drift** — tickets with overlapping ACs or gaps between them

## Review output

```text
## Epic Review — [EPIC-KEY]

**Prototype**: [url] (commit: [SHA])
**Active tickets**: [count] ([X] stories, [Y] tasks)
**Closed tickets**: [count]

### Per-Ticket Assessment

#### [KEY] — [Summary] ([Status])
- **Coverage**: [Full / Partial / Stale]
- **Findings**:
  - [AC text is stale — prototype component or behavior has changed]
  - [Missing AC — prototype added a new interactive element not covered by any AC]
- **Suggested changes**: [specific AC additions, removals, or rewording]

### Gaps (not covered by any ticket)
- [Feature X has no ticket — should be added]

### Overlaps
- [KEY-1] and [KEY-2] both mention [feature]

### Summary
| Metric | Count |
|---|---|
| Tickets reviewed | [N] |
| Fully accurate | [N] |
| Need AC updates | [N] |
| Stale / should close | [N] |
| Missing tickets | [N] |
```

Then ask:

> **Review complete.** You can:
> - **"show updates"** to see exact description/AC changes before applying
> - **"create missing tickets"** to preview and create tickets for gaps
> - **"update [KEY] with [change]"** to revise a specific ticket
> - **"looks good"** if no changes needed
> - **"cancel"** to take no action

## Jira write safety rules

1. **Never edit without showing the exact change first.** Present the diff per ticket:
   > **Proposed update to `[KEY]`:**
   > - **Remove AC**: "[old text]"
   > - **Add AC**: "[new text]"
   >
   > Apply this update? (yes / no / edit)

   Only call `editJiraIssue` after user confirms each update.

2. **Never create without preview.** "create missing tickets" must show full ticket preview (same as Step 7) and wait for approval.

3. **Never close or delete tickets.** Recommend manual close for stale tickets.
