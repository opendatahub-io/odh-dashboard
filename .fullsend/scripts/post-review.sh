#!/usr/bin/env bash
# Vendored from fullsend-ai/agents scripts/post-review.sh
# @ 91f61f3441baedf3f912c9afd4bd574c98793b96 (harness review.yaml base).
#
# Local changes from the stock script:
#   1. Set the GitHub review action from findings (any medium+ →
#      request-changes; risk/confidence/needs-human → comment) and rewrite
#      the sticky comment. Floors/caps live in rating-policy.json.
#   2. Categorize sticky ## TODO (Findings / Checks / Judgement / Nits).
#      Do not append the stock /fs-fix "Next steps" footer.
#   3. Link file/line references in the sticky summary and suppress inline
#      review comments by omitting line numbers only from the CLI payload.
#   4. Render the durable structured review: change summary, host status,
#      Signal|Level|Assessment (risk/confidence), decisions, findings, Jira
#      coherence, inspected evidence, signals, checks, and labels.
#   5. Resolve human-facing Check/Producer names from dimensions.json `label`
#      (fallback: registry id). Machine matching still uses `id`.
#   6. Producers table columns: Producer | Type | Ran | Result (kind-aware;
#      Type from registry output; Ran/Result/adapter status from result.producers;
#      findings Result from producers.raised; Challenger audit from
#      producers.challenger.removed_findings). Rows are sorted alphabetically
#      by Type, then Producer.
#   7. Absolutize FULLSEND_CONFIG_DIR when FULLSEND_DIR is relative — post_script
#      CWD is runDir, so a bare ".fullsend" would miss dimensions.json
#      (labels → ids, Type/Result → —).

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

# Resolve the config directory to an absolute path. The harness sets
# FULLSEND_DIR=.fullsend (relative) and runs post_script with CWD=runDir, so a
# bare relative value cannot find dimensions.json or .run/collected.json.
resolve_fullsend_config_dir() {
  local script_dir candidate
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  candidate="${FULLSEND_DIR:-${script_dir}}"
  if [[ "${candidate}" != /* ]]; then
    if [[ -d "${candidate}" ]]; then
      candidate="$(cd "${candidate}" && pwd)"
    elif [[ -n "${GITHUB_WORKSPACE:-}" && -d "${GITHUB_WORKSPACE}/${candidate}" ]]; then
      candidate="$(cd "${GITHUB_WORKSPACE}/${candidate}" && pwd)"
    else
      candidate="${script_dir}"
    fi
  fi
  printf '%s' "${candidate}"
}

FULLSEND_CONFIG_DIR="$(resolve_fullsend_config_dir)"
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

def load_dimension_registry():
    """Map dimension id → {label, output, result_fields} from dimensions.json."""
    registry = {}
    base = os.environ.get("FULLSEND_CONFIG_DIR") or ""
    path = os.path.join(base, "dimensions.json") if base else ""
    if not path or not os.path.isfile(path):
        return registry
    try:
        with open(path, encoding="utf-8") as fh:
            loaded = json.load(fh)
    except (OSError, ValueError):
        return registry
    if not isinstance(loaded, dict):
        return registry
    for row in loaded.get("dimensions") or []:
        if not isinstance(row, dict):
            continue
        dim_id = row.get("id")
        if not isinstance(dim_id, str) or not dim_id:
            continue
        entry = {}
        label = row.get("label")
        if isinstance(label, str) and label.strip():
            entry["label"] = label.strip()
        output = row.get("output")
        if isinstance(output, str) and output.strip():
            entry["output"] = output.strip()
        fields = row.get("result_fields")
        if isinstance(fields, list):
            entry["result_fields"] = [f for f in fields if isinstance(f, str) and f]
        registry[dim_id] = entry
    return registry

DIMENSION_REGISTRY = load_dimension_registry()

def dimension_label(dim_id):
    """Human-facing name for a registry id; falls back to the id."""
    if not isinstance(dim_id, str) or not dim_id:
        return dim_id or ""
    entry = DIMENSION_REGISTRY.get(dim_id) or {}
    return entry.get("label") or dim_id

def output_kind(output):
    """Collapse registry/envelope output to a lowercase Type token."""
    if not isinstance(output, str) or not output.strip():
        return "—"
    raw = output.strip().lower()
    if raw in ("findings", "context"):
        return raw
    if ":" in raw:
        prefix = raw.split(":", 1)[0]
        if prefix in ("check", "signal", "section"):
            return prefix
    return "—"

def dimension_type(dim_id):
    """Type column from registry output (collapse check:/signal:/section:)."""
    entry = DIMENSION_REGISTRY.get(dim_id) if isinstance(dim_id, str) else None
    return output_kind((entry or {}).get("output"))

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

def is_actionable_nit(finding):
    severity = (finding.get("severity") or "info").lower()
    return severity in ("low", "info") and bool(finding.get("actionable"))

def blocking_count(result):
    return sum(1 for finding in (result.get("findings") or []) if is_blocking(finding))

def checks(result):
    return [c for c in (result.get("checks") or []) if isinstance(c, dict)]

def checks_with_status(result, status):
    return [c for c in checks(result) if c.get("status") == status]

def failed_checks(result):
    return checks_with_status(result, "fail")

def needs_human(result):
    pa = result.get("product_ask") if isinstance(result.get("product_ask"), dict) else {}
    if os.environ.get("REVIEW_FORCE_PROTECTED_PATH"):
        return True
    if checks_with_status(result, "could-not-verify"):
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

def producers_block(result):
    """Self-contained producers object on the review result (schema v3)."""
    raw = result.get("producers") if isinstance(result, dict) else None
    return raw if isinstance(raw, dict) else None

def add_limit(inspected, note):
    notes = list(inspected.get("could_not_verify") or [])
    if note not in notes:
        notes.append(note)
    inspected["could_not_verify"] = notes

def ran_producer_ids(producers):
    """Ids that count as having run: dispatched LLM rows + adapter ids."""
    ran = []
    for item in (producers or {}).get("dispatched") or []:
        if isinstance(item, str) and item and item not in ran:
            ran.append(item)
    for item in (producers or {}).get("adapters") or []:
        if isinstance(item, dict):
            aid = item.get("id")
            if isinstance(aid, str) and aid and aid not in ran:
                ran.append(aid)
        elif isinstance(item, str) and item and item not in ran:
            ran.append(item)
    return ran

def reconcile_producers(result):
    """Validate result.producers and demote checks that did not run.

    Sticky Ran/Result/audit read result.producers only. There is no side
    ledger or inspected.producers corroboration path."""
    inspected = dict(result.get("inspected") or {})
    # Drop legacy inspected.producers if an older agent still emitted it.
    inspected.pop("producers", None)
    producers = producers_block(result)
    if producers is None:
        add_limit(inspected, "No producers object on the review result, so Ran/Result/audit cannot be rendered from a self-contained record.")
        result["inspected"] = inspected
        return result

    problem = challenger_problem(challenger_record(producers), result.get("findings") or [])
    if problem:
        add_limit(inspected, problem)

    ch = challenger_record(producers)
    removed_n = ch.get("removed")
    audit = ch.get("removed_findings") if isinstance(ch.get("removed_findings"), list) else None
    if isinstance(removed_n, (int, float)) and not isinstance(removed_n, bool) and audit is not None:
        if int(removed_n) != len(audit):
            add_limit(
                inspected,
                f"Challenger removed count ({int(removed_n)}) does not match "
                f"removed_findings length ({len(audit)}).",
            )

    ran_ids = set(ran_producer_ids(producers))
    for check in checks(result):
        check_id = check.get("id")
        if not isinstance(check_id, str) or not check_id or check_id in ran_ids:
            continue
        if check.get("status") == "could-not-verify":
            continue
        prior = str(check.get("status") or "missing")
        check["status"] = "could-not-verify"
        check["summary"] = (
            f"result.producers does not record '{check_id}' as running, "
            f"so the reported status ({prior}) is not a completed check."
        )
    if inspected:
        result["inspected"] = inspected
    elif "inspected" in result:
        result["inspected"] = inspected
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

    append_todo(result, protected_path_todo(", ".join(sorted(matches))))
    return result

def unverified_producers(result):
    """Everything this run could not establish, by whatever shape reported it.

    A readiness check that could not be verified is a producer that did not
    establish its result."""
    names = []
    for check in checks_with_status(result, "could-not-verify"):
        names.append(dimension_label(check.get("id") or "readiness check"))
    producers = producers_block(result)
    if producers is not None and challenger_problem(challenger_record(producers), result.get("findings") or []):
        names.append("challenger (its producers record contradicts the reported findings)")
    return names

def cap_confidence(result):
    """Host completeness re-cap: may lower confidence only (never raises risk)."""
    missing = unverified_producers(result)
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

def protected_path_todo(listed):
    return f"A human must approve this protected-path change: {listed}"

# Sticky ## TODO category ids → plain-text labels (not markdown headers).
TODO_CATEGORIES = (
    ("findings", "Findings"),
    ("checks", "Checks"),
    ("judgement", "Judgement"),
    ("nits", "Nits"),
)
TODO_CATEGORY_IDS = {cid for cid, _ in TODO_CATEGORIES}

def infer_todo_category(text, result):
    """Best-effort category for legacy plain-string todo bullets."""
    if "protected-path" in text.lower():
        return "judgement"
    for check in failed_checks(result):
        summary = (check.get("summary") or "").strip()
        if summary and (text == summary or summary in text):
            return "checks"
    # Blocking matches win over nits so finding order cannot misfile a
    # blocker-related string under Nits.
    nit_match = False
    for finding in (result.get("findings") or []):
        desc = (finding.get("description") or "").strip()
        if is_blocking(finding):
            rem = (finding.get("remediation") or "").strip()
            if (rem and rem in text) or (desc and desc in text):
                return "findings"
        if is_actionable_nit(finding) and desc and (desc in text or text in desc):
            nit_match = True
    if nit_match:
        return "nits"
    if needs_human(result) or approve_refuse_reason(result):
        return "judgement"
    return "findings"

def normalize_todo_item(item, result):
    if isinstance(item, str):
        text = item.strip()
    elif isinstance(item, dict):
        text = (item.get("text") or "").strip()
    else:
        return None
    if not text:
        return None
    if isinstance(item, dict):
        category = (item.get("category") or "").lower()
        if category in TODO_CATEGORY_IDS:
            return {"category": category, "text": text}
    return {"category": infer_todo_category(text, result), "text": text}

def todo_items(result):
    items = []
    for raw in (result.get("todo") or []):
        item = normalize_todo_item(raw, result)
        if item:
            items.append(item)
    return items

def append_todo(result, item, category="judgement"):
    if isinstance(item, str):
        candidate = {"category": category, "text": item.strip()}
    elif isinstance(item, dict):
        candidate = item
    else:
        return
    normalized = normalize_todo_item(candidate, result)
    if not normalized:
        return
    todos = todo_items(result)
    for t in todos:
        if t["text"] != normalized["text"]:
            continue
        # Host-owned Judgement (protected-path) wins over an agent Findings
        # classification of the same text — do not leave it under Findings.
        if normalized["category"] == "judgement" and t["category"] != "judgement":
            t["category"] = "judgement"
        break
    else:
        todos.append(normalized)
    result["todo"] = todos

def apply_host_todos(result):
    """Host-owned todos that the agent cannot know (protected-path gate)."""
    forced = (os.environ.get("REVIEW_FORCE_PROTECTED_PATH") or "").strip()
    if forced:
        append_todo(result, protected_path_todo(forced))
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
    if failed_checks(result):
        return "request-changes", "check-fail"
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
    """Record readiness limits for audit."""
    inspected = dict(result.get("inspected") or {})
    could_not_verify = list(inspected.get("could_not_verify") or [])
    for check in checks_with_status(result, "could-not-verify"):
        note = (
            f"{dimension_label(check.get('id') or 'readiness check')}: "
            f"{check.get('summary') or 'could not be verified'}"
        )
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
    # Finding file labels are untrusted; escape HTML (and backticks when the
    # label is shown in a code span) so they cannot break sticky <details>.
    safe_display = code_span_text(label)
    repo = (result.get("repo") or os.environ.get("GITHUB_REPOSITORY") or "").strip("/")
    sha = (result.get("head_sha") or "").strip()
    if not path or path.lower() == "n/a" or not repo or not sha:
        return f"`{safe_display}`"
    target = f"{server_url.rstrip('/')}/{repo}/blob/{sha}/{quote(path.lstrip('/'), safe='/')}"
    if line:
        target += f"#L{line}"
    link_label = safe_display.replace("\\", "\\\\").replace("[", "\\[").replace("]", "\\]")
    return f"[{link_label}]({target})"

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
    """One markdown table cell. Pipes and newlines would break the row; a raw
    `<` would let a cell close the surrounding `<details>` block."""
    return clean(text).replace("|", "\\|").replace("\n", " ").replace("<", "&lt;")

def inline_text(text):
    """Untrusted finding/audit field for Markdown outside tables.

    clean() only strips @mentions. Neutralize HTML so a field cannot close
    the host <details> block; flatten newlines so a value cannot inject
    headings or extra list items.
    """
    return clean(text).replace("\n", " ").replace("<", "&lt;")

def code_span_text(text):
    """Untrusted text for a single Markdown inline-code span (`...`).

    Applies inline_text, then replaces backticks so a value cannot break
    out of the span (or close a surrounding <details> via that breakout).
    """
    return inline_text(text).replace("`", "'")

def check_details_cell(check):
    """Checks-table Details cell: summary, then details[] with a blank line between each.

    GitHub markdown tables need `<br>` for line breaks. User text is escaped
    the same way as `table_cell`; the `<br>` separators are intentional HTML."""
    summary = clean(check.get("summary") or "")
    raw = check.get("details")
    detail_lines = []
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, str):
                line = clean(item)
                if line:
                    detail_lines.append(line)
    elif isinstance(raw, str):
        line = clean(raw)
        if line:
            detail_lines.append(line)
    if not summary and not detail_lines:
        return "—"
    parts = []
    if summary:
        parts.append(table_cell(summary))
    if detail_lines:
        if parts:
            parts.append("")  # summary<br><br>details ≈ a couple of newlines
        for i, line in enumerate(detail_lines):
            if i:
                parts.append("")  # extra blank line between details
            parts.append(table_cell(line))
    return "<br>".join(parts)

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

def author_wait_detail(result):
    count = blocking_count(result)
    failed = failed_checks(result)
    bits = []
    if count:
        noun = "finding" if count == 1 else "findings"
        bits.append(f"{count} blocking {noun}")
    if failed:
        n = len(failed)
        noun = "readiness check" if n == 1 else "readiness checks"
        bits.append(f"{n} failed {noun}")
    listed = " and ".join(bits) if bits else "blocking issues"
    return f"{listed} before the agent bar can clear. Human still finalizes."

STATUS_MARK = {"pass": "✅", "warning": "🟡", "fail": "❌", "not-applicable": "➖", "could-not-verify": "❔"}
ACTION_MARK = {"approve": "✅", "comment": "💬", "request-changes": "🔴", "reject": "⛔", "failure": "❌"}

def mark(table, key, default=""):
    if not isinstance(key, str):
        return default
    return table.get(key.lower(), default)

def detail_block(summary, body_lines, open_by_default=False):
    """A collapsed section. Blank lines around the body are required for
    GitHub to render markdown inside <details>."""
    attr = " open" if open_by_default else ""
    return [f"<details{attr}>", f"<summary>{summary}</summary>", ""] + body_lines + ["", "</details>"]

def challenger_record(producers):
    raw = (producers or {}).get("challenger")
    return raw if isinstance(raw, dict) else {}

def claims_empty_skip(reason):
    """True when a skipped challenger claims the empty-finding-set sanction."""
    return not reason or "no finding" in reason.lower()

def challenger_problem(ch, findings):
    """Confidence/limit note when the challenger record contradicts itself."""
    status = str(ch.get("status") or "").strip().lower()
    reason = clean(ch.get("reason") or "")
    if status == "pending":
        return ('result.producers still records the challenger as "pending", so whether it ran is unknown.')
    if status == "skipped" and claims_empty_skip(reason) and findings:
        count = len(findings)
        return (f"result.producers records the challenger as skipped for an empty finding set, but {count} "
                f"finding(s) were reported. Its real reason for skipping was not recorded.")
    return None

def challenger_prose(result):
    producers = producers_block(result)
    findings = result.get("findings") or []
    if producers is None:
        return "Challenger state is unverified — no producers object on the review result."
    ch = challenger_record(producers)
    status = str(ch.get("status") or "").strip().lower()
    if not status:
        return "Challenger state was not recorded in result.producers."
    problem = challenger_problem(ch, findings)
    if problem:
        return problem
    reason = clean(ch.get("reason") or "")
    if status == "failed":
        fallback = "using the pre-challenger finding set"
        if not reason:
            return f"Challenger failed; {fallback}."
        # Agents sometimes embed the fallback in reason; avoid duplicating it.
        if fallback in reason.lower():
            return f"Challenger failed ({reason})."
        return f"Challenger failed ({reason}); {fallback}."
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
        justified_n = len(justified_findings(result))
        removed_noise = max(0, removed - justified_n)
        noun = "finding" if input_n == 1 else "findings"
        parts = [f"{label} {n}" for label, n in (
            ("removed", removed_noise), ("justified", justified_n),
            ("merged", merged), ("downgraded", downgraded)) if n]
        if not parts:
            return f"Adjudicated {input_n} {noun}; all kept."
        return f"Adjudicated {input_n} {noun}; kept {kept} ({', '.join(parts)})."
    return clean(status)

def justification_allowed(finding):
    """Host policy categories cannot be cleared via Justifications."""
    category = (finding.get("category") or "").lower()
    # protected-path needs human; approach-rejected maps to reject.
    return category not in ("protected-path", "approach-rejected")

# Fields allowed on result.findings[] (schema $defs.finding). Audit-only
# keys on removed_finding (removal_reason, challenger_action) must not land here.
_FINDING_KEYS = (
    "severity", "category", "dimension", "file", "line",
    "description", "remediation", "why", "actionable",
)

def as_finding(item):
    """Project a removed_finding (or finding) onto schema-valid finding fields."""
    return {k: item[k] for k in _FINDING_KEYS if k in item}

def restore_policy_findings(result):
    """Put mistagged justified policy findings back into findings[].

    needs_human / compute_action only inspect result.findings. A challenger
    that incorrectly marks protected-path or approach-rejected as justified
    would otherwise drop them from disposition. Restore before
    normalize_protected_findings so host gates still fire.

    Restored items are projected onto standard finding fields; audit metadata
    stays only in producers.challenger.removed_findings.
    """
    producers = producers_block(result)
    if producers is None:
        return result
    removed = challenger_record(producers).get("removed_findings")
    if not isinstance(removed, list):
        return result
    protected = [
        as_finding(f) for f in removed
        if isinstance(f, dict)
        and f.get("challenger_action") == "justified"
        and not justification_allowed(f)
    ]
    if protected:
        result["findings"] = list(result.get("findings") or []) + protected
    return result

def justified_findings(result):
    """Extract justified findings allowed to render under ### Justified."""
    producers = producers_block(result)
    if producers is None:
        return []
    ch = challenger_record(producers)
    removed = ch.get("removed_findings")
    if not isinstance(removed, list):
        return []
    return [
        f for f in removed
        if isinstance(f, dict)
        and f.get("challenger_action") == "justified"
        and justification_allowed(f)
    ]

def render_justified_section(result):
    """Render ### Justified under ## Findings with omit markers."""
    items = justified_findings(result)
    if not items:
        return []
    run_url = os.environ.get("GITHUB_SERVER_URL", "https://github.com")
    lines = [
        "",
        "<!-- fullsend:justified-findings -->",
        f"### Justified ({len(items)})",
        "",
        "_These findings were raised by review producers but the PR's "
        "Justifications were accepted as sufficient for this run. They do "
        "not block disposition. A human reviewer may still disagree._",
    ]
    for finding in items:
        loc = render_location(result, finding, run_url)
        origin = ""
        if finding.get("dimension"):
            origin_ids = producer_ids(finding)
            origin_shown = ", ".join(
                code_span_text(dimension_label(i)) for i in origin_ids
            ) or code_span_text(finding.get("dimension"))
            origin = f"`{origin_shown}` · "
        sev = (finding.get("severity") or "info").capitalize()
        lines += ["", f"- {origin}**{inline_text(finding.get('category'))}** ({loc}) · _{sev}_: {inline_text(finding.get('description'))}"]
        reason = inline_text(finding.get("removal_reason") or "")
        if reason:
            lines.append(f"  - Justification: {reason}")
    lines += ["", "<!-- /fullsend:justified-findings -->"]
    return lines

def render_removed_audit(result):
    """Collapsed audit list of challenger-removed findings (ignore for disposition).

    Allowed justified items are rendered under Findings ### Justified instead;
    they are excluded here to avoid duplication. Policy-rejected justified
    items (protected-path / approach-rejected) stay in this audit.
    """
    producers = producers_block(result)
    if producers is None:
        return []
    ch = challenger_record(producers)
    removed = ch.get("removed_findings")
    if not isinstance(removed, list) or not removed:
        return []
    non_justified = [
        f for f in removed
        if isinstance(f, dict)
        and not (f.get("challenger_action") == "justified" and justification_allowed(f))
    ]
    if not non_justified:
        return []
    run_url = os.environ.get("GITHUB_SERVER_URL", "https://github.com")
    lines = [
        "",
        "<details>",
        "<summary>Removed findings (audit only)</summary>",
        "",
        "**Audit only — ignore for disposition.** These findings were removed "
        "or merged by the challenger. Agents and humans must not treat them as "
        "actionable review findings; use `findings[]` / ## Findings instead.",
        "",
    ]
    for finding in non_justified:
        loc = render_location(result, finding, run_url)
        origin = ""
        if finding.get("dimension"):
            origin_ids = producer_ids(finding)
            origin_shown = ", ".join(
                code_span_text(dimension_label(i)) for i in origin_ids
            ) or code_span_text(finding.get("dimension"))
            origin = f"`{origin_shown}` · "
        lines += [
            "",
            f"- {origin}**{inline_text(finding.get('category'))}** ({loc}): {inline_text(finding.get('description'))}",
        ]
        if finding.get("why"):
            lines.append(f"  - Why: {inline_text(finding.get('why'))}")
        reason = inline_text(finding.get("removal_reason") or "")
        if reason:
            lines.append(f"  - Removal reason: {reason}")
    lines += ["", "</details>"]
    return lines

def producer_ids(finding):
    """Registry ids stamped on a finding, including a same-category merge.

    Step 6b keeps both producer ids, comma-separated, when two findings merge.
    Distinct categories stay separate, so this split does not combine them."""
    dimension = finding.get("dimension")
    if not isinstance(dimension, str):
        return []
    ids = []
    for part in dimension.split(","):
        part = part.strip()
        if part and part not in ids:
            ids.append(part)
    return ids

def raised_findings_for(name, result):
    """As-raised findings for one producer id from result.producers.raised."""
    producers = producers_block(result) or {}
    raised = producers.get("raised")
    if not isinstance(raised, dict):
        return []
    mine = raised.get(name)
    return [f for f in mine if isinstance(f, dict)] if isinstance(mine, list) else []

def findings_result(name, result):
    """Producers Result for findings rows — as-raised counts, not survivors."""
    mine = raised_findings_for(name, result)
    if mine:
        cats = []
        for finding in mine:
            cat = finding.get("category") or "finding"
            if cat not in cats:
                cats.append(cat)
        noun = "finding" if len(mine) == 1 else "findings"
        return f"{len(mine)} {noun}: {', '.join(cats)}"
    return "No findings."

def check_result(name, review_checks):
    for check in review_checks:
        if isinstance(check, dict) and check.get("id") == name:
            status = clean(check.get("status") or "")
            summary = clean(check.get("summary") or "")
            if status and summary:
                return f"{status} — {summary}"
            return status or summary or "No check result."
    return "No check result."

def signal_result(dim_id, result):
    entry = DIMENSION_REGISTRY.get(dim_id) or {}
    fields = entry.get("result_fields") or ["risk", "confidence"]
    parts = []
    for field in fields:
        rated = result.get(field) if isinstance(result, dict) else None
        if isinstance(rated, dict) and rated.get("level"):
            parts.append(f"{field} {clean(str(rated.get('level')).lower())}")
    return " · ".join(parts) if parts else "No signal levels."

def section_result(dim_id, result):
    entry = DIMENSION_REGISTRY.get(dim_id) or {}
    fields = list(entry.get("result_fields") or [])
    if not fields:
        output = entry.get("output") or ""
        if isinstance(output, str) and output.startswith("section:") and output.split(":", 1)[1]:
            fields = [output.split(":", 1)[1]]
    parts = []
    for field in fields:
        section = result.get(field) if isinstance(result, dict) else None
        if isinstance(section, dict) and section.get("status") is not None:
            parts.append(f"{field} {clean(str(section.get('status')))}")
    return " · ".join(parts) if parts else "No section result."

def producer_result(name, result, review_checks, kind=None):
    """Kind-aware Result cell for a dispatched (or ok-adapter) producer."""
    kind = kind or dimension_type(name)
    if kind == "findings":
        return findings_result(name, result)
    if kind == "check":
        return check_result(name, review_checks)
    if kind == "signal":
        return signal_result(name, result)
    if kind == "section":
        return section_result(name, result)
    if kind == "context":
        return "Context available."
    return "—"

# Adapter `reason` values are fixed tokens (`no-issue-key`, `http-404`,
# `URLError`). Issue titles and other free-form text are not.
_ADAPTER_REASON = re.compile(r"^[A-Za-z][A-Za-z0-9_-]{0,63}$")

def adapter_reason(envelope):
    """Humanize a fixed adapter reason token for the Producers Result cell.

    Only `reason` is eligible. Snapshot fields such as `summary` stay off the
    public comment. A value that is not a token is dropped so the caller can
    use its status default."""
    raw = envelope.get("reason")
    if not isinstance(raw, str):
        return ""
    token = raw.strip()
    if _ADAPTER_REASON.fullmatch(token) is None:
        return ""
    return clean(token.replace("-", " "))

def adapter_producer_row(entry, result, review_checks):
    """Render a cli-adapter from result.producers.adapters status.

    ok → ran (✅). none/skipped → unavailable (⚪), not a clean zero-finding run.
    error → ❌. Missing or unrecognized status → ❔.
    Returns (label, type, ran_icon, result)."""
    if isinstance(entry, str):
        name, envelope = entry, None
    elif isinstance(entry, dict):
        name, envelope = entry.get("id"), entry
    else:
        return None
    if not isinstance(name, str) or not name:
        return None
    shown = dimension_label(name)
    typ = dimension_type(name)
    if not isinstance(envelope, dict) or "status" not in envelope:
        return (clean(shown), typ, "❔", "adapter status missing")
    status = str(envelope.get("status") or "").strip().lower()
    reason = adapter_reason(envelope)
    if status == "ok":
        res = producer_result(name, result, review_checks, kind=typ)
        return (clean(shown), typ, "✅", res)
    if status in ("none", "skipped"):
        default = "No usable adapter context." if status == "none" else "Adapter skipped."
        return (clean(shown), typ, "⚪", reason or default)
    if status == "error":
        return (clean(shown), typ, "❌", reason or "Adapter error.")
    return (clean(shown), typ, "❔", reason or f"Unrecognized adapter status: {status or 'missing'}")

def producer_rows(result):
    """What ran, by kind, with a Result cell — from result.producers only.

    LLM rows in `dispatched` are ✅. Adapter rows use transferred status on
    result.producers.adapters. Findings Result uses producers.raised.
    Each row is (label, type, ran_icon, result). Sorted by type, then label."""
    producers = producers_block(result)
    review_checks = checks(result)

    rows = []
    if producers is None:
        return rows, False
    for name in producers.get("dispatched") or []:
        if isinstance(name, str):
            typ = dimension_type(name)
            rows.append((
                clean(dimension_label(name)),
                typ,
                "✅",
                producer_result(name, result, review_checks, kind=typ),
            ))
    for entry in producers.get("adapters") or []:
        row = adapter_producer_row(entry, result, review_checks)
        if row:
            rows.append(row)
    for row in producers.get("skipped") or []:
        if isinstance(row, dict) and isinstance(row.get("id"), str):
            reason = clean(row.get("reason") or "not selected")
            rows.append((
                clean(dimension_label(row["id"])),
                dimension_type(row["id"]),
                "➖",
                reason,
            ))
    rows.sort(key=lambda r: ((r[1] or "").casefold(), (r[0] or "").casefold()))
    return rows, True

def status_headline(result, action):
    """Visible status line: icon + bold label + remainder."""
    if action == "request-changes":
        return f"{mark(ACTION_MARK, action)} **Waiting on author** — {author_wait_detail(result)}"
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
    return f"{mark(ACTION_MARK, action)} This review did not complete. Do not treat this head as reviewed."

def render_signal_table(result):
    """Signal | Level | Assessment — always risk + confidence under Status."""
    risk = result.get("risk") if isinstance(result.get("risk"), dict) else {}
    confidence = result.get("confidence") if isinstance(result.get("confidence"), dict) else {}
    risk_level = rated_level(result, "risk", "low")
    conf_level = rated_level(result, "confidence", "high")
    lines = [
        "",
        "### Signals",
        "",
        "| Signal | Level | Assessment |",
        "| --- | --- | --- |",
        f"| Risk | `{table_cell(risk_level)}` | {table_cell(risk.get('why') or '—')} |",
        f"| Confidence | `{table_cell(conf_level)}` | {table_cell(confidence.get('why') or '—')} |",
    ]
    return lines

def render_checks_table(result):
    rows = checks(result)
    if not rows:
        return []
    lines = ["", "### Checks", "", "| Check | Status | Details |", "| --- | --- | --- |"]
    for check in rows:
        status = check.get("status") or ""
        lines.append(
            f"| {table_cell(dimension_label(check.get('id')))} | {mark(STATUS_MARK, status)} {table_cell(status)} "
            f"| {check_details_cell(check)} |")
    return lines

def render_todo_section(result):
    todos = todo_items(result)
    if not todos:
        return []
    by_category = {cid: [] for cid, _ in TODO_CATEGORIES}
    for item in todos:
        by_category[item["category"]].append(item["text"])
    lines = ["", "## TODO"]
    for cid, label in TODO_CATEGORIES:
        items = by_category[cid]
        if not items:
            continue
        lines += ["", label] + [f"- {clean(text)}" for text in items]
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
    return lines

def render_body(result, previous_md, action):
    run_url = os.environ.get("GITHUB_SERVER_URL", "https://github.com")
    lines = render_header(result, action)

    if action == "failure":
        reason = clean(result.get("reason") or "unknown")
        lines += ["", f"This review did not complete (`{reason}`). Do not treat this head as reviewed."]
        return "\n".join(lines).rstrip() + "\n"

    lines += ["", "## Change summary", "", clean(result.get("change_summary"))]
    lines += ["", "## Status", "", status_headline(result, action)]
    lines += render_signal_table(result)
    lines += render_checks_table(result)

    findings = result.get("findings") or []
    justified = justified_findings(result)
    if findings or justified:
        lines += ["", "## Findings"]
        for severity, items in group_findings(findings):
            lines += ["", f"### {severity.capitalize()} ({len(items)})"]
            for finding in items:
                loc = render_location(result, finding, run_url)
                origin = ""
                if finding.get("dimension"):
                    origin_ids = producer_ids(finding)
                    origin_shown = ", ".join(dimension_label(i) for i in origin_ids) or clean(finding.get("dimension"))
                    origin = f"`{origin_shown}` · "
                tail = " · actionable follow-up" if is_actionable_nit(finding) else ""
                lines += ["", f"- {origin}**{clean(finding.get('category'))}** ({loc}){tail}: {clean(finding.get('description'))}"]
                if finding.get("why"):
                    lines.append(f"  - Why: {clean(finding.get('why'))}")
                if finding.get("remediation"):
                    lines += render_remediation(finding.get("remediation"))
        lines += render_justified_section(result)
    elif action == "approve":
        lines += ["", "Looks good to me."]

    pa = result.get("product_ask") if isinstance(result.get("product_ask"), dict) else None
    lines += render_product_ask_section(pa)
    lines += render_todo_section(result)

    inspected = result.get("inspected") if isinstance(result.get("inspected"), dict) else {}
    labels = result.get("label_actions") if isinstance(result.get("label_actions"), dict) else {}
    details_body = []

    rows, from_producers = producer_rows(result)
    if rows:
        details_body += ["### Producers", "",
                         "| Producer | Type | Ran | Result |",
                         "| --- | --- | --- | --- |"]
        for name, typ, ran, res in rows:
            details_body.append(
                f"| {table_cell(name)} | {table_cell(typ)} | {ran} | {table_cell(res)} |")
        details_body.append("")
    elif not from_producers:
        details_body += [
            "### Producers", "",
            "_No producers object on the review result — Ran/Result cannot be corroborated._",
            "",
        ]

    details_body += ["### Challenger", "", challenger_prose(result)]
    details_body += render_removed_audit(result)
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
        ran = sum(1 for _, _, icon, _ in rows if icon == "✅")
        unavailable = sum(1 for _, _, icon, _ in rows if icon == "⚪")
        errored = sum(1 for _, _, icon, _ in rows if icon == "❌")
        skipped = sum(1 for _, _, icon, _ in rows if icon == "➖")
        parts = []
        if ran:
            parts.append(f"{ran} producer(s) ran")
        if unavailable:
            parts.append(f"{unavailable} unavailable")
        if errored:
            parts.append(f"{errored} errored")
        if skipped:
            parts.append(f"{skipped} skipped")
        blurb = ", ".join(parts) if parts else "audit trail"
        lines += [""] + detail_block(f"🔍 <strong>Review details</strong> — {blurb}", details_body)

    _ = previous_md
    return "\n".join(lines).rstrip() + "\n"

with open(sys.argv[1], encoding="utf-8") as fh:
    result = json.load(fh)
previous_md = os.environ.get("REVIEW_PREVIOUS_MARKDOWN", "")
result = restore_policy_findings(result)
result = normalize_protected_findings(result)
result = reconcile_producers(result)
result = apply_host_todos(result)
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

  # Relative FULLSEND_DIR must still resolve when CWD is not the workspace
  # (post_script runs in runDir). Without this, labels/Type/Result collapse.
  local resolved_from_rundir
  resolved_from_rundir="$(
    cd "${tmp}"
    FULLSEND_DIR=".fullsend"
    unset GITHUB_WORKSPACE
    resolve_fullsend_config_dir
  )"
  if [[ "${resolved_from_rundir}" != /* ]] || [[ ! -f "${resolved_from_rundir}/dimensions.json" ]]; then
    echo "FAIL config-dir: relative FULLSEND_DIR from runDir did not resolve to dimensions.json (${resolved_from_rundir})" >&2
    fail=1
  else
    echo "PASS relative FULLSEND_DIR resolves from runDir to ${resolved_from_rundir}"
  fi

  local resolved_via_workspace
  resolved_via_workspace="$(
    cd "${tmp}"
    FULLSEND_DIR=".fullsend"
    # BASH_SOURCE[0] is this script (.fullsend/scripts/post-review.sh).
    GITHUB_WORKSPACE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    resolve_fullsend_config_dir
  )"
  if [[ ! -f "${resolved_via_workspace}/dimensions.json" ]]; then
    echo "FAIL config-dir: GITHUB_WORKSPACE-relative FULLSEND_DIR missed dimensions.json (${resolved_via_workspace})" >&2
    fail=1
  else
    echo "PASS GITHUB_WORKSPACE-relative FULLSEND_DIR resolves to ${resolved_via_workspace}"
  fi

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
       ! grep -q '### Signals' <<<"${body}" ||
       ! grep -q '<summary>🔍 <strong>Review details</strong>' <<<"${body}" ||
       grep -q '### Verification' <<<"${body}" ||
       grep -q '### Jira acceptance criteria' <<<"${body}" ||
       grep -q '## Decision needed' <<<"${body}" ||
       grep -q '### Readiness checks' <<<"${body}" ||
       grep -q '## Next steps' <<<"${body}"; then
      echo "FAIL ${name}: required rendered sections missing or retired sections present" >&2
      fail=1
      return
    fi
    echo "PASS ${name} (${want_action})"
  }

  local common
  common='"schema_version":"3","pr_number":1,"repo":"o/r","head_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","change_summary":"Changes a small frontend helper without changing authorization.","risk":{"level":"low","why":"The change is isolated to one internal helper."},"confidence":{"level":"high","why":"The complete diff and matching unit evidence were inspected."},"producers":{"dispatched":[],"adapters":[],"skipped":[],"returned":[],"raised":{},"challenger":{"status":"skipped","reason":"no findings to adjudicate"}}'

  render_fixture approve approve "{${common},\"findings\":[],\"product_ask\":{\"status\":\"none\"},\"inspected\":{\"summary\":\"Read the PR body and full diff.\"}}"

  render_fixture request-changes request-changes "{${common},\"findings\":[{\"severity\":\"high\",\"category\":\"correctness\",\"file\":\"a.ts\",\"line\":12,\"description\":\"Empty state throws.\",\"why\":\"The supported empty route reaches an unguarded map.\",\"remediation\":\"Guard the list and add an empty-state test.\"}],\"product_ask\":{\"status\":\"aligned\"}}"

  render_fixture needs-human comment "{${common},\"findings\":[],\"todo\":[{\"category\":\"judgement\",\"text\":\"Decide which product scope this PR implements.\"}],\"product_ask\":{\"status\":\"mismatch-justified\",\"needs_human\":true}}"

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
  if ! grep -Fq '**Needs human judgment.**' <<<"${body}" ||
     ! grep -q '## TODO' <<<"${body}" ||
     ! grep -Fxq 'Judgement' <<<"${body}" ||
     grep -q '## Decision needed' <<<"${body}"; then
    echo "FAIL needs-human: status or categorized TODO missing" >&2
    fail=1
  else
    echo "PASS needs-human status and Judgement TODO"
  fi
  body=$(jq -r .body "${tmp}/approve-out.json")
  if grep -q '## Findings' <<<"${body}" || grep -q '## TODO' <<<"${body}" || ! grep -q 'Looks good to me' <<<"${body}"; then
    echo "FAIL approve: empty findings rendering or unexpected TODO section" >&2
    fail=1
  else
    echo "PASS approve omits findings section"
  fi

  printf '%s' "{${common},\"checks\":[{\"id\":\"test-impact-review\",\"status\":\"warning\",\"summary\":\"No targeted tests were changed.\",\"details\":[\"PR body explains manual verification only.\",\"Second detail line.\"]}],\"todo\":[{\"category\":\"findings\",\"text\":\"Confirm the manual verification note is enough.\"}],\"producers\":{\"dispatched\":[\"test-impact-review\"],\"adapters\":[],\"skipped\":[],\"returned\":[\"test-impact-review\"],\"raised\":{},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/structured.json"
  transform_review_result "${tmp}/structured.json" > "${tmp}/structured-out.json"
  body=$(jq -r .body "${tmp}/structured-out.json")
  if [[ "$(jq -r .action "${tmp}/structured-out.json")" != "approve" ]] ||
     ! grep -q '### Checks' <<<"${body}" ||
     ! grep -q '| Check | Status | Details |' <<<"${body}" ||
     ! grep -q 'Test impact' <<<"${body}" ||
     ! grep -Fq 'No targeted tests were changed.<br><br>PR body explains manual verification only.<br><br>Second detail line.' <<<"${body}" ||
     ! grep -q '## TODO' <<<"${body}" ||
     ! grep -Fxq 'Findings' <<<"${body}" ||
     grep -q '### Verification' <<<"${body}" ||
     grep -q '### Jira acceptance criteria' <<<"${body}" ||
     grep -q '### Readiness checks' <<<"${body}"; then
    echo "FAIL structured results: checks/TODO were not rendered as visible sections" >&2
    fail=1
  else
    # Visible order: Signals, then Checks, then TODO after product ask (none here).
    signals_at=$(grep -n '### Signals' <<<"${body}" | head -1 | cut -d: -f1)
    checks_at=$(grep -n '### Checks' <<<"${body}" | head -1 | cut -d: -f1)
    todo_at=$(grep -n '## TODO' <<<"${body}" | head -1 | cut -d: -f1)
    if [[ -z "${signals_at}" || -z "${checks_at}" || -z "${todo_at}" ||
          "${signals_at}" -ge "${checks_at}" || "${checks_at}" -ge "${todo_at}" ]]; then
      echo "FAIL structured results: visible order is not Signals → Checks → TODO" >&2
      fail=1
    else
      echo "PASS structured results render Checks and TODO in sticky order"
    fi
  fi

  printf '%s' "{${common},\"findings\":[{\"severity\":\"medium\",\"category\":\"correctness\",\"file\":\"a.ts\",\"line\":1,\"description\":\"Service name mismatch.\",\"why\":\"Config disagrees with the Service manifest.\",\"remediation\":\"Align the service name with the manifest.\"},{\"severity\":\"low\",\"category\":\"style-conventions\",\"file\":\"b.ts\",\"description\":\"Minor naming nit.\",\"actionable\":true}],\"checks\":[{\"id\":\"pr-description-review\",\"status\":\"fail\",\"summary\":\"Problem section is empty.\"}],\"todo\":[{\"category\":\"findings\",\"text\":\"Align the service name with the manifest.\"},{\"category\":\"checks\",\"text\":\"Problem section is empty.\"},{\"category\":\"judgement\",\"text\":\"Obtain human approval for the protected-path change.\"},{\"category\":\"nits\",\"text\":\"Minor naming nit.\"}],\"product_ask\":{\"status\":\"none\"}}" > "${tmp}/todo-cats.json"
  transform_review_result "${tmp}/todo-cats.json" > "${tmp}/todo-cats-out.json"
  body=$(jq -r .body "${tmp}/todo-cats-out.json")
  # Category labels live under ## TODO as plain text (not ## / ### headings).
  todo_block=$(awk '/^## TODO$/{p=1;next} /^## /{p=0} p' <<<"${body}")
  findings_label=$(grep -n '^Findings$' <<<"${todo_block}" | head -1 | cut -d: -f1)
  checks_label=$(grep -n '^Checks$' <<<"${todo_block}" | head -1 | cut -d: -f1)
  human_label=$(grep -n '^Judgement$' <<<"${todo_block}" | head -1 | cut -d: -f1)
  nits_label=$(grep -n '^Nits$' <<<"${todo_block}" | head -1 | cut -d: -f1)
  if [[ -z "${findings_label}" || -z "${checks_label}" || -z "${human_label}" || -z "${nits_label}" ||
        "${findings_label}" -ge "${checks_label}" || "${checks_label}" -ge "${human_label}" ||
        "${human_label}" -ge "${nits_label}" ]] ||
     grep -Eq '^#{1,6}[[:space:]]+(Findings|Checks|Judgement|Nits)$' <<<"${todo_block}"; then
    echo "FAIL todo-cats: categorized TODO labels missing, misordered, or markdown-headed" >&2
    fail=1
  else
    echo "PASS categorized TODO labels render as plain text in recipe order"
  fi

  # Legacy string TODO matching both a nit (listed first) and a blocker
  # remediation must categorize as Findings, not Nits.
  printf '%s' "{${common},\"findings\":[{\"severity\":\"low\",\"category\":\"style-conventions\",\"file\":\"b.ts\",\"description\":\"Align the service name with the manifest.\",\"actionable\":true},{\"severity\":\"medium\",\"category\":\"correctness\",\"file\":\"a.ts\",\"line\":1,\"description\":\"Service name mismatch.\",\"why\":\"Config disagrees with the Service manifest.\",\"remediation\":\"Align the service name with the manifest.\"}],\"todo\":[\"Align the service name with the manifest.\"],\"product_ask\":{\"status\":\"none\"}}" > "${tmp}/todo-infer-order.json"
  transform_review_result "${tmp}/todo-infer-order.json" > "${tmp}/todo-infer-order-out.json"
  todo_block=$(awk '/^## TODO$/{p=1;next} /^## /{p=0} p' <<<"$(jq -r .body "${tmp}/todo-infer-order-out.json")")
  if ! grep -Fxq 'Findings' <<<"${todo_block}" || grep -Fxq 'Nits' <<<"${todo_block}"; then
    echo "FAIL todo-infer-order: sticky must show Findings, not Nits, when blocker matches first" >&2
    fail=1
  else
    echo "PASS legacy string TODO prefers blocking match over earlier nit"
  fi

  printf '%s' "{${common},\"findings\":[],\"checks\":[{\"id\":\"pr-description-review\",\"status\":\"fail\",\"summary\":\"Problem section is empty.\"}],\"producers\":{\"dispatched\":[\"pr-description-review\"],\"adapters\":[],\"skipped\":[],\"returned\":[\"pr-description-review\"],\"raised\":{},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/check-fail.json"
  transform_review_result "${tmp}/check-fail.json" > "${tmp}/check-fail-out.json"
  if [[ "$(jq -r .action "${tmp}/check-fail-out.json")" != "request-changes" ]] ||
     ! grep -Fq '**Waiting on author** — 1 failed readiness check' <<<"$(jq -r .body "${tmp}/check-fail-out.json")"; then
    echo "FAIL check-fail: failed readiness check must request changes" >&2
    fail=1
  else
    echo "PASS failed readiness check requests changes"
  fi

  printf '%s' "{${common},\"findings\":[],\"checks\":[{\"id\":\"test-impact-review\",\"status\":\"could-not-verify\",\"summary\":\"CI host context was unavailable.\"}],\"todo\":[{\"category\":\"judgement\",\"text\":\"Re-run when CI context is available.\"}]}" > "${tmp}/check-cnv.json"
  transform_review_result "${tmp}/check-cnv.json" > "${tmp}/check-cnv-out.json"
  if [[ "$(jq -r .action "${tmp}/check-cnv-out.json")" != "comment" ]] ||
     ! grep -Fq '**Needs human judgment.**' <<<"$(jq -r .body "${tmp}/check-cnv-out.json")"; then
    echo "FAIL check-cnv: could-not-verify must refuse approve and need a human" >&2
    fail=1
  else
    echo "PASS could-not-verify check needs a human"
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
  if ! jq -e '
      .action == "comment"
      and ((.findings // []) | length) == 1
      and ((.todo // [])
           | map(if type == "string" then . else .text end)
           | any(contains(".github/workflows/ci.yaml")))
      and ((.todo // []) | any(type == "object" and .category == "judgement"))
      and (.decision_needed | not)
    ' "${tmp}/pp-real-out.json" >/dev/null; then
    echo "FAIL protected-path-real: want comment + retained finding + judgement TODO, no decision_needed" >&2
    fail=1
  elif ! grep -q 'Needs human judgment' <<<"$(jq -r .body "${tmp}/pp-real-out.json")" ||
       ! grep -Fxq 'Judgement' <<<"$(jq -r .body "${tmp}/pp-real-out.json")"; then
    echo "FAIL protected-path-real: status should route to human judgment with Judgement TODO" >&2
    fail=1
  else
    echo "PASS supported protected-path routes to human judgment, not request-changes"
  fi

  # Host-owned protected-path TODO keeps Judgement even when an agent already
  # listed the same text under Findings.
  local pp_todo_text
  pp_todo_text='A human must approve this protected-path change: .github/workflows/ci.yaml'
  printf '%s' "{${common},\"findings\":[${pp_finding}],\"todo\":[{\"category\":\"findings\",\"text\":$(jq -n --arg t "${pp_todo_text}" '$t')}]}" > "${tmp}/pp-todo-dup.json"
  (
    export REVIEW_PROTECTED_PATHS=".github/,scripts/"
    export REVIEW_CHANGED_FILES=$'.github/workflows/ci.yaml\nsrc/app.ts'
    transform_review_result "${tmp}/pp-todo-dup.json"
  ) > "${tmp}/pp-todo-dup-out.json"
  if ! jq -e '
      .action == "comment"
      and ((.todo // [])
           | map(select((.text // .) | contains(".github/workflows/ci.yaml")))
           | length) == 1
      and ((.todo // []) | any(
            type == "object"
            and .category == "judgement"
            and (.text | contains(".github/workflows/ci.yaml"))))
      and ((.todo // []) | any(
            type == "object"
            and .category == "findings"
            and (.text | contains(".github/workflows/ci.yaml"))) | not)
    ' "${tmp}/pp-todo-dup-out.json" >/dev/null; then
    echo "FAIL protected-path-todo-dup: host Judgement must replace matching agent Findings TODO" >&2
    fail=1
  elif ! grep -Fxq 'Judgement' <<<"$(jq -r .body "${tmp}/pp-todo-dup-out.json")" ||
       grep -Fxq 'Findings' <<<"$(awk '/^## TODO$/{p=1;next} /^## /{p=0} p' <<<"$(jq -r .body "${tmp}/pp-todo-dup-out.json")")"; then
    echo "FAIL protected-path-todo-dup: sticky must show Judgement, not Findings, for the TODO" >&2
    fail=1
  else
    echo "PASS host-owned protected-path TODO retains Judgement over matching Findings"
  fi

  # result.producers is authoritative; legacy inspected.producers is dropped.
  printf '%s' "{${common},\"findings\":[],\"inspected\":{\"summary\":\"Read the diff.\",\"producers\":[\"correctness\",\"security\",\"challenger\"]},\"producers\":{\"dispatched\":[\"correctness\"],\"adapters\":[{\"id\":\"jira-snapshot\",\"status\":\"ok\"}],\"skipped\":[{\"id\":\"security\",\"reason\":\"no auth, secrets or config touched\"}],\"returned\":[\"correctness\"],\"raised\":{\"correctness\":[]},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/ledger.json"
  transform_review_result "${tmp}/ledger.json" > "${tmp}/ledger-out.json"
  if jq -e '.inspected | has("producers")' "${tmp}/ledger-out.json" >/dev/null; then
    echo "FAIL producers-result: legacy inspected.producers must be dropped" >&2
    fail=1
  elif ! jq -e '.confidence.level == "high"' "${tmp}/ledger-out.json" >/dev/null; then
    echo "FAIL producers-result: a skipped conditional producer should not cap confidence" >&2
    fail=1
  elif jq -e 'has("verification") and (.verification | length > 0)' "${tmp}/ledger-out.json" >/dev/null; then
    echo "FAIL producers-result: host must not invent verification rows" >&2
    fail=1
  else
    echo "PASS result.producers is used; inspected.producers is not"
  fi

  # Missing result.producers still surfaces a Producers note (empty table case).
  jq -n --argjson common "$(printf '{%s}' "${common}")" \
    '$common | del(.producers) | .findings = []' > "${tmp}/no-producers.json"
  transform_review_result "${tmp}/no-producers.json" > "${tmp}/no-producers-out.json"
  if ! grep -q 'No producers object on the review result' <<<"$(jq -r .body "${tmp}/no-producers-out.json")"; then
    echo "FAIL no-producers: missing producers footnote not rendered" >&2
    fail=1
  else
    echo "PASS missing producers object renders a Producers footnote"
  fi

  # An unavailable readiness check is an incomplete review, even when every
  # verification row passed. This is the shape the 51-minute smoke run hit: a
  # readiness check reported could-not-verify while confidence still claimed high.
  printf '%s' "{${common},\"findings\":[],\"checks\":[{\"id\":\"test-impact-review\",\"status\":\"could-not-verify\",\"summary\":\"CI host context was unavailable.\"}]}" > "${tmp}/unavailable-check.json"
  transform_review_result "${tmp}/unavailable-check.json" > "${tmp}/unavailable-check-out.json"
  if ! jq -e '.action == "comment" and .confidence.level == "medium" and (.confidence.why | contains("Test impact"))' "${tmp}/unavailable-check-out.json" >/dev/null; then
    echo "FAIL unavailable-check: confidence stayed high or approve was not refused" >&2
    fail=1
  elif ! jq -e '.inspected.could_not_verify | any(.[]; contains("Test impact"))' "${tmp}/unavailable-check-out.json" >/dev/null; then
    echo "FAIL unavailable-check: the limit was not recorded in inspected" >&2
    fail=1
  else
    echo "PASS unavailable readiness check caps confidence and is recorded"
  fi

  # A skipped producer cannot leave a passed check in place. result.producers
  # is the record of what ran; a schema-valid pass for an unrun check must not approve.
  printf '%s' "{${common},\"findings\":[],\"checks\":[{\"id\":\"pr-description-review\",\"status\":\"pass\",\"summary\":\"PR body is complete.\"},{\"id\":\"test-impact-review\",\"status\":\"pass\",\"summary\":\"Tests cover the change.\"}],\"producers\":{\"dispatched\":[\"test-impact-review\"],\"adapters\":[],\"skipped\":[{\"id\":\"pr-description-review\",\"reason\":\"not spawned\"}],\"returned\":[\"test-impact-review\"],\"raised\":{},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/skip-check.json"
  transform_review_result "${tmp}/skip-check.json" > "${tmp}/skip-check-out.json"
  if ! jq -e '.action == "comment" and .confidence.level == "medium" and ([.checks[] | select(.id == "pr-description-review") | .status] == ["could-not-verify"]) and ([.checks[] | select(.id == "test-impact-review") | .status] == ["pass"])' "${tmp}/skip-check-out.json" >/dev/null; then
    echo "FAIL skip-check: a skipped producer must not keep a passing check or approve" >&2
    fail=1
  elif ! grep -Fq '**Needs human judgment.**' <<<"$(jq -r .body "${tmp}/skip-check-out.json")"; then
    echo "FAIL skip-check: downgraded check must need a human" >&2
    fail=1
  else
    echo "PASS skipped producer cannot leave a passing check"
  fi

  # Provenance: result.producers drives the Producers table. Result counts
  # as-raised findings (even when survivors differ), and ## Findings uses survivors.
  printf '%s' "{${common},\"findings\":[{\"severity\":\"high\",\"category\":\"off-by-one\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"line\":3,\"description\":\"Out of bounds.\",\"why\":\"Index equals length.\",\"remediation\":\"Subtract one.\"}],\"producers\":{\"dispatched\":[\"correctness\",\"style-review\"],\"adapters\":[{\"id\":\"jira-snapshot\",\"status\":\"ok\"}],\"skipped\":[{\"id\":\"security\",\"reason\":\"no auth or secrets touched\"}],\"returned\":[\"correctness\",\"style-review\"],\"raised\":{\"correctness\":[{\"severity\":\"high\",\"category\":\"off-by-one\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"line\":3,\"description\":\"Out of bounds.\",\"why\":\"Index equals length.\",\"remediation\":\"Subtract one.\"}],\"style-review\":[{\"severity\":\"medium\",\"category\":\"bounds-check\",\"dimension\":\"style-review\",\"file\":\"a.ts\",\"line\":3,\"description\":\"Possible out-of-range access.\",\"why\":\"Same bounds issue.\"}]},\"challenger\":{\"status\":\"ran\",\"input\":2,\"kept\":1,\"removed\":1,\"merged\":0,\"downgraded\":0,\"removed_findings\":[{\"severity\":\"medium\",\"category\":\"bounds-check\",\"dimension\":\"style-review\",\"file\":\"a.ts\",\"line\":3,\"description\":\"Possible out-of-range access.\",\"why\":\"Same bounds issue.\",\"removal_reason\":\"duplicate of correctness off-by-one\"}]}}}" > "${tmp}/prov.json"
  transform_review_result "${tmp}/prov.json" > "${tmp}/prov-out.json"
  body=$(jq -r .body "${tmp}/prov-out.json")
  if ! grep -q '### Producers' <<<"${body}"; then
    echo "FAIL provenance: no Producers table" >&2
    fail=1
  elif ! grep -qE '^\| Correctness \| findings \| ✅ \| 1 finding: off-by-one' <<<"${body}"; then
    echo "FAIL provenance: as-raised Result missing for correctness" >&2
    fail=1
  elif ! grep -qE '^\| Style \| findings \| ✅ \| 1 finding: bounds-check' <<<"${body}"; then
    echo "FAIL provenance: as-raised Result must count findings later removed by challenger" >&2
    fail=1
  elif ! grep -qE '^\| Security \| findings \| ➖ \| no auth or secrets touched' <<<"${body}"; then
    echo "FAIL provenance: skipped producer missing its reason" >&2
    fail=1
  elif ! grep -q '`Correctness` · \*\*off-by-one\*\*' <<<"${body}"; then
    echo "FAIL provenance: finding does not name the producer that raised it" >&2
    fail=1
  elif ! grep -q '### High (1)' <<<"${body}"; then
    echo "FAIL provenance: severity heading missing count" >&2
    fail=1
  elif grep -qE '^\| challenger \|' <<<"${body}"; then
    echo "FAIL provenance: challenger must not appear in the Producers table" >&2
    fail=1
  elif ! grep -q '### Challenger' <<<"${body}" || ! grep -q 'Adjudicated 2 findings; kept 1 (removed 1)\.' <<<"${body}"; then
    echo "FAIL provenance: Challenger section missing or wrong prose" >&2
    fail=1
  elif ! grep -q 'Removed findings (audit only)' <<<"${body}"; then
    echo "FAIL provenance: removed-findings audit section missing" >&2
    fail=1
  elif ! grep -q 'Audit only — ignore for disposition' <<<"${body}"; then
    echo "FAIL provenance: audit disclaimer missing" >&2
    fail=1
  elif ! grep -q 'Removal reason: duplicate of correctness off-by-one' <<<"${body}"; then
    echo "FAIL provenance: removal_reason not rendered" >&2
    fail=1
  elif grep -q 'bounds-check' <<<"$(grep -A2 '## Findings' <<<"${body}")"; then
    echo "FAIL provenance: removed finding must not appear under ## Findings" >&2
    fail=1
  else
    echo "PASS as-raised Result + removed audit; survivors only in Findings"
  fi

  # Raised arrays are per producer id. Result uses raised, not survivor dimension stamps.
  printf '%s' "{${common},\"findings\":[{\"severity\":\"low\",\"category\":\"naming\",\"dimension\":\"correctness, style-review\",\"file\":\"a.ts\",\"description\":\"Shared naming nit.\"}],\"producers\":{\"dispatched\":[\"correctness\",\"style-review\"],\"adapters\":[],\"skipped\":[],\"returned\":[\"correctness\",\"style-review\"],\"raised\":{\"correctness\":[{\"severity\":\"low\",\"category\":\"naming\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"description\":\"Shared naming nit.\"},{\"severity\":\"low\",\"category\":\"off-by-one\",\"dimension\":\"correctness\",\"file\":\"b.ts\",\"description\":\"Index equals length.\"}],\"style-review\":[{\"severity\":\"low\",\"category\":\"naming\",\"dimension\":\"style-review\",\"file\":\"a.ts\",\"description\":\"Shared naming nit.\"}]},\"challenger\":{\"status\":\"ran\",\"input\":3,\"kept\":1,\"removed\":2,\"merged\":1,\"downgraded\":0,\"removed_findings\":[{\"severity\":\"low\",\"category\":\"naming\",\"dimension\":\"style-review\",\"file\":\"a.ts\",\"description\":\"Shared naming nit.\",\"removal_reason\":\"Merged into naming at a.ts\"},{\"severity\":\"low\",\"category\":\"off-by-one\",\"dimension\":\"correctness\",\"file\":\"b.ts\",\"description\":\"Index equals length.\",\"removal_reason\":\"removed by challenger\"}]}}}" > "${tmp}/merged.json"
  transform_review_result "${tmp}/merged.json" > "${tmp}/merged-out.json"
  body=$(jq -r .body "${tmp}/merged-out.json")
  if ! grep -qE '^\| Correctness \| findings \| ✅ \| 2 findings: naming, off-by-one' <<<"${body}"; then
    echo "FAIL raised-result: correctness as-raised counts wrong" >&2
    fail=1
  elif ! grep -qE '^\| Style \| findings \| ✅ \| 1 finding: naming' <<<"${body}"; then
    echo "FAIL raised-result: style-review as-raised counts wrong" >&2
    fail=1
  elif ! grep -q 'Merged into naming at a.ts' <<<"${body}"; then
    echo "FAIL raised-result: merge loser missing from audit" >&2
    fail=1
  elif jq -e '((.inspected.could_not_verify // []) | any(.[]; contains("does not match removed_findings")))' "${tmp}/merged-out.json" >/dev/null; then
    echo "FAIL raised-result: removed count must equal removed_findings length (incl. merge losers)" >&2
    fail=1
  else
    echo "PASS as-raised Result counts per producer; merge losers in audit"
  fi

  # Producers table rows are sorted alphabetically by Type, then Producer.
  printf '%s' "{${common},\"findings\":[],\"producers\":{\"dispatched\":[\"correctness\",\"test-impact-review\"],\"adapters\":[{\"id\":\"jira-snapshot\",\"status\":\"ok\"},{\"id\":\"coderabbit\",\"status\":\"ok\"}],\"skipped\":[{\"id\":\"security\",\"reason\":\"no auth or secrets touched\"},{\"id\":\"pr-description-review\",\"reason\":\"not spawned\"}],\"returned\":[\"correctness\",\"test-impact-review\"],\"raised\":{\"correctness\":[],\"coderabbit\":[]},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/producer-sort.json"
  transform_review_result "${tmp}/producer-sort.json" > "${tmp}/producer-sort-out.json"
  body=$(jq -r .body "${tmp}/producer-sort-out.json")
  got=$(awk -F '|' '/^\| Producer \| Type \|/{flag=1; next} flag && /^\| ---/{next} flag && /^\| /{gsub(/^ +| +$/,"",$2); gsub(/^ +| +$/,"",$3); print $3 " | " $2; next} {if(flag) exit}' <<<"${body}")
  want=$'check | PR description\ncheck | Test impact\ncontext | Jira\nfindings | CodeRabbit\nfindings | Correctness\nfindings | Security'
  if [[ "${got}" != "${want}" ]]; then
    echo "FAIL producer-sort: expected Type then Producer order, got:" >&2
    printf '%s\n' "${got}" >&2
    fail=1
  else
    echo "PASS producers table is sorted by Type then Producer"
  fi

  # Adapter status comes from result.producers.adapters, not collected.json.
  printf '%s' "{${common},\"findings\":[],\"producers\":{\"dispatched\":[\"correctness\"],\"adapters\":[{\"id\":\"jira-snapshot\",\"status\":\"none\",\"reason\":\"no-issue-key\"},{\"id\":\"coderabbit\",\"status\":\"ok\"}],\"skipped\":[],\"returned\":[\"correctness\"],\"raised\":{\"correctness\":[],\"coderabbit\":[]},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/adapter-status.json"
  transform_review_result "${tmp}/adapter-status.json" > "${tmp}/adapter-status-out.json"
  body=$(jq -r .body "${tmp}/adapter-status-out.json")
  if ! grep -qE '^\| Jira \| context \| ⚪ \| no issue key' <<<"${body}"; then
    echo "FAIL adapter-status: status=none adapter was not marked unavailable" >&2
    fail=1
  elif ! grep -qE '^\| CodeRabbit \| findings \| ✅ \| No findings\.' <<<"${body}"; then
    echo "FAIL adapter-status: status=ok findings adapter with empty findings should still show ran-clean" >&2
    fail=1
  elif ! grep -q '2 producer(s) ran, 1 unavailable' <<<"${body}"; then
    echo "FAIL adapter-status: review-details blurb should separate ran from unavailable" >&2
    fail=1
  else
    echo "PASS adapter status on result.producers distinguishes unavailable from ran-clean"
  fi

  printf '%s' "{${common},\"findings\":[],\"producers\":{\"dispatched\":[],\"adapters\":[{\"id\":\"coderabbit\",\"status\":\"error\",\"reason\":\"cli-unavailable\"}],\"skipped\":[],\"returned\":[],\"raised\":{},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/adapter-error.json"
  transform_review_result "${tmp}/adapter-error.json" > "${tmp}/adapter-error-out.json"
  body=$(jq -r .body "${tmp}/adapter-error-out.json")
  if ! grep -qE '^\| CodeRabbit \| findings \| ❌ \| cli unavailable' <<<"${body}"; then
    echo "FAIL adapter-error: status=error adapter was not marked errored" >&2
    fail=1
  else
    echo "PASS adapter error status on result renders as errored, not ran-clean"
  fi

  # Free-form reasons fall back to the status default; Result cells must not
  # break the table or close the host <details> block. Adapter status has no
  # snapshot text fields on the result.
  jq -n \
    --arg skip $'skip </details>\n| x' \
    --arg summary $'note </details>\n| x' \
    --argjson common "$(printf '{%s}' "${common}")" \
    '$common * {
      findings: [],
      checks: [{id:"pr-description-review",status:"warning",summary:$summary}],
      producers: {
        dispatched: ["pr-description-review"],
        adapters: [
          {id:"jira-snapshot",status:"ok"},
          {id:"coderabbit",status:"error",reason:"boom </details>"},
          {id:"other",status:"error",reason:"http-404"}
        ],
        skipped: [{id:"security",reason:$skip}],
        returned: ["pr-description-review"],
        raised: {},
        challenger: {status:"skipped",reason:"no findings to adjudicate"}
      }
    }' > "${tmp}/adapter-safe.json"
  transform_review_result "${tmp}/adapter-safe.json" > "${tmp}/adapter-safe-out.json"
  body=$(jq -r .body "${tmp}/adapter-safe-out.json")
  if grep -q 'boom' <<<"${body}"; then
    echo "FAIL adapter-safe: free-form reason reached the comment" >&2
    fail=1
  elif ! grep -qF '| Jira | context | ✅ | Context available. |' <<<"${body}"; then
    echo "FAIL adapter-safe: ok context adapter must use the fixed note" >&2
    fail=1
  elif ! grep -qF '| CodeRabbit | findings | ❌ | Adapter error. |' <<<"${body}"; then
    echo "FAIL adapter-safe: free-form error reason must use the status default" >&2
    fail=1
  elif ! grep -qE '^\| other \| [^|]+ \| ❌ \| http 404' <<<"${body}"; then
    echo "FAIL adapter-safe: token reason was not humanized" >&2
    fail=1
  elif ! grep -qF '| PR description | check | ✅ | warning — note &lt;/details> \| x |' <<<"${body}"; then
    echo "FAIL adapter-safe: check Result was not escaped" >&2
    fail=1
  elif ! grep -qF '| Security | findings | ➖ | skip &lt;/details> \| x |' <<<"${body}"; then
    echo "FAIL adapter-safe: skipped reason in Result was not escaped" >&2
    fail=1
  elif [[ "$(grep -c '</details>' <<<"${body}")" -ne 1 ]]; then
    echo "FAIL adapter-safe: a Result cell closed the host details block" >&2
    fail=1
  else
    echo "PASS adapter notes stay inside the table and omit free-form text"
  fi

  # Mixed kinds: check / signal / section Type + Result cells (not findings-shaped).
  printf '%s' "{${common},\"findings\":[],\"checks\":[{\"id\":\"test-impact-review\",\"status\":\"pass\",\"summary\":\"Selector tests cover the planner.\"}],\"product_ask\":{\"status\":\"aligned\"},\"risk\":{\"level\":\"high\",\"why\":\"Wide CI surface.\"},\"confidence\":{\"level\":\"medium\",\"why\":\"Unit evidence only.\"},\"producers\":{\"dispatched\":[\"correctness\",\"test-impact-review\",\"rating\",\"product-ask-review\"],\"adapters\":[],\"skipped\":[],\"returned\":[\"correctness\",\"test-impact-review\",\"rating\",\"product-ask-review\"],\"raised\":{\"correctness\":[]},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/mixed.json"
  transform_review_result "${tmp}/mixed.json" > "${tmp}/mixed-out.json"
  body=$(jq -r .body "${tmp}/mixed-out.json")
  if ! grep -qE '^\| Correctness \| findings \| ✅ \| No findings\.' <<<"${body}"; then
    echo "FAIL mixed-kind: findings producer Result wrong" >&2
    fail=1
  elif ! grep -qE '^\| Test impact \| check \| ✅ \| pass — Selector tests cover the planner\.' <<<"${body}"; then
    echo "FAIL mixed-kind: check Type/Result wrong" >&2
    fail=1
  elif ! grep -qE '^\| Rating \| signal \| ✅ \| risk high · confidence medium' <<<"${body}"; then
    echo "FAIL mixed-kind: signal Type/Result wrong" >&2
    fail=1
  elif ! grep -qE '^\| Product ask \| section \| ✅ \| product_ask aligned' <<<"${body}"; then
    echo "FAIL mixed-kind: section Type/Result wrong" >&2
    fail=1
  else
    echo "PASS mixed-kind producers render Type and Result by output kind"
  fi

  # removed count vs audit list mismatch surfaces a host warning.
  printf '%s' "{${common},\"findings\":[],\"producers\":{\"dispatched\":[\"correctness\"],\"adapters\":[],\"skipped\":[],\"returned\":[\"correctness\"],\"raised\":{\"correctness\":[]},\"challenger\":{\"status\":\"ran\",\"input\":1,\"kept\":0,\"removed\":2,\"merged\":0,\"downgraded\":0,\"removed_findings\":[{\"severity\":\"low\",\"category\":\"naming\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"description\":\"Nit.\",\"removal_reason\":\"noise\"}]}}}" > "${tmp}/mismatch.json"
  transform_review_result "${tmp}/mismatch.json" > "${tmp}/mismatch-out.json"
  if ! jq -e '.inspected.could_not_verify | any(.[]; contains("does not match removed_findings length"))' "${tmp}/mismatch-out.json" >/dev/null; then
    echo "FAIL removed-mismatch: host did not warn on count vs audit length" >&2
    fail=1
  else
    echo "PASS removed count mismatch is recorded"
  fi

  # Untrusted removed-finding fields must not close the audit <details> block.
  jq -n \
    --argjson common "$(printf '{%s}' "${common}")" \
    '$common * {
      findings: [],
      producers: {
        dispatched: ["correctness"],
        adapters: [],
        skipped: [],
        returned: ["correctness"],
        raised: {correctness: []},
        challenger: {
          status: "ran",
          input: 1,
          kept: 0,
          removed: 1,
          merged: 0,
          downgraded: 0,
          removed_findings: [{
            severity: "medium",
            category: "x </details>",
            dimension: "correctness",
            file: "a.ts",
            description: "desc </details>",
            why: "why </details>",
            removal_reason: "reason </details>"
          }]
        }
      }
    }' > "${tmp}/audit-escape.json"
  transform_review_result "${tmp}/audit-escape.json" > "${tmp}/audit-escape-out.json"
  body=$(jq -r .body "${tmp}/audit-escape-out.json")
  if grep -qF 'x </details>' <<<"${body}" || grep -qF 'desc </details>' <<<"${body}" || grep -qF 'why </details>' <<<"${body}" || grep -qF 'reason </details>' <<<"${body}"; then
    echo "FAIL audit-escape: raw </details> from a removed-finding field reached the comment" >&2
    fail=1
  elif ! grep -q '&lt;/details>' <<<"${body}"; then
    echo "FAIL audit-escape: removed-finding markup was not escaped" >&2
    fail=1
  elif [[ "$(grep -c '</details>' <<<"${body}")" -ne 2 ]]; then
    echo "FAIL audit-escape: expected only audit + review-details closers, not a field breakout" >&2
    fail=1
  else
    echo "PASS removed-finding audit fields are HTML-escaped"
  fi

  # Hostile dimension / file labels must not break the audit code span or <details>.
  # Unrecognized dimensions fall back to the finding's dimension string; file is
  # shown via render_location. Both are untrusted review data.
  jq -n \
    --argjson common "$(printf '{%s}' "${common}")" \
    '$common * {
      findings: [],
      producers: {
        dispatched: ["correctness"],
        adapters: [],
        skipped: [],
        returned: ["correctness"],
        raised: {correctness: []},
        challenger: {
          status: "ran",
          input: 1,
          kept: 0,
          removed: 1,
          merged: 0,
          downgraded: 0,
          removed_findings: [{
            severity: "medium",
            category: "x",
            dimension: "evil`</details>`",
            file: "path</details>`evil.ts",
            description: "desc",
            removal_reason: "merged"
          }]
        }
      }
    }' > "${tmp}/audit-label-escape.json"
  transform_review_result "${tmp}/audit-label-escape.json" > "${tmp}/audit-label-escape-out.json"
  body=$(jq -r .body "${tmp}/audit-label-escape-out.json")
  if grep -qF 'evil`</details>`' <<<"${body}" || grep -qF 'path</details>`evil.ts' <<<"${body}"; then
    echo "FAIL audit-label-escape: raw hostile dimension/file label reached the comment" >&2
    fail=1
  elif [[ "$(grep -c '</details>' <<<"${body}")" -ne 2 ]]; then
    echo "FAIL audit-label-escape: expected only audit + review-details closers" >&2
    fail=1
  elif ! grep -qF "evil'&lt;/details>'" <<<"${body}"; then
    echo "FAIL audit-label-escape: hostile dimension was not escaped into the code span" >&2
    fail=1
  elif ! grep -qF "path&lt;/details>'evil.ts" <<<"${body}"; then
    echo "FAIL audit-label-escape: hostile file label was not escaped" >&2
    fail=1
  else
    echo "PASS removed-finding dimension/file labels are escaped"
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

  # Unmet Jira criteria are not a sticky section. Product ask covers description↔Jira.
  printf '%s' "{${common},\"jira_criteria\":[{\"criterion\":\"Gate is present\",\"verdict\":\"MISS\",\"evidence\":\"No gate in diff.\"}]}" > "${tmp}/jira-miss.json"
  body=$(transform_review_result "${tmp}/jira-miss.json" | jq -r .body)
  if grep -q '### Jira acceptance criteria' <<<"${body}" || grep -q 'Gate is present' <<<"${body}"; then
    echo "FAIL jira-miss: Jira acceptance criteria must not render" >&2
    fail=1
  else
    echo "PASS Jira acceptance criteria are not rendered"
  fi

  # result.producers claiming an empty-set skip while findings exist is the exact
  # shape run 243 produced. The host must contradict it, not repeat it.
  printf '%s' "{${common},\"findings\":[{\"severity\":\"high\",\"category\":\"off-by-one\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"description\":\"Out of bounds.\",\"why\":\"undefined.\",\"remediation\":\"length - 1.\"}],\"producers\":{\"dispatched\":[\"correctness\"],\"adapters\":[],\"skipped\":[],\"returned\":[\"correctness\"],\"raised\":{\"correctness\":[{\"severity\":\"high\",\"category\":\"off-by-one\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"description\":\"Out of bounds.\",\"why\":\"undefined.\",\"remediation\":\"length - 1.\"}]},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/ch.json"
  transform_review_result "${tmp}/ch.json" > "${tmp}/ch-out.json"
  body=$(jq -r .body "${tmp}/ch-out.json")
  if ! grep -q 'result.producers records the challenger as skipped for an empty finding set' <<<"${body}"; then
    echo "FAIL challenger-contradiction: host repeated a producers claim the findings disprove" >&2
    fail=1
  elif ! jq -e '.confidence.level == "medium"' "${tmp}/ch-out.json" >/dev/null; then
    echo "FAIL challenger-contradiction: a self-contradicting producers record left confidence untouched" >&2
    fail=1
  else
    echo "PASS contradictory challenger record is reported and caps confidence"
  fi

  # An honest skip with a stated reason renders in the Challenger section.
  jq '.producers.challenger = {"status":"skipped","reason":"re-review, findings unchanged since prior run"}' \
    "${tmp}/ch.json" > "${tmp}/ch-ok.json"
  transform_review_result "${tmp}/ch-ok.json" > "${tmp}/ch-ok-out.json"
  if ! grep -q 'Skipped — re-review, findings unchanged since prior run\.' <<<"$(jq -r .body "${tmp}/ch-ok-out.json")"; then
    echo "FAIL challenger-reason: a stated skip reason was not rendered" >&2
    fail=1
  else
    echo "PASS challenger skip reason renders in its own section"
  fi

  # A producers.challenger never rewritten after collect is not the same as a skip.
  jq '.producers.challenger = {"status":"pending"}' "${tmp}/ch.json" > "${tmp}/ch-pending.json"
  transform_review_result "${tmp}/ch-pending.json" > "${tmp}/ch-p-out.json"
  if ! grep -q 'whether it ran is unknown' <<<"$(jq -r .body "${tmp}/ch-p-out.json")"; then
    echo "FAIL challenger-pending: an un-rewritten producers.challenger was read as a real state" >&2
    fail=1
  else
    echo "PASS un-rewritten challenger record is flagged, not believed"
  fi

  # Filtered adjudication prose.
  jq '.producers.challenger = {"status":"ran","input":7,"kept":4,"removed":2,"merged":1,"downgraded":0}' \
    "${tmp}/ch.json" > "${tmp}/ch-filter.json"
  transform_review_result "${tmp}/ch-filter.json" > "${tmp}/ch-filter-out.json"
  if ! grep -q 'Adjudicated 7 findings; kept 4 (removed 2, merged 1)\.' <<<"$(jq -r .body "${tmp}/ch-filter-out.json")"; then
    echo "FAIL challenger-filter: expected alteration summary" >&2
    fail=1
  else
    echo "PASS challenger section reports removals and merges"
  fi

  # Justified findings: challenger_action == justified items appear under
  # ## Findings → ### Justified, not in severity groups or removed audit.
  printf '%s' "{${common},\"findings\":[],\"producers\":{\"dispatched\":[\"correctness\"],\"adapters\":[],\"skipped\":[],\"returned\":[\"correctness\"],\"raised\":{\"correctness\":[{\"severity\":\"high\",\"category\":\"architecture\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"description\":\"Norm departure.\",\"why\":\"New pattern.\",\"remediation\":\"Follow existing.\"}]},\"challenger\":{\"status\":\"ran\",\"input\":1,\"kept\":0,\"removed\":1,\"merged\":0,\"downgraded\":0,\"removed_findings\":[{\"severity\":\"high\",\"category\":\"architecture\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"description\":\"Norm departure.\",\"why\":\"New pattern.\",\"removal_reason\":\"PR Justifications explain the architectural choice; diff confirms the new pattern is consistent.\",\"challenger_action\":\"justified\"}]}}}" > "${tmp}/justified.json"
  transform_review_result "${tmp}/justified.json" > "${tmp}/justified-out.json"
  body=$(jq -r .body "${tmp}/justified-out.json")
  if [[ "$(jq -r .action "${tmp}/justified-out.json")" != "approve" ]]; then
    echo "FAIL justified: justified-only findings must not block disposition" >&2
    fail=1
  elif ! grep -q '## Findings' <<<"${body}"; then
    echo "FAIL justified: justified items without survivors must still open ## Findings" >&2
    fail=1
  elif ! grep -q '### Justified (1)' <<<"${body}"; then
    echo "FAIL justified: ### Justified subheading missing or wrong count" >&2
    fail=1
  elif ! grep -q 'fullsend:justified-findings' <<<"${body}"; then
    echo "FAIL justified: HTML omit markers missing" >&2
    fail=1
  elif ! grep -q 'Justification:' <<<"${body}"; then
    echo "FAIL justified: challenger reason not rendered under Justified" >&2
    fail=1
  elif grep -q '### High' <<<"${body}"; then
    echo "FAIL justified: justified finding must not appear in severity groups" >&2
    fail=1
  elif grep -q 'Removed findings (audit only)' <<<"${body}"; then
    echo "FAIL justified: justified items must not appear in removed audit" >&2
    fail=1
  elif grep -q 'Looks good to me' <<<"${body}"; then
    echo "FAIL justified: justified-only must not render LGTM" >&2
    fail=1
  elif ! grep -q 'kept 0 (justified 1)' <<<"${body}"; then
    echo "FAIL justified: challenger prose must report justified, not removed" >&2
    fail=1
  else
    echo "PASS justified findings render under ### Justified, not severity groups or audit"
  fi

  # Mixed: survivors + justified should show both severity groups and ### Justified.
  printf '%s' "{${common},\"findings\":[{\"severity\":\"medium\",\"category\":\"bounds\",\"dimension\":\"correctness\",\"file\":\"b.ts\",\"description\":\"Off by one.\",\"why\":\"Index.\"}],\"producers\":{\"dispatched\":[\"correctness\"],\"adapters\":[],\"skipped\":[],\"returned\":[\"correctness\"],\"raised\":{\"correctness\":[{\"severity\":\"high\",\"category\":\"architecture\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"description\":\"Norm departure.\",\"why\":\"New pattern.\",\"remediation\":\"Follow existing.\"},{\"severity\":\"medium\",\"category\":\"bounds\",\"dimension\":\"correctness\",\"file\":\"b.ts\",\"description\":\"Off by one.\",\"why\":\"Index.\"}]},\"challenger\":{\"status\":\"ran\",\"input\":2,\"kept\":1,\"removed\":1,\"merged\":0,\"downgraded\":0,\"removed_findings\":[{\"severity\":\"high\",\"category\":\"architecture\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"description\":\"Norm departure.\",\"why\":\"New pattern.\",\"removal_reason\":\"Architecture justified per PR body.\",\"challenger_action\":\"justified\"}]}}}" > "${tmp}/justified-mixed.json"
  transform_review_result "${tmp}/justified-mixed.json" > "${tmp}/justified-mixed-out.json"
  body=$(jq -r .body "${tmp}/justified-mixed-out.json")
  if [[ "$(jq -r .action "${tmp}/justified-mixed-out.json")" != "request-changes" ]]; then
    echo "FAIL justified-mixed: surviving medium finding must still block" >&2
    fail=1
  elif ! grep -q '### Medium (1)' <<<"${body}"; then
    echo "FAIL justified-mixed: severity group missing for surviving finding" >&2
    fail=1
  elif ! grep -q '### Justified (1)' <<<"${body}"; then
    echo "FAIL justified-mixed: ### Justified subheading missing alongside severity groups" >&2
    fail=1
  else
    echo "PASS mixed survivors + justified both render under ## Findings"
  fi

  # Challenger prose must separate justified from noise-removal counts.
  printf '%s' "{${common},\"findings\":[],\"producers\":{\"dispatched\":[\"correctness\"],\"adapters\":[],\"skipped\":[],\"returned\":[\"correctness\"],\"raised\":{\"correctness\":[]},\"challenger\":{\"status\":\"ran\",\"input\":2,\"kept\":0,\"removed\":2,\"merged\":0,\"downgraded\":0,\"removed_findings\":[{\"severity\":\"high\",\"category\":\"architecture\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"description\":\"Norm departure.\",\"removal_reason\":\"Justified per PR body.\",\"challenger_action\":\"justified\"},{\"severity\":\"low\",\"category\":\"noise\",\"dimension\":\"correctness\",\"file\":\"b.ts\",\"description\":\"False positive.\",\"removal_reason\":\"Not reproducible.\"}]}}}" > "${tmp}/justified-prose.json"
  transform_review_result "${tmp}/justified-prose.json" > "${tmp}/justified-prose-out.json"
  if ! grep -q 'kept 0 (removed 1, justified 1)' <<<"$(jq -r .body "${tmp}/justified-prose-out.json")"; then
    echo "FAIL justified-prose: challenger summary must split removed vs justified" >&2
    fail=1
  else
    echo "PASS challenger prose separates justified from removed counts"
  fi

  # Hostile dimension / file labels in ### Justified must use code_span_text.
  jq -n \
    --argjson common "$(printf '{%s}' "${common}")" \
    '$common * {
      findings: [],
      producers: {
        dispatched: ["correctness"],
        adapters: [],
        skipped: [],
        returned: ["correctness"],
        raised: {correctness: []},
        challenger: {
          status: "ran",
          input: 1,
          kept: 0,
          removed: 1,
          merged: 0,
          downgraded: 0,
          removed_findings: [{
            severity: "medium",
            category: "architecture",
            dimension: "evil`</details>`",
            file: "path</details>`evil.ts",
            description: "Norm departure.",
            removal_reason: "Justified per PR body.",
            challenger_action: "justified"
          }]
        }
      }
    }' > "${tmp}/justified-label-escape.json"
  transform_review_result "${tmp}/justified-label-escape.json" > "${tmp}/justified-label-escape-out.json"
  body=$(jq -r .body "${tmp}/justified-label-escape-out.json")
  if grep -qF 'evil`</details>`' <<<"${body}" || grep -qF 'path</details>`evil.ts' <<<"${body}"; then
    echo "FAIL justified-label-escape: raw hostile dimension/file label reached the comment" >&2
    fail=1
  elif ! grep -q '### Justified (1)' <<<"${body}"; then
    echo "FAIL justified-label-escape: ### Justified section missing" >&2
    fail=1
  elif ! grep -qF "evil'&lt;/details>'" <<<"${body}"; then
    echo "FAIL justified-label-escape: hostile dimension was not escaped into the code span" >&2
    fail=1
  elif ! grep -qF "path&lt;/details>'evil.ts" <<<"${body}"; then
    echo "FAIL justified-label-escape: hostile file label was not escaped" >&2
    fail=1
  else
    echo "PASS justified finding dimension/file labels are escaped"
  fi

  # Mistagged justified protected-path must be restored into findings[] (host gate).
  jq -n \
    --argjson common "$(printf '{%s}' "${common}")" \
    '$common * {
      findings: [],
      producers: {
        dispatched: ["orchestrator"],
        adapters: [],
        skipped: [],
        returned: ["orchestrator"],
        raised: {orchestrator: []},
        challenger: {
          status: "ran",
          input: 1,
          kept: 0,
          removed: 1,
          merged: 0,
          downgraded: 0,
          removed_findings: [{
            severity: "medium",
            category: "protected-path",
            dimension: "orchestrator",
            file: ".github/workflows/ci.yaml",
            description: "Touches protected path.",
            why: "Human approval required.",
            removal_reason: "Author justified in PR body.",
            challenger_action: "justified"
          }]
        }
      }
    }' > "${tmp}/justified-pp.json"
  (
    export REVIEW_PROTECTED_PATHS=".github/,scripts/"
    export REVIEW_CHANGED_FILES=$'.github/workflows/ci.yaml\nsrc/app.ts'
    transform_review_result "${tmp}/justified-pp.json"
  ) > "${tmp}/justified-pp-out.json"
  body=$(jq -r .body "${tmp}/justified-pp-out.json")
  if [[ "$(jq -r .action "${tmp}/justified-pp-out.json")" != "comment" ]]; then
    echo "FAIL justified-pp: mistagged protected-path must not clear to approve" >&2
    fail=1
  elif ! jq -e '((.findings // []) | map(select(.category == "protected-path")) | length) == 1' "${tmp}/justified-pp-out.json" >/dev/null; then
    echo "FAIL justified-pp: protected-path must be restored into findings[]" >&2
    fail=1
  elif jq -e '((.findings // []) | map(select(has("challenger_action") or has("removal_reason"))) | length) > 0' "${tmp}/justified-pp-out.json" >/dev/null; then
    echo "FAIL justified-pp: restored findings must not carry audit-only keys" >&2
    fail=1
  elif ! python3 -c "
import json, sys
from jsonschema import Draft202012Validator
schema = json.load(open(sys.argv[1], encoding='utf-8'))
instance = json.load(open(sys.argv[2], encoding='utf-8'))
Draft202012Validator(schema).validate(instance)
" "${FULLSEND_CONFIG_DIR}/schemas/review-result.schema.json" "${tmp}/justified-pp-out.json"; then
    echo "FAIL justified-pp: transformed recovery result must be schema-valid" >&2
    fail=1
  elif grep -q '### Justified' <<<"${body}"; then
    echo "FAIL justified-pp: policy-protected justified must not render under ### Justified" >&2
    fail=1
  else
    echo "PASS mistagged justified protected-path is restored for host gate"
  fi

  # Mistagged justified approach-rejected must still reject.
  printf '%s' "{${common},\"findings\":[],\"producers\":{\"dispatched\":[\"intent-coherence\"],\"adapters\":[],\"skipped\":[],\"returned\":[\"intent-coherence\"],\"raised\":{\"intent-coherence\":[]},\"challenger\":{\"status\":\"ran\",\"input\":1,\"kept\":0,\"removed\":1,\"merged\":0,\"downgraded\":0,\"removed_findings\":[{\"severity\":\"high\",\"category\":\"approach-rejected\",\"dimension\":\"intent-coherence\",\"file\":\"a.ts\",\"description\":\"Wrong approach.\",\"why\":\"Product ask mismatch.\",\"remediation\":\"Align with the product ask.\",\"removal_reason\":\"Author justified.\",\"challenger_action\":\"justified\"}]}}}" > "${tmp}/justified-reject.json"
  transform_review_result "${tmp}/justified-reject.json" > "${tmp}/justified-reject-out.json"
  if [[ "$(jq -r .action "${tmp}/justified-reject-out.json")" != "reject" ]]; then
    echo "FAIL justified-reject: mistagged approach-rejected must still reject" >&2
    fail=1
  elif jq -e '((.findings // []) | map(select(has("challenger_action") or has("removal_reason"))) | length) > 0' "${tmp}/justified-reject-out.json" >/dev/null; then
    echo "FAIL justified-reject: restored findings must not carry audit-only keys" >&2
    fail=1
  elif ! python3 -c "
import json, sys
from jsonschema import Draft202012Validator
schema = json.load(open(sys.argv[1], encoding='utf-8'))
instance = json.load(open(sys.argv[2], encoding='utf-8'))
Draft202012Validator(schema).validate(instance)
" "${FULLSEND_CONFIG_DIR}/schemas/review-result.schema.json" "${tmp}/justified-reject-out.json"; then
    echo "FAIL justified-reject: transformed recovery result must be schema-valid" >&2
    fail=1
  elif grep -q '### Justified' <<<"$(jq -r .body "${tmp}/justified-reject-out.json")"; then
    echo "FAIL justified-reject: approach-rejected must not render under ### Justified" >&2
    fail=1
  else
    echo "PASS mistagged justified approach-rejected still rejects"
  fi

  # Every U+FE0F variation selector is stripped from the comment before it is
  # posted -- the live body carries none. A glyph that needs one to be coloured
  # (U+26A0 WARNING SIGN is the one that bit us) therefore renders monochrome on
  # GitHub no matter how the source is written. Every marker must be a character
  # that is emoji-presentation by default, so scan the rendered body rather than
  # trusting the marker tables.
  jq -r .body "${tmp}/ledger-out.json" "${tmp}/prov-out.json" \
      "${tmp}/request-changes-out.json" "${tmp}/structured-out.json" \
      "${tmp}/needs-human-out.json" \
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

# Sticky Ran/Result/Challenger audit come from result.producers only.
# producers.json is the orchestrator's working store; post-review does not
# read it or collected.json for the comment.

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

      # Drop the prior action/body so the re-render applies the protected-path gate.
      # REVIEW_FORCE_PROTECTED_PATH is what adds the TODO and refuses approve.
      MODIFIED_RESULT=$(mktemp)
      CLEANUP_FILES+=("${MODIFIED_RESULT}")
      jq 'del(.body, .action)' "${RESULT_FILE}" > "${MODIFIED_RESULT}"
      RERENDERED_RESULT=$(mktemp)
      CLEANUP_FILES+=("${RERENDERED_RESULT}")
      REVIEW_FORCE_PROTECTED_PATH="${_PROTECTED_LIST}" \
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
