#!/usr/bin/env bash
# Vendored from fullsend-ai/agents scripts/post-review.sh
# @ 91f61f3441baedf3f912c9afd4bd574c98793b96 (harness review.yaml base).
#
# Local changes from the stock script:
#   1. Set the GitHub review action from findings (any medium+ →
#      request-changes; risk/confidence/needs-human → comment) and rewrite
#      the sticky comment. Floors/caps live in rating-policy.json.
#   2. Do not append the /fs-fix "Next steps" footer.
#   3. Link file/line references in the sticky summary and suppress inline
#      review comments by omitting line numbers only from the CLI payload.
#   4. Render the durable structured review: change summary, host status,
#      Signal|Level|Assessment (risk/confidence), decisions, findings, Jira
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
_FULLSEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FULLSEND_CONFIG_DIR="${FULLSEND_DIR:-${_FULLSEND_DIR}}"
export FULLSEND_CONFIG_DIR

# $1 = path to agent-result.json. Writes transformed JSON to stdout.
transform_review_result() {
  python3 - "$1" <<'PY'
import json, os, re, sys
from datetime import datetime, timezone
from urllib.parse import quote

# Host policy: .fullsend/rating-policy.json (floors/caps/refuse lists only).
# Judgment criteria live in the rating skill — not here.
DEFAULT_POLICY = {
    "blocking_finding_severities": ["critical", "high", "medium"],
    "exclude_blocking_categories": ["protected-path"],
    "risk_refuse_approve": ["high", "critical"],
    "confidence_refuse_approve": ["low"],
    "product_ask": {
        "mismatch_unjustified": {
            "confidence_floor": "low",
            "needs_human": True,
        },
    },
    "confidence_cap": {"incomplete_review": "medium"},
}

def _lower_set(values):
    return frozenset(str(v).lower() for v in (values or []))

def load_rating_policy():
    """Merge rating-policy.json over DEFAULT_POLICY (same json.load pattern as the ledger)."""
    merged = json.loads(json.dumps(DEFAULT_POLICY))  # deep copy via JSON
    base = os.environ.get("FULLSEND_CONFIG_DIR") or ""
    path = os.path.join(base, "rating-policy.json") if base else ""
    if path and os.path.isfile(path):
        try:
            with open(path, encoding="utf-8") as fh:
                loaded = json.load(fh)
        except (OSError, ValueError):
            loaded = None
        if isinstance(loaded, dict):
            for key, value in loaded.items():
                if key not in merged:
                    continue
                if isinstance(value, dict) and isinstance(merged[key], dict):
                    nested = dict(merged[key])
                    for nested_key, nested_val in value.items():
                        if isinstance(nested_val, dict) and isinstance(nested.get(nested_key), dict):
                            nested[nested_key] = {**nested[nested_key], **nested_val}
                        else:
                            nested[nested_key] = nested_val
                    merged[key] = nested
                elif isinstance(merged[key], list):
                    # List-valued keys: accept list overrides only. A string
                    # would be iterated character-by-character by _lower_set.
                    if isinstance(value, list):
                        merged[key] = value
                else:
                    merged[key] = value
    merged["_blocking_severities"] = _lower_set(merged.get("blocking_finding_severities"))
    merged["_exclude_categories"] = _lower_set(merged.get("exclude_blocking_categories"))
    merged["_risk_refuse"] = _lower_set(merged.get("risk_refuse_approve"))
    merged["_confidence_refuse"] = _lower_set(merged.get("confidence_refuse_approve"))
    return merged

POLICY = load_rating_policy()

def rated_level(result, field, default):
    rated = result.get(field)
    if isinstance(rated, dict):
        return (rated.get("level") or default).lower()
    return default

def is_blocking(finding):
    cat = (finding.get("category") or "").lower()
    if cat in POLICY["_exclude_categories"]:
        return False
    severity = (finding.get("severity") or "info").lower()
    return severity in POLICY["_blocking_severities"]

def blocking_count(result):
    return sum(1 for finding in (result.get("findings") or []) if is_blocking(finding))

def needs_human(result):
    pa = result.get("product_ask") if isinstance(result.get("product_ask"), dict) else {}
    if result.get("decision_needed"):
        return True
    if "needs_human" in pa:
        if pa.get("needs_human"):
            return True
    elif pa.get("status") == "mismatch-unjustified":
        # Default true when the field is absent; honor explicit false.
        return True
    return any((f.get("category") or "").lower() == "protected-path" for f in (result.get("findings") or []))

def approve_refuse_reason(result):
    """Why approve is refused on the clean-findings path: risk, confidence, or None."""
    if rated_level(result, "risk", "low") in POLICY["_risk_refuse"]:
        return "risk"
    if rated_level(result, "confidence", "high") in POLICY["_confidence_refuse"]:
        return "confidence"
    return None

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

    problem = challenger_problem(challenger_record(ledger), result.get("findings") or [])
    if problem:
        add_limit(inspected, problem)
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
    check. Reading only one of the two lets a review claim every producer ran
    while a section of itself says otherwise."""
    names = []
    for row in result.get("verification") or []:
        if row.get("result") == "could-not-verify":
            names.append(row.get("label") or row.get("id") or "verification check")
    for check in result.get("checks") or []:
        if check.get("status") == "could-not-verify":
            names.append(check.get("id") or "readiness check")
    ledger = load_ledger()
    if ledger is not None and challenger_problem(challenger_record(ledger), result.get("findings") or []):
        names.append("challenger (its ledger record contradicts the reported findings)")
    return names

def cap_confidence(result):
    """Host completeness re-cap: may lower confidence only (never raises risk)."""
    missing = unverified_producers(result)
    if summary_scope_problem(result):
        missing = missing + ["the change summary (it describes files outside this PR's diff)"]
    if not missing:
        return result
    confidence = result.get("confidence") if isinstance(result.get("confidence"), dict) else {}
    if (confidence.get("level") or "high").lower() != "high":
        return result
    floor = ((POLICY.get("confidence_cap") or {}).get("incomplete_review") or "medium").lower()
    why = (confidence.get("why") or "").strip()
    listed = ", ".join(sorted(set(missing)))
    limit = f"This run could not establish: {listed}. Patch-review completeness is therefore partial."
    result["confidence"] = {"level": floor, "why": (why + " " + limit).strip()}
    return result

def normalize_host_verification(result):
    """Make the host-owned blocker audit agree with the host action rule."""
    count = blocking_count(result)
    noun = "finding" if count == 1 else "findings"
    severities = "/".join(sorted(POLICY["_blocking_severities"])) or "configured"
    excluded = ", ".join(sorted(POLICY["_exclude_categories"])) or "none"
    row = {
        "id": "blocking-findings",
        "label": "Blocking findings",
        "result": "fail" if count else "pass",
        "notes": f"{count} blocking {noun} under the host rule: {severities} (excluded: {excluded}).",
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
    refuse = approve_refuse_reason(result)
    if refuse == "risk":
        return "comment", "risk-blocks-approve"
    if refuse == "confidence":
        return "comment", "low-confidence"
    if needs_human(result):
        return "comment", "needs-human"
    return "approve", "no-blocking-findings"

def apply_product_ask(result):
    """Floor confidence for unjustified Jira-vs-description mismatch. Never bump risk."""
    pa = result.get("product_ask")
    if not isinstance(pa, dict) or (pa.get("status") or "none") != "mismatch-unjustified":
        return result
    conf_rank = {"high": 0, "medium": 1, "low": 2}
    rules = (POLICY.get("product_ask") or {}).get("mismatch_unjustified") or {}
    # Stamp policy so needs_human() can honor an explicit false.
    pa["needs_human"] = bool(rules.get("needs_human", True))
    pa["justified_in_description"] = False
    floor = (rules.get("confidence_floor") or "low").lower()
    rated = result.get("confidence") if isinstance(result.get("confidence"), dict) else {}
    cur = (rated.get("level") or "high").lower()
    why = "The unresolved Jira mismatch requires human judgment before approval."
    reasons = [rated.get("why", "").strip(), why]
    if conf_rank.get(floor, 0) > conf_rank.get(cur, 0):
        cur = floor
    result["confidence"] = {"level": cur, "why": " ".join(r for r in reasons if r)}
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

def render_remediation(text):
    """A one-line remediation stays inline; a patch snippet gets a fenced block.

    CodeRabbit's suggestions[] are code, so flattening them to one bullet makes
    them unreadable. List continuation needs four-space indentation, and the
    fence is padded past any backticks inside the snippet.
    """
    body = suppress_mentions(str(text or "").strip())
    if not body:
        return []
    if "\n" not in body:
        return [f"  - Remediation: {body}"]
    longest = max((len(m) for m in re.findall(r"`+", body)), default=0)
    fence = "`" * max(3, longest + 1)
    out = ["  - Remediation:", "", f"    {fence}"]
    out += [f"    {line}" if line.strip() else "" for line in body.split("\n")]
    out += [f"    {fence}", ""]
    return out

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
        "<!-- fullsend:review-agent -->",
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
        refuse = approve_refuse_reason(result)
        if refuse == "risk":
            return "Agent cannot approve this head — blast-radius risk. Human still finalizes."
        if refuse == "confidence":
            return "Agent cannot approve this head — low confidence. Human still finalizes."
        return "Advisory — no blocking findings. Human still finalizes."
    if action == "approve":
        return "Agent bar cleared for this head. Human still finalizes."
    if action == "reject":
        return "Approach rejected."
    return "This review did not complete. Do not treat this head as reviewed."

STATUS_MARK = {"pass": "✅", "warning": "🟡", "fail": "❌", "not-applicable": "➖", "could-not-verify": "❔"}
VERDICT_MARK = {"PASS": "✅", "PARTIAL": "🟠", "MISS": "❌", "SKIP": "➖"}
ACTION_MARK = {"approve": "✅", "comment": "💬", "request-changes": "🔴", "reject": "⛔", "failure": "❌"}

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

def challenger_record(ledger):
    raw = (ledger or {}).get("challenger")
    return raw if isinstance(raw, dict) else {}

def claims_empty_skip(reason):
    """True when a skipped challenger claims the empty-finding-set sanction."""
    return not reason or "no finding" in reason.lower()

def challenger_problem(ch, findings):
    """Confidence/limit note when the challenger record contradicts itself."""
    status = str(ch.get("status") or "").strip().lower()
    reason = clean(ch.get("reason") or "")
    if status == "pending":
        return ('The producer ledger still records the challenger as "pending", so whether it ran is unknown.')
    if status == "skipped" and claims_empty_skip(reason) and findings:
        count = len(findings)
        return (f"The ledger records the challenger as skipped for an empty finding set, but {count} "
                f"finding(s) were reported. Its real reason for skipping was not recorded.")
    return None

def challenger_prose(result):
    ledger = load_ledger()
    findings = result.get("findings") or []
    if ledger is None:
        return "Challenger state is unverified — no dispatch ledger for this run."
    ch = challenger_record(ledger)
    status = str(ch.get("status") or "").strip().lower()
    if not status:
        return "Challenger state was not recorded in the dispatch ledger."
    problem = challenger_problem(ch, findings)
    if problem:
        return problem
    reason = clean(ch.get("reason") or "")
    if status == "failed":
        return (f"Challenger failed ({reason}); using the pre-challenger finding set."
                if reason else "Challenger failed; using the pre-challenger finding set.")
    if status == "skipped":
        if claims_empty_skip(reason):
            return "Skipped — no findings to adjudicate."
        return f"Skipped — {reason}."
    if status == "ran":
        def num(key):
            value = ch.get(key)
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                return None
            return int(value)
        input_n, kept = num("input"), num("kept")
        if input_n is None or kept is None:
            return "Challenger ran, but adjudication counts were not recorded."
        removed, merged, downgraded = num("removed") or 0, num("merged") or 0, num("downgraded") or 0
        noun = "finding" if input_n == 1 else "findings"
        parts = [f"{label} {n}" for label, n in (
            ("removed", removed), ("merged", merged), ("downgraded", downgraded)) if n]
        if not parts:
            return f"Adjudicated {input_n} {noun}; all kept."
        return f"Adjudicated {input_n} {noun}; kept {kept} ({', '.join(parts)})."
    return clean(status)

def producer_rows(result):
    """What ran, and what each one found — from the dispatch ledger."""
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
        unverified_note = "run state is unverified because no dispatch ledger exists"
        for name in (result.get("inspected") or {}).get("producers") or []:
            rows.append((clean(name), "❔", count_cell(name), unverified_note))
        return rows, False
    for key in ("dispatched", "adapters"):
        for name in ledger.get(key) or []:
            if isinstance(name, str):
                rows.append((clean(name), "✅", count_cell(name), "—"))
    for row in ledger.get("skipped") or []:
        if isinstance(row, dict) and isinstance(row.get("id"), str):
            reason = clean(row.get("reason") or "not selected")
            rows.append((clean(row["id"]), "➖", "—", reason))
    return rows, True

def status_headline(result, action):
    """Visible status line: icon + bold label + remainder."""
    text = status_text(result, action)
    if action == "request-changes":
        count = blocking_count(result)
        noun = "finding" if count == 1 else "findings"
        inner = (f"**Waiting on author** — {count} blocking {noun} before the agent bar can clear. "
                 f"Human still finalizes.")
        return f"{mark(ACTION_MARK, action)} {inner}"
    if action == "comment" and needs_human(result):
        return f"{mark(ACTION_MARK, action)} **Needs human judgment.**"
    if action == "comment":
        refuse = approve_refuse_reason(result)
        if refuse == "risk":
            return (f"{mark(ACTION_MARK, action)} **Cannot approve** — blast-radius risk. "
                    f"Human still finalizes.")
        if refuse == "confidence":
            return (f"{mark(ACTION_MARK, action)} **Cannot approve** — low confidence. "
                    f"Human still finalizes.")
        return f"{mark(ACTION_MARK, action)} **Advisory** — no blocking findings. Human still finalizes."
    if action == "approve":
        return f"{mark(ACTION_MARK, action)} **Agent bar cleared for this head.** Human still finalizes."
    if action == "reject":
        return f"{mark(ACTION_MARK, action)} **Approach rejected.**"
    return f"{mark(ACTION_MARK, action)} {text}"

def render_signal_table(result):
    """Signal | Level | Assessment — always risk + confidence under Status."""
    risk = result.get("risk") if isinstance(result.get("risk"), dict) else {}
    confidence = result.get("confidence") if isinstance(result.get("confidence"), dict) else {}
    risk_level = rated_level(result, "risk", "low")
    conf_level = rated_level(result, "confidence", "high")
    lines = [
        "",
        "| Signal | Level | Assessment |",
        "| --- | --- | --- |",
        f"| Risk | `{table_cell(risk_level)}` | {table_cell(risk.get('why') or '—')} |",
        f"| Confidence | `{table_cell(conf_level)}` | {table_cell(confidence.get('why') or '—')} |",
    ]
    return lines

def render_product_ask_section(pa):
    if not pa or (pa.get("status") or "none") == "none":
        return []
    status = pa.get("status") or "none"
    lines = ["", "## Product ask", ""]
    human = " · needs human review" if pa.get("needs_human") else ""
    lines.append(f"**Status:** `{clean(status)}`{human}")
    lines.append("")
    if pa.get("aligned"):
        lines += ["Aligned:"] + [f"- {clean(item)}" for item in pa["aligned"]] + [""]
    if pa.get("mismatched"):
        lines += ["Mismatched:"] + [f"- {clean(item)}" for item in pa["mismatched"]] + [""]
    lines.append("The PR description is the source of truth. This section compares description vs linked Jira text — not the diff against acceptance criteria.")
    return lines

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
    lines += ["", "## Status", "", status_headline(result, action)]
    lines += render_signal_table(result)

    decision = result.get("decision_needed") if isinstance(result.get("decision_needed"), dict) else None
    if decision:
        lines += ["", "## Decision needed", "", clean(decision.get("question")), ""]
        for option in decision.get("options") or []:
            suffix = f" — {clean(option.get('implication'))}" if option.get("implication") else ""
            lines.append(f"- **{clean(option.get('id'))}.** {clean(option.get('title'))}{suffix}")

    findings = result.get("findings") or []
    if findings:
        lines += ["", "## Findings"]
        for severity, items in group_findings(findings):
            lines += ["", f"### {severity.capitalize()} ({len(items)})"]
            for finding in items:
                loc = render_location(result, finding, run_url)
                origin = f"`{clean(finding.get('dimension'))}` · " if finding.get("dimension") else ""
                tail = " · actionable follow-up" if finding.get("actionable") and severity in ("low", "info") else ""
                lines += ["", f"- {origin}**{clean(finding.get('category'))}** ({loc}){tail}: {clean(finding.get('description'))}"]
                if finding.get("why"):
                    lines.append(f"  - Why: {clean(finding.get('why'))}")
                if finding.get("remediation"):
                    lines += render_remediation(finding.get("remediation"))
    elif action == "approve":
        lines += ["", "Looks good to me."]

    pa = result.get("product_ask") if isinstance(result.get("product_ask"), dict) else None
    lines += render_product_ask_section(pa)

    inspected = result.get("inspected") if isinstance(result.get("inspected"), dict) else {}
    labels = result.get("label_actions") if isinstance(result.get("label_actions"), dict) else {}
    details_body = []

    verification = result.get("verification") or []
    if verification:
        details_body += ["### Verification", "",
                         "| Check | Result | Notes |", "| --- | --- | --- |"]
        for row in verification:
            res = row.get("result") or ""
            note = table_cell(row.get("notes") or "—")
            details_body.append(
                f"| {table_cell(row.get('label') or row.get('id'))} | "
                f"{mark(STATUS_MARK, res)} {table_cell(res)} | {note} |")
        details_body.append("")

    rows, from_ledger = producer_rows(result)
    if rows:
        details_body += ["### Producers", "",
                         "| Producer | Ran | Findings count | Notes |",
                         "| --- | --- | --- | --- |"]
        for name, ran, count, notes in rows:
            details_body.append(f"| {name} | {ran} | {count} | {notes} |")
        if not from_ledger:
            details_body += ["", "_No dispatch ledger for this run — this list is self-reported by the agent._"]
        details_body.append("")

    details_body += ["### Challenger", "", challenger_prose(result), ""]

    criteria = result.get("jira_criteria") if isinstance(result.get("jira_criteria"), list) else []
    if criteria:
        details_body += ["### Jira acceptance criteria", "",
                         "| Criterion | Verdict | Evidence |", "| --- | --- | --- |"]
        for c in criteria:
            verdict = c.get("verdict") or ""
            stale = " · stale comment" if c.get("stale_comment") else ""
            details_body.append(
                f"| {table_cell(c.get('criterion'))} | "
                f"{mark(VERDICT_MARK, verdict)} {table_cell(verdict)}{stale} "
                f"| {table_cell(c.get('evidence'))} |")
        details_body.append("")

    checks = result.get("checks") if isinstance(result.get("checks"), list) else []
    if checks:
        details_body += ["### Readiness checks", "",
                         "| Check | Status | Summary |", "| --- | --- | --- |"]
        for check in checks:
            status = check.get("status") or ""
            details_body.append(
                f"| {table_cell(check.get('id'))} | {mark(STATUS_MARK, status)} {table_cell(status)} "
                f"| {table_cell(check.get('summary'))} |")
        details_body.append("")

    if inspected.get("summary") or inspected.get("could_not_verify"):
        details_body += ["### Evidence inspected", ""]
        if inspected.get("summary"):
            details_body += [clean(inspected["summary"]), ""]
        if inspected.get("could_not_verify"):
            details_body += ["**Could not verify:**", ""]
            details_body += [f"- {clean(i)}" for i in inspected["could_not_verify"]] + [""]

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
        ran = sum(1 for _, icon, _, _ in rows if icon == "✅")
        skipped = sum(1 for _, icon, _, _ in rows if icon == "➖")
        blurb = f"{ran} producer(s) ran, {skipped} skipped" if rows else "audit trail"
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
       ! grep -q '### Verification' <<<"${body}" ||
       grep -q '## Checks' <<<"${body}"; then
      echo "FAIL ${name}: required rendered sections missing or legacy Checks present" >&2
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
  if ! jq -e '.action == "comment" and .risk.level == "low" and .confidence.level == "low" and (.confidence.why | contains("Jira"))' "${tmp}/product-ask-out.json" >/dev/null; then
    echo "FAIL product-ask: want confidence floor only (risk unchanged) + comment" >&2
    fail=1
  elif jq -e '(.risk.why // "") | contains("Jira")' "${tmp}/product-ask-out.json" >/dev/null; then
    echo "FAIL product-ask: host must not rewrite risk why for ask drift" >&2
    fail=1
  else
    echo "PASS product-ask floors confidence only; risk unchanged"
  fi

  # Gate matrix: any medium finding → request-changes (no advisory carve-out).
  render_fixture medium-blocks request-changes "{${common},\"findings\":[{\"severity\":\"medium\",\"category\":\"style-conventions\",\"file\":\"a.ts\",\"line\":1,\"description\":\"Naming drift.\",\"why\":\"Public export renamed without alias.\"}],\"product_ask\":{\"status\":\"none\"}}"

  # low/info may ride with approve.
  render_fixture low-rides-approve approve "{${common},\"findings\":[{\"severity\":\"low\",\"category\":\"style-conventions\",\"file\":\"a.ts\",\"description\":\"Minor naming nit.\",\"actionable\":true}],\"product_ask\":{\"status\":\"none\"}}"

  # high risk alone → comment (not request-changes).
  render_fixture high-risk-comment comment "{${common},\"findings\":[],\"risk\":{\"level\":\"high\",\"why\":\"Cross-package secret wiring expands blast radius.\"},\"confidence\":{\"level\":\"high\",\"why\":\"Unit and mock coverage correlated to the claim.\"},\"product_ask\":{\"status\":\"none\"}}"

  # low confidence alone → comment.
  render_fixture low-conf-comment comment "{${common},\"findings\":[],\"risk\":{\"level\":\"low\",\"why\":\"Isolated helper.\"},\"confidence\":{\"level\":\"low\",\"why\":\"No credible proof correlated to this diff.\"},\"product_ask\":{\"status\":\"none\"}}"

  body=$(jq -r .body "${tmp}/approve-out.json")
  if ! grep -q '| Signal | Level | Assessment |' <<<"${body}" ||
     ! grep -q '| Risk |' <<<"${body}" ||
     ! grep -q '| Confidence |' <<<"${body}"; then
    echo "FAIL sticky: Signal|Level|Assessment table missing under Status" >&2
    fail=1
  else
    echo "PASS sticky Signal table includes risk and confidence"
  fi

  body=$(jq -r .body "${tmp}/request-changes-out.json")
  if ! grep -Fq '**Waiting on author** — 1 blocking finding' <<<"${body}" ||
     ! grep -Fq '[a.ts:12](https://github.com/o/r/blob/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/a.ts#L12)' <<<"${body}"; then
    echo "FAIL request-changes: status count or commit-pinned link missing" >&2
    fail=1
  else
    echo "PASS request-changes status and linked location"
  fi
  body=$(jq -r .body "${tmp}/needs-human-out.json")
  if ! grep -Fq '**Needs human judgment.**' <<<"${body}" || ! grep -q '## Decision needed' <<<"${body}"; then
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

  printf '%s' "{${common},\"jira_criteria\":[{\"criterion\":\"Permission is checked\",\"verdict\":\"PASS\",\"evidence\":\"Route gate is present.\",\"stale_comment\":true}],\"checks\":[{\"id\":\"test-impact-review\",\"status\":\"warning\",\"summary\":\"No targeted tests were changed.\",\"details\":[\"PR body explains manual verification only.\"]}]}" > "${tmp}/structured.json"
  transform_review_result "${tmp}/structured.json" > "${tmp}/structured-out.json"
  body=$(jq -r .body "${tmp}/structured-out.json")
  if grep -q '## Checks' <<<"${body}" ||
     ! grep -q '### Readiness checks' <<<"${body}" ||
     ! grep -q 'test-impact-review' <<<"${body}" ||
     ! grep -q '### Jira acceptance criteria' <<<"${body}" ||
     ! grep -q 'Permission is checked' <<<"${body}"; then
    echo "FAIL structured results: audit tables were not rendered in Review details" >&2
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

  printf '%s' '{"dispatched":["correctness"],"adapters":["jira-snapshot"],"skipped":[{"id":"security","reason":"no auth, secrets or config touched"}],"returned":["correctness"],"challenger":{"status":"skipped","reason":"no findings to adjudicate"}}' > "${tmp}/producers.json"
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
  printf '%s' '{"dispatched":["correctness","style-review"],"adapters":["jira-snapshot"],"skipped":[{"id":"security","reason":"no auth or secrets touched"}],"returned":["correctness","style-review"],"challenger":{"status":"ran","input":1,"kept":1}}' > "${tmp}/prov-ledger.json"
  printf '%s' "{${common},\"findings\":[{\"severity\":\"high\",\"category\":\"off-by-one\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"line\":3,\"description\":\"Out of bounds.\",\"why\":\"Index equals length.\",\"remediation\":\"Subtract one.\"}]}" > "${tmp}/prov.json"
  (
    export REVIEW_PRODUCER_LEDGER="${tmp}/prov-ledger.json"
    transform_review_result "${tmp}/prov.json"
  ) > "${tmp}/prov-out.json"
  body=$(jq -r .body "${tmp}/prov-out.json")
  if ! grep -q '### Producers' <<<"${body}"; then
    echo "FAIL provenance: no Producers table" >&2
    fail=1
  elif ! grep -qE '^\| correctness \| ✅ \| 1 \|' <<<"${body}"; then
    echo "FAIL provenance: producer that found something is not counted" >&2
    fail=1
  elif ! grep -qE '^\| style-review \| ✅ \| 0 \|' <<<"${body}"; then
    echo "FAIL provenance: producer that ran clean is not distinguished from one that was skipped" >&2
    fail=1
  elif ! grep -qE '^\| security \| ➖ \| — \| no auth or secrets touched' <<<"${body}"; then
    echo "FAIL provenance: skipped producer missing its reason" >&2
    fail=1
  elif ! grep -q '`correctness` · \*\*off-by-one\*\*' <<<"${body}"; then
    echo "FAIL provenance: finding does not name the producer that raised it" >&2
    fail=1
  elif ! grep -q '### High (1)' <<<"${body}"; then
    echo "FAIL provenance: severity heading missing count" >&2
    fail=1
  elif grep -qE '^\| challenger \|' <<<"${body}"; then
    echo "FAIL provenance: challenger must not appear in the Producers table" >&2
    fail=1
  elif ! grep -q '### Challenger' <<<"${body}" || ! grep -q 'Adjudicated 1 finding; all kept\.' <<<"${body}"; then
    echo "FAIL provenance: Challenger section missing or wrong prose" >&2
    fail=1
  else
    echo "PASS producers table attributes findings and separates ran-clean from skipped"
  fi

  # A patch snippet must survive as code. Flattened to one bullet it is
  # unreadable, and a fence shorter than the snippet's own backticks breaks out.
  fix_finding='{"severity":"high","category":"coderabbit","dimension":"coderabbit","file":"a.ts","description":"Guard the empty list.","why":"The list can be empty.","remediation":"if (!items.length) {\n  return null;\n}\n\n```ts\nconst safe = items ?? [];\n```"}'
  prose_finding='{"severity":"high","category":"correctness","dimension":"correctness","file":"b.ts","description":"Empty state throws.","why":"Unguarded map.","remediation":"Guard the list and add an empty-state test."}'
  printf '%s' "{${common},\"findings\":[${fix_finding},${prose_finding}]}" > "${tmp}/fix.json"
  transform_review_result "${tmp}/fix.json" > "${tmp}/fix-out.json"
  body=$(jq -r .body "${tmp}/fix-out.json")
  if ! grep -qE '^  - Remediation:$' <<<"${body}"; then
    echo "FAIL remediation: multi-line snippet was not given its own block" >&2
    fail=1
  elif ! grep -qE '^    ````$' <<<"${body}"; then
    echo "FAIL remediation: fence was not padded past the snippet's own backticks" >&2
    fail=1
  elif ! grep -qE '^      return null;$' <<<"${body}"; then
    echo "FAIL remediation: snippet indentation was lost" >&2
    fail=1
  elif ! grep -qE '^  - Remediation: Guard the list and add an empty-state test\.$' <<<"${body}"; then
    echo "FAIL remediation: single-line remediation should stay inline" >&2
    fail=1
  else
    echo "PASS remediation renders snippets as code and prose inline"
  fi

  # Unmet criteria stay expanded; an all-clear set collapses.
  printf '%s' "{${common},\"jira_criteria\":[{\"criterion\":\"Gate is present\",\"verdict\":\"MISS\",\"evidence\":\"No gate in diff.\"}]}" > "${tmp}/jira-miss.json"
  body=$(transform_review_result "${tmp}/jira-miss.json" | jq -r .body)
  if ! grep -q '### Jira acceptance criteria' <<<"${body}" || ! grep -q 'Gate is present' <<<"${body}"; then
    echo "FAIL jira-miss: unmet Jira criteria must appear in Review details" >&2
    fail=1
  else
    echo "PASS unmet Jira criteria render in Review details"
  fi

  # The ledger claiming an empty-set skip while findings exist is the exact
  # shape run 243 produced. The host must contradict it, not repeat it.
  printf '%s' '{"dispatched":["correctness"],"adapters":[],"skipped":[],"challenger":{"status":"skipped","reason":"no findings to adjudicate"}}' > "${tmp}/ch-bad.json"
  printf '%s' "{${common},\"findings\":[{\"severity\":\"high\",\"category\":\"off-by-one\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"description\":\"Out of bounds.\",\"why\":\"undefined.\",\"remediation\":\"length - 1.\"}]}" > "${tmp}/ch.json"
  ( export REVIEW_PRODUCER_LEDGER="${tmp}/ch-bad.json"; transform_review_result "${tmp}/ch.json" ) > "${tmp}/ch-out.json"
  body=$(jq -r .body "${tmp}/ch-out.json")
  if ! grep -q 'ledger records the challenger as skipped for an empty finding set' <<<"${body}"; then
    echo "FAIL challenger-contradiction: host repeated a ledger claim the findings disprove" >&2
    fail=1
  elif ! jq -e '.confidence.level == "medium"' "${tmp}/ch-out.json" >/dev/null; then
    echo "FAIL challenger-contradiction: a self-contradicting ledger left confidence untouched" >&2
    fail=1
  else
    echo "PASS contradictory challenger record is reported and caps confidence"
  fi

  # An honest skip with a stated reason renders in the Challenger section.
  printf '%s' '{"dispatched":["correctness"],"adapters":[],"skipped":[],"challenger":{"status":"skipped","reason":"re-review, findings unchanged since prior run"}}' > "${tmp}/ch-ok.json"
  ( export REVIEW_PRODUCER_LEDGER="${tmp}/ch-ok.json"; transform_review_result "${tmp}/ch.json" ) > "${tmp}/ch-ok-out.json"
  if ! grep -q 'Skipped — re-review, findings unchanged since prior run\.' <<<"$(jq -r .body "${tmp}/ch-ok-out.json")"; then
    echo "FAIL challenger-reason: a stated skip reason was not rendered" >&2
    fail=1
  else
    echo "PASS challenger skip reason renders in its own section"
  fi

  # A ledger never rewritten after collect is not the same as a skip.
  printf '%s' '{"dispatched":["correctness"],"adapters":[],"skipped":[],"challenger":{"status":"pending"}}' > "${tmp}/ch-pending.json"
  ( export REVIEW_PRODUCER_LEDGER="${tmp}/ch-pending.json"; transform_review_result "${tmp}/ch.json" ) > "${tmp}/ch-p-out.json"
  if ! grep -q 'whether it ran is unknown' <<<"$(jq -r .body "${tmp}/ch-p-out.json")"; then
    echo "FAIL challenger-pending: an un-rewritten ledger was read as a real state" >&2
    fail=1
  else
    echo "PASS un-rewritten challenger record is flagged, not believed"
  fi

  # Filtered adjudication prose.
  printf '%s' '{"dispatched":["correctness"],"adapters":[],"skipped":[],"challenger":{"status":"ran","input":7,"kept":4,"removed":2,"merged":1}}' > "${tmp}/ch-filter.json"
  ( export REVIEW_PRODUCER_LEDGER="${tmp}/ch-filter.json"; transform_review_result "${tmp}/ch.json" ) > "${tmp}/ch-filter-out.json"
  if ! grep -q 'Adjudicated 7 findings; kept 4 (removed 2, merged 1)\.' <<<"$(jq -r .body "${tmp}/ch-filter-out.json")"; then
    echo "FAIL challenger-filter: expected alteration summary" >&2
    fail=1
  else
    echo "PASS challenger section reports removals and merges"
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
      --fullsend-dir "${FULLSEND_CONFIG_DIR}" \
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
         --fullsend-dir "${FULLSEND_CONFIG_DIR}" \
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
  --fullsend-dir "${FULLSEND_CONFIG_DIR}" \
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
