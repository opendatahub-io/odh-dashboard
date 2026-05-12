# Jira Project Reference -- RHOAI Dashboard

Single source of truth for all Jira-specific values used by triage skills. This file is referenced by `SKILL.md` and all analysis skills in the epic.

**This is a living document.** Update it whenever you encounter a value not already listed.

## Project Constants

| Constant | Value | Notes |
|---|---|---|
| Project key | `RHOAIENG` | |
| Component | `AI Core Dashboard` | |
| Team field | `customfield_10001` | Jira Teams (`atlassian-team`). **JQL** name: `Team`; dashboard value: `ec74d716-af36-4b3c-950f-f79213d08f71-1809`. **Search/get fields:** include `customfield_10001` (not legacy ids). **SET_FIELDS:** `{"customfield_10001": "ec74d716-af36-4b3c-950f-f79213d08f71-1809"}` for RHOAI Dashboard (plain string, **not** `{"id": "..."}` — the MCP tool double-wraps object values). |
| Epic Link field | `customfield_12311140` | |
| Severity field | `customfield_10840` | Select (option). Values: Critical, Important, Moderate, Low, Informational. SET_FIELDS format: `{"customfield_10840": {"value": "<name>"}}` |
| Blocked field | `customfield_10517` | Select (option). Values: `"True"`, `"False"`. JQL name: `Blocked`. SET_FIELDS format: `{"customfield_10517": {"value": "True"}}` |
| Blocked Reason field | `customfield_10483` | Paragraph (ADF). Free-text explanation of the blocking condition. |
| Activity Type | `customfield_10464` | Select (option). **JQL** name: `Activity Type`. Exact option **values** (use in SET_FIELDS): `Tech Debt & Quality`, `Learning & Enablement`, `New Features`. Format: `{"customfield_10464": {"value": "<exact value>"}}` |
| Blocks link type | ID `10000` | Outward text: "blocks", Inward text: "is blocked by". Use `jira_create_issue_link` with `link_type: "Blocks"`. |
| Duplicate link type | | Outward text: "duplicates", Inward text: "is duplicated by". The **outward** issue ("duplicates X") is the copy; the **inward** issue ("is duplicated by Y") is the canonical/surviving one. See § Duplicate Link & Resolution Semantics below. |
| Affects Version/s | `versions` | Standard Jira field (array). Lists the product versions where the issue was observed. |
| Comment visibility | `{"type":"group","value":"Red Hat Employee"}` | **All** comments posted by triage skills must use this visibility restriction. Restricts comments to Red Hat employees only. **MCP:** pass as `visibility` parameter (JSON string). **REST API:** include as `visibility` object in the POST body. |

### Duplicate Link & Resolution Semantics

Jira's "Duplicate" link type has **directionality**, and the linked issue's **resolution** determines what the closure means. Getting this wrong can cause an agent to close the canonical issue by mistake.

| Link text on current issue | Meaning | Current issue is… |
|---|---|---|
| "is duplicated by RHOAIENG-Y" | Y is a copy of this issue | The **canonical/surviving** issue — must stay open |
| "duplicates RHOAIENG-X" | This issue is a copy of X | The **copy** — candidate for closure |

**Resolution on the linked issue matters:**

| Linked issue resolution | What it means | Safe to conclude work is done? |
|---|---|---|
| `Duplicate` | The linked issue was closed as a copy — it was housekeeping cleanup | **No.** It says nothing about work completion. If the current issue "is duplicated by" a Duplicate-resolved issue, the current issue is the canonical one and remains open. |
| `Done` / `Fixed` / `Resolved` | The linked issue's work was completed | **Maybe.** Treat the linked issue's fix as a candidate to verify, but do not auto-close — the fix may not cover the current issue's full scope, or the bug may have resurfaced. |
| `Won't Do` / `Won't Fix` | The linked issue was deliberately declined | **No.** Does not imply the current issue should also be declined. |

**Rule: Never close an issue solely because a linked issue is closed. Always check the linked issue's resolution to understand *why* it was closed, and only draw conclusions consistent with that resolution.**

## GitHub Repository

| Constant | Value |
|---|---|
| Owner | `opendatahub-io` |
| Repo | `odh-dashboard` |
| Upstream remote | `upstream` (convention; verify with `git remote -v`) |
| Default branch | `main` |

## External Jira Projects (Role Signals)

Referenced Jira issues often live in projects owned by specific roles. When an issue references or depends on an issue in one of these projects, **use the project key as a strong signal for classifying the nature of the dependency** (which `needs-*` label to apply, who the blocking party is).

| Project Key | Role / Team | Examples |
|---|---|---|
| `RHOAIUX` | UX / Design | Design explorations, mockups, interaction patterns, layout decisions, visual arrangement, component placement |

**How to use:** When evaluating blockers (Tag or Evaluate mode), if an issue references `RHOAIUX-xxx` as a dependency, blocker, or source of an open question, that dependency is almost certainly **UX-related** — classify it as `needs-ux`, not `needs-pm` or `needs-info`. The same principle applies to other project keys as they are identified.

**Design decisions vs product decisions:** Questions that are answered by referencing a UX project issue — layout (how many cards/columns), visual arrangement, component placement, interaction behavior, section composition — are **design decisions** even when they feel like scope questions. The test: *is the authority who would resolve this a designer or a product manager?* If the referenced issue or person is UX, it's `needs-ux`.

## Issue Types

| Type | Use for |
|---|---|
| Bug | Defect in existing functionality |
| Story | User-facing enhancement small enough to go directly into the team backlog |
| Task | Non-user-facing work (refactors, infrastructure, dev tooling, test improvements) |

### Template Issues

Some Jira issues are **templates** — recurring blueprints that teams clone to create actual work items (e.g., sprint-start learning activities, nightly build analysis). Templates are not real work items and must be left alone by the triage pipeline.

**Detection signals** (any one is sufficient to classify as a template):

| Signal | Examples |
|---|---|
| Summary contains "TEMPLATE" (case-insensitive) | "TEMPLATE - Learning Activities", "Nightly build analysis - TEMPLATE", "[TEMPLATE] Sprint Retrospective" |
| Labels include a template-related label | `template` |
| Description is primarily placeholder/boilerplate | Fill-in markers like `[replace this]`, `TODO:`, repeating placeholder sections with no real content |

**Triage behavior:** Template issues are detected at Step 2.0a (Template Gate) and produce a single `NO_OP`. No other operations are emitted — no team assignment, no analysis pipeline, no status transition, no `ai-reviewed` label. Templates are not work items and should not be touched at all.

### Standard Query Filters

All triage and sub-triage queries use a common set of filters to scope results to actionable dashboard team issues. Use the positive type filter rather than a negative exclusion list -- this is resilient to new issue types being added to the project.

| Filter | JQL | Why |
|---|---|---|
| Type | `type in (Bug, Story, Task)` | Only triage-eligible types. Excludes Sub-tasks (managed by parent), Epics/Initiatives (planned at program level), and Vulnerabilities (auto-generated with their own lifecycle). |
| Epic Link | `"Epic Link" is EMPTY` | Issues inside an epic are managed as part of the epic's planned work and do not belong in the triage queue. |
| Team | `Team = {jql_team_id}` | Sub-triage queries (blockers, area labels, etc.) should only process issues already assigned to the dashboard team. |

**Exception -- Full Triage / Untriaged issues:** The Full Triage query for New issues uses `(Team is EMPTY OR Team = {jql_team_id})` instead of strict team match, because incoming issues may not yet have a team assigned. The triage pipeline's team gate (Step 2a) evaluates and assigns the team.

### Dashboard ownership (triage scope)

All **dashboard triage** analysis skills and Full Triage Steps 2b–2d apply only to issues **owned by the RHOAI Dashboard** program team (Jira Team field = dashboard value, or empty with positive dashboard evidence at the team gate).

- If an issue **belongs to another program team** or the Team field is set to a **non-dashboard** team, **do not** continue dashboard triage for that issue: no analysis pipeline, no dashboard-area or scrum labeling on behalf of another team.
- **Full Triage:** Step 2a enforces this before Step 2b. If Step 2b reveals a wrong-team mistake, stop and omit that issue from the Apply batch (see `jira-triage` SKILL Step 2b).
- **Standalone skill use:** If while reading an issue you conclude it is not dashboard-owned, produce **no operations** for that issue.

### When *not* to treat an issue as dashboard-owned (team gate)

Dashboard Full Triage uses JQL `component = "AI Core Dashboard"` (among other filters). That only means the **AI Core Dashboard** component is **one of** the components on the card — not that the dashboard program team owns the work. Apply the checks below **before** looking for positive dashboard evidence. When these signals dominate, **skip** the issue (no Team assignment to RHOAI Dashboard, no Steps 2b–2d).

| Signal | Why it matters |
|---|---|
| **Multiple components** | If **Components** includes **any** component **in addition to** `AI Core Dashboard`, Jira may be recording **relationship, impact, or duplicate visibility** — not that the dashboard program team owns the work. Treat multi-component cards as **ambiguous** until **explicit** dashboard UI/BFF/repo evidence (below) appears. |
| **Labels outside dashboard triage taxonomy** | Labels that look like **another subsystem**, **CI pipeline**, **service name**, or **team-local tagging** — and **no** `dashboard-area-*` label — suggest categorization for a **different** intake. That is weak evidence *for* assigning the issue to dashboard triage. Do **not** enumerate product-specific label names in rules; judge from context. |
| **Description centers on backend/API/automation, not the dashboard UI** | When the narrative is dominated by **HTTP/API behavior**, **service error codes**, **contract or OpenAPI drift**, **cluster-integrated test jobs**, **feature-file or automated tests against a backend** — and **nothing** ties the fix to a **dashboard page**, **PatternFly/UI**, **routes in this repo**, or **this repo's Express/BFF** — treat ownership as **likely outside** the dashboard team unless proven otherwise. Prose in the description that frames work as **tests or jobs for another named subsystem** (not the web dashboard) reinforces that reading. |
| **Composite (strong skip)** | **Additional non-dashboard component(s)** **and** **labels that imply another surface** (per above) **and** **backend/API/automation-only description without UI/repo evidence** → default **skip** for dashboard triage unless **explicit** evidence links the change to dashboard scope. |
| **Only `AI Core Dashboard` on the card** | Multiple components are a **strong** hint, not a prerequisite. The same **backend/API/automation-only, no-UI** pattern can still warrant **skip** when only the dashboard component is listed (e.g. cross-component link or mis-filed). Use `jira-triage` Step 2a — no positive dashboard evidence — to **skip**. |

**Illustrative pattern (out of scope):** Issues that match the composite row: extra Jira component + non-dashboard label vocabulary + description only about API/tests/services — **skip** at team gate; do not assign the dashboard Team field or run dashboard analysis for the owning program of that other component.

### Issue Type Classification Criteria

Use the following decision flow when evaluating whether an issue has the correct type. Evaluate in order -- the first match wins.

#### 1. Is it a Bug?

The issue describes broken behavior in something that already exists. Signals:

- Regression (something that previously worked no longer does)
- Error, crash, or unhandled exception
- Incorrect output or data loss
- Security vulnerability in existing code
- Behavior that contradicts documented or expected functionality

**Exception — flaky Cypress / CI tests (keep Task):** Issues that track **intermittent Cypress or CI failures** (flakes, timing races, unstable specs, “page updated while command was executing”) belong as **Task**, not Bug, when the work is **test hardening or test stability**. Past experience: many flakes trace to how tests are written or synchronized, not to a reproducible end-user product defect. Signals include explicit **flake** / **flaky** wording, labels such as `dashboard-cypress-flake`, focus on a **`.cy.ts`** (or similar) spec and CI output without a described **user-visible** broken workflow in the product. **Do not** change **Task → Bug** or **Story → Bug** for triage on that basis alone; misfiled **Story** flakes should become **Task** via the Task classification step below. If the issue clearly describes **reproducible broken product behavior** for users (distinct from test instability), classify or keep as **Bug** per the signals above.

If the content describes a defect but the type is not Bug, change it to Bug — **except** when the exception above applies (flake/stability work filed as Task or Story).

#### 2. Is it a Task?

The issue describes non-user-facing technical work. Signals:

- Refactoring or code cleanup
- Infrastructure, CI/CD, or build changes
- Dev tooling improvements
- Test improvements (new tests, test framework changes, **Cypress/CI flake fixes** — see Bug exception above)
- Documentation updates (developer docs, ADRs)
- Dependency updates

If the content describes non-user-facing work but the type is not Task, change it to Task.

#### 3. Is it user-facing work?

If the issue is neither a Bug nor a Task, it describes user-facing work. Determine whether it qualifies as a **Story** or needs to be flagged as a **feature-request**.

**Qualifies as a Story** (add `enhancement` label) -- must meet ALL of:

- **Relevant to an existing feature.** The enhancement extends or improves something already in the product, not a net-new product area.
- **Minor in scope.** Limited UI surface -- single component, small behavioral change, no new pages or sections. Could reasonably be implemented in one sprint.
- **Clear enough to act on.** The work can be described without needing an epic, product discovery, or cross-team coordination.

Examples that qualify as Story:
- UX department issues with clear scope and design direction
- Small usability improvements (better defaults, clearer labels, improved empty states)
- Minor UI additions to existing pages (a column in a table, a filter option)
- Accessibility fixes that add visible behavior
- Small behavioral tweaks requested by users or QE

**Too large for a Story** (add `feature-request` label) -- any of these disqualify:

- Introduces a net-new product area, page, or section
- Requires significant workflow changes across multiple components
- Needs new integrations or backend capabilities that don't exist yet
- Scope is unclear or requires product discovery
- Multi-sprint effort that should be tracked under an epic
- The request has no obvious fit with any existing feature area

Do NOT change the issue type for feature requests. Add the `feature-request` label so they can be filtered for later RFE handling.

**When ambiguous**, lean toward `feature-request`. It is better to require explicit approval for the fast path to the backlog than to let large work slip through as a Story.

### Activity Type (`customfield_10464`)

Program field with three options. Triage uses it as a **strong signal** for issue-type classification and **sets or corrects** it when validating issue type (see `jira-validate-issue-type`). **Do not** treat the reporter’s value as authoritative — always confirm against summary and description — but when Activity Type is already set and **consistent** with the text, weight it heavily (require clearer contradictory evidence before changing issue type).

| Option | Meaning | Issue type mapping |
|---|---|---|
| **Tech Debt & Quality** | Defects, hardening, refactors, CI/CD, tests, internal quality | **Bug** or **Task** (per Bug vs Task vs user-facing rules above) |
| **Learning & Enablement** | Training, enablement, onboarding, docs whose primary purpose is learning | **Task** only — if content is truly user-facing net-new enhancement, reporter may have mis-set; validate and correct type + Activity |
| **New Features** | User-facing enhancements and new capability in the product UI/workflow | **Story** when the card is a proper Story — if content describes only a defect or internal work, reporter mis-set; validate and correct type + Activity |

**Setting the field:** Whenever triage determines the correct `issuetype`, set Activity Type to the row that matches **content + type** (see skill). Prefer **one** `SET_FIELDS` operation that includes both `issuetype` and `customfield_10464` when either changes. If the issue type is already correct but Activity Type is empty or wrong, emit `SET_FIELDS` for `customfield_10464` alone.

**Choosing between Tech Debt & Quality and Learning & Enablement for Tasks:** Default to **Tech Debt & Quality** for refactors, tooling, CI, tests, developer docs, and code cleanup. Use **Learning & Enablement** when the work is primarily about teaching, workshops, onboarding flows, or customer/partner enablement content (still filed as Task).

## Description Quality Criteria

Defines the expected description structure per issue type. The validate-description skill evaluates issues against these criteria. Evaluate substance over structure -- a description that covers the required information in prose is fine even if it doesn't use headings or a template.

**General quality bar:** A description that consists of only a title restatement, a single vague sentence, or is otherwise insufficient for another engineer to understand the issue should be flagged regardless of type.

### Bug

| Category | Sections | Notes |
|---|---|---|
| **Required** | Problem description | What is broken? Clear statement of the defect. |
| **Required** | Steps to reproduce | Numbered steps to trigger the issue. The single most important section for bugs -- always flag if missing. |
| **Required** | Observed behavior | What actually happens (error message, wrong result, crash). |
| **Required** | Expected behavior | What should happen instead. |
| **Required** | Environment | Product version (e.g., RHOAI 2.19). For UI bugs: browser and version, production build vs dev environment. |
| **Required** | Reproducibility | Always, sometimes, or one-time occurrence. |
| Recommended | Screenshots / recordings | Visual evidence, especially for UI bugs. |
| Recommended | Logs / error messages | Console errors, stack traces, pod logs. |
| Recommended | Workaround | Known workaround, if any. Helps gauge urgency. |
| Recommended | Regression indicator | Was this working before? If so, which version? |

### Story

| Category | Sections | Notes |
|---|---|---|
| **Required** | Description of the enhancement | What is being added or changed and why. |
| **Required** | Acceptance criteria | Measurable conditions that define when the story is done. |
| Recommended | User story format | "As a [role], I want [goal], so that [benefit]." |
| Recommended | Design references | Figma, Miro, or doc links if the story involves UI changes. |

### Task

| Category | Sections | Notes |
|---|---|---|
| **Required** | Description of the work | What needs to be done and why. |
| **Required** | Acceptance criteria / definition of done | How to verify the task is complete. |
| Recommended | Technical context | Approach notes, relevant code areas, dependencies. |

**Automated test / flake tasks:** For Tasks about a **failing or flaky automated test** (named spec, assertion, or CI output), see `jira-validate-description` § *Test automation and flake tasks*. Implied DoD and reproduction are often enough — do not demand explicit AC prose or manual “steps to reproduce” when re-running the test is the reproduction method.

## Severity (bugs only)

Severity measures how much the issue impacts the user. Do not accept the author's value as fact. Regressions (something that previously worked) are a factor that may increase severity but do not automatically make an issue Critical -- evaluate based on the criteria below.

| Severity | When to apply |
|---|---|
| Critical | Core workflow or feature completely unusable; crashes / error screens; data loss; no workaround or workaround too complex / unreasonable; unauthorized access to sensitive data |
| Important | Non-critical security concerns; RBAC issues; performance degradation that impedes normal workflow; silent failures — functional breakage where the user is not shown an obvious error (e.g., empty pages, missing data, truncated results, features that quietly stop working). Silent failures are Important because the user may not realize something is wrong. |
| Moderate | Default severity; validation issues; accessibility issues; minor functional problems where the failure is visible to the user and a reasonable workaround exists |
| Low | Cosmetic issues (alignment, layout, color); micro copy |
| Informational | Console output issues; React warnings |

**Workaround rule:** Only credit a workaround if the issue description explicitly states one or the workaround is trivially obvious with no security, data, or workflow ramifications. Do not invent workarounds by assuming the user can use a different configuration, skip a feature, or change their deployment — the user may have requirements that make the affected path necessary.

Evaluate sentiment from the issue description and comments to help gauge real-world impact.

## Priority

Priority indicates how urgently an issue needs to be addressed. The assessment approach differs by issue type.

### Bug Priority

Bugs use content-based priority criteria. Do not accept the author's value as fact -- evaluate independently (raise or lower).

| Priority | When to apply |
|---|---|
| Blocker | Prevents release; production-impacting; requires immediate attention |
| Critical | High-impact issue that must be resolved soon; minimum priority for all Critical severity bugs |
| Major | Related to recently released features, active development, or customer-visible functionality; should be delivered ahead of the general backlog |
| Normal | Default priority; no specific urgency signal |
| Minor | Low urgency; can wait to be addressed |

**Exception — nightly E2E test failures (respect reporter priority):** Bugs found during **nightly E2E test runs** (labeled `cypress_found_bug` or whose summary or description references a nightly job such as `dashboard-e2e-tests`) reflect failures in the automated product gate. The reporter (typically a QE engineer) sets priority based on the operational impact of the failure on the release pipeline — context that is not captured in the description alone. **When a valid priority is already set** (not `Undefined`), **do not lower the reporter's priority**, even when the failure was observed only once or could not be immediately reproduced. However, you **may raise** the priority above the reporter's value if the [severity-to-priority floor rules](#severity-to-priority-floor-bugs-only) indicate a higher minimum priority. If priority is missing or `Undefined`, apply normal priority-setting logic. E2E test failures can block the product release, and a non-reproducible failure in nightly may still indicate a real intermittent regression.

### Task Priority

Tasks use the same priority scale and content-based criteria as bugs (table above), but with a key difference: **respect existing priority**. Task authors and team members typically have context about urgency that is not captured in the description (sprint commitments, dependency chains, upcoming releases). If a task already has a valid priority set (not `Undefined`), evaluate independently but **only raise** — do not lower. If the content clearly supports a higher priority than assigned, emit a SET_FIELDS to raise it.

### Story Priority

Stories use a simplified priority model during triage. Scrum teams and PMs may adjust priority during grooming.

| Priority | When to apply |
|---|---|
| Major | Strong urgency signal: customer-facing pain with no workaround, time-sensitive dependency on an upcoming release, explicitly flagged as urgent by PM or leadership, or regression workaround that needs a permanent fix soon |
| Normal | Default for all stories. No specific urgency signal, or urgency is unclear |

**Rules:**
- **Default to Normal.** Most standalone stories are Normal priority.
- **Promote to Major** only when the description contains clear urgency signals (see table above).
- **Never set higher than Major.** Blocker and Critical are reserved for bugs and operational issues, not stories.
- **Respect existing priority.** If a story already has a valid priority set (not `Undefined`), do not override it -- the reporter or team may have context that justifies the level.

### Severity-to-priority floor (bugs only)

A bug's priority should not be lower than the floor implied by its severity. This is a minimum, not a ceiling -- a Moderate severity bug can still be Blocker if it blocks a release.

| Severity | Minimum Priority |
|---|---|
| Critical | Critical |
| Important | Major |
| Moderate | Normal |
| Low | Normal |
| Informational | Minor |

## Triage Labels

Labels used during triage to indicate what an issue needs before it can proceed, or to classify the nature of the work.

### Needs-* Labels

These labels signal that an issue is **waiting on input** from a specific role. Apply them when the issue cannot proceed without that input. Remove them when the input has been provided.

| Label | When to apply | Resolution signals (remove when) |
|---|---|---|
| `needs-info` | Generic catch-all: we need information from a specific person. Use when someone needs to answer a question, confirm a decision, or provide missing context — including stale blocking references where specific people need to confirm whether to proceed. Also used when description is too vague (via validate-description) or clarifying questions went unanswered. | Reporter or a knowledgeable party comments addressing the open questions; description is updated with the requested details |
| `needs-ux` | Anything UI design related. Requires UX mockups, design review, or interaction guidance before engineering can proceed; a discussion about how something should look or behave is unresolved; no existing design artifact covers the requirement. | UX team member comments with a design deliverable (Figma, Miro, or doc link) or a clear written design decision; a linked UX issue is resolved/closed. Must be confident guidance, not just an acknowledgement or "we'll look into it" |
| `needs-pm` | Requires product direction, scope clarification, priority call, or acceptance criteria from Product Management; the team cannot determine what to build without PM input. This includes questions about whether customer need or business justification exists, or whether product direction has shifted making the work potentially irrelevant. | PM comments with a clear decision, scope statement, or acceptance criteria; a linked PM issue is resolved/closed. Must be confident guidance, not just an acknowledgement |
| `needs-advisor` | Architectural questions where the implementation path is unclear. Multiple viable technical approaches exist with significant trade-offs; touches cross-cutting concerns (architecture, shared infrastructure); solution path is unclear even to experienced developers. | Tech lead or architect comments with a recommended approach or decision; a linked spike/investigation issue is resolved/closed |

### Process Labels

| Label | Meaning |
|---|---|
| `ai-reviewed` | Passive marker indicating the issue has been through the AI triage pipeline. Applied as the final step to **every** issue in the query result — including team-gate skips and NO_OP issues — to prevent reprocessing in future triage runs. No skill or query depends on this label — it exists for human reference, reporting, and deduplication. |

### AI Analysis Labels

Labels applied by AI analysis skills to indicate the outcome of automated review. These labels should not be manually applied.

| Label | Meaning |
|---|---|
| `ai-already-fixed` | The bug has been fixed and verified in the codebase on main. The issue may be auto-closed or flagged for human review if a backport concern exists. |
| `ai-potentially-fixed` | Evidence suggests the bug may have been addressed but confidence is not high enough to auto-close. Requires human verification. |
| `ai-obsolete` | The code area referenced by the issue has been fundamentally rewritten or removed. The described scenario can no longer occur. |

### Classification Labels

| Label | Meaning |
|---|---|
| `enhancement` | Standalone new feature or improvement (Stories) |
| `feature-request` | User-facing request too large for a standalone Story; requires RFE/epic process |
| `tech-debt` | Addresses technical debt |

### Excluded Labels (triage queries)

Issues with these labels are excluded from triage queries because they are managed through separate processes:

| Label | Reason |
|---|---|
| `Security` | Security/CVE tracker issues are auto-generated with their own triage lifecycle |
| `Cross-Team` | Cross-team effort managed at the program level, not dashboard-specific triage. **Applied by triage** when the team gate (Step 2a) determines the work belongs to another component's team but the AI Core Dashboard component is legitimately on the issue (the dashboard has a package/BFF that consumes the other component's service — e.g., `AI Evaluations` → `packages/eval-hub/`). The label acknowledges the dashboard's integration interest while routing the work to the owning team. |

Scrum team labels (`dashboard-*-scrum`) also serve as an exclusion signal -- issues already assigned to a scrum team have been human-triaged and should not be reprocessed.

### Blocking Mechanisms -- When to Use What

An issue can be blocked by multiple mechanisms simultaneously. Use the most specific mechanism that fits.

| Mechanism | Use when | How to set | How to clear |
|---|---|---|---|
| **needs-\* label** | Waiting on **input/decision** from a role. No specific blocking issue exists -- you're waiting on a person or team to provide something. | `ADD_LABEL` with the appropriate `needs-*` label | `REMOVE_LABEL` when the input has been provided (see resolution signals above) |
| **Blocked-by link** | Waiting on a **specific Jira issue** to be completed. The blocking issue is trackable and has its own lifecycle. | `LINK_BLOCKED_BY` with the blocking issue key. Creates an "is blocked by" link. | The link persists as history. When the blocking issue is resolved, evaluate whether to also clear the Blocked field if it was set. |
| **Blocked field = True** | Waiting on something **external or structural** that isn't a single Jira issue: release timing, infrastructure provisioning, external team dependency, environment availability. Always set Blocked Reason with a clear explanation. | `SET_FIELDS` with `{"customfield_10517": {"value": "True"}, "customfield_10483": "<reason>"}` | `SET_FIELDS` with `{"customfield_10517": {"value": "False"}}`. Clear Blocked Reason only if the context is no longer useful. |

**Combining mechanisms:** A single issue may have a `needs-ux` label AND be blocked by another Jira issue AND have Blocked=True for an unrelated infrastructure reason. Each mechanism is independent and cleared independently.

**Blocked field is NOT auto-set by links.** Creating a blocked-by link does not automatically set the Blocked field to True. The Blocked field is reserved for external/structural blockers. An issue can be linked as "is blocked by X" without the Blocked dropdown being True -- the link itself communicates the dependency.

## Scrum Team Labels

Labels that assign issues to a scrum team. Format: `dashboard-{team}-scrum`.

| Label | Team |
|---|---|
| `dashboard-monarch-scrum` | Monarch |
| `dashboard-zaffre-scrum` | Zaffre |
| `dashboard-green-scrum` | Green |
| `dashboard-crimson-scrum` | Crimson |
| `dashboard-razzmatazz-scrum` | Razzmatazz |
| `dashboard-tangerine-scrum` | Tangerine |
| `dashboard-purple-scrum` | Purple |
| `dashboard-onyx-scrum` | Onyx |

## Area Labels

Labels that categorize issues by functional area. Format: `dashboard-area-{area}`.

| Label | Area |
|---|---|
| `dashboard-area-infrastructure` | Infrastructure |
| `dashboard-area-patternfly` | PatternFly |
| `dashboard-area-pf6` | PatternFly 6 migration |
| `dashboard-area-home` | Home page |
| `dashboard-area-projects` | Data Science Projects |
| `dashboard-area-pipelines` | Pipelines |
| `dashboard-area-edge` | Edge |
| `dashboard-area-accelerators` | Accelerators |
| `dashboard-area-workbenches` | Workbenches |
| `dashboard-area-jupyter` | Jupyter |
| `dashboard-area-notebooks` | Notebooks |
| `dashboard-area-bff` | BFF (Go backend shared patterns) |
| `dashboard-area-security` | Security (CVE, security audits) |
| `dashboard-area-cluster-storage` | Cluster Storage |
| `dashboard-area-storage-classes` | Storage Classes |
| `dashboard-area-cluster-settings` | Cluster Settings |
| `dashboard-area-manifests` | Manifests |
| `dashboard-area-connection-types` | Connection Types |
| `dashboard-area-consistencies` | Consistencies |
| `dashboard-area-model-serving` | Model Serving |
| `dashboard-area-model-registry` | Model Registry |
| `dashboard-area-distributed-workloads` | Distributed Workloads |
| `dashboard-area-trusty-ai` | TrustyAI |
| `dashboard-area-model-catalog` | Model Catalog |
| `dashboard-area-maas` | MaaS (Model-as-a-Service) |
| `dashboard-area-genai` | Gen AI Studio |
| `dashboard-area-mcp` | MCP |
| `dashboard-area-hardware-profiles` | Hardware Profiles |
| `dashboard-area-user-management` | User Management |
| `dashboard-area-e2e` | E2E Testing |
| `dashboard-area-cypress` | Cypress Testing |
| `dashboard-area-performance` | Performance |
| `dashboard-area-documentation` | Documentation |
| `dashboard-area-automl` | AutoML |
| `dashboard-area-autorag` | AutoRAG |
| `dashboard-area-observability` | Observability |
| `dashboard-area-applications` | Applications |

## Area Label Signal Mapping

Reference tables for the [validate-area-label](../jira-validate-area-label/SKILL.md) skill. Three signal dimensions are captured here (keywords, K8s kinds, code paths). Three additional dimensions -- Jira labels (non-area product/feature labels on the issue), linked issue labels, and scrum team labels -- are evaluated at runtime from live Jira data.

### Content Signals (keywords + K8s kinds)

Matched against issue summary, description text, and **Jira labels** (non-area labels on the issue). Includes natural-language feature names, UI page/section titles, Kubernetes resource type names, and product/feature labels commonly used in the project.

| Area Label | Keywords | K8s Kinds |
|---|---|---|
| `dashboard-area-pipelines` | pipeline, pipeline run, pipeline definition, experiment, artifact, execution, pipeline server, DSPA, Elyra, DAG, topology | `DataSciencePipelinesApplication` |
| `dashboard-area-model-serving` | model serving, inference, KServe, ModelMesh, serving runtime, model deploy, deploy model, deployment, NIM, vLLM, endpoint performance | `InferenceService`, `ServingRuntime`, `LLMInferenceService` |
| `dashboard-area-model-registry` | model registry, registered model, model version, model artifact | `ModelRegistry` |
| `dashboard-area-model-catalog` | model catalog, catalog card | |
| `dashboard-area-workbenches` | workbench, notebook server, spawner, workbench image, deployment size, environment variable | `Notebook` |
| `dashboard-area-notebooks` | notebook image, BYON image, image stream, notebook controller | `ImageStream` |
| `dashboard-area-jupyter` | Jupyter, JupyterHub, JupyterLab | |
| `dashboard-area-projects` | data science project, project selector, project list, project create, project delete, project rename (NOT project detail tabs -- those map to their respective feature areas) | `Project` |
| `dashboard-area-hardware-profiles` | hardware profile, accelerator profile, GPU, tolerations, node selector, node affinity | `HardwareProfile`, `AcceleratorProfile` |
| `dashboard-area-connection-types` | connection type, connection, data connection | |
| `dashboard-area-cluster-storage` | cluster storage, PVC, persistent volume, storage size | `PersistentVolumeClaim` |
| `dashboard-area-storage-classes` | storage class, default storage class | `StorageClass` |
| `dashboard-area-cluster-settings` | cluster settings, PVC size, culler, notebook tolerations, model serving platform, telemetry | |
| `dashboard-area-distributed-workloads` | distributed workload, Kueue, workload metrics, cluster queue, local queue, quota | `ClusterQueue`, `LocalQueue`, `Workload` |
| `dashboard-area-user-management` | user management, group settings, RBAC, permissions, role binding | `Role`, `RoleBinding`, `ClusterRole` |
| `dashboard-area-home` | home page, landing page, overview page, welcome, getting started | |
| `dashboard-area-infrastructure` | webpack, build, CI, docker, module federation, navigation, sidebar, header, app shell, plugin, extension | |
| `dashboard-area-patternfly` | PatternFly, PF, component library, design system | |
| `dashboard-area-pf6` | PF6, PatternFly 6, PatternFly migration, PF upgrade | |
| `dashboard-area-bff` | BFF, backend-for-frontend, Go backend, shared middleware, common middleware, RequireAccessToService, RequireValidIdentity, SelfSubjectAccessReview, SSAR, BFF route, BFF module | |
| `dashboard-area-security` | CVE, security audit, vulnerability scan, security advisory, OVAL | |
| `dashboard-area-manifests` | manifest, OLM, operator, kustomize, deployment config | |
| `dashboard-area-trusty-ai` | TrustyAI, bias, fairness, explainability, model bias metrics | `TrustyAIService` |
| `dashboard-area-maas` | MaaS, model as a service, subscription, API key, auth policy, rate limit | |
| `dashboard-area-genai` | Gen AI Studio, gen-ai, playground, chatbot, compare mode, chat session, AI Asset Endpoints, AAE, Llama Stack, LlamaStack Distribution, LSD, vector store, RAG, knowledge tab, knowledge sources, EvalHub, evaluation run, lmEval, benchmark evaluation, prompt management, prompt versioning, guardrails, NeMo Guardrails, code export, InstructLab, fine-tuning, teacher model, judge model | `LlamaStackDistribution` |
| `dashboard-area-mcp` | MCP, MCP server, MCP catalog | |
| `dashboard-area-edge` | edge, edge deployment | |
| `dashboard-area-accelerators` | accelerator, GPU support, multi-GPU | |
| `dashboard-area-e2e` | e2e test, end-to-end test, test case, test coverage, test automation | |
| `dashboard-area-cypress` | Cypress config, mock test, intercept, fixture, cypress command, test infrastructure, test framework | |
| `dashboard-area-performance` | performance, slow, latency, render time, memory | |
| `dashboard-area-documentation` | documentation, docs, README, ADR | |
| `dashboard-area-automl` | AutoML, AutoX, automl experiment, tabular pipeline, timeseries pipeline, binary classification, multiclass classification, regression pipeline, AutoGluon, automl leaderboard, automl model details, confusion matrix, feature importance, prediction type, label column, automl configure, register model (in AutoML context), S3 file explorer (in AutoML context) | |
| `dashboard-area-autorag` | AutoRAG, AutoX, autorag experiment, RAG pattern evaluation, autorag leaderboard, pattern details, optimization metric, faithfulness, answer correctness, context correctness, RAG patterns, vector store provider, Milvus (in AutoRAG context), chunking, embedding model, retrieval method, generation model, autorag configure, S3 file explorer (in AutoRAG context), Docling, text extraction (in AutoRAG context), test data file | |
| `dashboard-area-observability` | observability, observability dashboard, Perses, PersesDashboard, PersesBoard, metrics dashboard, time range selector, Prometheus datasource | |
| `dashboard-area-applications` | application, enabled application, explore application, ISV | |
| `dashboard-area-consistencies` | consistency, shared pattern, common component, UX consistency | |

### Code Path Signals

Matched against file paths from linked PRs, code references in descriptions, or stack traces. Each area maps to one or more repository directory prefixes. Use **longest prefix wins** when paths overlap (e.g., a file under `frontend/src/pages/projects/screens/spawner/` matches `workbenches`, not `projects`).

| Area Label | Code Paths |
|---|---|
| `dashboard-area-pipelines` | `frontend/src/concepts/pipelines/`, `frontend/src/pages/pipelines/` |
| `dashboard-area-model-serving` | `frontend/src/pages/modelServing/`, `frontend/src/concepts/modelServing/`, `frontend/src/concepts/modelServingKServe/`, `packages/model-serving/` |
| `dashboard-area-model-registry` | `packages/model-registry/`, `frontend/src/concepts/modelRegistry/`, `frontend/src/pages/modelRegistry/`, `frontend/src/pages/modelRegistrySettings/` |
| `dashboard-area-model-catalog` | `frontend/src/pages/modelCatalog/`, `frontend/src/concepts/modelCatalog/` |
| `dashboard-area-workbenches` | `frontend/src/pages/projects/screens/spawner/`, `frontend/src/pages/projects/screens/detail/notebooks/`, `frontend/src/concepts/notebooks/` |
| `dashboard-area-notebooks` | `frontend/src/pages/BYONImages/`, `frontend/src/pages/notebookController/`, `packages/notebooks/` |
| `dashboard-area-projects` | `frontend/src/pages/projects/`, `frontend/src/concepts/projects/` |
| `dashboard-area-hardware-profiles` | `frontend/src/pages/hardwareProfiles/`, `frontend/src/concepts/hardwareProfiles/` |
| `dashboard-area-connection-types` | `frontend/src/pages/connectionTypes/`, `frontend/src/concepts/connectionTypes/` |
| `dashboard-area-cluster-storage` | *(within projects pages -- no dedicated directory)* |
| `dashboard-area-storage-classes` | `frontend/src/pages/storageClasses/` |
| `dashboard-area-cluster-settings` | `frontend/src/pages/clusterSettings/` |
| `dashboard-area-distributed-workloads` | `frontend/src/pages/distributedWorkloads/`, `frontend/src/concepts/distributedWorkloads/` |
| `dashboard-area-user-management` | `frontend/src/pages/groupSettings/`, `frontend/src/concepts/permissions/`, `frontend/src/concepts/roleBinding/`, `frontend/src/concepts/userConfigs/` |
| `dashboard-area-home` | `frontend/src/pages/home/` |
| `dashboard-area-infrastructure` | `frontend/src/app/`, `frontend/src/plugins/`, `backend/src/`, `packages/plugin-core/`, `packages/app-config/` |
| `dashboard-area-patternfly` | `frontend/src/concepts/dashboard/` |
| `dashboard-area-manifests` | `manifests/` |
| `dashboard-area-trusty-ai` | `frontend/src/concepts/trustyai/`, `frontend/src/api/trustyai/` |
| `dashboard-area-maas` | `packages/maas/` |
| `dashboard-area-genai` | `packages/gen-ai/` |
| `dashboard-area-mcp` | *(no dedicated directory yet)* |
| `dashboard-area-e2e` | `packages/cypress/` |
| `dashboard-area-cypress` | `packages/cypress/` |
| `dashboard-area-automl` | `packages/automl/` |
| `dashboard-area-autorag` | `packages/autorag/` |
| `dashboard-area-observability` | `packages/observability/`, `manifests/observability/` |
| `dashboard-area-applications` | `frontend/src/pages/enabledApplications/`, `frontend/src/pages/exploreApplication/` |
| `dashboard-area-bff` | *(cross-cutting -- shared patterns span `packages/*/bff/`)* |
| `dashboard-area-security` | *(cross-cutting -- no dedicated directory)* |
| `dashboard-area-consistencies` | *(cross-cutting -- no dedicated directory)* |
| `dashboard-area-performance` | *(cross-cutting -- no dedicated directory)* |
| `dashboard-area-documentation` | `docs/` |

Areas without dedicated code paths (`dashboard-area-bff`, `dashboard-area-edge`, `dashboard-area-accelerators`, `dashboard-area-jupyter`, `dashboard-area-pf6`) rely on keyword matching combined with other signal dimensions.

Note: `dashboard-area-e2e` and `dashboard-area-cypress` share the same code path (`packages/cypress/`). Keywords must disambiguate: `e2e` is for test cases, `cypress` is for framework config and test infrastructure.

### Jira Label Signals

Non-area labels on the issue that serve as keyword-equivalent signals for area matching. These are product/feature labels applied by reporters, QE, or other processes -- they are not `dashboard-area-*` labels but carry the same semantic weight as a keyword match.

| Area Label | Jira Labels (case-insensitive match) |
|---|---|
| `dashboard-area-automl` | `AutoML`, `automl` |
| `dashboard-area-autorag` | `AutoRAG`, `autorag` |
| `dashboard-area-genai` | `gen-ai`, `genai` |
| `dashboard-area-maas` | `maas`, `MaaS` |
| `dashboard-area-model-registry` | `model-registry` |
| `dashboard-area-pipelines` | `ai-pipelines` |

Jira label matches have the **same confidence level as keyword matches** -- they are a content signal (reporters chose the label deliberately). They contribute to the multi-signal requirement like any other keyword dimension.

### Matching Notes

- **Multi-signal requirement**: An area must be supported by at least two signal dimensions (keywords + code path, keywords + linked issue, etc.) OR by a single high-confidence signal (K8s kind, code path, or unambiguous multi-word phrase unique to one area). A single generic keyword alone is never sufficient.
- **Case-insensitive** matching for all keywords
- **Multi-word phrases** match as whole phrases first with higher weight than individual word matches
- **Summary hits weigh more** than description hits (summary is the most deliberate text)
- **K8s kind matches are high confidence** -- a reporter mentioning `InferenceService` almost certainly means model serving
- **Code path matches are high confidence** and use **longest prefix wins** when paths overlap (e.g., `spawner/` under `projects/` matches `workbenches`, not `projects`)
- **Linked issue labels are confirming** -- if a parent or blocked-by issue has `dashboard-area-pipelines`, that confirms the signal for the current issue
- **Scrum team labels are weak signals** -- used to confirm, not to determine. A scrum team can work issues outside their default areas.
- **Feature area beats cross-cutting area** -- "slow model serving table" is `model-serving`, not `performance`. Cross-cutting areas (`performance`, `security`, `consistencies`, `infrastructure`, `bff`, `patternfly`) are only assigned when the issue is specifically about that concern itself.
- **BFF vs feature area** -- a bug in a specific BFF endpoint (e.g., gen-ai chat route, maas subscription API) uses the feature area (`genai`, `maas`, `model-registry`, etc.). `dashboard-area-bff` is for cross-cutting Go backend patterns: shared middleware, common auth, patterns applied across multiple BFF modules.
- **Gen AI vs MaaS** -- `dashboard-area-genai` covers the Gen AI Studio UX (`packages/gen-ai/`): playground, chatbot, LlamaStack, RAG/vector stores, guardrails, AAE, EvalHub, prompt management. `dashboard-area-maas` covers the MaaS admin surface (`packages/maas/`): subscription CRUD, API key management, auth policies. The gen-ai BFF calls MaaS for model/token access, so issues about **consuming** MaaS data within the Gen AI Studio (e.g., "MaaS model not appearing in playground") are `genai`. Issues about **managing** subscriptions, API keys, or auth policies are `maas`. Both labels may apply when an issue spans both surfaces.
- **Security is narrow** -- `dashboard-area-security` is reserved for CVE tracking, security audits, and vulnerability scans. Authorization middleware, RBAC patterns, or auth bugs in a feature area use the feature area or `bff`, not `security`.
- **Specific area beats container area** -- `projects` is only for the project selector, list, and project-level actions. Each project detail tab maps to its feature area: Workbenches tab = `workbenches`, Pipelines tab = `pipelines`, Connections tab = `connection-types`, Cluster storage tab = `cluster-storage`, Deployments tab = `model-serving`, Permissions tab = `user-management`.
- **Multiple area labels are normal** -- an issue can independently qualify for more than one area
- **Contextual keywords resolve ambiguity** -- "notebook" alone is ambiguous; "notebook" + "spawner" = `workbenches`, "notebook" + "BYON" = `notebooks`, "notebook" + "Jupyter" = `jupyter`
- **Jira labels are keyword-equivalent signals** -- Non-area labels on the issue (e.g., `AutoML`, `AutoRAG`, `gen-ai`, `ai-pipelines`) are treated as keyword matches when they appear in the Jira Label Signals table. They have the same confidence as a keyword hit in the summary. Combined with another signal dimension (summary keyword, code path, linked issue), they satisfy the multi-signal requirement.
- **AutoML vs AutoRAG** -- `dashboard-area-automl` covers the AutoML experiment experience (`packages/automl/`): tabular classification (binary, multiclass), regression, timeseries forecasting, AutoGluon, model leaderboard, confusion matrix, feature importance, model registration. `dashboard-area-autorag` covers the AutoRAG experiment experience (`packages/autorag/`): RAG pattern evaluation, vector stores, chunking, embedding, retrieval, generation, optimization metrics (faithfulness, answer correctness, context correctness), pattern leaderboard. Both share S3 file browsing and pipeline topology UI patterns; use the summary prefix (`[AutoML]` vs `[AutoRAG]`) or Jira labels (`AutoML`/`automl` vs `AutoRAG`/`autorag`) to disambiguate. Issues affecting both (e.g., shared UI patterns) can have both labels. The umbrella term "AutoX" covers both areas.
- **Manifest paths** -- A reference to `manifests/` alone is often cross-cutting (see `dashboard-area-manifests`). If the description or PR links include **paths or resource names** that map to a feature’s Code Path Signals (e.g. serving, maas, pipelines), weight the **feature area** at least as highly as generic manifests; see § Manifests area and scrum routing.

## Deprecated Labels

Labels that have been retired. If encountered on an issue, replace with the canonical label. Do not assign deprecated labels to new issues.

| Deprecated label | Replacement | Notes |
|---|---|---|
| `dashboard-area-homepage` | `dashboard-area-home` | Legacy variant; consolidated to `home` |

## Area-to-Scrum Default Mapping

An area label can appear on issues belonging to any team. This mapping provides the **default/primary** team for each area, used when skills need a best-guess association. Derived from label co-occurrence analysis of 450 unresolved stories/bugs (March 2026) plus manual corrections.

| Area | Default Team |
|---|---|
| `dashboard-area-bff` | Monarch |
| `dashboard-area-infrastructure` | Monarch |
| `dashboard-area-patternfly` | Monarch |
| `dashboard-area-pf6` | Monarch |
| `dashboard-area-home` | Monarch |
| `dashboard-area-projects` | Monarch |
| `dashboard-area-consistencies` | Monarch |
| `dashboard-area-security` | Monarch |
| `dashboard-area-cluster-settings` | Monarch |
| `dashboard-area-cypress` | Monarch |
| `dashboard-area-applications` | Monarch |
| `dashboard-area-observability` | Monarch |
| `dashboard-area-workbenches` | Razzmatazz |
| `dashboard-area-jupyter` | Razzmatazz |
| `dashboard-area-notebooks` | Razzmatazz |
| `dashboard-area-pipelines` | Razzmatazz |
| `dashboard-area-storage-classes` | Razzmatazz |
| `dashboard-area-hardware-profiles` | Razzmatazz |
| `dashboard-area-user-management` | Razzmatazz |
| `dashboard-area-performance` | Razzmatazz |
| `dashboard-area-e2e` | Razzmatazz |
| `dashboard-area-model-serving` | Zaffre |
| `dashboard-area-maas` | Onyx |
| `dashboard-area-connection-types` | Zaffre |
| `dashboard-area-manifests` | Monarch |
| `dashboard-area-genai` | Crimson |
| `dashboard-area-model-catalog` | Green |
| `dashboard-area-model-registry` | Green |
| `dashboard-area-distributed-workloads` | Green |
| `dashboard-area-mcp` | Green |
| `dashboard-area-automl` | Purple |
| `dashboard-area-autorag` | Purple |

### Manifests area and scrum routing

The `dashboard-area-manifests` label covers **Kubernetes/OLM/kustomize YAML in this repo** (`manifests/` and related deployment config). **Default scrum mapping:** **Monarch** — shared install layout, operator bases, cross-cutting resources (e.g. broad RBAC refactors under `manifests/core-bases/`, repo-wide overlay structure), and manifest work that is **not** tied to a single product feature’s ownership.

**Feature-specific deployment assets:** Many paths under `manifests/` are **owned by the feature** that ships those resources (model serving, MaaS, pipelines, gen-ai, etc.). When an issue cites **concrete paths, overlays, or resource kinds** that clearly belong to a feature (examples: KServe/serving runtime deployment YAML, `packages/maas` operator assets, pipeline/EvalHub-related deployment slices, gen-ai/LlamaStack operator resources), **prefer assigning the feature’s `dashboard-area-*` label** (e.g. `dashboard-area-model-serving`, `dashboard-area-maas`, `dashboard-area-genai`, `dashboard-area-pipelines`) — either **instead of** or **in addition to** `dashboard-area-manifests`, per confidence. Scrum routing then follows **that** feature area’s mapping (see assign-scrum-team: generic `dashboard-area-manifests` is dropped when it conflicts with a feature area’s team).

**Zaffre and “manifests” in keywords:** Zaffre’s association with kustomize/OLM refers to **deployment and operator artifacts for model serving and connection types** — not every change under `manifests/`. Generic odh-dashboard manifest hygiene and shared base YAML default to **Monarch** unless the issue is clearly scoped to a feature team's owned area. MaaS-related operator/deployment assets under `manifests/` route to **Onyx** (via `dashboard-area-maas`). For deterministic routing from path evidence alone, if a path matches `manifests/**` and includes MaaS-specific tokens (for example `maas`, `maas-operator`, `maas-deployment`, `dashboard-area-maas`), treat that as a direct signal for `dashboard-area-maas` (Onyx), not generic `dashboard-area-manifests`.

### Areas without a default team

These area labels have no observed scrum co-occurrence. Assign based on context or leave unassigned:

`dashboard-area-edge`, `dashboard-area-accelerators`, `dashboard-area-cluster-storage`, `dashboard-area-trusty-ai`, `dashboard-area-documentation`

### Team keyword / feature associations

When an issue lacks area labels, these keywords and feature associations can help identify the owning team. Match against summary, description, and component references.

**Quality bar for keywords**: Keywords must be feature-specific or area-specific. Avoid cross-cutting terms (e.g., "tests", "E2E tests", "performance", "security") that match issues from many teams -- those should resolve through area labels (Path A), not keyword matching (Path B).

| Team | Scrum label | Keywords / features | Reasoning |
|---|---|---|---|
| **Monarch** | `dashboard-monarch-scrum` | PatternFly, PF6, home page, projects page, navigation, infrastructure, cluster settings, shared UI, consistencies, BFF shared infrastructure (not feature-specific BFF), Go backend shared patterns, common middleware, shared auth, plugin-core, app-config, common libraries, cross-package utilities, applications, observability, Perses, PersesDashboard, metrics dashboard, **generic manifests, install-base, cross-cutting operator YAML** | Monarch owns app shell, shared infrastructure, cross-cutting UI foundations, cross-cutting BFF/Go backend patterns, the observability/Perses dashboard integration (`packages/observability/`), and **default ownership of repo-wide manifest and install layout** when no feature-specific path dominates. "applications" refers to the enabled/explore applications pages (ISV integrations). |
| **Razzmatazz** | `dashboard-razzmatazz-scrum` | workbenches, spawner, notebook server, notebooks, BYON image, Jupyter, JupyterLab, pipelines, pipeline server, DSPA, pipeline run, hardware profiles, accelerator profiles, tolerations, node selector, storage classes, user management, RBAC, permissions, group settings | Razzmatazz owns the core DS project experience: workbenches, notebooks, pipelines, hardware profiles, storage classes, and user management. |
| **Zaffre** | `dashboard-zaffre-scrum` | model serving, inference, KServe, ModelMesh, serving runtime, model deploy, NIM, vLLM, connection types, operator bundles, kustomize overlays, OLM resources for serving and connection types | Zaffre owns model serving infrastructure, connection types, and the operator and deployment layers that ship those capabilities. Gen AI Studio's consumption of MaaS models/tokens is Crimson (`dashboard-area-genai`); MaaS admin (subscriptions, API keys, auth policies) is Onyx (`dashboard-area-maas`). |
| **Green** | `dashboard-green-scrum` | model catalog, catalog card, model registry, registered model, model version, model artifact, distributed workloads, Kueue, cluster queue, local queue, workload metrics, Ray (when related to DW queue management), MCP, MCP server, MCP catalog | Green owns model catalog, model registry, distributed workloads (queue management side), and MCP. |
| **Crimson** | `dashboard-crimson-scrum` | Gen AI Studio, gen-ai package, playground, chatbot, compare mode, chat session, AI Asset Endpoints, AAE, endpoint modal, Llamastack, LlamaStack Distribution, LSD install, vector store, RAG, knowledge tab, knowledge sources, EvalHub, evaluation run, lmEval, benchmark evaluation, prompt management, prompt versioning, save prompt, MaaS subscription, ephemeral API key, InstructLab, fine-tuning, teacher model, judge model, guardrails, NeMo Guardrails, code export | Crimson owns the Gen AI Studio experience (`packages/gen-ai/`, `dashboard-area-genai`): playground/chatbot, AAE, Llamastack integration, RAG/vector stores, guardrails, evaluation, prompt management, and MaaS subscriptions within the Gen AI context. |
| **Tangerine** | `dashboard-tangerine-scrum` | RayJob, RayCluster, Ray dashboard URL, training job, TrainJob, model training, model-training package, checkpointing, Feature Store, Feast, feature view, feature store repository, lineage graph, Kubeflow Pipelines frontend, KFP frontend, MLMD, ML Metadata, artifact details, execution details, pipeline run routing | Tangerine owns model training (RayJob/RayCluster/TrainJob lifecycle), Feature Store (Feast UI), and Kubeflow Pipelines upstream frontend. |
| **Purple** | `dashboard-purple-scrum` | AutoRAG, AutoML, AutoX, autorag experiment, automl experiment, RAG pattern evaluation, autorag leaderboard, automl leaderboard, pattern details, automl model details, experiment evaluation, tabular pipeline, timeseries pipeline, binary classification, multiclass classification, regression pipeline, AutoGluon, confusion matrix, feature importance, optimization metric, faithfulness, answer correctness, context correctness, vector store provider, Milvus (in AutoRAG context), chunking, embedding model (in AutoRAG context), retrieval method, generation model (in AutoRAG context), Docling, text extraction (in AutoRAG context), S3 file browser (in AutoRAG/AutoML context), AutoRAG configure, AutoML configure, model registration (in AutoML context) | Purple owns the AutoRAG (`packages/autorag/`, `dashboard-area-autorag`) and AutoML (`packages/automl/`, `dashboard-area-automl`) — collectively AutoX — automated experiment experiences: configuration, evaluation, leaderboards, and S3 storage browsing for experiment data. |
| **Onyx** | `dashboard-onyx-scrum` | MaaS, MaaS admin, subscription management, subscription CRUD, API key management, auth policy, rate limit, packages/maas/, operator assets | Onyx owns the MaaS admin package (`packages/maas/`, `dashboard-area-maas`): subscription CRUD, API key management, auth policies, and the operator/deployment layers for MaaS capabilities. Gen AI Studio's consumption of MaaS models/tokens (e.g., selecting a subscription in the playground) is Crimson (`dashboard-area-genai`), not Onyx. |

## Future Additions

- Additional custom field IDs as analysis skills discover them
- Additional signal dimensions for area label mapping (API endpoints, feature flags, SupportedArea IDs) as needed
