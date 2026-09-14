#!/usr/bin/env bash
# Vendored from fullsend-ai/agents scripts/post-review.sh
# @ 91f61f3441baedf3f912c9afd4bd574c98793b96 (harness review.yaml base).
#
# Local changes from the stock script:
#   1. Set the GitHub review action from findings (critical/high →
#      request-changes, and so on) and rewrite the sticky comment.
#   2. Do not append the /fs-fix "Next steps" footer.
#   3. Link file/line references in the sticky summary and suppress inline
#      review comments by omitting line numbers only from the CLI payload.
#   4. Render the durable structured review: change summary, host status,
#      blast-radius risk, confidence rationale, decisions, findings, Jira
#      coherence, verification, inspected evidence, signals, and labels.

#
# Harness may fetch this script with sibling files in scripts/.
#
# Usage:
#   post-review.sh              # CI / harness post_script
#   post-review.sh --self-test  # local checks, no GitHub
#
# Stock behavior kept: severity filter, protected-path, labels,
# stale-head (exit 10), and the formal fullsend post-review disposition.
#
# Runs on the GitHub Actions runner AFTER the sandbox is destroyed.
# CWD is runDir.
#
# Required environment variables:
#   REVIEW_TOKEN                      — token with pull-requests:write on the target repo
#   PR_NUMBER                         — GitHub PR number
#   REPO_FULL_NAME                    — owner/repo (e.g. my-org/my-repo)
#   REVIEW_FINDING_SEVERITY_THRESHOLD — minimum severity for findings
#                                       (info|low|medium|high|critical);
#                                       default supplied by harness/review.yaml
#   REVIEW_PROTECTED_PATHS            — comma-separated protected path prefixes,
#                                       or empty string to opt out; required
#                                       (non-empty-or-explicitly-empty) for
#                                       approve actions; default supplied by
#                                       harness/review.yaml
#
# Exit codes:
#   0 — review posted
#   1 — error (review not posted or fallback comment posted)
set -euo pipefail

REVIEW_STICKY_MARKER='<!-- fullsend:review-agent -->'

# $1 = path to agent-result.json. Writes transformed JSON to stdout.
transform_review_result() {
  python3 - "$1" <<'PY'
import json, os, re, sys
from datetime import datetime, timezone
from urllib.parse import quote

# protected-path is deliberately absent: it is a governance gate whose
# remediation is a human decision, so a medium protected-path finding routes to
# "needs human judgment" rather than request-changes (which would tell the
# author to fix something only a reviewer can, and wake the fix agent for it).
# A high protected-path finding still blocks on severity alone.
FUNCTIONAL_CATEGORIES = {
    "correctness", "security",
}

def is_functional(finding):
    cat = (finding.get("category") or "").lower()
    if cat in FUNCTIONAL_CATEGORIES:
        return True
    return any(tok in cat for tok in ("bug", "permission", "schema", "silent"))

def rated_level(result, field, default):
    rated = result.get(field)
    if isinstance(rated, dict):
        return (rated.get("level") or default).lower()
    return default

def is_blocking(finding):
    severity = (finding.get("severity") or "info").lower()
    return severity in ("critical", "high") or (severity == "medium" and is_functional(finding))

def blocking_count(result):
    return sum(1 for finding in (result.get("findings") or []) if is_blocking(finding))

def needs_human(result):
    pa = result.get("product_ask") if isinstance(result.get("product_ask"), dict) else {}
    if result.get("decision_needed") or pa.get("needs_human") or pa.get("status") == "mismatch-unjustified":
        return True
    return any((f.get("category") or "").lower() == "protected-path" for f in (result.get("findings") or []))

# Rows whose result is owned by exactly one registry dimension. If the ledger
# says that dimension never ran, the row cannot honestly report pass/fail.
LEDGER_ROW_DIMENSION = {
    "security": "security",
    "product-ask": "jira-pr-review",
    "evidence": "test-impact-review",
}

def load_ledger():
    """Producer ledger written by the orchestrator at dispatch time (step 4c)."""
    path = os.environ.get("REVIEW_PRODUCER_LEDGER") or ""
    if not path or not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None

def add_limit(inspected, note):
    notes = list(inspected.get("could_not_verify") or [])
    if note not in notes:
        notes.append(note)
    inspected["could_not_verify"] = notes

def reconcile_producers(result):
    """Check the review's account of itself against the dispatch ledger.

    The agent writes the ledger before any result is known, so it records what
    the run did rather than what the review would like to claim. Without this,
    a re-review can inherit the previous run's producer list and verification
    prose and present it as this run's work."""
    inspected = dict(result.get("inspected") or {})
    ledger = load_ledger()
    if ledger is None:
        add_limit(inspected, "No producer ledger was written for this run, so the producer list is self-reported and unverified.")
        result["inspected"] = inspected
        return result

    ran = []
    for key in ("dispatched", "adapters"):
        for item in ledger.get(key) or []:
            if isinstance(item, str) and item and item not in ran:
                ran.append(item)
    if (ledger.get("challenger") or "") == "ran" and "challenger" not in ran:
        ran.append("challenger")

    skipped = {}
    for row in ledger.get("skipped") or []:
        if isinstance(row, dict) and isinstance(row.get("id"), str):
            skipped[row["id"]] = str(row.get("reason") or "").strip()

    claimed = [item for item in (inspected.get("producers") or []) if isinstance(item, str)]
    for item in claimed:
        if item not in ran:
            add_limit(inspected, f"Dropped '{item}' from the producer list: the dispatch ledger does not record it running.")
    if ran:
        inspected["producers"] = ran
    result["inspected"] = inspected

    stray = summary_scope_problem(result)
    if stray:
        add_limit(inspected, "The change summary cites files that are not in this PR's diff: "
                             + ", ".join(stray) + ".")
        result["inspected"] = inspected

    _, challenger_problem = challenger_state(ledger, result.get("findings") or [])
    if challenger_problem:
        add_limit(inspected, challenger_problem)
        result["inspected"] = inspected

    verification = []
    for row in result.get("verification") or []:
        dimension = LEDGER_ROW_DIMENSION.get(row.get("id"))
        if dimension and dimension in skipped and row.get("result") in ("pass", "fail"):
            reason = skipped[dimension] or "it was not selected for this change"
            row = dict(row)
            row["result"] = "could-not-verify"
            row["notes"] = f"The {dimension} producer did not run in this review ({reason}), so this check was not performed."
        verification.append(row)
    if verification:
        result["verification"] = verification
    return result

def protected_prefixes():
    """None means unconfigured (do not police); [] means enforcement is off."""
    raw = os.environ.get("REVIEW_PROTECTED_PATHS")
    if raw is None:
        return None
    return [entry.strip() for entry in raw.split(",") if entry.strip()]

def changed_paths():
    raw = os.environ.get("REVIEW_CHANGED_FILES") or ""
    return [line.strip() for line in raw.splitlines() if line.strip()]

def normalize_protected_findings(result):
    """Protected-path findings are a human gate, not author work.

    Two corrections: a finding naming a path that is not in
    REVIEW_PROTECTED_PATHS is unsupported by the policy the host enforces, and
    is dropped. A supported one stays, but routes to human judgment rather
    than request-changes — the remediation is a human decision, so there is
    nothing for the author (or the fix agent) to do."""
    findings = result.get("findings") or []
    protected = [f for f in findings if (f.get("category") or "").lower() == "protected-path"]
    if not protected:
        return result

    prefixes = protected_prefixes()
    files = changed_paths()
    if prefixes is None or not files:
        return result  # cannot adjudicate — leave the agent's finding as written

    matches = [f for f in files if any(f == p or f.startswith(p) for p in prefixes)]
    inspected = dict(result.get("inspected") or {})
    if not matches:
        result["findings"] = [f for f in findings if (f.get("category") or "").lower() != "protected-path"]
        if not result["findings"]:
            del result["findings"]
        add_limit(inspected, f"Dropped {len(protected)} protected-path finding(s): no changed file matches REVIEW_PROTECTED_PATHS.")
        result["inspected"] = inspected
        return result

    if not result.get("decision_needed"):
        listed = ", ".join(sorted(matches))
        result["decision_needed"] = {
            "question": f"A human must approve this protected-path change: {listed}",
            "options": [
                {"id": "A", "title": "Approve the protected-path change", "implication": "A human accepts the governance or infrastructure risk."},
                {"id": "None", "title": "Do not land this approach"},
            ],
        }
    return result

PATH_TOKEN = re.compile(r"(?:[\w.-]+/)+[\w.-]+\.[A-Za-z0-9]+")
# A summary that cites "post-review.sh" without its directory evades PATH_TOKEN,
# which is how a wrong summary got through after the first version of this guard.
# Bare names are only worth checking when the extension says "file in a repo",
# so this list is deliberately narrow, and a few library names that look like
# filenames are excluded outright.
BARE_FILE_TOKEN = re.compile(
    r"\b[\w.-]+\.(?:tsx?|jsx?|mjs|cjs|scss|css|go|py|sh|ya?ml|json|md|snap)\b")
BARE_FILE_EXCEPTIONS = {"node.js", "next.js", "nest.js", "vue.js", "three.js", "d3.js"}
# A directory the PR does not touch is the same claim in coarser form.
DIR_TOKEN = re.compile(r"(?:[\w.-]+/){1,}")

def summary_scope_problem(result):
    """File paths the change summary cites that this PR does not touch.

    change_summary is meant to describe the PR's own diff. On a re-review whose
    head has just merged the base branch in, `changed_since_prior` is full of
    base-branch files the PR does not own, and summarizing those produces a
    confident description of somebody else's change. The instruction not to do
    that has now been ignored once, so the host checks it."""
    summary = result.get("change_summary") or ""
    changed = changed_paths()
    if not summary or not changed:
        return []
    stray = []

    def note(token):
        if token not in stray:
            stray.append(token)

    paths = PATH_TOKEN.findall(summary)
    for token in paths:
        if any(token == f or f.endswith("/" + token) or token.endswith("/" + f) for f in changed):
            continue
        note(token)

    basenames = {f.rsplit("/", 1)[-1] for f in changed}
    for token in BARE_FILE_TOKEN.findall(summary):
        if token.lower() in BARE_FILE_EXCEPTIONS or token in basenames:
            continue
        # Already reported, with its directory, by the full-path pass above.
        if any(token == path.rsplit("/", 1)[-1] for path in paths):
            continue
        note(token)

    for token in DIR_TOKEN.findall(summary):
        directory = token.rstrip("/")
        if not directory or "/" not in token:
            continue
        if any(f == directory or f.startswith(directory + "/") for f in changed):
            continue
        # A directory that is only the leading part of a full path already flagged.
        if any(path.startswith(token) for path in paths):
            continue
        note(token)

    return stray

def unverified_producers(result):
    """Everything this run could not establish, by whatever shape reported it.

    A producer that failed is a producer that did not run, whether it reported
    that as a could-not-verify verification row, a could-not-verify readiness
    check, or an unavailable classifier. Reading only one of the three lets a
    review claim every producer ran while a section of itself says otherwise."""
    names = []
    for row in result.get("verification") or []:
        if row.get("result") == "could-not-verify":
            names.append(row.get("label") or row.get("id") or "verification check")
    for check in result.get("checks") or []:
        if check.get("status") == "could-not-verify":
            names.append(check.get("id") or "readiness check")
    for classifier in result.get("classifications") or []:
        if classifier.get("status") == "unavailable":
            names.append(classifier.get("id") or "classifier")
    ledger = load_ledger()
    if ledger is not None:
        _, problem = challenger_state(ledger, result.get("findings") or [])
        if problem:
            names.append("challenger (its ledger record contradicts the reported findings)")
    return names

def cap_confidence(result):
    """Confidence follows the weaker of proof quality and completeness."""
    missing = unverified_producers(result)
    if summary_scope_problem(result):
        missing = missing + ["the change summary (it describes files outside this PR's diff)"]
    if not missing:
        return result
    confidence = result.get("confidence") if isinstance(result.get("confidence"), dict) else {}
    if (confidence.get("level") or "high").lower() != "high":
        return result
    why = (confidence.get("why") or "").strip()
    listed = ", ".join(sorted(set(missing)))
    limit = f"This run could not establish: {listed}. Patch-review completeness is therefore partial."
    result["confidence"] = {"level": "medium", "why": (why + " " + limit).strip()}
    return result

def normalize_host_verification(result):
    """Make the host-owned blocker audit agree with the host action rule."""
    count = blocking_count(result)
    noun = "finding" if count == 1 else "findings"
    row = {
        "id": "blocking-findings",
        "label": "Blocking findings",
        "result": "fail" if count else "pass",
        "notes": f"{count} blocking {noun} under the host rule: critical/high, or functional medium.",
    }
    verification = [
        existing for existing in (result.get("verification") or [])
        if existing.get("id") != "blocking-findings"
    ]
    verification.append(row)
    result["verification"] = verification
    return result

def compute_action(result):
    existing = result.get("action")
    if existing == "failure":
        return "failure", "agent-failure"
    findings = result.get("findings") or []
    if any((f.get("category") or "") == "approach-rejected" for f in findings):
        return "reject", "approach-rejected"
    if blocking_count(result):
        return "request-changes", "blocking-findings"
    medium = [f for f in findings if f.get("severity") == "medium"]
    if medium:
        return "comment", "medium-advisory"
    action = "approve"
    reason = "no-blocking-findings"
    risk = rated_level(result, "risk", "low")
    confidence = rated_level(result, "confidence", "high")
    if action == "approve" and risk in ("high", "critical"):
        return "comment", "risk-blocks-approve"
    if action == "approve" and confidence == "low":
        return "comment", "low-confidence"
    if action == "approve" and needs_human(result):
        return "comment", "needs-human"
    return action, reason

def apply_product_ask(result):
    """Raise risk / lower confidence for unjustified Jira-vs-description mismatch.
    Needs-human refuses approve later. Description remains SoT."""
    pa = result.get("product_ask")
    if not isinstance(pa, dict):
        return result
    status = pa.get("status") or "none"
    risk_rank = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    conf_rank = {"high": 0, "medium": 1, "low": 2}

    def bump_risk(floor, why):
        rated = result.get("risk") if isinstance(result.get("risk"), dict) else {}
        cur = (rated.get("level") or "low").lower()
        reasons = [rated.get("why", "").strip(), why]
        if risk_rank.get(floor, 0) > risk_rank.get(cur, 0):
            cur = floor
        result["risk"] = {"level": cur, "why": " ".join(r for r in reasons if r)}

    def drop_confidence(floor, why):
        rated = result.get("confidence") if isinstance(result.get("confidence"), dict) else {}
        cur = (rated.get("level") or "high").lower()
        reasons = [rated.get("why", "").strip(), why]
        if conf_rank.get(floor, 0) > conf_rank.get(cur, 0):
            cur = floor
        result["confidence"] = {"level": cur, "why": " ".join(r for r in reasons if r)}

    if status == "mismatch-unjustified":
        pa["needs_human"] = True
        pa["justified_in_description"] = False
        bump_risk("high", "The PR description does not justify departing from the linked Jira ask.")
        drop_confidence("low", "The unresolved Jira mismatch requires human judgment before approval.")
    return result


def augment_inspected(result):
    """Record verification limits for audit."""
    inspected = dict(result.get("inspected") or {})
    could_not_verify = list(inspected.get("could_not_verify") or [])
    for row in result.get("verification") or []:
        if row.get("result") == "could-not-verify":
            note = row.get("notes") or row.get("label")
            if note and note not in could_not_verify:
                could_not_verify.append(note)
    for check in result.get("checks") or []:
        if check.get("status") == "could-not-verify":
            note = f"{check.get('id') or 'readiness check'}: {check.get('summary') or 'could not be verified'}"
            if note not in could_not_verify:
                could_not_verify.append(note)
    for classifier in result.get("classifications") or []:
        if classifier.get("status") == "unavailable":
            note = f"{classifier.get('id') or 'classifier'}: {classifier.get('summary') or 'unavailable'}"
            if note not in could_not_verify:
                could_not_verify.append(note)
    if could_not_verify:
        inspected["could_not_verify"] = could_not_verify
    if inspected:
        result["inspected"] = inspected
    return result

def group_findings(findings):
    order = ["critical", "high", "medium", "low", "info"]
    grouped = {s: [] for s in order}
    for f in findings:
        grouped.setdefault(f.get("severity") or "info", []).append(f)
    return [(s, grouped[s]) for s in order if grouped.get(s)]

def suppress_mentions(text):
    """Keep agent prose from turning @words into GitHub mentions/links."""
    return re.sub(r"@(?=[A-Za-z0-9-])", "@\u200b", text or "")

def render_location(result, finding, server_url):
    path = (finding.get("file") or "").strip()
    line = finding.get("line")
    label = f"{path}:{line}" if line else path
    repo = (result.get("repo") or os.environ.get("GITHUB_REPOSITORY") or "").strip("/")
    sha = (result.get("head_sha") or "").strip()
    if not path or path.lower() == "n/a" or not repo or not sha:
        return f"`{label}`"
    target = f"{server_url.rstrip('/')}/{repo}/blob/{sha}/{quote(path.lstrip('/'), safe='/')}"
    if line:
        target += f"#L{line}"
    safe_label = label.replace("\\", "\\\\").replace("[", "\\[").replace("]", "\\]")
    return f"[{safe_label}]({target})"

def clean(text):
    return suppress_mentions(str(text or "").strip())

def table_cell(text):
    return clean(text).replace("|", "\\|").replace("\n", " ")

def render_header(result, action):
    sha = result.get("head_sha") or ""
    short = sha[:7] if sha else "unknown"
    started = os.environ.get("REVIEW_STARTED") or os.environ.get("FULLSEND_RUN_STARTED") or ""
    completed = datetime.now(timezone.utc).strftime("%H:%M UTC")
    run_url = os.environ.get("GITHUB_SERVER_URL", "https://github.com")
    repo = os.environ.get("GITHUB_REPOSITORY") or result.get("repo") or ""
    run_id = os.environ.get("GITHUB_RUN_ID", "")
    lines = [
        "<!-- fullsend:review-poc -->",
        f"<!-- **Head SHA:** {sha} -->",
        "",
        f"Finished Review · `{action}` · Commit: `{short}`",
    ]
    meta = []
    if started:
        meta.append(f"Started {started}")
    meta.append(f"Completed {completed}")
    if repo and run_id:
        meta.append(f"[View workflow run]({run_url.rstrip('/')}/{repo}/actions/runs/{run_id})")
    lines.append(" · ".join(meta))
    return lines

def status_text(result, action):
    count = blocking_count(result)
    if action == "request-changes":
        noun = "finding" if count == 1 else "findings"
        return f"Waiting on author — {count} blocking {noun} before the agent bar can clear. Human still finalizes."
    if action == "comment" and needs_human(result):
        return "Needs human judgment."
    if action == "comment":
        return "Advisory — no blocking findings. Human still finalizes."
    if action == "approve":
        return "Agent bar cleared for this head. Human still finalizes."
    if action == "reject":
        return "Approach rejected."
    return "This review did not complete. Do not treat this head as reviewed."

SEVERITY_MARK = {"critical": "⛔", "high": "🔴", "medium": "🟠", "low": "🟡", "info": "⚪"}
STATUS_MARK = {"pass": "✅", "warning": "🟡", "fail": "❌", "not-applicable": "➖", "could-not-verify": "❔"}
VERDICT_MARK = {"PASS": "✅", "PARTIAL": "🟠", "MISS": "❌", "SKIP": "➖"}
ACTION_MARK = {"approve": "✅", "comment": "💬", "request-changes": "🔴", "reject": "⛔", "failure": "❌"}
LEVEL_MARK = {"low": "🟢", "medium": "🟠", "high": "🔴", "critical": "⛔"}
CONFIDENCE_MARK = {"high": "🟢", "medium": "🟠", "low": "🔴"}

def mark(table, key, default=""):
    """Verdict keys are upper-case (PASS/MISS), status keys lower-case.
    Try the key as given before folding case, so both resolve."""
    if not isinstance(key, str):
        return default
    if key in table:
        return table[key]
    return table.get(key.lower(), default)

def detail_block(summary, body_lines, open_by_default=False):
    """A collapsed section. Blank lines around the body are required for
    GitHub to render markdown inside <details>."""
    attr = " open" if open_by_default else ""
    return [f"<details{attr}>", f"<summary>{summary}</summary>", ""] + body_lines + ["", "</details>"]

def challenger_state(ledger, findings):
    """Read the ledger's challenger record, and catch it contradicting itself.

    The sanctioned skip is an empty finding set (step 6d). A run that skips for
    another reason has to say so; recording the empty-set reason instead makes
    the ledger assert something the finding list disproves. Since the ledger
    exists precisely to let the host check the review's account of itself, a
    contradiction here is reported, not absorbed."""
    raw = (ledger.get("challenger") or "").strip()
    if not raw:
        return "", None
    if raw == "ran":
        return "✅ ran", None
    if raw == "failed":
        return "❌ failed", None
    if raw == "pending":
        return ('❔ ledger left at "pending" — never rewritten after collect',
                'The producer ledger still records the challenger as "pending", so whether it ran is unknown.')
    if raw.startswith("skipped"):
        _, _, reason = raw.partition(":")
        reason = reason.strip()
        claims_empty = not reason or "no finding" in reason.lower() or raw == "skipped-empty-set"
        count = len(findings)
        if claims_empty and count:
            return (f'🟡 skipped — recorded as "no findings to adjudicate", but {count} finding(s) were reported',
                    f"The ledger records the challenger as skipped for an empty finding set, but {count} "
                    f"finding(s) were reported. Its real reason for skipping was not recorded.")
        return f"➖ skipped — {clean(reason) if reason else 'no findings to adjudicate'}", None
    return clean(raw), None

def producer_rows(result):
    """What ran, and what each one found — from the dispatch ledger.

    This is the answer to "which sub-agent found what". Without it the review
    is a wall of findings with no provenance, and a reader cannot tell a
    dimension that ran and found nothing from one that never ran."""
    ledger = load_ledger()
    findings = result.get("findings") or []
    attributed = any(f.get("dimension") for f in findings)
    counts = {}
    for f in findings:
        key = f.get("dimension")
        if key:
            counts[key] = counts.get(key, 0) + 1

    def count_cell(name):
        if not attributed:
            return "—"
        return str(counts.get(name, 0))

    rows = []
    if ledger is None:
        for name in (result.get("inspected") or {}).get("producers") or []:
            rows.append((clean(name), "✅ ran", count_cell(name)))
        return rows, False
    for key in ("dispatched", "adapters"):
        for name in ledger.get(key) or []:
            if isinstance(name, str):
                rows.append((clean(name), "✅ ran", count_cell(name)))
    label, _ = challenger_state(ledger, findings)
    if label:
        rows.append(("challenger", label, "—"))
    for row in ledger.get("skipped") or []:
        if isinstance(row, dict) and isinstance(row.get("id"), str):
            reason = clean(row.get("reason") or "not selected")
            rows.append((clean(row["id"]), f"➖ skipped — {reason}", "—"))
    return rows, True

def signal(marker, name, result, detail_lines, open_by_default=False):
    """One status-bearing thing: a scannable line, expandable for the why.

    Risk, confidence, product ask, Jira adherence, readiness checks and
    verification rows all have the same shape — a name, a verdict, and a
    rationale — so they get the same treatment instead of six bespoke
    sections. Anything unmet opens by default; a problem is never hidden
    behind a click."""
    head = f"{marker} <strong>{name}</strong> — {result}".strip()
    if not detail_lines:
        return [f"<details><summary>{head}</summary>", "", "_No further detail reported._", "", "</details>"]
    attr = " open" if open_by_default else ""
    return [f"<details{attr}>", f"<summary>{head}</summary>", ""] + detail_lines + ["", "</details>"]

def render_body(result, previous_md, action):
    run_url = os.environ.get("GITHUB_SERVER_URL", "https://github.com")
    lines = render_header(result, action)

    if action == "failure":
        reason = clean(result.get("reason") or "unknown")
        lines += ["", f"This review did not complete (`{reason}`). Do not treat this head as reviewed."]
        return "\n".join(lines).rstrip() + "\n"

    lines += ["", "## Change summary", "", clean(result.get("change_summary"))]
    stray = summary_scope_problem(result)
    if stray:
        changed = changed_paths()
        lines += ["", f"> 🟡 This summary names files that are not in this PR's diff "
                      f"(`{'`, `'.join(stray)}`). This PR changes "
                      f"{len(changed)} file(s): `{'`, `'.join(changed)}`."]
    lines += ["", "## Status", "", f"{mark(ACTION_MARK, action)} {status_text(result, action)}"]

    # ---- One uniform list of every judgement this review made. ----
    signals = []

    risk = result.get("risk") if isinstance(result.get("risk"), dict) else {}
    confidence = result.get("confidence") if isinstance(result.get("confidence"), dict) else {}
    risk_level = (risk.get("level") or "unspecified").lower()
    conf_level = (confidence.get("level") or "unspecified").lower()
    signals += signal(mark(LEVEL_MARK, risk_level), "Risk", clean(risk_level),
                      [clean(risk.get("why"))] if risk.get("why") else [],
                      open_by_default=risk_level in ("high", "critical"))
    signals += signal(mark(CONFIDENCE_MARK, conf_level), "Confidence", clean(conf_level),
                      [clean(confidence.get("why"))] if confidence.get("why") else [],
                      open_by_default=conf_level == "low")

    pa = result.get("product_ask") if isinstance(result.get("product_ask"), dict) else None
    if pa and (pa.get("status") or "none") != "none":
        status = pa.get("status") or "none"
        needs_attention = bool(pa.get("needs_human")) or status.startswith("mismatch")
        body = []
        if pa.get("aligned"):
            body += ["Aligned:"] + [f"- {clean(item)}" for item in pa["aligned"]] + [""]
        if pa.get("mismatched"):
            body += ["Mismatched:"] + [f"- {clean(item)}" for item in pa["mismatched"]] + [""]
        body += ["The PR description is the source of truth. This is not a check of the diff against acceptance criteria."]
        label = f"<code>{clean(status)}</code>" + (" · needs human review" if pa.get("needs_human") else "")
        signals += signal("🟡" if needs_attention else "✅", "Product ask", label, body,
                          open_by_default=needs_attention)

    criteria = result.get("jira_criteria") if isinstance(result.get("jira_criteria"), list) else []
    if criteria:
        unmet = [c for c in criteria if (c.get("verdict") or "") in ("MISS", "PARTIAL")]
        tally = {}
        for c in criteria:
            tally[c.get("verdict") or "?"] = tally.get(c.get("verdict") or "?", 0) + 1
        counts = " · ".join(f"{mark(VERDICT_MARK, v)} {n} {v}".strip() for v, n in sorted(tally.items()))
        table = ["| Criterion | Verdict | Evidence |", "| --- | --- | --- |"]
        for c in criteria:
            verdict = c.get("verdict") or ""
            stale = " · stale comment" if c.get("stale_comment") else ""
            table.append(
                f"| {table_cell(c.get('criterion'))} | "
                f"{(mark(VERDICT_MARK, verdict) + ' ' + table_cell(verdict)).strip()}{stale} "
                f"| {table_cell(c.get('evidence'))} |")
        signals += signal("❌" if unmet else "✅", "Jira acceptance criteria", counts, table,
                          open_by_default=bool(unmet))

    for check in result.get("checks") if isinstance(result.get("checks"), list) else []:
        status = check.get("status") or ""
        details = [f"- {clean(d)}" for d in check.get("details") or []]
        signals += signal(mark(STATUS_MARK, status), clean(check.get("id")),
                          f"{clean(status)} · {clean(check.get('summary'))}", details,
                          open_by_default=status == "fail")

    for row in result.get("verification") or []:
        res = row.get("result") or ""
        signals += signal(mark(STATUS_MARK, res), clean(row.get("label")), clean(res),
                          [clean(row.get("notes"))] if row.get("notes") else [],
                          open_by_default=res == "fail")

    if signals:
        lines += ["", "## Checks", ""] + signals

    decision = result.get("decision_needed") if isinstance(result.get("decision_needed"), dict) else None
    if decision:
        lines += ["", "## Decision needed", "", clean(decision.get("question")), ""]
        for option in decision.get("options") or []:
            suffix = f" — {clean(option.get('implication'))}" if option.get("implication") else ""
            lines.append(f"- **{clean(option.get('id'))}.** {clean(option.get('title'))}{suffix}")

    findings = result.get("findings") or []
    if findings:
        lines += ["", "## Findings", "",
                  "⛔ Critical, 🔴 High, and functional 🟠 Medium block the agent bar. 🟡 Low and ⚪ Info do not."]
        for severity, items in group_findings(findings):
            lines += ["", f"### {mark(SEVERITY_MARK, severity)} {severity.capitalize()} ({len(items)})"]
            for finding in items:
                loc = render_location(result, finding, run_url)
                actionable = " · actionable follow-up" if finding.get("actionable") and severity in ("low", "info") else ""
                origin = f"`{clean(finding.get('dimension'))}` · " if finding.get("dimension") else ""
                lines += ["", f"- {origin}**{clean(finding.get('category'))}** ({loc}){actionable}: {clean(finding.get('description'))}"]
                if finding.get("why"):
                    lines.append(f"  - Why: {clean(finding.get('why'))}")
                if finding.get("remediation"):
                    lines.append(f"  - Remediation: {clean(finding.get('remediation'))}")
    elif action == "approve":
        lines += ["", "Looks good to me."]

    # ---- Provenance and audit. ----
    inspected = result.get("inspected") if isinstance(result.get("inspected"), dict) else {}
    labels = result.get("label_actions") if isinstance(result.get("label_actions"), dict) else {}
    classifications = result.get("classifications") if isinstance(result.get("classifications"), list) else []
    details_body = []

    rows, from_ledger = producer_rows(result)
    if rows:
        details_body += ["### Producers", "", "| Producer | Ran | Findings |", "| --- | --- | --- |"]
        for name, ran, count in rows:
            details_body.append(f"| {name} | {ran} | {count} |")
        if not from_ledger:
            details_body += ["", "_No dispatch ledger for this run — this list is self-reported by the agent._"]
        details_body.append("")

    if classifications:
        details_body += ["### Classifications", "", "| Classifier | Subject | Result | Reason |", "| --- | --- | --- | --- |"]
        for classifier in classifications:
            for item in classifier.get("classifications") or []:
                details_body.append(
                    f"| {table_cell(classifier.get('id'))} | {table_cell(item.get('subject'))} "
                    f"| {table_cell(item.get('classification'))} | {table_cell(item.get('reason'))} |")
            if not classifier.get("classifications"):
                details_body.append(
                    f"| {table_cell(classifier.get('id'))} | — | {table_cell(classifier.get('status'))} "
                    f"| {table_cell(classifier.get('summary'))} |")
        details_body.append("")

    if inspected.get("could_not_verify"):
        details_body += ["### Could not verify", ""] + [f"- {clean(i)}" for i in inspected["could_not_verify"]] + [""]
    if inspected.get("summary"):
        details_body += ["### Evidence", "", clean(inspected["summary"]), ""]

    sig = clean(os.environ.get("REVIEW_SIGNALS"))
    if sig:
        details_body += ["### Signals", "", sig, ""]
    if labels and labels.get("actions"):
        details_body += ["### Labels", ""]
        reason = clean(labels.get("reason"))
        for item in labels["actions"]:
            details_body.append(f"- `{clean(item.get('label'))}` — {clean(item.get('action'))}: {reason}")
        details_body.append("")

    if details_body:
        ran = sum(1 for _, state, _ in rows if state.startswith("✅"))
        skipped = len(rows) - ran
        blurb = f"{ran} producer(s) ran, {skipped} skipped" if rows else "evidence and provenance"
        lines += [""] + detail_block(f"🔍 <strong>Review details</strong> — {blurb}", details_body)

    _ = previous_md
    return "\n".join(lines).rstrip() + "\n"

with open(sys.argv[1], encoding="utf-8") as fh:
    result = json.load(fh)
previous_md = os.environ.get("REVIEW_PREVIOUS_MARKDOWN", "")
result = normalize_protected_findings(result)
result = reconcile_producers(result)
result = normalize_host_verification(result)
result = augment_inspected(result)
result = apply_product_ask(result)
result = cap_confidence(result)
action, _reason = compute_action(result)
body = render_body(result, previous_md, action)
out = dict(result)
out["action"] = action
if body:
    out["body"] = body
json.dump(out, sys.stdout, indent=2)
sys.stdout.write("\n")
PY
}

# Fullsend v0.39.0 has no switch for summary-only review findings. Its CLI
# creates inline or file-level review comments only for findings that include
# a positive line number. Preserve findings for verdicts and approved-review
# follow-up issues, but remove line numbers from the copy passed to the CLI.
prepare_summary_only_result() {
  jq 'if (.findings | type) == "array" then .findings |= map(del(.line)) else . end' "$1" > "$2"
}

run_self_test() {
  local fail=0 tmp
  tmp=$(mktemp -d)
  cleanup_self_test() { rm -rf "${tmp}"; }
  trap cleanup_self_test EXIT

  render_fixture() {
    local name="$1" want_action="$2" json="$3" body
    printf '%s' "${json}" > "${tmp}/${name}.json"
    transform_review_result "${tmp}/${name}.json" > "${tmp}/${name}-out.json"
    if [[ "$(jq -r .action "${tmp}/${name}-out.json")" != "${want_action}" ]]; then
      echo "FAIL ${name}: expected action=${want_action}" >&2
      fail=1
      return
    fi
    body=$(jq -r .body "${tmp}/${name}-out.json")
    if ! grep -q '## Change summary' <<<"${body}" ||
       ! grep -q '## Status' <<<"${body}" ||
       ! grep -q '<summary>🔍 <strong>Review details</strong>' <<<"${body}" ||
       ! grep -q '## Checks' <<<"${body}" ||
       ! grep -q '<strong>Blocking findings</strong>' <<<"${body}"; then
      echo "FAIL ${name}: required rendered sections missing" >&2
      fail=1
      return
    fi
    echo "PASS ${name} (${want_action})"
  }

  local common
  common='"schema_version":"2","pr_number":1,"repo":"o/r","head_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","change_summary":"Changes a small frontend helper without changing authorization.","risk":{"level":"low","why":"The change is isolated to one internal helper."},"confidence":{"level":"high","why":"The complete diff and matching unit evidence were inspected."},"verification":[{"id":"description-vs-code","label":"Description vs code","result":"pass"},{"id":"evidence","label":"Evidence","result":"pass"},{"id":"security","label":"Security","result":"pass"},{"id":"blocking-findings","label":"Blocking findings","result":"pass"},{"id":"product-ask","label":"Product ask","result":"pass"}]'

  render_fixture approve approve "{${common},\"findings\":[],\"product_ask\":{\"status\":\"none\"},\"inspected\":{\"summary\":\"Read the PR body and full diff.\",\"producers\":[\"correctness\",\"style-conventions\"]}}"

  render_fixture request-changes request-changes "{${common},\"findings\":[{\"severity\":\"high\",\"category\":\"correctness\",\"file\":\"a.ts\",\"line\":12,\"description\":\"Empty state throws.\",\"why\":\"The supported empty route reaches an unguarded map.\",\"remediation\":\"Guard the list and add an empty-state test.\"}],\"product_ask\":{\"status\":\"aligned\"}}"

  render_fixture needs-human comment "{${common},\"findings\":[],\"decision_needed\":{\"question\":\"Which product scope should this PR implement?\",\"options\":[{\"id\":\"A\",\"title\":\"Keep the PR scope\"},{\"id\":\"B\",\"title\":\"Match Jira\"}]},\"product_ask\":{\"status\":\"mismatch-justified\",\"needs_human\":true}}"

  local pa body
  printf '%s' "{${common},\"product_ask\":{\"status\":\"mismatch-unjustified\",\"mismatched\":[\"Jira asks for export\"]}}" > "${tmp}/product-ask.json"
  transform_review_result "${tmp}/product-ask.json" > "${tmp}/product-ask-out.json"
  if ! jq -e '.action == "comment" and .risk.level == "high" and .confidence.level == "low" and (.risk.why | contains("Jira")) and (.confidence.why | contains("Jira"))' "${tmp}/product-ask-out.json" >/dev/null; then
    echo "FAIL product-ask: host floors and rationale rewrite" >&2
    fail=1
  else
    echo "PASS product-ask floors risk/confidence and rewrites why"
  fi

  body=$(jq -r .body "${tmp}/request-changes-out.json")
  if ! grep -q 'Waiting on author — 1 blocking finding' <<<"${body}" ||
     ! grep -Fq '[a.ts:12](https://github.com/o/r/blob/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/a.ts#L12)' <<<"${body}"; then
    echo "FAIL request-changes: status count or commit-pinned link missing" >&2
    fail=1
  else
    echo "PASS request-changes status and linked location"
  fi
  body=$(jq -r .body "${tmp}/needs-human-out.json")
  if ! grep -q 'Needs human judgment' <<<"${body}" || ! grep -q '## Decision needed' <<<"${body}"; then
    echo "FAIL needs-human: status or decision section missing" >&2
    fail=1
  else
    echo "PASS needs-human status and decision section"
  fi
  body=$(jq -r .body "${tmp}/approve-out.json")
  if grep -q '## Findings' <<<"${body}" || ! grep -q 'Looks good to me' <<<"${body}"; then
    echo "FAIL approve: empty findings rendering" >&2
    fail=1
  else
    echo "PASS approve omits findings section"
  fi

  printf '%s' "{${common},\"jira_criteria\":[{\"criterion\":\"Permission is checked\",\"verdict\":\"PASS\",\"evidence\":\"Route gate is present.\",\"stale_comment\":true}],\"checks\":[{\"id\":\"test-impact-review\",\"status\":\"warning\",\"summary\":\"No targeted tests were changed.\",\"details\":[\"PR body explains manual verification only.\"]}],\"classifications\":[{\"id\":\"example-classifier\",\"status\":\"completed\",\"summary\":\"One failed check classified.\",\"classifications\":[{\"subject\":\"unit\",\"classification\":\"flaky\",\"reason\":\"Repeated on unrelated PRs.\"}]}]}" > "${tmp}/structured.json"
  transform_review_result "${tmp}/structured.json" > "${tmp}/structured-out.json"
  body=$(jq -r .body "${tmp}/structured-out.json")
  if ! grep -q '## Checks' <<<"${body}" ||
     ! grep -q '<strong>test-impact-review</strong>' <<<"${body}" ||
     ! grep -q '<strong>Jira acceptance criteria</strong>' <<<"${body}" ||
     ! grep -q 'Permission is checked' <<<"${body}" ||
     ! grep -q '### Classifications' <<<"${body}" ||
     ! grep -q 'example-classifier' <<<"${body}"; then
    echo "FAIL structured results: checks or classifications were not rendered" >&2
    fail=1
  else
    echo "PASS structured results render separately from findings"
  fi

  prepare_summary_only_result "${tmp}/request-changes-out.json" "${tmp}/summary-only.json"
  if ! jq -e '(.findings[0] | has("line") | not) and (.body | contains("a.ts#L12"))' "${tmp}/summary-only.json" >/dev/null; then
    echo "FAIL summary-only: expected linked body location without structured line" >&2
    fail=1
  else
    echo "PASS summary-only suppresses inline comments"
  fi

  printf '%s' '{"pr_number":1,"repo":"o/r","head_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","action":"failure","reason":"tool-failure"}' > "${tmp}/failure.json"
  body=$(transform_review_result "${tmp}/failure.json" | jq -r .body)
  if ! grep -q 'Finished Review · `failure`' <<<"${body}" || ! grep -q 'Do not treat this head as reviewed' <<<"${body}"; then
    echo "FAIL failure: failure variant missing" >&2
    fail=1
  else
    echo "PASS failure variant"
  fi

  local pp_finding
  pp_finding='{"severity":"medium","category":"protected-path","file":".fullsend/.run/.gitignore","description":"Modifies a governance file.","why":"Governance files need human oversight."}'

  printf '%s' "{${common},\"findings\":[${pp_finding}]}" > "${tmp}/pp-unsupported.json"
  (
    export REVIEW_PROTECTED_PATHS=".github/,scripts/"
    export REVIEW_CHANGED_FILES=".fullsend/.run/.gitignore"
    transform_review_result "${tmp}/pp-unsupported.json"
  ) > "${tmp}/pp-unsupported-out.json"
  if ! jq -e '((.findings // []) | length) == 0 and .action == "approve"' "${tmp}/pp-unsupported-out.json" >/dev/null; then
    echo "FAIL protected-path-unsupported: finding naming an unlisted path was not dropped" >&2
    fail=1
  else
    echo "PASS protected-path finding outside REVIEW_PROTECTED_PATHS is dropped"
  fi

  printf '%s' "{${common},\"findings\":[${pp_finding}]}" > "${tmp}/pp-real.json"
  (
    export REVIEW_PROTECTED_PATHS=".github/,scripts/"
    export REVIEW_CHANGED_FILES=$'.github/workflows/ci.yaml\nsrc/app.ts'
    transform_review_result "${tmp}/pp-real.json"
  ) > "${tmp}/pp-real-out.json"
  if ! jq -e '.action == "comment" and ((.findings // []) | length) == 1 and (.decision_needed.question | contains(".github/workflows/ci.yaml"))' "${tmp}/pp-real-out.json" >/dev/null; then
    echo "FAIL protected-path-real: want comment + retained finding + decision_needed" >&2
    fail=1
  elif ! grep -q 'Needs human judgment' <<<"$(jq -r .body "${tmp}/pp-real-out.json")"; then
    echo "FAIL protected-path-real: status should route to human judgment, not the author" >&2
    fail=1
  else
    echo "PASS supported protected-path routes to human judgment, not request-changes"
  fi

  printf '%s' '{"dispatched":["correctness"],"adapters":["jira-snapshot"],"skipped":[{"id":"security","reason":"no auth, secrets or config touched"}],"challenger":"skipped-empty-set","returned":["correctness"]}' > "${tmp}/producers.json"
  printf '%s' "{${common},\"findings\":[],\"inspected\":{\"summary\":\"Read the diff.\",\"producers\":[\"correctness\",\"security\",\"challenger\"]}}" > "${tmp}/ledger.json"
  (
    export REVIEW_PRODUCER_LEDGER="${tmp}/producers.json"
    transform_review_result "${tmp}/ledger.json"
  ) > "${tmp}/ledger-out.json"
  if ! jq -e '(.verification[] | select(.id == "security") | .result) == "could-not-verify"' "${tmp}/ledger-out.json" >/dev/null; then
    echo "FAIL ledger: a skipped dimension still reported a pass verification row" >&2
    fail=1
  elif ! jq -e '.inspected.producers == ["correctness","jira-snapshot"]' "${tmp}/ledger-out.json" >/dev/null; then
    echo "FAIL ledger: producer list was not reconciled against the ledger" >&2
    fail=1
  elif ! jq -e '.confidence.level == "medium"' "${tmp}/ledger-out.json" >/dev/null; then
    echo "FAIL ledger: confidence stayed high despite an unverifiable check" >&2
    fail=1
  else
    echo "PASS ledger reconciles producers, verification rows and confidence"
  fi

  # An unavailable readiness check is an incomplete review, even when every
  # verification row passed. This is the shape the 51-minute smoke run hit: a
  # readiness check reported could-not-verify while confidence still claimed high.
  printf '%s' "{${common},\"findings\":[],\"checks\":[{\"id\":\"test-impact-review\",\"status\":\"could-not-verify\",\"summary\":\"CI host context was unavailable.\"}]}" > "${tmp}/unavailable-check.json"
  transform_review_result "${tmp}/unavailable-check.json" > "${tmp}/unavailable-check-out.json"
  if ! jq -e '.confidence.level == "medium" and (.confidence.why | contains("test-impact-review"))' "${tmp}/unavailable-check-out.json" >/dev/null; then
    echo "FAIL unavailable-check: confidence stayed high despite an unverifiable readiness check" >&2
    fail=1
  elif ! jq -e '.inspected.could_not_verify | any(.[]; contains("test-impact-review"))' "${tmp}/unavailable-check-out.json" >/dev/null; then
    echo "FAIL unavailable-check: the limit was not recorded in inspected" >&2
    fail=1
  else
    echo "PASS unavailable readiness check caps confidence and is recorded"
  fi

  # Provenance: the ledger drives a Producers table that distinguishes a
  # dimension that ran and found nothing from one that never ran, and each
  # finding names the producer that raised it.
  printf '%s' '{"dispatched":["correctness","style-review"],"adapters":["jira-snapshot"],"skipped":[{"id":"security","reason":"no auth or secrets touched"}],"challenger":"ran","returned":["correctness","style-review"]}' > "${tmp}/prov-ledger.json"
  printf '%s' "{${common},\"findings\":[{\"severity\":\"high\",\"category\":\"off-by-one\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"line\":3,\"description\":\"Out of bounds.\",\"why\":\"Index equals length.\",\"remediation\":\"Subtract one.\"}]}" > "${tmp}/prov.json"
  (
    export REVIEW_PRODUCER_LEDGER="${tmp}/prov-ledger.json"
    transform_review_result "${tmp}/prov.json"
  ) > "${tmp}/prov-out.json"
  body=$(jq -r .body "${tmp}/prov-out.json")
  if ! grep -q '### Producers' <<<"${body}"; then
    echo "FAIL provenance: no Producers table" >&2
    fail=1
  elif ! grep -qE '^\| correctness \| ✅ ran \| 1 \|' <<<"${body}"; then
    echo "FAIL provenance: producer that found something is not counted" >&2
    fail=1
  elif ! grep -qE '^\| style-review \| ✅ ran \| 0 \|' <<<"${body}"; then
    echo "FAIL provenance: producer that ran clean is not distinguished from one that was skipped" >&2
    fail=1
  elif ! grep -q 'security | ➖ skipped — no auth or secrets touched' <<<"${body}"; then
    echo "FAIL provenance: skipped producer missing its reason" >&2
    fail=1
  elif ! grep -q '`correctness` · \*\*off-by-one\*\*' <<<"${body}"; then
    echo "FAIL provenance: finding does not name the producer that raised it" >&2
    fail=1
  elif ! grep -q '### 🔴 High (1)' <<<"${body}"; then
    echo "FAIL provenance: severity heading missing marker or count" >&2
    fail=1
  else
    echo "PASS producers table attributes findings and separates ran-clean from skipped"
  fi

  # Unmet criteria stay expanded; an all-clear set collapses.
  printf '%s' "{${common},\"jira_criteria\":[{\"criterion\":\"Gate is present\",\"verdict\":\"MISS\",\"evidence\":\"No gate in diff.\"}]}" > "${tmp}/jira-miss.json"
  body=$(transform_review_result "${tmp}/jira-miss.json" | jq -r .body)
  if ! grep -q '<details open>' <<<"${body}"; then
    echo "FAIL jira-miss: an unmet criterion must stay expanded" >&2
    fail=1
  elif grep -q '<summary>✅ <strong>Jira acceptance criteria' <<<"${body}"; then
    echo "FAIL jira-miss: unmet criteria were collapsed behind an all-clear summary" >&2
    fail=1
  else
    echo "PASS unmet Jira criteria stay expanded, clean ones collapse"
  fi

  # The ledger claiming an empty-set skip while findings exist is the exact
  # shape run 243 produced. The host must contradict it, not repeat it.
  printf '%s' '{"dispatched":["correctness"],"adapters":[],"skipped":[],"challenger":"skipped-empty-set"}' > "${tmp}/ch-bad.json"
  printf '%s' "{${common},\"findings\":[{\"severity\":\"high\",\"category\":\"off-by-one\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"description\":\"Out of bounds.\",\"why\":\"undefined.\",\"remediation\":\"length - 1.\"}]}" > "${tmp}/ch.json"
  ( export REVIEW_PRODUCER_LEDGER="${tmp}/ch-bad.json"; transform_review_result "${tmp}/ch.json" ) > "${tmp}/ch-out.json"
  body=$(jq -r .body "${tmp}/ch-out.json")
  if ! grep -q 'recorded as "no findings to adjudicate", but 1 finding(s) were reported' <<<"${body}"; then
    echo "FAIL challenger-contradiction: host repeated a ledger claim the findings disprove" >&2
    fail=1
  elif ! jq -e '.confidence.level == "medium"' "${tmp}/ch-out.json" >/dev/null; then
    echo "FAIL challenger-contradiction: a self-contradicting ledger left confidence untouched" >&2
    fail=1
  else
    echo "PASS contradictory challenger record is reported and caps confidence"
  fi

  # An honest skip with a stated reason renders as-is.
  printf '%s' '{"dispatched":["correctness"],"adapters":[],"skipped":[],"challenger":"skipped: re-review, findings unchanged since prior run"}' > "${tmp}/ch-ok.json"
  ( export REVIEW_PRODUCER_LEDGER="${tmp}/ch-ok.json"; transform_review_result "${tmp}/ch.json" ) > "${tmp}/ch-ok-out.json"
  if ! grep -q '➖ skipped — re-review, findings unchanged since prior run' <<<"$(jq -r .body "${tmp}/ch-ok-out.json")"; then
    echo "FAIL challenger-reason: a stated skip reason was not rendered" >&2
    fail=1
  else
    echo "PASS challenger skip reason renders verbatim"
  fi

  # A ledger never rewritten after collect is not the same as a skip.
  printf '%s' '{"dispatched":["correctness"],"adapters":[],"skipped":[],"challenger":"pending"}' > "${tmp}/ch-pending.json"
  ( export REVIEW_PRODUCER_LEDGER="${tmp}/ch-pending.json"; transform_review_result "${tmp}/ch.json" ) > "${tmp}/ch-p-out.json"
  if ! grep -q 'never rewritten after collect' <<<"$(jq -r .body "${tmp}/ch-p-out.json")"; then
    echo "FAIL challenger-pending: an un-rewritten ledger was read as a real state" >&2
    fail=1
  else
    echo "PASS un-rewritten challenger record is flagged, not believed"
  fi

  # The exact shape runs 240/243/246 produced: the summary describes the
  # base-branch merge instead of the PR's own four files.
  printf '%s' '{"pr_number":1,"repo":"o/r","head_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","schema_version":"2","change_summary":"Infrastructure-only update: modified .fullsend/scripts/post-review.sh and .fullsend/skills/pr-review/SKILL.md.","risk":{"level":"low","why":"n"},"confidence":{"level":"high","why":"All producers ran."},"verification":[{"id":"evidence","label":"Evidence","result":"pass"}],"findings":[]}' > "${tmp}/scope.json"
  (
    export REVIEW_CHANGED_FILES="frontend/src/pages/smokeReview/useSmokeQuota.ts
docs/admin-dashboard.md"
    transform_review_result "${tmp}/scope.json"
  ) > "${tmp}/scope-out.json"
  body=$(jq -r .body "${tmp}/scope-out.json")
  if ! grep -q "names files that are not in this PR's diff" <<<"${body}"; then
    echo "FAIL summary-scope: a summary describing files outside the diff went unchallenged" >&2
    fail=1
  elif ! grep -q 'post-review.sh' <<<"${body}"; then
    echo "FAIL summary-scope: the offending paths were not named" >&2
    fail=1
  elif ! jq -e '.confidence.level == "medium"' "${tmp}/scope-out.json" >/dev/null; then
    echo "FAIL summary-scope: confidence stayed high on a summary of the wrong change" >&2
    fail=1
  else
    echo "PASS out-of-diff change summary is challenged and caps confidence"
  fi

  # A summary that names only files the PR touches must pass clean.
  printf '%s' '{"pr_number":1,"repo":"o/r","head_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","schema_version":"2","change_summary":"Adds a quota panel in frontend/src/pages/smokeReview/useSmokeQuota.ts and documents it.","risk":{"level":"low","why":"n"},"confidence":{"level":"high","why":"All producers ran."},"verification":[{"id":"evidence","label":"Evidence","result":"pass"}],"findings":[]}' > "${tmp}/scope-ok.json"
  (
    export REVIEW_CHANGED_FILES="frontend/src/pages/smokeReview/useSmokeQuota.ts
docs/admin-dashboard.md"
    transform_review_result "${tmp}/scope-ok.json"
  ) > "${tmp}/scope-ok-out.json"
  if grep -q "names files that are not in this PR's diff" <<<"$(jq -r .body "${tmp}/scope-ok-out.json")"; then
    echo "FAIL summary-scope: an in-diff summary was falsely challenged" >&2
    fail=1
  elif ! jq -e '.confidence.level == "high"' "${tmp}/scope-ok-out.json" >/dev/null; then
    echo "FAIL summary-scope: an in-diff summary should not cap confidence" >&2
    fail=1
  else
    echo "PASS in-diff change summary passes clean"
  fi

  # Run 249's summary, verbatim. It named the base-branch files by basename only
  # ("post-review.sh", not ".fullsend/scripts/post-review.sh"), so the first
  # version of this guard -- which required a slash -- let it through.
  printf '%s' '{"pr_number":1,"repo":"o/r","head_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","schema_version":"2","change_summary":"Infrastructure-only changes to Fullsend review harness: updated fetch-jira-context.sh and post-review.sh scripts in .fullsend/scripts/. No changes to smoke fixture code (frontend/src/pages/smokeReview/) which remains unchanged since prior review at 6285d45.","risk":{"level":"low","why":"n"},"confidence":{"level":"high","why":"All producers ran."},"verification":[{"id":"evidence","label":"Evidence","result":"pass"}],"findings":[]}' > "${tmp}/bare.json"
  (
    export REVIEW_CHANGED_FILES="frontend/src/pages/smokeReview/SmokeAdminPanel.tsx
frontend/src/pages/smokeReview/useSmokeQuota.ts
frontend/src/pages/smokeReview/SmokeAdminPanel.scss
docs/admin-dashboard.md"
    transform_review_result "${tmp}/bare.json"
  ) > "${tmp}/bare-out.json"
  body=$(jq -r .body "${tmp}/bare-out.json")
  if ! grep -q "names files that are not in this PR's diff" <<<"${body}"; then
    echo "FAIL bare-scope: a summary citing base-branch files by basename went unchallenged" >&2
    fail=1
  elif ! grep -q 'post-review.sh' <<<"${body}"; then
    echo "FAIL bare-scope: the offending basename was not named" >&2
    fail=1
  elif ! grep -q '.fullsend/scripts/' <<<"${body}"; then
    echo "FAIL bare-scope: the untouched directory was not named" >&2
    fail=1
  elif ! jq -e '.confidence.level == "medium"' "${tmp}/bare-out.json" >/dev/null; then
    echo "FAIL bare-scope: confidence stayed high on a summary of the wrong change" >&2
    fail=1
  else
    echo "PASS basenames and directories outside the diff are challenged too"
  fi

  # The widened matcher must not fire on a correct summary: basenames that are in
  # the diff, a directory that is, and a library whose name looks like a filename.
  printf '%s' '{"pr_number":1,"repo":"o/r","head_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","schema_version":"2","change_summary":"Adds a quota panel in frontend/src/pages/smokeReview/useSmokeQuota.ts, styles it in SmokeAdminPanel.scss, and documents it in docs/admin-dashboard.md. Written against Node.js 22.","risk":{"level":"low","why":"n"},"confidence":{"level":"high","why":"All producers ran."},"verification":[{"id":"evidence","label":"Evidence","result":"pass"}],"findings":[]}' > "${tmp}/bare-ok.json"
  (
    export REVIEW_CHANGED_FILES="frontend/src/pages/smokeReview/SmokeAdminPanel.tsx
frontend/src/pages/smokeReview/useSmokeQuota.ts
frontend/src/pages/smokeReview/SmokeAdminPanel.scss
docs/admin-dashboard.md"
    transform_review_result "${tmp}/bare-ok.json"
  ) > "${tmp}/bare-ok-out.json"
  if grep -q "names files that are not in this PR's diff" <<<"$(jq -r .body "${tmp}/bare-ok-out.json")"; then
    echo "FAIL bare-scope: an in-diff summary was falsely challenged" >&2
    jq -r .body "${tmp}/bare-ok-out.json" | grep "names files" >&2
    fail=1
  else
    echo "PASS in-diff basenames and a library name pass clean"
  fi

  # Every U+FE0F variation selector is stripped from the comment before it is
  # posted -- the live body carries none. A glyph that needs one to be coloured
  # (U+26A0 WARNING SIGN is the one that bit us) therefore renders monochrome on
  # GitHub no matter how the source is written. Every marker must be a character
  # that is emoji-presentation by default, so scan the rendered body rather than
  # trusting the marker tables.
  jq -r .body "${tmp}/scope-out.json" "${tmp}/ledger-out.json" "${tmp}/prov-out.json" \
      "${tmp}/request-changes-out.json" "${tmp}/structured-out.json" \
    | python3 -c '
import sys, unicodedata
text = sys.stdin.read()
bad = set()
for index, char in enumerate(text):
    if char == "\ufe0f":
        bad.add("U+FE0F after " + hex(ord(text[index - 1])))
        continue
    if ord(char) < 0x2100 or unicodedata.category(char) != "So":
        continue
    # Symbols below U+1F000 that are not emoji by default need a selector.
    if ord(char) < 0x1F000 and ord(char) not in {
        0x2705, 0x274C, 0x2754, 0x2796, 0x26D4, 0x26AA, 0x21B3,
    }:
        bad.add(hex(ord(char)) + " " + unicodedata.name(char, "?"))
if bad:
    print("\n".join(sorted(bad)))
' > "${tmp}/glyphs.txt"
  if [[ -s "${tmp}/glyphs.txt" ]]; then
    echo "FAIL glyphs: markers that need a stripped variation selector, or a stray one:" >&2
    cat "${tmp}/glyphs.txt" >&2
    fail=1
  else
    echo "PASS every rendered marker is coloured without a variation selector"
  fi

  if [[ "${fail}" -ne 0 ]]; then
    exit 1
  fi
  echo "All self-tests passed"
  trap - EXIT
  cleanup_self_test
}

if [[ "${1:-}" == "--self-test" ]]; then
  run_self_test
  exit 0
fi

: "${REVIEW_TOKEN:?REVIEW_TOKEN is required}"
: "${PR_NUMBER:?PR_NUMBER is required}"
if ! [[ "${PR_NUMBER}" =~ ^[0-9]+$ ]]; then
  echo "::error::PR_NUMBER must be a positive integer" >&2
  exit 1
fi
: "${REPO_FULL_NAME:?REPO_FULL_NAME is required}"

echo "::add-mask::${REVIEW_TOKEN}"
export GH_TOKEN="${REVIEW_TOKEN}"

# Temp file cleanup: accumulate files to remove on exit so later traps
# don't overwrite earlier ones.
CLEANUP_FILES=()
trap 'rm -f "${CLEANUP_FILES[@]}"' EXIT

# Refuse to post reviews on merged or closed PRs.
# Also fetch draft status — draft PRs must not receive ready-for-merge.
PR_INFO=$(gh pr view "${PR_NUMBER}" --repo "${REPO_FULL_NAME}" --json state,isDraft)
PR_STATE=$(echo "${PR_INFO}" | jq -r '.state')
PR_IS_DRAFT=$(echo "${PR_INFO}" | jq -r '.isDraft')
if [ "${PR_STATE}" != "OPEN" ]; then
  echo "PR is ${PR_STATE}, skipping review"

  STATE_LOWER="$(echo "${PR_STATE}" | tr '[:upper:]' '[:lower:]')"
  COMMENT_BODY="Review skipped — this PR is already **${STATE_LOWER}**.

The \`/fs-review\` command only reviews open pull requests.

<sub>Posted by <a href=\"https://github.com/fullsend-ai/fullsend\">fullsend</a> post-review check</sub>"

  printf '%s' "${COMMENT_BODY}" | gh issue comment "${PR_NUMBER}" \
    --repo "${REPO_FULL_NAME}" --body-file - 2>/dev/null || true

  exit 0
fi

# Find the agent result — prefer the validated iteration when set.
# Trust boundary: FULLSEND_VALIDATED_ITERATION_DIR is set by the fullsend CLI
# on the runner — not by the sandbox or the agent. No containment check
# (realpath / prefix guard) is applied here; the value is trusted from the
# external harness. If the trust model changes, add a realpath prefix check.
if [[ -n "${FULLSEND_VALIDATED_ITERATION_DIR:-}" ]]; then
  if [[ -f "${FULLSEND_VALIDATED_ITERATION_DIR}/agent-result.json" ]]; then
    RESULT_FILE="${FULLSEND_VALIDATED_ITERATION_DIR}/agent-result.json"
  elif [[ -f "${FULLSEND_VALIDATED_ITERATION_DIR}/result.json" ]]; then
    RESULT_FILE="${FULLSEND_VALIDATED_ITERATION_DIR}/result.json"
  else
    echo "::error::FULLSEND_VALIDATED_ITERATION_DIR is set but contains neither agent-result.json nor result.json" >&2
    exit 1
  fi
else
  RESULT_FILE=$(find .  -maxdepth 4 -path '*/iteration-*/output/agent-result.json' | sort -V | tail -1)
fi

if [ -z "${RESULT_FILE}" ] || [ ! -f "${RESULT_FILE}" ]; then
  echo "::error::No agent-result.json found — posting failure notice"
  echo '{"action":"failure","reason":"agent-no-output"}' | \
    fullsend post-review \
      --repo "${REPO_FULL_NAME}" \
      --pr "${PR_NUMBER}" \
      --token "${REVIEW_TOKEN}" \
      --result -
  exit 1
fi

echo "Using result: ${RESULT_FILE}"

# The orchestrator writes producers.json next to agent-result.json at dispatch
# time. Capture it now: RESULT_FILE is reassigned to temp copies below.
REVIEW_PRODUCER_LEDGER="$(dirname "${RESULT_FILE}")/producers.json"
if [[ -f "${REVIEW_PRODUCER_LEDGER}" ]]; then
  echo "Producer ledger: ${REVIEW_PRODUCER_LEDGER}"
else
  echo "::warning::No producer ledger at ${REVIEW_PRODUCER_LEDGER} — the review's producer list cannot be corroborated"
  REVIEW_PRODUCER_LEDGER=""
fi
export REVIEW_PRODUCER_LEDGER

# ---------------------------------------------------------------------------
# Severity filtering: drop findings below the configured threshold.
# Defense-in-depth — the agent should already have filtered, but the
# post-script enforces it. The filter runs before ACTION is read so
# that verdict recalculation (if all findings are removed) is possible.
# ---------------------------------------------------------------------------
REVIEW_FINDING_SEVERITY_THRESHOLD="${REVIEW_FINDING_SEVERITY_THRESHOLD:-}"
case "${REVIEW_FINDING_SEVERITY_THRESHOLD}" in
  info|low|medium|high|critical) ;;
  *) # Sanitize before interpolating into a workflow command. Strip raw
     # newlines, then strip every '%' and ':' character outright rather than
     # matching specific multi-char tokens (e.g. "%0A", "::") — matching
     # fixed-width tokens is not idempotent and can be bypassed by adjacent
     # fragments reassembling after a single pass (e.g. "%0%0aA" -> "%0A",
     # ':::error:::' -> '::error::'). Removing every occurrence of a single
     # character in one pass can't reassemble into that character.
     sanitized="${REVIEW_FINDING_SEVERITY_THRESHOLD//$'\n'/}"
     sanitized="${sanitized//$'\r'/}"
     sanitized="${sanitized//%/}"
     sanitized="${sanitized//:/}"
     echo "::error::REVIEW_FINDING_SEVERITY_THRESHOLD='${sanitized}' is invalid (expected info|low|medium|high|critical)"
     echo '{"action":"failure","reason":"tool-failure"}' | \
       fullsend post-review \
         --repo "${REPO_FULL_NAME}" \
         --pr "${PR_NUMBER}" \
         --token "${REVIEW_TOKEN}" \
         --result -
     exit 1 ;;
esac

severity_rank() {
  case "$1" in
    info)     echo 0 ;;
    low)      echo 1 ;;
    medium)   echo 2 ;;
    high)     echo 3 ;;
    critical) echo 4 ;;
    *)        echo 1 ;;
  esac
}

threshold_rank=$(severity_rank "$REVIEW_FINDING_SEVERITY_THRESHOLD")

if jq -e '.findings' "${RESULT_FILE}" >/dev/null 2>&1; then
  original_count=$(jq '.findings | length' "${RESULT_FILE}")
  FILTERED_RESULT=$(mktemp)
  CLEANUP_FILES+=("${FILTERED_RESULT}")
  jq --argjson rank "$threshold_rank" '
    .findings |= [.[] | select(
      (if .severity == "info" then 0
       elif .severity == "low" then 1
       elif .severity == "medium" then 2
       elif .severity == "high" then 3
       elif .severity == "critical" then 4
       else 1 end) >= $rank
    )]
  ' "${RESULT_FILE}" > "${FILTERED_RESULT}"
  filtered_count=$(jq '.findings | length' "${FILTERED_RESULT}")

  if [ "${filtered_count}" -lt "${original_count}" ]; then
    echo "Severity filter (threshold=${REVIEW_FINDING_SEVERITY_THRESHOLD}): kept ${filtered_count}/${original_count} findings"
    RESULT_FILE="${FILTERED_RESULT}"

    # If filtering removed all findings, delete the empty findings array
    # (minItems: 1 in the schema). For request-changes/reject, also
    # downgrade to comment — zero findings with a blocking verdict is
    # semantically wrong. Use "comment" (not "approve") so the PR gets
    # requires-manual-review, not ready-for-merge.
    if [ "${filtered_count}" -eq 0 ]; then
      original_action=$(jq -r '.action' "${FILTERED_RESULT}")
      DOWNGRADE_RESULT=$(mktemp)
      CLEANUP_FILES+=("${DOWNGRADE_RESULT}")
      if [ "${original_action}" = "request-changes" ] || [ "${original_action}" = "reject" ]; then
        echo "All findings removed by severity filter — downgrading '${original_action}' to 'comment'"
        jq 'del(.findings) | .action = "comment"' "${FILTERED_RESULT}" > "${DOWNGRADE_RESULT}"
      else
        jq 'del(.findings)' "${FILTERED_RESULT}" > "${DOWNGRADE_RESULT}"
      fi
      RESULT_FILE="${DOWNGRADE_RESULT}"
    fi
  else
    rm -f "${FILTERED_RESULT}"
  fi
fi

# Set action and comment body after the severity filter so dropped
# findings do not affect the GitHub review.
PREVIOUS_MD=""
if [[ -n "${PRIOR_REVIEW_FILE:-}" && -f "${PRIOR_REVIEW_FILE}" ]]; then
  PREVIOUS_MD=$(cat "${PRIOR_REVIEW_FILE}")
elif [[ -f prior-review.txt ]]; then
  PREVIOUS_MD=$(cat prior-review.txt)
fi
export REVIEW_PREVIOUS_MARKDOWN="${PREVIOUS_MD}"

echo "Transforming review result (action + comment body) using ${RESULT_FILE}"
REVIEW_SIGNALS=$(gh pr view "${PR_NUMBER}" --repo "${REPO_FULL_NAME}" \
  --json additions,deletions,changedFiles \
  --jq '"+\(.additions) / −\(.deletions) · \(.changedFiles) " + (if .changedFiles == 1 then "file" else "files" end)' \
  2>/dev/null || true)
export REVIEW_SIGNALS
# Changed paths let the renderer adjudicate protected-path findings against the
# same list the host enforces, instead of trusting the agent's path matching.
REVIEW_CHANGED_FILES=$(gh pr view "${PR_NUMBER}" --repo "${REPO_FULL_NAME}" \
  --json files --jq '.files[].path' 2>/dev/null || true)
export REVIEW_CHANGED_FILES
if [[ -n "${GITHUB_RUN_ID:-}" ]]; then
  _RUN_STARTED_AT=$(gh run view "${GITHUB_RUN_ID}" --repo "${REPO_FULL_NAME}" \
    --json startedAt --jq '.startedAt // empty' 2>/dev/null || true)
  if [[ -n "${_RUN_STARTED_AT}" ]]; then
    REVIEW_STARTED=$(date -u -d "${_RUN_STARTED_AT}" '+%H:%M UTC' 2>/dev/null || true)
    export REVIEW_STARTED
  fi
fi
AGENT_ACTION=$(jq -r '.action // "omitted"' "${RESULT_FILE}")
TRANSFORMED=$(mktemp)
CLEANUP_FILES+=("${TRANSFORMED}")
transform_review_result "${RESULT_FILE}" > "${TRANSFORMED}"
cp "${TRANSFORMED}" "${RESULT_FILE}"
echo "Host action=$(jq -r .action "${RESULT_FILE}") (agent had ${AGENT_ACTION})"

ACTION=$(jq -r '.action' "${RESULT_FILE}")
# ACTION retains the original value for the entire script — not re-read after protected-path downgrade.

# ---------------------------------------------------------------------------
# Protected-path check: the review agent must not approve PRs that touch
# sensitive paths. If the PR modifies any of these, downgrade "approve" to
# "comment" so only a human can grant approval. This is the sole enforcement
# point — the code agent is free to propose changes to any path.
# ---------------------------------------------------------------------------
DOWNGRADED=false
if [ "${ACTION}" = "approve" ]; then
  # harness/review.yaml always sets REVIEW_PROTECTED_PATHS (with a default,
  # overridable per-repo via harness composition), so an unset value here
  # indicates a genuine misconfiguration rather than an intentional opt-out.
  if [[ "${REVIEW_PROTECTED_PATHS+set}" != "set" ]]; then
    echo "::error::REVIEW_PROTECTED_PATHS is not set — check harness/review.yaml" >&2
    exit 1
  fi

  if [[ -z "${REVIEW_PROTECTED_PATHS}" ]]; then
    # Explicitly empty — operator has opted out of protected-path
    # enforcement for this repo. Distinct from comma-noise below, which
    # is treated as a likely misconfiguration rather than an intentional
    # opt-out.
    echo "::notice::REVIEW_PROTECTED_PATHS is explicitly empty — protected-path enforcement disabled"
    REVIEW_ACTIVE_PROTECTED_PATHS=()
  else
    IFS=',' read -ra REVIEW_ACTIVE_PROTECTED_PATHS <<< "${REVIEW_PROTECTED_PATHS}"
    # Trim leading/trailing whitespace and drop empty entries.
    trimmed=()
    for entry in "${REVIEW_ACTIVE_PROTECTED_PATHS[@]}"; do
      entry="$(echo "${entry}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
      [[ -n "${entry}" ]] && trimmed+=("${entry}")
    done
    REVIEW_ACTIVE_PROTECTED_PATHS=()
    [[ ${#trimmed[@]} -gt 0 ]] && REVIEW_ACTIVE_PROTECTED_PATHS=("${trimmed[@]}")
    unset trimmed entry
    if [[ ${#REVIEW_ACTIVE_PROTECTED_PATHS[@]} -eq 0 ]]; then
      # Sanitize before interpolating into a workflow command. Strip raw
      # newlines, then strip every '%' and ':' character outright rather
      # than collapsing fixed-width tokens (e.g. "::", "%0A") — matching
      # fixed-width tokens is not idempotent and can be bypassed by
      # adjacent fragments reassembling after a single pass. Same
      # approach as the REVIEW_FINDING_SEVERITY_THRESHOLD sanitization
      # above.
      sanitized_paths="${REVIEW_PROTECTED_PATHS//$'\n'/}"
      sanitized_paths="${sanitized_paths//$'\r'/}"
      sanitized_paths="${sanitized_paths//%/}"
      sanitized_paths="${sanitized_paths//:/}"
      echo "::error::REVIEW_PROTECTED_PATHS=\"${sanitized_paths}\" contains no valid path entries after trimming — likely misconfigured (stray/consecutive commas?). Refusing to continue (fail-closed)." >&2
      unset sanitized_paths
      exit 1
    fi
  fi

  # PR-files fetch and the empty-result guard are an independent safety
  # net (refuse to approve if we can't establish what changed) and must
  # run regardless of whether protected-path enforcement itself is
  # enabled — only the pattern-matching loop below is gated on a
  # non-empty REVIEW_ACTIVE_PROTECTED_PATHS.
  PR_FILES=$(gh pr view "${PR_NUMBER}" --repo "${REPO_FULL_NAME}" --json files --jq '.files[].path')
  if [ -z "${PR_FILES}" ]; then
    echo "::error::Failed to fetch PR files or PR has no changed files — refusing to approve (gh pr view --json files)" >&2
    exit 1
  fi

  if [[ ${#REVIEW_ACTIVE_PROTECTED_PATHS[@]} -gt 0 ]]; then
    PROTECTED_MATCHES=""
    while IFS= read -r file; do
      [ -z "${file}" ] && continue
      for pattern in "${REVIEW_ACTIVE_PROTECTED_PATHS[@]}"; do
        if [[ "${file}" == "${pattern}"* ]]; then
          PROTECTED_MATCHES="${PROTECTED_MATCHES}${file}"$'\n'
          break
        fi
      done
    done <<< "${PR_FILES}"

    if [ -n "${PROTECTED_MATCHES}" ]; then
      echo "PR touches protected paths — downgrading approve to comment"
      echo "${PROTECTED_MATCHES}" | sed '/^$/d' | sed 's/^/  /'

      _PROTECTED_LIST=$(printf '%s' "${PROTECTED_MATCHES}" | sed '/^$/d' | paste -sd ', ' -)

      # Express the policy gate as structured input, then let the host renderer
      # recompute the comment instead of appending a second visual language.
      MODIFIED_RESULT=$(mktemp)
      CLEANUP_FILES+=("${MODIFIED_RESULT}")
      jq --arg files "${_PROTECTED_LIST}" \
        '.decision_needed = {
          question: ("A human must approve this protected-path change: " + $files),
          options: [
            {id: "A", title: "Approve the protected-path change", implication: "A human accepts the governance or infrastructure risk."},
            {id: "None", title: "Do not land this approach"}
          ]
        } | del(.body, .action)' \
        "${RESULT_FILE}" > "${MODIFIED_RESULT}"
      RERENDERED_RESULT=$(mktemp)
      CLEANUP_FILES+=("${RERENDERED_RESULT}")
      transform_review_result "${MODIFIED_RESULT}" > "${RERENDERED_RESULT}"
      RESULT_FILE="${RERENDERED_RESULT}"
      DOWNGRADED=true
    fi
  fi
fi

# ---------------------------------------------------------------------------
# Label-actions validation: the review agent may recommend contextual labels
# (e.g. area/api, priority/high). Validate them here so the label reason
# appears in the review body. Actual label API calls happen after posting.
# ---------------------------------------------------------------------------
REVIEW_CONTROL_LABELS=(
  "ready-for-merge" "requires-manual-review" "rejected"
  "ready-for-review" "fullsend-no-fix" "fullsend-fix"
)

is_control_label() {
  local label="$1"
  for cl in "${REVIEW_CONTROL_LABELS[@]}"; do
    if [[ "${cl}" == "${label}" ]]; then
      return 0
    fi
  done
  return 1
}

VALIDATED_LABEL_ADDS=()
VALIDATED_LABEL_REMOVES=()
LABEL_REASON=""

HAS_LABEL_ACTIONS=$(jq 'has("label_actions")' "${RESULT_FILE}")
if [[ "${HAS_LABEL_ACTIONS}" == "true" ]]; then
  LABEL_REASON=$(jq -r '.label_actions.reason' "${RESULT_FILE}")
  LABEL_COUNT=$(jq '.label_actions.actions | length' "${RESULT_FILE}")

  echo "Validating ${LABEL_COUNT} label action(s)..."

  # Fetch existing repo labels once.
  EXISTING_LABELS=$(gh api "repos/${REPO_FULL_NAME}/labels" --paginate --jq '.[].name' 2>/dev/null || true)

  label_exists() {
    local label="$1"
    echo "${EXISTING_LABELS}" | grep -qFx "${label}"
  }

  for i in $(seq 0 $((LABEL_COUNT - 1))); do
    LA_ACTION=$(jq -r ".label_actions.actions[${i}].action" "${RESULT_FILE}")
    LA_LABEL=$(jq -r ".label_actions.actions[${i}].label" "${RESULT_FILE}")

    # Sanitize jq -r output: strip newlines, carriage returns, and GHA
    # workflow command delimiters to prevent command injection via crafted
    # label names or action values.
    LA_ACTION="${LA_ACTION//$'\n'/}"
    LA_ACTION="${LA_ACTION//$'\r'/}"
    LA_ACTION="${LA_ACTION//::/:}"
    LA_LABEL="${LA_LABEL//$'\n'/}"
    LA_LABEL="${LA_LABEL//$'\r'/}"
    LA_LABEL="${LA_LABEL//::/:}"

    if [[ ! "${LA_LABEL}" =~ ^[a-zA-Z0-9._/:\ +\-]+$ ]]; then
      echo "::warning::Refused label '${LA_LABEL}' -- contains invalid characters"
      continue
    fi

    if is_control_label "${LA_LABEL}"; then
      echo "::warning::Refused to ${LA_ACTION} control label '${LA_LABEL}' -- control labels are managed by the review pipeline"
      continue
    fi

    case "${LA_ACTION}" in
      add)
        if ! label_exists "${LA_LABEL}"; then
          echo "::warning::Skipping label '${LA_LABEL}' -- does not exist in repo (will not auto-create)"
          continue
        fi
        VALIDATED_LABEL_ADDS+=("${LA_LABEL}")
        ;;
      remove)
        VALIDATED_LABEL_REMOVES+=("${LA_LABEL}")
        ;;
      *)
        echo "::warning::Unknown label action '${LA_ACTION}' for label '${LA_LABEL}'"
        ;;
    esac
  done

  # The host-rendered Review details section already explains label_actions.
  # Validation controls which of those proposed mutations are actually synced.
fi

# ---------------------------------------------------------------------------
# Post the review. Exit code 10 = stale-head: the PR HEAD moved after the
# agent reviewed it. When this happens, post a /fs-review comment to
# re-dispatch a fresh review for the current HEAD.
# ---------------------------------------------------------------------------
POST_RESULT_FILE=$(mktemp)
CLEANUP_FILES+=("${POST_RESULT_FILE}")
prepare_summary_only_result "${RESULT_FILE}" "${POST_RESULT_FILE}"
INLINE_LOCATION_COUNT=$(jq '[.findings[]? | select(.line != null)] | length' "${RESULT_FILE}")
if [ "${INLINE_LOCATION_COUNT}" -gt 0 ]; then
  echo "Summary-only review: linked ${INLINE_LOCATION_COUNT} finding location(s) in the sticky comment; inline comments disabled"
fi

POST_REVIEW_EXIT=0
fullsend post-review \
  --repo "${REPO_FULL_NAME}" \
  --pr "${PR_NUMBER}" \
  --token "${REVIEW_TOKEN}" \
  --result "${POST_RESULT_FILE}" || POST_REVIEW_EXIT=$?

if [ "${POST_REVIEW_EXIT}" -eq 10 ]; then
  echo "Stale-head detected — checking whether to re-dispatch review"

  # Loop guard: if a stale-head re-dispatch comment was posted recently
  # (within the last 5 minutes), skip to avoid cascading dispatches from
  # rapid force-pushes. The next synchronize event will pick it up.
  REDISPATCH_MARKER="<!-- fullsend:stale-head-redispatch -->"
  RECENT_REDISPATCH=$(gh api \
    "repos/${REPO_FULL_NAME}/issues/${PR_NUMBER}/comments" \
    --paginate 2>/dev/null \
    | jq -s "add // [] | [.[] | select(.body | contains(\"${REDISPATCH_MARKER}\"))
          | select(.created_at > (now - 300 | strftime(\"%Y-%m-%dT%H:%M:%SZ\")))]
     | length") || RECENT_REDISPATCH=0

  if [ "${RECENT_REDISPATCH}" -gt 0 ]; then
    echo "Recent stale-head re-dispatch already exists — skipping"
  else
    echo "Re-dispatching review for current HEAD"
    gh pr comment "${PR_NUMBER}" --repo "${REPO_FULL_NAME}" \
      --body "/fs-review
${REDISPATCH_MARKER}" || echo "::warning::Failed to post re-dispatch comment"
  fi

  # Stale-head is handled gracefully — exit 0 so the workflow does not
  # appear as a failure.
  exit 0
elif [ "${POST_REVIEW_EXIT}" -ne 0 ]; then
  echo "::error::fullsend post-review failed with exit code ${POST_REVIEW_EXIT} (PR #${PR_NUMBER} in ${REPO_FULL_NAME})" >&2
  exit "${POST_REVIEW_EXIT}"
fi

# ---------------------------------------------------------------------------
# Outcome labels: apply labels based on the review action.
# Labels are created if missing, matching the needs-human pattern in
# post-fix.sh.
# Label logic is mirrored in post-review-test.sh — update both.
# ---------------------------------------------------------------------------

# Determine the target outcome label before mutating anything so we can
# skip no-op remove/re-add cycles that generate timeline noise.
OUTCOME_LABEL=""
if [ "${ACTION}" = "approve" ] && [ "${DOWNGRADED}" = "false" ] && [ "${PR_IS_DRAFT}" != "true" ]; then
  OUTCOME_LABEL="ready-for-merge"
elif { [ "${ACTION}" = "approve" ] && { [ "${DOWNGRADED}" = "true" ] || [ "${PR_IS_DRAFT}" = "true" ]; }; } || \
     [ "${ACTION}" = "comment" ]; then
  OUTCOME_LABEL="requires-manual-review"
elif [ "${ACTION}" = "reject" ]; then
  OUTCOME_LABEL="rejected"
fi

# Remove stale outcome labels from prior runs, skipping the label we are
# about to apply so we don't create a pointless unlabel/relabel cycle.
# 2>/dev/null is intentional: removal of a non-existent label is the
# common case and not worth logging.
for stale_label in "ready-for-merge" "requires-manual-review" "rejected"; do
  [ "${stale_label}" = "${OUTCOME_LABEL}" ] && continue
  gh pr edit "${PR_NUMBER}" --repo "${REPO_FULL_NAME}" \
    --remove-label "${stale_label}" 2>/dev/null || true
done

if [ "${OUTCOME_LABEL}" = "ready-for-merge" ]; then
  echo "Approve disposition — applying ready-for-merge label"
  gh label create "ready-for-merge" --repo "${REPO_FULL_NAME}" \
    --description "All reviewers approved — ready to merge" --color "0E8A16" \
    2>/dev/null || true
  gh pr edit "${PR_NUMBER}" --repo "${REPO_FULL_NAME}" \
    --add-label "ready-for-merge" || true
elif [ "${OUTCOME_LABEL}" = "requires-manual-review" ]; then
  if [ "${PR_IS_DRAFT}" = "true" ] && [ "${ACTION}" = "approve" ]; then
    echo "PR is a draft — skipping ready-for-merge, applying requires-manual-review"
  else
    echo "Review requires human judgment — applying requires-manual-review label"
  fi
  gh label create "requires-manual-review" --repo "${REPO_FULL_NAME}" \
    --description "Review requires human judgment" --color "FBCA04" \
    2>/dev/null || true
  gh pr edit "${PR_NUMBER}" --repo "${REPO_FULL_NAME}" \
    --add-label "requires-manual-review" || true
elif [ "${OUTCOME_LABEL}" = "rejected" ]; then
  echo "Reject disposition — closing PR and applying label"
  gh label create "rejected" --repo "${REPO_FULL_NAME}" \
    --description "Approach rejected by review agent" --color "B60205" \
    2>/dev/null || true
  gh pr close "${PR_NUMBER}" \
    --repo "${REPO_FULL_NAME}" \
    --comment "Closed by review agent: approach rejected." || true
  gh pr edit "${PR_NUMBER}" \
    --repo "${REPO_FULL_NAME}" \
    --add-label "rejected" || true
elif [ "${ACTION}" = "request-changes" ]; then
  echo "Request-changes disposition — no outcome label (fix agent triggers on event)"
fi

# ---------------------------------------------------------------------------
# Contextual labels: apply validated label mutations from label_actions.
# ---------------------------------------------------------------------------
for label in "${VALIDATED_LABEL_ADDS[@]}"; do
  echo "Adding contextual label '${label}'..."
  gh api "repos/${REPO_FULL_NAME}/issues/${PR_NUMBER}/labels" \
    -f "labels[]=${label}" --silent || \
    echo "::warning::Failed to add label '${label}'"
done

for label in "${VALIDATED_LABEL_REMOVES[@]}"; do
  echo "Removing contextual label '${label}'..."
  encoded=$(printf '%s' "${label}" | jq -sRr @uri)
  gh api "repos/${REPO_FULL_NAME}/issues/${PR_NUMBER}/labels/${encoded}" \
    -X DELETE --silent 2>/dev/null || true
done

echo "Review posted on ${REPO_FULL_NAME}#${PR_NUMBER}"
