#!/usr/bin/env bash
# Host post-script for the review agent: renders the sticky review comment and
# computes the review verdict on the runner, after the sandbox is destroyed.
#
# The sandbox runs the stock Fullsend pr-review skill, so agent-result.json
# follows the stock review-result schema. Its `action` and `body` are not
# used. What this script reads:
#   - agent-result.json: findings, head_sha, pr_number, repo, label_actions,
#     and `action: failure` with its `reason`.
#   - <iteration output>/odh/*.json: side files the dashboard personas write
#     (personas/README.md): the challenger audit, the rating and change
#     summary, the product-ask section and the readiness checks.
#   - <runDir>/personas.json: the runner's list of staged personas, and
#     <iteration>/transcripts/: one file per dispatched sub-agent.
#   - ${FULLSEND_CONFIG_DIR}/.run/collected.json: host adapter envelopes from
#     pre-review.sh (Jira status, CodeRabbit status and findings), and
#     .run/jira.json for trusted issue links.
#   - dimensions.json (producer labels, kinds, categories) and
#     rating-policy.json (verdict floors, caps and refuse lists).
#
# Flow: normalize_stock_result folds those inputs into one object
# (schemas/sticky-input.schema.json), the severity filter drops findings below
# the threshold, transform_review_result sets the action and renders the body,
# and `fullsend post-review` posts it.
#
# What the host decides:
#   1. The action, from findings, checks, risk, confidence and product ask
#      (blocking severities -> request-changes; human-judgment severities,
#      refused risk or confidence, a could-not-verify check, an errored host
#      adapter or a protected path -> comment; otherwise approve).
#   2. The sticky comment: change summary, status, signals, checks, findings
#      (with the Justified section), product ask, TODO and the collapsed
#      review details (producers table, challenger audit, evidence, labels).
#      File references link to the PR's Files changed view.
#   3. Inline review comments are suppressed: line numbers are removed from
#      the copy handed to the CLI.
#   4. The prior-findings marker (review-findings-v2) for the next run's
#      pre-script, in the stock field layout. Host adapter findings are left
#      out of it: their category is not one the stock pre-script accepts.
#   5. Outcome and contextual labels, the protected-path approve gate and the
#      stale-head re-dispatch.
#
# FULLSEND_CONFIG_DIR is made absolute because post_script runs with
# CWD=runDir. The host-adapter credentials that env.runner hands every host
# script are unset before any child starts; this script never reads them.
#
# Harness may fetch this script with sibling files in scripts/.
#
# Usage:
#   post-review.sh              # CI / harness post_script
#   post-review.sh --self-test  # local checks, no GitHub
#
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
# Optional environment variables:
#   FULLSEND_PERSONAS_FILE            — persona manifest path; default is
#                                       personas.json in runDir
#
# Exit codes:
#   0 — review posted
#   1 — error (review not posted, fallback comment posted, or the result's
#       action was "failure": the notice is published but the review did
#       not complete)
set -euo pipefail

# env.runner in harness/review.yaml gives every host-side script the
# host-adapter credentials. Only pre-review.sh uses them, so drop them before
# this script starts any child. Keep the list in step with env.runner.
unset CODERABBIT_API_KEY JIRA_URL JIRA_USERNAME JIRA_API_TOKEN

REVIEW_STICKY_MARKER='<!-- fullsend:review-agent -->'

# Resolve the config directory to an absolute path. The harness sets
# FULLSEND_DIR=.fullsend (relative) and runs post_script with CWD=runDir, so a
# bare relative value cannot find dimensions.json or .run/collected.json.
# Captured once at load time, before anything changes directory: BASH_SOURCE[0]
# is relative when the script is invoked by a relative path.
POST_REVIEW_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

resolve_fullsend_config_dir() {
  local script_dir candidate
  script_dir="$(cd "${POST_REVIEW_SCRIPT_DIR}/.." && pwd)"
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

# Build the sticky input (schemas/sticky-input.schema.json) that
# transform_review_result consumes, from what a run leaves on the host:
#   $1  agent-result.json in the stock review-result shape. Findings, head_sha,
#       pr_number, repo, reason and label_actions are used. The agent's action
#       and body are not: the host computes both. `action: failure` is kept so
#       the failure path still applies.
#   $2  the personas' side-file directory (<iteration output>/odh, see
#       personas/README.md): challenger.json, rating.json (which also holds
#       the change summary) and one <registry id>.json per check and section
#       row.
#   $3  the runner's persona manifest (personas.json), when there is one.
#   $4  the iteration's transcripts directory, when there is one. A file named
#       review-sub<N>-<persona>-<timestamp>… shows that persona was dispatched.
#   ${FULLSEND_CONFIG_DIR}/dimensions.json and .run/collected.json: the
#       producer registry and the host adapter envelopes (Jira, CodeRabbit).
#
# Side files are model output and are not validated by the runner. A missing
# or malformed one is treated as that persona not reporting: a check becomes
# could-not-verify, a missing rating becomes medium risk and low confidence,
# and neither can stop the review from being posted. CodeRabbit findings are merged as they
# are; they do not go through the challenger. The TODO list is built here from
# the normalized findings, checks, rating and product ask.
normalize_stock_result() {
  python3 - "$@" <<'PY'
import json, os, re, sys

SEVERITIES = ("critical", "high", "medium", "low", "info")
CHECK_STATUSES = ("pass", "fail", "warning", "not-applicable", "could-not-verify")
PA_STATUSES = ("none", "aligned", "mismatch-justified", "mismatch-unjustified")
ADAPTER_STATUSES = ("ok", "none", "skipped", "error")
ACTIONS = ("approve", "request-changes", "comment", "reject", "failure")
FAILURE_REASONS = ("tool-failure", "missing-context", "ambiguous-findings", "token-limit", "time-budget")
RISK_LEVELS = ("low", "medium", "high", "critical")
CONFIDENCE_LEVELS = ("low", "medium", "high")
CHALLENGER_ACTIONS = ("kept", "downgraded", "merged", "removed", "justified")
# Categories the stock orchestrator raises itself and never hands the challenger.
UNCHALLENGED_CATEGORIES = frozenset({
    "sub-agent-failure", "protected-path", "provenance-warning", "scope-authorization-implicit",
})
CHALLENGER_FAILURE_PREFIX = "The challenger sub-agent did not return findings:"
IMAGE_LIMIT_PREFIX = "Could not verify image evidence:"
CHANGE_SUMMARY_MAX = 500
NO_CHANGE_SUMMARY = "No change summary was recorded for this run."
FINDING_ID_RE = re.compile(r"f_[A-Za-z0-9]+")
DIMENSION_RE = re.compile(r"[a-z0-9][a-z0-9-]{0,63}")


def load_json(path):
    """Parsed JSON, or None when the file is absent or unreadable."""
    if not path or not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError, RecursionError):
        return None


def text(value):
    return value.strip() if isinstance(value, str) and value.strip() else ""


def positive_int(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, int) and value > 0:
        return value
    if isinstance(value, str) and re.fullmatch(r"[0-9]{1,9}", value.strip() or "x") and int(value) > 0:
        return int(value)
    return None


def clean_finding(raw, strict):
    """A finding reduced to the fields the sticky input allows.

    strict (side files, adapter envelopes): a finding without a valid
    severity, category or description is dropped. Otherwise (the agent
    result, already validated by the runner) a bad field is replaced so the
    finding still counts toward the verdict."""
    if not isinstance(raw, dict):
        return None
    severity = raw.get("severity").lower() if isinstance(raw.get("severity"), str) else ""
    category = text(raw.get("category"))
    description = text(raw.get("description"))
    if severity not in SEVERITIES:
        if strict:
            return None
        severity = "medium"
    if not category or not description:
        if strict:
            return None
        category = category or "uncategorized"
        description = description or "No description was recorded for this finding."
    out = {
        "severity": severity,
        "category": category,
        "file": text(raw.get("file")) or "N/A",
        "description": description,
    }
    line = positive_int(raw.get("line"))
    if line:
        out["line"] = line
    if text(raw.get("remediation")):
        out["remediation"] = raw["remediation"].strip()
    if isinstance(raw.get("actionable"), bool):
        out["actionable"] = raw["actionable"]
    if text(raw.get("dimension")):
        out["dimension"] = raw["dimension"].strip()
    if isinstance(raw.get("id"), str) and FINDING_ID_RE.fullmatch(raw["id"]):
        out["id"] = raw["id"]
    return out


def finding_dimensions(finding):
    """Persona ids on a finding; a merged finding lists several, comma-separated."""
    ids = []
    for part in (finding.get("dimension") or "").split(","):
        part = part.strip()
        if DIMENSION_RE.fullmatch(part) and part != "orchestrator" and part not in ids:
            ids.append(part)
    return ids


def is_challenger_failure(finding):
    return (finding.get("category") == "sub-agent-failure"
            and finding["description"].startswith(CHALLENGER_FAILURE_PREFIX))


def load_registry(config_dir):
    loaded = load_json(os.path.join(config_dir, "dimensions.json")) if config_dir else None
    rows = loaded.get("dimensions") if isinstance(loaded, dict) else None
    return [r for r in rows if isinstance(r, dict) and text(r.get("id"))] if isinstance(rows, list) else []


def output_kind(row):
    output = row.get("output") if isinstance(row.get("output"), str) else "findings"
    return output.split(":", 1)[0].strip().lower() or "findings"


def row_label(row):
    return text(row.get("label")) or row["id"]


def load_manifest(path):
    """Staged personas by name, or None when there is no valid manifest."""
    loaded = load_json(path)
    if not isinstance(loaded, dict) or loaded.get("version") != 1:
        return None
    personas = loaded.get("personas")
    if not isinstance(personas, list) or not personas:
        return None
    staged = {}
    for persona in personas:
        if not isinstance(persona, dict) or not text(persona.get("name")):
            return None
        staged[persona["name"].strip()] = persona
    return staged


def clean_rated(raw, levels):
    if not isinstance(raw, dict):
        return None
    level = raw.get("level").strip().lower() if isinstance(raw.get("level"), str) else ""
    why = text(raw.get("why"))
    if level not in levels or not why:
        return None
    return {"level": level, "why": why}


def clean_check(raw, check_id):
    """The check a persona reported, under its registry id."""
    check = raw.get("check") if isinstance(raw, dict) else None
    if not isinstance(check, dict):
        return None
    status = check.get("status") if isinstance(check.get("status"), str) else ""
    summary = text(check.get("summary"))
    if status not in CHECK_STATUSES or not summary:
        return None
    out = {"id": check_id, "status": status, "summary": summary}
    details = check.get("details")
    if isinstance(details, str):
        details = [details]
    if isinstance(details, list):
        kept = [d.strip() for d in details if text(d)]
        if kept:
            out["details"] = kept
    return out


def clean_pa_record(raw, with_key):
    if not isinstance(raw, dict) or raw.get("status") not in PA_STATUSES:
        return None
    out = {"status": raw["status"]}
    if with_key:
        if not isinstance(raw.get("key"), str) or not raw["key"].strip():
            return None
        out["key"] = raw["key"].strip()
        if isinstance(raw.get("url"), str):
            out["url"] = raw["url"]
    for field in ("aligned", "mismatched"):
        if isinstance(raw.get(field), list):
            out[field] = [item for item in raw[field] if isinstance(item, str)]
    for field in ("justified_in_description", "needs_human"):
        if isinstance(raw.get(field), bool):
            out[field] = raw[field]
    return out


def clean_product_ask(raw):
    section = raw.get("product_ask") if isinstance(raw, dict) else None
    out = clean_pa_record(section, with_key=False)
    if out is None:
        return None
    if isinstance(section.get("issues"), list):
        issues = [clean_pa_record(issue, with_key=True) for issue in section["issues"]]
        issues = [issue for issue in issues if issue]
        if issues:
            out["issues"] = issues
    return out


def clean_label_actions(raw):
    if not isinstance(raw, dict) or not text(raw.get("reason")) or not isinstance(raw.get("actions"), list):
        return None
    actions = [
        {"action": item["action"], "label": item["label"]}
        for item in raw["actions"]
        if isinstance(item, dict) and item.get("action") in ("add", "remove") and text(item.get("label"))
    ][:20]
    return {"reason": raw["reason"].strip(), "actions": actions} if actions else None


def trim_summary(value):
    """Change summary within the 500 characters the personas contract allows."""
    summary = " ".join(value.split())
    if len(summary) <= CHANGE_SUMMARY_MAX:
        return summary
    return summary[:CHANGE_SUMMARY_MAX - 1].rstrip() + "…"


def base_fields(result):
    out = {"schema_version": "3"}
    pr_number = positive_int(result.get("pr_number")) or positive_int(os.environ.get("PR_NUMBER"))
    if pr_number:
        out["pr_number"] = pr_number
    repo = text(result.get("repo")) or text(os.environ.get("REPO_FULL_NAME"))
    if repo:
        out["repo"] = repo
    if text(result.get("head_sha")):
        out["head_sha"] = result["head_sha"].strip()
    return out


def failure(result, reason):
    out = base_fields(result)
    out["action"] = "failure"
    out["reason"] = reason if reason in FAILURE_REASONS else "tool-failure"
    return out


TRANSCRIPT_RE = re.compile(r"review-sub[0-9]+-([a-z0-9][a-z0-9-]{0,63})-[0-9]{4}-[0-9]{2}-[0-9]{2}T")


def transcript_personas(path):
    """Personas with a sub-agent transcript, or None when that cannot be told."""
    try:
        names = os.listdir(path) if path and os.path.isdir(path) else []
    except OSError:
        names = []
    found = {m.group(1) for m in (TRANSCRIPT_RE.match(name) for name in names) if m}
    return found or None


def load_policy(config_dir):
    """The lists of rating-policy.json the TODO recipe needs, with the host defaults."""
    policy = {
        "blocking_finding_severities": ["critical", "high"],
        "exclude_blocking_categories": ["protected-path"],
        "human_judgment_finding_severities": ["medium"],
        "risk_refuse_approve": ["high", "critical"],
        "confidence_refuse_approve": ["low"],
    }
    loaded = load_json(os.path.join(config_dir, "rating-policy.json")) if config_dir else None
    for key in policy:
        if isinstance(loaded, dict) and isinstance(loaded.get(key), list):
            policy[key] = loaded[key]
    return {key: frozenset(str(v).lower() for v in values) for key, values in policy.items()}


def todo_text(value):
    flat = " ".join(str(value).split())
    return flat if len(flat) <= 300 else flat[:299].rstrip() + "…"


def build_todo(out, config_dir, labels):
    """The closed TODO recipe: findings, checks, judgement, nits."""
    policy = load_policy(config_dir)
    rank = {name: i for i, name in enumerate(("info", "low", "medium", "high", "critical"))}
    threshold = rank.get(os.environ.get("REVIEW_FINDING_SEVERITY_THRESHOLD") or "", 0)
    todo = []

    def add(category, value):
        item = {"category": category, "text": todo_text(value)}
        if item["text"] and item not in todo:
            todo.append(item)

    def where(finding):
        if finding["file"] == "N/A":
            return ""
        return finding["file"] + (f":{finding['line']}" if finding.get("line") else "") + ": "

    posted = [f for f in out["findings"] if rank[f["severity"]] >= threshold]
    for finding in posted:
        gated = policy["blocking_finding_severities"] | policy["human_judgment_finding_severities"]
        if finding["severity"] in gated and finding["category"].lower() not in policy["exclude_blocking_categories"]:
            add("findings", where(finding) + (finding.get("remediation") or finding["description"]))
    for check in out["checks"]:
        if check["status"] == "fail":
            add("checks", check["summary"])
    for check in out["checks"]:
        if check["status"] == "could-not-verify":
            add("judgement", f"Verify {labels.get(check['id'], check['id'])} by hand: {check['summary']}")
    if out["risk"]["level"] in policy["risk_refuse_approve"]:
        add("judgement", f"A human must decide whether to approve: risk is {out['risk']['level']}. {out['risk']['why']}")
    if out["confidence"]["level"] in policy["confidence_refuse_approve"]:
        add("judgement", f"A human must decide whether to approve: confidence is {out['confidence']['level']}. {out['confidence']['why']}")
    section = out.get("product_ask") or {}
    if section.get("needs_human") or (section.get("status") == "mismatch-unjustified" and "needs_human" not in section):
        add("judgement", "Decide whether the PR can go ahead although it does not match the linked issue (see Product ask).")
    for finding in posted:
        if finding["severity"] in ("low", "info") and finding.get("actionable") is True:
            add("nits", where(finding) + finding["description"])
    return todo


def normalize(result_path, side_dir, manifest_path, transcripts_dir):
    result = load_json(result_path)
    if not isinstance(result, dict):
        return failure({}, "tool-failure")
    if result.get("action") == "failure":
        return failure(result, result.get("reason"))

    config_dir = os.environ.get("FULLSEND_CONFIG_DIR") or ""
    registry = load_registry(config_dir)
    reviewer_rows = [r for r in registry if r.get("kind") != "cli-adapter"]
    adapter_rows = [r for r in registry if r.get("kind") == "cli-adapter"]
    staged = load_manifest(manifest_path)
    transcripts = transcript_personas(transcripts_dir)
    notes = []

    def side_file(name):
        """(parsed object or None, whether a file was there at all)."""
        path = os.path.join(side_dir, name + ".json") if side_dir else ""
        present = bool(path) and os.path.exists(path)
        loaded = load_json(path)
        return (loaded if isinstance(loaded, dict) else None), present

    out = base_fields(result)
    if result.get("action") in ACTIONS:
        out["action"] = result["action"]

    agent_findings = [f for f in (clean_finding(raw, strict=False)
                                  for raw in (result.get("findings") if isinstance(result.get("findings"), list) else []))
                      if f]
    challenger_failed = any(is_challenger_failure(f) for f in agent_findings)

    # Host adapters: status for every registry row, findings from the ones
    # that report findings.
    collected = load_json(os.path.join(config_dir, ".run", "collected.json")) if config_dir else None
    envelopes = {}
    for envelope in collected if isinstance(collected, list) else []:
        if isinstance(envelope, dict):
            key = text(envelope.get("id")) or text(envelope.get("dimension"))
            if key and key not in envelopes:
                envelopes[key] = envelope
    raised = {}
    adapters = []
    host_findings = []
    for row in adapter_rows:
        entry = {"id": row["id"]}
        envelope = envelopes.get(row["id"])
        status = envelope.get("status") if isinstance(envelope, dict) else None
        if isinstance(status, str) and status.strip().lower() in ADAPTER_STATUSES:
            entry["status"] = status.strip().lower()
            if isinstance(envelope.get("reason"), str):
                entry["reason"] = envelope["reason"]
        else:
            # No envelope (the pre-script ran no adapters, or not this one):
            # the adapter did not run. That is not an adapter error.
            entry.update(status="skipped", reason="not-run")
        adapters.append(entry)
        if entry.get("status") != "ok" or output_kind(row) != "findings":
            continue
        categories = [c for c in (row.get("categories") or []) if text(c)]
        mine = []
        for raw in envelope.get("findings") if isinstance(envelope.get("findings"), list) else []:
            finding = clean_finding(raw, strict=True)
            if not finding:
                continue
            if categories and finding["category"] not in categories:
                finding["category"] = categories[0]
            finding["dimension"] = row["id"]
            finding.pop("id", None)
            mine.append(finding)
        raised[row["id"]] = mine
        host_findings += mine

    # Challenger audit.
    audit, audit_present = side_file("challenger")
    as_raised = None
    adjudicated = None
    if audit and isinstance(audit.get("as_raised"), list) and isinstance(audit.get("adjudicated"), list):
        as_raised = [f for f in (clean_finding(raw, strict=True) for raw in audit["as_raised"]) if f]
        adjudicated = []
        for raw in audit["adjudicated"]:
            finding = clean_finding(raw, strict=True)
            action = raw.get("challenger_action") if isinstance(raw, dict) else None
            if finding and action in CHALLENGER_ACTIONS:
                # A merged entry with merged_into was absorbed into another
                # finding; the one without it is the survivor.
                if action == "merged" and not isinstance(raw.get("merged_into"), dict):
                    action = "merged-survivor"
                adjudicated.append((finding, action, text(raw.get("challenger_reason"))))
    # Readiness checks, product ask and rating, each from its persona's side file.
    reported = set()
    checks = []
    summary = ""
    rating_row = False
    for row in reviewer_rows:
        kind = output_kind(row)
        if kind == "findings":
            continue
        loaded, present = side_file(row["id"])
        label = row_label(row)
        problem = (f"{label} wrote a result the host could not read." if present
                   else f"{label} did not report a result for this run.")
        if kind == "check":
            check = clean_check(loaded, row["id"])
            if check:
                reported.add(row["id"])
                notes += [d for d in check.get("details", []) if d.startswith(IMAGE_LIMIT_PREFIX)]
            else:
                check = {"id": row["id"], "status": "could-not-verify", "summary": problem}
            checks.append(check)
        elif kind == "section":
            section = clean_product_ask(loaded)
            if section:
                reported.add(row["id"])
                out["product_ask"] = section
            else:
                notes.append(problem)
        elif kind == "signal":
            rating_row = True
            risk = clean_rated((loaded or {}).get("risk"), RISK_LEVELS)
            confidence = clean_rated((loaded or {}).get("confidence"), CONFIDENCE_LEVELS)
            summary = text((loaded or {}).get("change_summary"))
            if risk or confidence:
                reported.add(row["id"])
            if not (risk and confidence):
                notes.append(problem if not (risk or confidence)
                             else f"{label} reported only part of its result.")
            out["risk"] = risk or {
                "level": "medium", "why": f"{label} did not report a risk level; medium is assumed."}
            # Low is the level the policy refuses to approve.
            out["confidence"] = confidence or {
                "level": "low", "why": f"{label} did not report a confidence level; low is assumed."}
    if not rating_row:
        out["risk"] = {"level": "medium", "why": "No rating reviewer is registered; medium is assumed."}
        out["confidence"] = {"level": "low", "why": "No rating reviewer is registered; low is assumed."}
    out["change_summary"] = trim_summary(summary) if summary else NO_CHANGE_SUMMARY
    out["checks"] = checks

    # A persona that reports only through a side file returns no findings. If
    # the orchestrator recorded that as a failure although the side file is
    # there and valid, the persona ran: drop the failure finding.
    agent_findings = [
        f for f in agent_findings
        if not (f["category"] == "sub-agent-failure" and f["severity"] == "info"
                and finding_dimensions(f) and all(d in reported for d in finding_dimensions(f)))
    ]
    failed_dimensions = set()
    for finding in agent_findings:
        if finding["category"] == "sub-agent-failure":
            failed_dimensions.update(finding_dimensions(finding))

    # As-raised findings per persona: the challenger's record where it has one,
    # plus surviving findings it never saw (the stock orchestrator withholds
    # low and info findings from a large challenger input).
    reviewer_raised = {}
    seen = set()
    for finding in as_raised or []:
        for dim in finding_dimensions(finding):
            reviewer_raised.setdefault(dim, []).append(finding)
            seen.add((dim, finding["category"], finding["file"], finding.get("line")))
    for finding in agent_findings:
        if finding["category"] == "sub-agent-failure":
            continue
        for dim in finding_dimensions(finding):
            if (dim, finding["category"], finding["file"], finding.get("line")) not in seen:
                reviewer_raised.setdefault(dim, []).append(finding)

    challengeable = [f for f in agent_findings if f["category"] not in UNCHALLENGED_CATEGORIES]
    if challenger_failed:
        challenger = {"status": "failed"}
    elif adjudicated is not None:
        count = lambda *actions: sum(1 for _, action, _ in adjudicated if action in actions)
        removed = []
        for finding, action, reason in adjudicated:
            if action in ("removed", "justified"):
                entry = dict(finding)
                entry.pop("id", None)
                entry["challenger_action"] = action
                if reason:
                    entry["removal_reason"] = reason
                removed.append(entry)
        challenger = {
            "status": "ran",
            "input": len(as_raised),
            "kept": count("kept", "merged-survivor"),
            "removed": len(removed),
            "merged": count("merged"),
            "downgraded": count("downgraded"),
            "removed_findings": removed,
        }
    elif audit_present:
        # A file was written, so the challenger ran; its counts are unusable.
        challenger = {"status": "ran"}
        notes.append("The challenger's audit could not be read, so what it removed or justified is not shown.")
    elif not challengeable:
        challenger = {"status": "skipped", "reason": (
            "no reviewer findings to adjudicate (host adapter findings are not challenged)"
            if host_findings else "no findings to adjudicate")}
    else:
        challenger = {"status": "skipped", "reason": (
            "no challenger audit was recorded (low time budget, or the audit was not written)")}
        notes.append("No challenger audit was recorded, so the findings are shown as the reviewers raised them.")

    # Producers table: who ran, who did not, and why.
    dispatched = []
    skipped = []
    known = [row["id"] for row in reviewer_rows]
    extra = [name for name, persona in (staged or {}).items()
             if persona.get("role") == "dimension" and name not in known]
    extra += [dim for dim in reviewer_raised if dim not in known and dim not in extra
              and dim not in raised]
    for row in reviewer_rows + [{"id": name} for name in extra]:
        rid = row["id"]
        kind = output_kind(row)
        if rid in failed_dimensions:
            skipped.append({"id": rid, "reason": "did not return a result (sub-agent failure)"})
        elif kind != "findings":
            if rid in reported:
                dispatched.append(rid)
            elif transcripts is not None and rid in transcripts:
                skipped.append({"id": rid, "reason": "ran but did not report"})
            else:
                skipped.append({"id": rid, "reason": "did not report"})
        elif rid in reviewer_raised or (transcripts is not None and rid in transcripts):
            dispatched.append(rid)
            raised[rid] = reviewer_raised.get(rid, [])
        elif staged is not None and rid not in staged:
            skipped.append({"id": rid, "reason": "not staged for this run"})
        elif transcripts is not None:
            # Transcripts name every dispatched persona, so this one was not.
            skipped.append({"id": rid, "reason": "not selected"})
        elif staged is not None and staged[rid].get("always") is True:
            dispatched.append(rid)
            raised[rid] = []
        else:
            skipped.append({"id": rid, "reason": "no findings or not selected"})

    out["findings"] = agent_findings + host_findings
    out["producers"] = {
        "dispatched": dispatched,
        "adapters": adapters,
        "skipped": skipped,
        "raised": raised,
        "challenger": challenger,
    }
    if notes:
        out["inspected"] = {"could_not_verify": notes}
    todo = build_todo(out, config_dir, {row["id"]: row_label(row) for row in registry})
    if todo:
        out["todo"] = todo
    labels = clean_label_actions(result.get("label_actions"))
    if labels:
        out["label_actions"] = labels
    return out


try:
    args = sys.argv[1:] + ["", "", "", ""]
    normalized = normalize(args[0], args[1], args[2], args[3])
except Exception as exc:  # A normalizer fault must still post a notice.
    sys.stderr.write(f"::warning::Review result could not be normalized ({type(exc).__name__}); posting a failure notice\n")
    normalized = {"schema_version": "3", "action": "failure", "reason": "tool-failure"}
json.dump(normalized, sys.stdout, indent=2)
sys.stdout.write("\n")
PY
}

# $1 = path to a sticky input (normalize_stock_result output). Writes it back
# with the host-computed action and the rendered comment body.
transform_review_result() {
  python3 - "$1" <<'PY'
import hashlib, json, os, re, sys
from datetime import datetime, timezone
from urllib.parse import quote, urlsplit

JIRA_KEY_RE = re.compile(r"[A-Z][A-Z0-9]+-\d+")

# Host policy: .fullsend/rating-policy.json (floors/caps/refuse lists only).
# Judgment criteria live in the rating skill — not here.
DEFAULT_POLICY = {
    "blocking_finding_severities": ["critical", "high"],
    "exclude_blocking_categories": ["protected-path"],
    # Below the blocking bar, these severities still defer to a human
    # instead of approving. Empty the list to let them ride with approve.
    "human_judgment_finding_severities": ["medium"],
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
    merged["_human_judgment_severities"] = _lower_set(
        merged.get("human_judgment_finding_severities"))
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

def is_human_judgment_finding(finding):
    """A below-bar finding that still defers to a human."""
    cat = (finding.get("category") or "").lower()
    if cat in POLICY["_exclude_categories"]:
        return False
    return (finding.get("severity") or "").lower() in POLICY["_human_judgment_severities"]

def is_actionable_nit(finding):
    severity = (finding.get("severity") or "info").lower()
    return severity in ("low", "info") and bool(finding.get("actionable"))

def blocking_count(result):
    return sum(1 for finding in (result.get("findings") or []) if is_blocking(finding))

def human_judgment_findings(result):
    """Non-excluded findings at a human-judgment severity."""
    return [f for f in (result.get("findings") or []) if is_human_judgment_finding(f)]

def human_judgment_needed(result):
    """True when below-bar findings must yield comment instead of approve."""
    return bool(human_judgment_findings(result))

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
    if errored_adapters(result):
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

def errored_adapters(result):
    """Adapters that reported status=error, as "<Label> (<reason>)" notes."""
    producers = producers_block(result)
    notes = []
    for item in (producers or {}).get("adapters") or []:
        if isinstance(item, dict) and str(item.get("status") or "").strip().lower() == "error":
            name = result_label(item.get("id") or "adapter")
            notes.append(f"{name} ({adapter_reason(item) or 'adapter error'})")
    return notes

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
    path = os.environ.get("REVIEW_CHANGED_FILES_FILE") or ""
    if path and os.path.isfile(path):
        try:
            with open(path, encoding="utf-8") as fh:
                raw = fh.read()
        except OSError:
            pass
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
    establish its result. An errored adapter is also incomplete."""
    names = []
    for check in checks_with_status(result, "could-not-verify"):
        names.append(result_label(check.get("id") or "readiness check"))
    names.extend(errored_adapters(result))
    producers = producers_block(result)
    if producers is not None and challenger_problem(challenger_record(producers), result.get("findings") or []):
        names.append("challenger (its skip state contradicts the reported findings)")
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
        if is_blocking(finding) or is_human_judgment_finding(finding):
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
    if human_judgment_needed(result):
        return "comment", "human-judgment-findings"
    refuse = approve_refuse_reason(result)
    if refuse == "risk":
        return "comment", "risk-blocks-approve"
    if refuse == "confidence":
        return "comment", "low-confidence"
    if needs_human(result):
        return "comment", "needs-human"
    return "approve", "no-blocking-findings"

def compute_product_ask_overall(result):
    """Overwrite top-level product_ask.status from per-issue statuses when issues[] is present."""
    pa = result.get("product_ask")
    if not isinstance(pa, dict):
        return result
    issues = pa.get("issues")
    if not isinstance(issues, list) or not issues:
        return result
    rank = {"mismatch-unjustified": 3, "mismatch-justified": 2, "aligned": 1, "none": 0}
    best = 0
    any_human = False
    any_justified = False
    for issue in issues:
        s = issue.get("status") or "none"
        best = max(best, rank.get(s, 0))
        if issue.get("needs_human"):
            any_human = True
        if issue.get("justified_in_description"):
            any_justified = True
    reverse = {v: k for k, v in rank.items()}
    pa["status"] = reverse.get(best, "none")
    if any_human:
        pa["needs_human"] = True
    if any_justified:
        pa["justified_in_description"] = True
    return result


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
            f"{result_label(check.get('id') or 'readiness check')}: "
            f"{check.get('summary') or 'could not be verified'}"
        )
        if note not in could_not_verify:
            could_not_verify.append(note)
    for note in errored_adapters(result):
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

def escape_link_syntax(text):
    """Escape backslashes and brackets so Markdown renders them literally."""
    return text.replace("\\", "\\\\").replace("[", "\\[").replace("]", "\\]")

def repo_relative_path(path):
    """Diff-anchor path: repo-relative, no leading slash or ./ prefix.

    .lstrip("./") would eat the dot in .github/x.yml, so strip explicitly.
    """
    p = (path or "").strip()
    while p.startswith("./"):
        p = p[2:]
    return p.lstrip("/")

def render_location(result, finding, server_url):
    path = (finding.get("file") or "").strip()
    line = finding.get("line")
    label = f"{path}:{line}" if line else path
    # Finding file labels are untrusted; escape HTML (and backticks when the
    # label is shown in a code span) so they cannot break sticky <details>.
    safe_display = code_span_text(label)
    repo = (result.get("repo") or os.environ.get("GITHUB_REPOSITORY") or "").strip("/")
    sha = (result.get("head_sha") or "").strip()
    pr_number = str(result.get("pr_number") or os.environ.get("PR_NUMBER") or "").strip()
    if not path or path.lower() == "n/a" or not repo:
        return f"`{safe_display}`"
    link_label = escape_link_syntax(safe_display)
    # Only an ASCII line number can form a GitHub line anchor.
    line_suffix = str(line).strip() if line else ""
    if not re.fullmatch(r"[0-9]+", line_suffix):
        line_suffix = ""
    if pr_number:
        # PR-scoped diff anchor — the destination inline review comments use.
        # A commit-pinned /blob/ URL is not the PR diff: when the head commit
        # is not on a branch in this repo (fork PR head, force-push), GitHub
        # warns "This commit does not belong to any branch..." and the reader
        # leaves the review flow. `diff-` is the SHA256 of the repo-relative
        # path; R is the post-image (right) side. Files that are not part of
        # the PR diff have no anchor, so GitHub lands at the top of the diff.
        anchor = "diff-" + hashlib.sha256(
            repo_relative_path(path).encode("utf-8")
        ).hexdigest()
        target = f"{server_url.rstrip('/')}/{repo}/pull/{pr_number}/changes#{anchor}"
        if line_suffix:
            target += f"R{line_suffix}"
    elif sha:
        # No PR context: keep the commit-pinned file view.
        target = (
            f"{server_url.rstrip('/')}/{repo}/blob/{sha}/"
            f"{quote(repo_relative_path(path), safe='/')}"
        )
        if line_suffix:
            target += f"#L{line_suffix}"
    else:
        return f"`{safe_display}`"
    return f"[{link_label}]({target})"

def clean(text):
    # Normalize every line ending to LF first: GitHub treats a bare CR as a
    # line ending, so a value that reaches a renderer before flattening could
    # otherwise start a new Markdown block.
    return suppress_mentions(
        str(text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    )

def render_remediation(text):
    """A one-line remediation stays inline; a patch snippet gets a fenced block.

    CodeRabbit's suggestions[] are code, so flattening them to one bullet makes
    them unreadable. List continuation needs four-space indentation, and the
    fence is padded past any backticks inside the snippet.
    """
    body = clean(text)
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

    clean() normalizes line endings and strips @mentions. Neutralize HTML so
    a field cannot close the host <details> block; flatten newlines so a
    value cannot inject headings or extra list items.
    """
    return clean(text).replace("\n", " ").replace("<", "&lt;")

def markdown_prose(text):
    """Agent/Jira-echoed prose that may keep newlines and Markdown styling.

    Strips HTML comments (concealment) before clean()/mention suppression so
    values like `@<!-- conceal -->org/team` cannot reassemble into a live
    mention. Escapes raw `<` (no HTML expected) and keeps newlines so
    multi-line Markdown remains readable. Unlike inline_text(), does not
    flatten newlines.
    """
    stripped = re.sub(r"<!--.*?-->", "", str(text or ""), flags=re.S)
    return clean(stripped).replace("<", "&lt;")

def prose_bullet_lines(items):
    """Render prose array items as Markdown bullets with indented continuations."""
    lines = []
    for item in items:
        body = markdown_prose(item)
        if not body:
            continue
        first, *rest = body.split("\n")
        lines.append(f"- {first}")
        lines.extend(f"  {cont}" if cont.strip() else "" for cont in rest)
    return lines

def label_text(text):
    """Registry label or id as literal Markdown.

    Ids are result data; flattening and escaping link syntax keeps a forged
    id from adding blocks or becoming a bot-authored link."""
    return escape_link_syntax(inline_text(text))

def result_label(dim_id):
    """Display label for a result-authored registry id."""
    return label_text(dimension_label(dim_id))

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
    # No `<!-- fullsend:review-agent -->` line here: `fullsend post-review`
    # adds that marker itself and, from v0.48, HTML-escapes any other
    # `<!-- fullsend:` comment in the body, so a copy here shows as text.
    lines = [
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

# Raised by the orchestrator after the step 6d skip decision (step 6e, and the
# step 7 provenance warning), so they cannot disprove an empty-set skip.
ORCHESTRATOR_ONLY_CATEGORIES = frozenset({"protected-path", "provenance-warning"})

def challengeable(findings):
    """Findings step 6d could have handed the challenger."""
    kept = []
    for finding in findings:
        if not isinstance(finding, dict):
            continue
        if str(finding.get("category") or "").lower() in ORCHESTRATOR_ONLY_CATEGORIES:
            continue
        if producer_ids(finding) == ["orchestrator"]:
            continue
        kept.append(finding)
    return kept

def challenger_problem(ch, findings):
    """Confidence/limit note when the challenger record contradicts itself.

    Wording is PR-facing: no schema or field-name jargon."""
    status = str(ch.get("status") or "").strip().lower()
    reason = clean(ch.get("reason") or "")
    if status == "pending":
        return 'Challenger status is still pending, so whether it ran is unknown.'
    findings = challengeable(findings)
    if status == "skipped" and claims_empty_skip(reason) and findings:
        count = len(findings)
        return (f"Challenger was marked skipped with no findings to adjudicate, but {count} "
                f"finding(s) were reported. The real reason it skipped was not recorded.")
    return None

def challenger_prose(result):
    producers = producers_block(result)
    findings = result.get("findings") or []
    if producers is None:
        return "Challenger state is unverified — producer run details are missing from the review result."
    ch = challenger_record(producers)
    status = str(ch.get("status") or "").strip().lower()
    if not status:
        return "Challenger state was not recorded."
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
    """Render ### Justified under ## Findings.

    Heading-delimited on purpose. `fullsend post-review` runs agent-authored
    bodies through upstream's NeutralizeMarkers, which HTML-escapes every
    `<!-- fullsend:` opener, so an HTML comment wrapper would surface as
    visible text in the sticky. Readers find these items by the
    `### Justified (N)` heading.
    """
    items = justified_findings(result)
    if not items:
        return []
    run_url = os.environ.get("GITHUB_SERVER_URL", "https://github.com")
    lines = [
        "",
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
    shown = result_label(name)
    typ = dimension_type(name)
    if not isinstance(envelope, dict) or "status" not in envelope:
        return (shown, typ, "❔", "adapter status missing")
    status = str(envelope.get("status") or "").strip().lower()
    reason = adapter_reason(envelope)
    if status == "ok":
        res = producer_result(name, result, review_checks, kind=typ)
        return (shown, typ, "✅", res)
    if status in ("none", "skipped"):
        default = "No usable adapter context." if status == "none" else "Adapter skipped."
        return (shown, typ, "⚪", reason or default)
    if status == "error":
        return (shown, typ, "❌", reason or "Adapter error.")
    return (shown, typ, "❔", reason or f"Unrecognized adapter status: {status or 'missing'}")

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
                result_label(name),
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
                result_label(row["id"]),
                dimension_type(row["id"]),
                "➖",
                reason,
            ))
    rows.sort(key=lambda r: ((r[1] or "").casefold(), (r[0] or "").casefold()))
    return rows, True

def status_headline(result, action):
    """Visible status line: icon + bold label + remainder."""
    errs = errored_adapters(result)
    incomplete = inline_text(", ".join(errs)) if errs else ""
    incomplete_note = (
        f" Review incomplete — {incomplete}. Retry or escalate." if errs else ""
    )
    if action == "request-changes":
        return (f"{mark(ACTION_MARK, action)} **Waiting on author** — "
                f"{author_wait_detail(result)}{incomplete_note}")
    if action == "comment" and errs:
        return f"{mark(ACTION_MARK, action)} **Review incomplete** — {incomplete}. Retry or escalate."
    if action == "comment" and human_judgment_needed(result):
        count = len(human_judgment_findings(result))
        noun = "finding" if count == 1 else "findings"
        return (f"{mark(ACTION_MARK, action)} **Needs human judgment** — "
                f"{count} non-blocking {noun}. Human still finalizes.")
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
        return f"{mark(ACTION_MARK, action)} **Approach rejected.**{incomplete_note}"
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
            f"| {table_cell(result_label(check.get('id')))} | {mark(STATUS_MARK, status)} {table_cell(status)} "
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
        lines += ["", label] + [f"- {inline_text(text)}" for text in items]
    return lines

def _pa_status_line(label, record, suffix=""):
    status = record.get("status") or "none"
    human = " · needs human review" if record.get("needs_human") else ""
    return f"**{label}:** `{clean(status)}`{human}{suffix}"


def load_trusted_jira_context():
    """URLs, failed fetches, and omitted keys from the host Jira snapshot."""
    empty = {"urls": {}, "failed": [], "omitted": []}
    config_dir = os.environ.get("FULLSEND_CONFIG_DIR") or ""
    if not config_dir:
        return empty
    path = os.path.join(config_dir, ".run", "jira.json")
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError, TypeError):
        return empty
    if not isinstance(data, dict):
        return empty

    issues = data.get("issues")
    if not isinstance(issues, list):
        issues = []

    entries = []
    if data.get("key"):
        entries.append(data)
    entries.extend(issue for issue in issues if isinstance(issue, dict))
    urls = {
        str(issue.get("key")): str(issue.get("url") or "")
        for issue in entries
        if issue.get("key")
    }

    failed = []
    seen_failed = set()
    for issue in issues:
        if not isinstance(issue, dict) or issue.get("status") != "error":
            continue
        key = str(issue.get("key") or "").strip()
        if not key or key in seen_failed:
            continue
        seen_failed.add(key)
        failed.append({
            "key": key,
            "reason": str(issue.get("reason") or "error"),
        })

    omitted = []
    seen_omitted = set()
    raw_omitted = data.get("omitted_keys")
    if isinstance(raw_omitted, list):
        for item in raw_omitted:
            key = str(item or "").strip()
            if not key or key in seen_omitted:
                continue
            seen_omitted.add(key)
            omitted.append(key)

    return {"urls": urls, "failed": failed, "omitted": omitted}


TRUSTED_JIRA = load_trusted_jira_context()
TRUSTED_JIRA_ISSUES = TRUSTED_JIRA["urls"]


def trusted_jira_issue_url(key):
    url = TRUSTED_JIRA_ISSUES.get(key, "")
    if not url:
        return ""
    parsed = urlsplit(url)
    expected_path = f"/browse/{quote(key, safe='')}"
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path != expected_path
        or parsed.query
        or parsed.fragment
    ):
        return ""
    return url


def _pa_key_label(key):
    """Safe label for a trusted Jira key. Invalid shapes are omitted, never echoed."""
    key = str(key or "").strip()
    if not key or not JIRA_KEY_RE.fullmatch(key):
        return ""
    url = trusted_jira_issue_url(key)
    return f"[{key}]({url})" if url else f"`{code_span_text(key)}`"


class PaIssueKeyResolver:
    """Map untrusted issues[] entries onto keys from the host Jira snapshot.

    Match a well-formed key, then its URL. Fall back to a lone unclaimed
    snapshot key only when the snapshot holds a single distinct key, key-only
    failure entries included, and the reported key is unusable, so masked or
    truncated metadata still renders. A well-formed key that contradicts an
    existing snapshot is never swapped for a different issue, a key absent
    from an existing snapshot is never published even when it is well formed,
    and a key outside ``JIRA_KEY_RE`` is never returned.
    """

    def __init__(self):
        # Every well-formed key in the snapshot, including key-only entries
        # whose fetch failed, so snapshot absence stays distinguishable from
        # the absence of URL-bearing keys.
        self.snapshot_keys = {
            key for key in TRUSTED_JIRA_ISSUES if JIRA_KEY_RE.fullmatch(key)
        }
        # URL-bearing snapshot keys, the only candidates for URL recovery.
        self.url_keys = [
            key for key in TRUSTED_JIRA_ISSUES
            if JIRA_KEY_RE.fullmatch(key) and trusted_jira_issue_url(key)
        ]
        self.claimed = set()

    def _claim(self, key):
        if key in self.snapshot_keys and key not in self.claimed:
            self.claimed.add(key)
            return key
        return ""

    def resolve(self, issue):
        if not isinstance(issue, dict):
            return ""
        raw = str(issue.get("key") or "").strip()
        well_formed = bool(JIRA_KEY_RE.fullmatch(raw))
        if well_formed and self._claim(raw):
            return raw
        if well_formed and self.snapshot_keys:
            # A well-formed key outside an existing snapshot contradicts it;
            # never borrow a different issue via URL recovery.
            return ""
        url = str(issue.get("url") or "").strip()
        if url:
            for candidate in self.url_keys:
                if candidate in self.claimed:
                    continue
                if trusted_jira_issue_url(candidate) == url:
                    return self._claim(candidate)
        if not well_formed and len(self.snapshot_keys) == 1:
            # Only a snapshot holding exactly one distinct key, key-only
            # failures included, may resolve an unusable key to itself.
            return self._claim(next(iter(self.snapshot_keys)))
        # With no snapshot, a well-formed key is still safe to display.
        return raw if well_formed and not self.snapshot_keys else ""


def render_product_ask_evaluation_limits():
    """Surface snapshot fetch failures and omitted keys in the published review."""
    failed = TRUSTED_JIRA["failed"]
    omitted = TRUSTED_JIRA["omitted"]
    if not failed and not omitted:
        return []
    lines = [
        "",
        "**Evaluation limits:** Product-ask covered only the issues that could be fetched. The following linked issues were not evaluated:",
        "",
    ]
    for item in failed:
        label = _pa_key_label(item["key"])
        if label:
            lines.append(
                f"- {label} — could not fetch (`{code_span_text(item['reason'])}`)"
            )
    for key in omitted:
        label = _pa_key_label(key)
        if label:
            lines.append(f"- {label} — omitted (10-key cap)")
    lines.append("")
    return lines


def _render_pa_block(issue, suffix=""):
    lines = [_pa_status_line("Status", issue, suffix), ""]
    if issue.get("aligned"):
        lines += ["Aligned:"] + prose_bullet_lines(issue["aligned"]) + [""]
    if issue.get("mismatched"):
        lines += ["Mismatched:"] + prose_bullet_lines(issue["mismatched"]) + [""]
    return lines


def render_product_ask_section(pa):
    if not pa or (pa.get("status") or "none") == "none":
        return []
    issues = pa.get("issues") if isinstance(pa.get("issues"), list) else []
    ok_issues = [i for i in issues if (i.get("status") or "none") != "none"]
    resolver = PaIssueKeyResolver()
    lines = ["", "## Product ask", ""]
    if len(ok_issues) > 1:
        lines += [_pa_status_line("Overall", pa), ""]
        for issue in ok_issues:
            link = _pa_key_label(resolver.resolve(issue))
            lines += [f"### {link or 'Linked Jira issue'}", ""]
            lines += _render_pa_block(issue)
    elif len(ok_issues) == 1:
        link = _pa_key_label(resolver.resolve(ok_issues[0]))
        lines += _render_pa_block(ok_issues[0], suffix=f" · {link}" if link else "")
    else:
        lines += _render_pa_block(pa)
    lines += render_product_ask_evaluation_limits()
    return lines

def render_body(result, previous_md, action):
    run_url = os.environ.get("GITHUB_SERVER_URL", "https://github.com")
    lines = render_header(result, action)

    if action == "failure":
        reason = clean(result.get("reason") or "unknown")
        lines += ["", f"This review did not complete (`{reason}`). Do not treat this head as reviewed."]
        return "\n".join(lines).rstrip() + "\n"

    lines += ["", "## Change summary", "", inline_text(result.get("change_summary"))]
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
                    origin_shown = ", ".join(
                        code_span_text(dimension_label(i)) for i in origin_ids
                    ) or code_span_text(finding.get("dimension"))
                    origin = f"`{origin_shown}` · "
                tail = " · actionable follow-up" if is_actionable_nit(finding) else ""
                lines += ["", f"- {origin}**{inline_text(finding.get('category'))}** ({loc}){tail}: {inline_text(finding.get('description'))}"]
                if finding.get("why"):
                    lines.append(f"  - Why: {inline_text(finding.get('why'))}")
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
            details_body += [inline_text(inspected["summary"]), ""]
        if inspected.get("could_not_verify"):
            details_body += ["**Could not verify:**", ""]
            details_body += [f"- {inline_text(i)}" for i in inspected["could_not_verify"]] + [""]

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
result = compute_product_ask_overall(result)
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

# Usage: find_personas_file <agent-result.json>
# Prints the runner's persona manifest path, or nothing. The runner writes it
# to runDir, which is this script's CWD and two or three levels above the
# result file.
find_personas_file() {
  local result_dir candidate
  result_dir="$(dirname "$1")"
  for candidate in "${FULLSEND_PERSONAS_FILE:-}" personas.json \
    "${result_dir}/../../personas.json" "${result_dir}/../personas.json"; do
    if [[ -n "${candidate}" && -f "${candidate}" ]]; then
      printf '%s' "${candidate}"
      return 0
    fi
  done
}

# Fullsend v0.39.0 has no switch for summary-only review findings. Its CLI
# creates inline or file-level review comments only for findings that include
# a positive line number. Preserve findings for verdicts and approved-review
# follow-up issues, but remove line numbers from the copy passed to the CLI.
prepare_summary_only_result() {
  jq 'if (.findings | type) == "array" then .findings |= map(del(.line)) else . end' "$1" > "$2"
}

# Write the machine-readable projection into the body: the findings only when
# every schema-validated finding can be represented safely, otherwise a
# withheld sentinel. A lossy projection could turn a failed sub-agent
# into an apparently clean dimension on the next re-review. Low-severity
# challenger failures are non-dimensional and retain the pre-challenger findings.
# A dimension failure the severity filter removed (info-tier failures) must
# still suppress the projection.
#
# From fullsend-ai/agents scripts/post-review.src.sh
# @ ce2eedd097dcccf17e29f4a7cd337ec4d95d7194. Local changes:
#   - The allowed categories are the reviewer rows' `categories` in the
#     registry, limited to scripts/stock/review-categories.json when that file
#     exists, so the stock pre-script accepts every projected finding.
#   - Findings in a host adapter's category (CodeRabbit) are left out. The
#     stock pre-script rejects a marker holding a category it does not know,
#     and the adapter reports them again on every run.
#   - Each finding carries `id`, `actionable` and `dimension` when the result
#     has them, and the marker carries the posted `action`, in the layout the
#     stock scripts write. Dispositions are not written.
#   - A findings row that result.producers records as dispatched but not
#     returned counts as a failed dimension, because the agent may already
#     have dropped its info-tier failure finding.
#   - Findings the orchestrator raised itself (`dimension: orchestrator`) are
#     not a dimension's prior findings.
#   - Exactly one marker is always written, as the first line of the body: the
#     projection, or a withheld sentinel that cannot validate. pre-review.sh
#     accepts a comment only when it holds exactly one marker, so text inside
#     the body can never stand in for a marker the host did not write. First,
#     not last: the poster truncates an oversized body from the end, and the
#     Jira integration appends link definitions to the comment.
#
# Usage: append_prior_findings_projection <result.json> <unfiltered-result.json>
append_prior_findings_projection() {
  local result_file="$1" unfiltered_file="$2"
  local registry="${FULLSEND_CONFIG_DIR:-}/dimensions.json"
  local stock_categories="${FULLSEND_CONFIG_DIR:-}/scripts/stock/review-categories.json"
  local projection="" marker encoded
  [[ -f "${stock_categories}" ]] || stock_categories=/dev/null
  if [[ -f "${registry}" && -f "${unfiltered_file}" ]]; then
    projection="$(jq -c --slurpfile unfiltered "${unfiltered_file}" --slurpfile registry "${registry}" \
      --slurpfile stock "${stock_categories}" '
      def host_category:
        IN($registry[0].dimensions[] | select(.kind == "cli-adapter") | .categories[]?);
      def allowed_category:
        IN($registry[0].dimensions[] | select(.kind != "cli-adapter") | .categories[]?)
        and (($stock | length) == 0 or (($stock[0] | type) == "array" and IN($stock[0][])));
      def safe_path:
        type == "string" and length > 0 and . != "N/A" and
        test("^[ -~]+$") and
        (test("(^/|/$|//|(^|/)\\.\\.?(/|$)|[\\\\\\r\\n<>])") | not);
      def non_dimensional_category:
        type == "string" and IN(
          "protected-path", "provenance-warning", "scope-authorization-implicit"
        );
      def non_dimensional_finding:
        (.category | non_dimensional_category) or
        (.dimension == "orchestrator" and .category != "sub-agent-failure") or
        (.category == "sub-agent-failure" and .severity == "low");
      def projectable:
        (.category | type == "string" and allowed_category) and (.file == "N/A" or (.file | safe_path));
      (.findings // []) as $findings
      | ($findings | map(select((non_dimensional_finding or (.category | host_category)) | not))) as $dimension_findings
      | [$registry[0].dimensions[]
          | select(.kind != "cli-adapter" and ((.output // "findings") == "findings"))
          | .id] as $findings_rows
      | (($unfiltered[0].producers // {}) | if type == "object" then . else {} end) as $run
      # The agent may already have dropped an info-tier failure finding, so
      # also read result.producers: a findings row dispatched but not
      # returned failed.
      | (($run.raised // {}) | if type == "object" then keys else [] end) as $raised_ids
      | (($run.returned | type) == "array" and (($run.dispatched // []) | any(.[];
          . as $id | ($id | IN($findings_rows[])) and ($id | IN($run.returned[], $raised_ids[]) | not)))) as $unreturned
      | ((($unfiltered[0].findings // [])
          | any(.[]; .category == "sub-agent-failure" and (non_dimensional_finding | not)))
          or $unreturned) as $dimension_failed
      | if (.action | IN("approve", "request-changes", "comment", "reject"))
          and ($dimension_findings | all(.[]; projectable))
          and ($dimension_failed | not) then
          {
            version: 2,
            action,
            findings: [
              $dimension_findings[]
              | {severity, category, file: (if .file == "N/A" then null else .file end)}
                + (if (.id | type == "string" and test("^f_[A-Za-z0-9]+$")) then {id} else {} end)
                + (if (.line | type == "number" and . > 0 and floor == .) then {line} else {} end)
                + (if (.actionable | type) == "boolean" then {actionable} else {} end)
                + (if (.dimension | type == "string" and test("^[a-z0-9][a-z0-9-]{0,63}$")) then {dimension} else {} end)
            ]
          }
          # The stock pre-script rejects a marker with a repeated id.
          | .findings |= reduce .[] as $f ([];
              . as $seen
              | . + [if ($f.id != null and any($seen[]; .id == $f.id)) then $f | del(.id) else $f end])
        else empty
        end
    ' "${result_file}")" || {
      echo "::warning::Prior-findings projection could not be computed; the next re-review runs as a first review" >&2
      projection=""
    }
  fi
  # Nothing to project: still write a marker, one whose payload the stock
  # pre-script rejects, so the next run is a full first review and text in the
  # body can never stand in for a marker the host did not write.
  [[ -n "${projection}" ]] || projection='{"version":2,"withheld":true}'
  encoded="$(printf '%s' "${projection}" | base64 | tr -d '\n')"
  marker="<!-- fullsend:review-findings-v2:${encoded} -->"
  jq --arg marker "${marker}" '
    # pre-review.sh rejects a comment with a second marker or a history
    # delimiter, so a copy of either in the body would cost the next run its
    # prior findings.
    def strip_reserved:
      gsub("(?m)^<!-- fullsend:review-findings-v[12]:[A-Za-z0-9+/=]+ -->\\r?$"; "")
      | gsub("<!-- sticky:history-(start|end) -->"; "")
      | gsub("(?m)^<summary>Previous run( \\([0-9]+\\))?</summary>\\r?$"; "");
    # Removing a substring can join its neighbours into a new reserved string,
    # so repeat until nothing changes. Each changing pass shortens the body.
    def strip_reserved_fixpoint:
      . as $in | strip_reserved | if . == $in then . else strip_reserved_fixpoint end;
    .body = (
      if (.body | type) == "string" then .body else "" end
      | strip_reserved_fixpoint
    )
    | .body = ($marker + "\n" + .body)
  ' "${result_file}"
}

# Usage: pr_file_list_incomplete <fetched-count> <expected-count>
# True when the fetched list cannot be shown to hold every changed file. The
# pull-request files endpoint stops at 3000 entries even when paginated, so a
# larger PR would otherwise pass the protected-path gate on a cut-off list.
pr_file_list_incomplete() {
  [[ "${1:-}" =~ ^[0-9]+$ && "${2:-}" =~ ^[0-9]+$ ]] || return 0
  (( $1 < $2 ))
}

run_self_test() {
  local fail=0 tmp
  tmp=$(mktemp -d)
  cleanup_self_test() { rm -rf "${tmp}"; }
  trap cleanup_self_test EXIT

  # Every adapter credential the registry names reaches this script through
  # env.runner, so the unset line at the top must list it. Only the top-level
  # env.runner mapping counts: a mention elsewhere in the harness does not.
  # The workflow hands them over in one secret (FULLSEND_GITHUB_RUNNER_SECRETS).
  local cred_name unset_line runner_env shim missing_creds=""
  shim="${POST_REVIEW_SCRIPT_DIR}/../../.github/workflows/fullsend.yaml"
  unset_line="$(grep -m1 -E '^unset CODERABBIT_API_KEY' "${POST_REVIEW_SCRIPT_DIR}/post-review.sh")"
  runner_env="$(awk '
    /^[^[:space:]#]/ { in_env = ($0 ~ /^env:[[:space:]]*$/); in_runner = 0; next }
    in_env && /^  [^[:space:]#]/ { in_runner = ($0 ~ /^  runner:[[:space:]]*$/); next }
    in_runner && /^    [A-Z]/ { print }
  ' "${POST_REVIEW_SCRIPT_DIR}/../harness/review.yaml")"
  while IFS= read -r cred_name; do
    [[ -n "${cred_name}" ]] || continue
    if [[ " ${unset_line#unset } " != *" ${cred_name} "* ]] \
      || ! grep -qxF "    ${cred_name}: \"\${${cred_name}}\"" <<<"${runner_env}" \
      || { [[ -f "${shim}" ]] && ! grep -qF 'FULLSEND_GITHUB_RUNNER_SECRETS: ${{ secrets.FULLSEND_GITHUB_RUNNER_SECRETS }}' "${shim}"; }; then
      missing_creds+=" ${cred_name}"
    fi
  done < <(jq -r '[.dimensions[] | select(.kind == "cli-adapter") | .host.credentials // {}
    | .url_env, .username_env, .token_env | select(type == "string" and . != "")] | unique[]' \
    "${POST_REVIEW_SCRIPT_DIR}/../dimensions.json")
  if [[ -z "${unset_line}" || -n "${missing_creds}" ]]; then
    echo "FAIL adapter credentials: not unset here, not in env.runner, or the workflow does not pass the runner secrets:${missing_creds:- (no unset line)}" >&2
    fail=1
  else
    echo "PASS adapter credentials are unset before any child"
  fi

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
    # POST_REVIEW_SCRIPT_DIR is the directory of this script (.fullsend/scripts).
    GITHUB_WORKSPACE="$(cd "${POST_REVIEW_SCRIPT_DIR}/../.." && pwd)"
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

  local jira_config body
  jira_config="${tmp}/jira-config"
  mkdir -p "${jira_config}/.run"
  write_default_jira_snapshot() {
    cat > "${jira_config}/.run/jira.json" <<'JSON'
{
  "key": "RHOAIENG-100655",
  "url": "https://jira.example.test/browse/RHOAIENG-100655",
  "issues": [
    {"key": "RHOAIENG-100580", "url": "https://jira.example.test/browse/RHOAIENG-100580"},
    {"key": "RHOAIENG-100583", "url": "https://jira.example.test/browse/RHOAIENG-100583"},
    {"key": "RHOAIENG-100655", "url": "https://jira.example.test/browse/RHOAIENG-100655"},
    {"key": "bad]\n[more]\n@org/team\n<script>alert(1)</script>", "url": "https://jira.example.test/browse/RHOAIENG-100655"}
  ]
}
JSON
  }
  write_default_jira_snapshot
  render_jira_fixture() {
    local name="$1"
    (
      export FULLSEND_CONFIG_DIR="${jira_config}"
      transform_review_result "${tmp}/${name}.json" > "${tmp}/${name}-out.json"
    )
  }
  printf '%s' "{${common},\"product_ask\":{\"status\":\"mismatch-unjustified\",\"mismatched\":[\"Jira asks for export\"]}}" > "${tmp}/product-ask.json"
  render_jira_fixture product-ask
  if ! jq -e '.action == "comment" and .risk.level == "low" and .confidence.level == "low" and (.confidence.why | contains("Jira"))' "${tmp}/product-ask-out.json" >/dev/null; then
    echo "FAIL product-ask: want confidence floor only (risk unchanged) + comment" >&2
    fail=1
  elif jq -e '(.risk.why // "") | contains("Jira")' "${tmp}/product-ask-out.json" >/dev/null; then
    echo "FAIL product-ask: host must not rewrite risk why for ask drift" >&2
    fail=1
  else
    echo "PASS product-ask floors confidence only; risk unchanged"
  fi

  # Multi-issue product-ask: overall computed from per-issue statuses.
  printf '%s' "{${common},\"product_ask\":{\"status\":\"aligned\",\"issues\":[{\"key\":\"RHOAIENG-100580\",\"url\":\"https://jira.example.test/browse/RHOAIENG-100580\",\"status\":\"aligned\",\"aligned\":[\"Export feature matches.\"]},{\"key\":\"RHOAIENG-100583\",\"url\":\"https://jira.example.test/browse/RHOAIENG-100583\",\"status\":\"mismatch-unjustified\",\"mismatched\":[\"Jira asks for import.\"],\"needs_human\":true}]}}" > "${tmp}/pa-multi.json"
  render_jira_fixture pa-multi
  body=$(jq -r .body "${tmp}/pa-multi-out.json")
  if ! grep -qF '**Overall:** `mismatch-unjustified` · needs human review' <<<"${body}"; then
    echo "FAIL pa-multi: Overall line missing or wrong" >&2
    fail=1
  elif ! grep -qF '### [RHOAIENG-100580](https://jira.example.test/browse/RHOAIENG-100580)' <<<"${body}"; then
    echo "FAIL pa-multi: first issue heading missing" >&2
    fail=1
  elif ! grep -qF '### [RHOAIENG-100583](https://jira.example.test/browse/RHOAIENG-100583)' <<<"${body}"; then
    echo "FAIL pa-multi: second issue heading missing" >&2
    fail=1
  elif ! jq -e '.confidence.level == "low"' "${tmp}/pa-multi-out.json" >/dev/null; then
    echo "FAIL pa-multi: confidence floor not applied from computed overall" >&2
    fail=1
  else
    echo "PASS pa-multi: overall computed, per-issue headings, confidence floored"
  fi

  # Single-issue product-ask: key linked on status line, no Overall.
  printf '%s' "{${common},\"product_ask\":{\"status\":\"aligned\",\"issues\":[{\"key\":\"RHOAIENG-100655\",\"url\":\"https://jira.example.test/browse/RHOAIENG-100655\",\"status\":\"aligned\",\"aligned\":[\"Fixes the bug.\"]}]}}" > "${tmp}/pa-single.json"
  render_jira_fixture pa-single
  body=$(jq -r .body "${tmp}/pa-single-out.json")
  if grep -qF '**Overall:**' <<<"${body}"; then
    echo "FAIL pa-single: Overall line should not appear for one issue" >&2
    fail=1
  elif ! grep -qF '[RHOAIENG-100655](https://jira.example.test/browse/RHOAIENG-100655)' <<<"${body}"; then
    echo "FAIL pa-single: key link missing on status line" >&2
    fail=1
  elif ! grep -qF '**Status:** `aligned`' <<<"${body}"; then
    echo "FAIL pa-single: Status line missing" >&2
    fail=1
  else
    echo "PASS pa-single: single issue renders linked status, no Overall"
  fi

  # Hostile issue metadata cannot escape the link or inject Markdown/HTML.
  printf '%s' "{${common},\"product_ask\":{\"status\":\"aligned\",\"issues\":[{\"key\":\"RHOAIENG-100655\",\"url\":\"https://example.com)\\n\\n@org/team\\n\\n[more](https://example.com\",\"status\":\"aligned\",\"aligned\":[\"Safe link only.\"]},{\"key\":\"bad]\\n[more]\\n@org/team\\n<script>alert(1)</script>\",\"url\":\"https://example.com\",\"status\":\"aligned\",\"aligned\":[\"Hostile key only.\"]}]}}" > "${tmp}/pa-hostile.json"
  render_jira_fixture pa-hostile
  body=$(jq -r .body "${tmp}/pa-hostile-out.json")
  if ! grep -qF '[RHOAIENG-100655](https://jira.example.test/browse/RHOAIENG-100655)' <<<"${body}"; then
    echo "FAIL pa-hostile: trusted issue link missing" >&2
    fail=1
  elif grep -qF -e 'https://example.com)' \
                -e '[more](https://example.com' \
                -e '<script>' \
                -e '@org/team' <<<"${body}"; then
    echo "FAIL pa-hostile: hostile URL, Markdown, HTML, or mention reached the body" >&2
    fail=1
  elif grep -qF 'bad]' <<<"${body}"; then
    echo "FAIL pa-hostile: hostile key reached the body" >&2
    fail=1
  elif ! grep -qF '### Linked Jira issue' <<<"${body}"; then
    echo "FAIL pa-hostile: unresolved issue heading missing" >&2
    fail=1
  else
    echo "PASS pa-hostile: trusted link kept, hostile key omitted, metadata escaped"
  fi

  # Hostile aligned/mismatched prose: strip comments before mention suppression,
  # escape HTML, keep newlines. Comment-separated @mentions must not go live.
  printf '%s' "{${common},\"product_ask\":{\"status\":\"aligned\",\"issues\":[{\"key\":\"RHOAIENG-100655\",\"url\":\"https://jira.example.test/browse/RHOAIENG-100655\",\"status\":\"aligned\",\"aligned\":[\"Matches.\\n\\n<!-- hide -->\\n## Injected\\n<script>alert(1)</script>\\n@<!-- conceal -->org/team\"],\"mismatched\":[\"Drift.\\n<!-- x -->\\n<details>\\n@<!-- hide -->alice\"]}]}}" > "${tmp}/pa-prose.json"
  render_jira_fixture pa-prose
  body=$(jq -r .body "${tmp}/pa-prose-out.json")
  if ! grep -qF 'Matches.' <<<"${body}"; then
    echo "FAIL pa-prose: aligned prose missing" >&2
    fail=1
  elif grep -qF -e '<!-- hide -->' -e '<!-- x -->' -e '<!-- conceal -->' <<<"${body}"; then
    echo "FAIL pa-prose: injected HTML comment leaked into body" >&2
    fail=1
  elif grep -qF '<script>' <<<"${body}"; then
    echo "FAIL pa-prose: raw script tag leaked into body" >&2
    fail=1
  elif ! grep -qF '&lt;script>alert(1)&lt;/script>' <<<"${body}"; then
    echo "FAIL pa-prose: HTML was not escaped" >&2
    fail=1
  elif ! grep -qF '&lt;details>' <<<"${body}"; then
    echo "FAIL pa-prose: mismatched HTML was not escaped" >&2
    fail=1
  elif grep -qF 'Matches. ## Injected' <<<"${body}"; then
    echo "FAIL pa-prose: newlines were flattened into a single line" >&2
    fail=1
  elif ! grep -qE '^  ## Injected$' <<<"${body}"; then
    echo "FAIL pa-prose: multi-line prose was not kept as list continuation" >&2
    fail=1
  elif grep -qF -e '@org/team' -e '@alice' <<<"${body}"; then
    echo "FAIL pa-prose: comment-separated mention became a live @mention" >&2
    fail=1
  else
    echo "PASS pa-prose: comments stripped, HTML escaped, newlines kept, mentions suppressed"
  fi

  # Legacy product-ask without issues: same block as before.
  printf '%s' "{${common},\"product_ask\":{\"status\":\"aligned\",\"aligned\":[\"Matches.\"]}}" > "${tmp}/pa-legacy.json"
  transform_review_result "${tmp}/pa-legacy.json" > "${tmp}/pa-legacy-out.json"
  body=$(jq -r .body "${tmp}/pa-legacy-out.json")
  if grep -qF '**Overall:**' <<<"${body}"; then
    echo "FAIL pa-legacy: Overall line should not appear without issues" >&2
    fail=1
  elif ! grep -qF '**Status:** `aligned`' <<<"${body}"; then
    echo "FAIL pa-legacy: Status line missing" >&2
    fail=1
  elif ! grep -qF 'Matches.' <<<"${body}"; then
    echo "FAIL pa-legacy: aligned items missing" >&2
    fail=1
  else
    echo "PASS pa-legacy: legacy single-key renders unchanged"
  fi

  # Mixed fetch success/failure: aligned evaluation must still show fetch limits.
  cat > "${jira_config}/.run/jira.json" <<'JSON'
{
  "id": "jira-snapshot",
  "status": "ok",
  "key": "RHOAIENG-100580",
  "url": "https://jira.example.test/browse/RHOAIENG-100580",
  "issues": [
    {"key": "RHOAIENG-100580", "url": "https://jira.example.test/browse/RHOAIENG-100580", "summary": "Export"},
    {"key": "RHOAIENG-100583", "status": "error", "reason": "http-404"},
    {"key": "RHOAIENG-100655", "status": "error", "reason": "URLError"}
  ]
}
JSON
  printf '%s' "{${common},\"product_ask\":{\"status\":\"aligned\",\"issues\":[{\"key\":\"RHOAIENG-100580\",\"url\":\"https://jira.example.test/browse/RHOAIENG-100580\",\"status\":\"aligned\",\"aligned\":[\"Export feature matches.\"]}]}}" > "${tmp}/pa-partial.json"
  render_jira_fixture pa-partial
  body=$(jq -r .body "${tmp}/pa-partial-out.json")
  if ! grep -qF '**Status:** `aligned`' <<<"${body}"; then
    echo "FAIL pa-partial: aligned status missing" >&2
    fail=1
  elif ! grep -qF '**Evaluation limits:**' <<<"${body}"; then
    echo "FAIL pa-partial: evaluation-limit notice missing" >&2
    fail=1
  elif ! grep -qF '`RHOAIENG-100583` — could not fetch (`http-404`)' <<<"${body}"; then
    echo "FAIL pa-partial: failed key/reason not rendered" >&2
    fail=1
  elif ! grep -qF '`RHOAIENG-100655` — could not fetch (`URLError`)' <<<"${body}"; then
    echo "FAIL pa-partial: second failed key not rendered" >&2
    fail=1
  else
    echo "PASS pa-partial: mixed fetch failure surfaces evaluation limits"
  fi

  # Over-cap omitted keys: notice even when every fetched issue aligned.
  cat > "${jira_config}/.run/jira.json" <<'JSON'
{
  "id": "jira-snapshot",
  "status": "ok",
  "key": "RHOAIENG-100580",
  "url": "https://jira.example.test/browse/RHOAIENG-100580",
  "issues": [
    {"key": "RHOAIENG-100580", "url": "https://jira.example.test/browse/RHOAIENG-100580", "summary": "Export"}
  ],
  "omitted_keys": ["RHOAIENG-100511", "RHOAIENG-100512"]
}
JSON
  printf '%s' "{${common},\"product_ask\":{\"status\":\"aligned\",\"issues\":[{\"key\":\"RHOAIENG-100580\",\"url\":\"https://jira.example.test/browse/RHOAIENG-100580\",\"status\":\"aligned\",\"aligned\":[\"Export feature matches.\"]}]}}" > "${tmp}/pa-omitted.json"
  render_jira_fixture pa-omitted
  body=$(jq -r .body "${tmp}/pa-omitted-out.json")
  if ! grep -qF '**Evaluation limits:**' <<<"${body}"; then
    echo "FAIL pa-omitted: evaluation-limit notice missing" >&2
    fail=1
  elif ! grep -qF '`RHOAIENG-100511` — omitted (10-key cap)' <<<"${body}"; then
    echo "FAIL pa-omitted: first omitted key missing" >&2
    fail=1
  elif ! grep -qF '`RHOAIENG-100512` — omitted (10-key cap)' <<<"${body}"; then
    echo "FAIL pa-omitted: second omitted key missing" >&2
    fail=1
  elif grep -qF 'could not fetch' <<<"${body}"; then
    echo "FAIL pa-omitted: fetch-failure wording should not appear" >&2
    fail=1
  else
    echo "PASS pa-omitted: over-cap keys surface evaluation limits"
  fi

  # An issues[].key that is not a valid key never reaches the body; the label
  # comes from the host snapshot instead.
  cat > "${jira_config}/.run/jira.json" <<'JSON'
{
  "key": "RHOAIENG-100828",
  "url": "https://jira.example.test/browse/RHOAIENG-100828",
  "issues": [
    {"key": "RHOAIENG-100828", "url": "https://jira.example.test/browse/RHOAIENG-100828", "summary": "Sticky key"}
  ]
}
JSON
  printf '%s' "{${common},\"product_ask\":{\"status\":\"aligned\",\"issues\":[{\"key\":\"RHOA...\",\"url\":\"***/browse/RHOAIENG-100828\",\"status\":\"aligned\",\"aligned\":[\"Fixes the bug.\"]}]}}" > "${tmp}/pa-truncated.json"
  render_jira_fixture pa-truncated
  body=$(jq -r .body "${tmp}/pa-truncated-out.json")
  if ! grep -qF '[RHOAIENG-100828](https://jira.example.test/browse/RHOAIENG-100828)' <<<"${body}"; then
    echo "FAIL pa-truncated: snapshot key was not linked" >&2
    fail=1
  elif grep -qF -e 'RHOA...' -e '***' <<<"${body}"; then
    echo "FAIL pa-truncated: truncated or masked key reached the body" >&2
    fail=1
  elif ! grep -qF '**Status:** `aligned` · [RHOAIENG-100828]' <<<"${body}"; then
    echo "FAIL pa-truncated: status line lost the snapshot link" >&2
    fail=1
  else
    echo "PASS pa-truncated: snapshot key replaces a truncated/masked key"
  fi

  printf '%s' "{${common},\"product_ask\":{\"status\":\"aligned\",\"issues\":[{\"key\":\"***\",\"url\":\"***/browse/RHOAIENG-100828\",\"status\":\"aligned\",\"aligned\":[\"Fixes the bug.\"]}]}}" > "${tmp}/pa-masked.json"
  render_jira_fixture pa-masked
  body=$(jq -r .body "${tmp}/pa-masked-out.json")
  if ! grep -qF '[RHOAIENG-100828](https://jira.example.test/browse/RHOAIENG-100828)' <<<"${body}"; then
    echo "FAIL pa-masked: snapshot key was not linked" >&2
    fail=1
  elif grep -qF '***' <<<"${body}"; then
    echo "FAIL pa-masked: masked key reached the body" >&2
    fail=1
  else
    echo "PASS pa-masked: snapshot key replaces a masked key"
  fi

  # A well-formed key that contradicts the snapshot must not borrow the
  # snapshot key. Only masked or truncated metadata may use the fallback.
  printf '%s' "{${common},\"product_ask\":{\"status\":\"aligned\",\"issues\":[{\"key\":\"RHOAIENG-999999\",\"status\":\"aligned\",\"aligned\":[\"Fixes the bug.\"]}]}}" > "${tmp}/pa-conflict.json"
  render_jira_fixture pa-conflict
  body=$(jq -r .body "${tmp}/pa-conflict-out.json")
  if grep -qF 'RHOAIENG-100828' <<<"${body}"; then
    echo "FAIL pa-conflict: conflicting key was relabeled as the snapshot key" >&2
    fail=1
  elif grep -qF 'RHOAIENG-999999' <<<"${body}"; then
    echo "FAIL pa-conflict: unknown well-formed key reached the body" >&2
    fail=1
  elif ! grep -qF '**Status:** `aligned`' <<<"${body}"; then
    echo "FAIL pa-conflict: status line missing" >&2
    fail=1
  else
    echo "PASS pa-conflict: well-formed key never borrows the snapshot key"
  fi

  # The same conflict carrying the snapshot issue's URL must not be recovered
  # through URL matching: a well-formed key that cannot be claimed is final.
  printf '%s' "{${common},\"product_ask\":{\"status\":\"aligned\",\"issues\":[{\"key\":\"RHOAIENG-999999\",\"url\":\"https://jira.example.test/browse/RHOAIENG-100828\",\"status\":\"aligned\",\"aligned\":[\"Fixes the bug.\"]}]}}" > "${tmp}/pa-conflict-url.json"
  render_jira_fixture pa-conflict-url
  body=$(jq -r .body "${tmp}/pa-conflict-url-out.json")
  if grep -qF 'RHOAIENG-100828' <<<"${body}"; then
    echo "FAIL pa-conflict-url: conflicting key was relabeled via URL recovery" >&2
    fail=1
  elif grep -qF 'RHOAIENG-999999' <<<"${body}"; then
    echo "FAIL pa-conflict-url: unknown well-formed key reached the body" >&2
    fail=1
  elif ! grep -qF '**Status:** `aligned`' <<<"${body}"; then
    echo "FAIL pa-conflict-url: status line missing" >&2
    fail=1
  else
    echo "PASS pa-conflict-url: URL recovery cannot relabel a claimed-key conflict"
  fi

  # In a multi-issue snapshot, an exact match claims one key; a later
  # malformed entry without a matching URL must stay unlabeled rather than
  # inherit the snapshot's remaining key.
  cat > "${jira_config}/.run/jira.json" <<'JSON'
{
  "issues": [
    {"key": "RHOAIENG-100828", "url": "https://jira.example.test/browse/RHOAIENG-100828", "summary": "First"},
    {"key": "RHOAIENG-100829", "url": "https://jira.example.test/browse/RHOAIENG-100829", "summary": "Second"}
  ]
}
JSON
  printf '%s' "{${common},\"product_ask\":{\"status\":\"aligned\",\"issues\":[{\"key\":\"RHOAIENG-100828\",\"url\":\"https://jira.example.test/browse/RHOAIENG-100828\",\"status\":\"aligned\",\"aligned\":[\"First matches.\"]},{\"key\":\"***\",\"status\":\"aligned\",\"aligned\":[\"Second matches.\"]}]}}" > "${tmp}/pa-multi-orphan.json"
  render_jira_fixture pa-multi-orphan
  body=$(jq -r .body "${tmp}/pa-multi-orphan-out.json")
  if ! grep -qF '[RHOAIENG-100828](https://jira.example.test/browse/RHOAIENG-100828)' <<<"${body}"; then
    echo "FAIL pa-multi-orphan: exact-match key lost its link" >&2
    fail=1
  elif grep -qF 'RHOAIENG-100829' <<<"${body}"; then
    echo "FAIL pa-multi-orphan: malformed entry inherited the remaining snapshot key" >&2
    fail=1
  elif ! grep -qF '### Linked Jira issue' <<<"${body}"; then
    echo "FAIL pa-multi-orphan: unresolved heading missing" >&2
    fail=1
  else
    echo "PASS pa-multi-orphan: multi-issue snapshot does not exhaust into a malformed entry"
  fi

  # A key-only snapshot exists: a well-formed producer key that is absent from
  # it must not be published as the evaluated ticket.
  cat > "${jira_config}/.run/jira.json" <<'JSON'
{
  "issues": [
    {"key": "RHOAIENG-100828", "summary": "Key-only host snapshot"}
  ]
}
JSON
  printf '%s' "{${common},\"product_ask\":{\"status\":\"aligned\",\"issues\":[{\"key\":\"RHOAIENG-999999\",\"status\":\"aligned\",\"aligned\":[\"Fixes the bug.\"]}]}}" > "${tmp}/pa-keyonly.json"
  render_jira_fixture pa-keyonly
  body=$(jq -r .body "${tmp}/pa-keyonly-out.json")
  if grep -qF 'RHOAIENG-999999' <<<"${body}"; then
    echo "FAIL pa-keyonly: producer key outside a key-only snapshot reached the body" >&2
    fail=1
  elif ! grep -qF '**Status:** `aligned`' <<<"${body}"; then
    echo "FAIL pa-keyonly: status line missing" >&2
    fail=1
  else
    echo "PASS pa-keyonly: key-only snapshot still rejects keys it does not contain"
  fi

  # Mixed fetch success/failure: the snapshot holds two distinct keys, so an
  # unusable producer key must stay unlabeled instead of taking the one key
  # that happened to fetch.
  cat > "${jira_config}/.run/jira.json" <<'JSON'
{
  "issues": [
    {"key": "RHOAIENG-100580", "url": "https://jira.example.test/browse/RHOAIENG-100580", "summary": "Export"},
    {"key": "RHOAIENG-100583", "status": "error", "reason": "http-404"}
  ]
}
JSON
  printf '%s' "{${common},\"product_ask\":{\"status\":\"aligned\",\"issues\":[{\"key\":\"***\",\"status\":\"aligned\",\"aligned\":[\"Fixes the bug.\"]}]}}" > "${tmp}/pa-mixed-unresolved.json"
  render_jira_fixture pa-mixed-unresolved
  body=$(jq -r .body "${tmp}/pa-mixed-unresolved-out.json")
  if grep -qF '](https://jira.example.test/browse/RHOAIENG-100580)' <<<"${body}"; then
    echo "FAIL pa-mixed-unresolved: unusable key inherited the only fetched snapshot key" >&2
    fail=1
  elif grep -qF '***' <<<"${body}"; then
    echo "FAIL pa-mixed-unresolved: unusable key reached the body" >&2
    fail=1
  elif ! grep -qF '**Status:** `aligned`' <<<"${body}"; then
    echo "FAIL pa-mixed-unresolved: status line missing" >&2
    fail=1
  else
    echo "PASS pa-mixed-unresolved: mixed-success snapshot does not absorb an unusable key"
  fi

  # Restore the shared jira fixture for later tests that reuse render_jira_fixture.
  write_default_jira_snapshot

  # Gate matrix: below-bar findings defer to a human instead of blocking.
  render_fixture judgment-findings comment "{${common},\"findings\":[{\"severity\":\"medium\",\"category\":\"style-conventions\",\"file\":\"a.ts\",\"line\":1,\"description\":\"Naming drift.\",\"why\":\"Public export renamed without alias.\",\"remediation\":\"Rename the export or add an alias.\"}],\"todo\":[{\"category\":\"findings\",\"text\":\"Rename the export or add an alias.\"}],\"product_ask\":{\"status\":\"none\"}}"
  body=$(jq -r .body "${tmp}/judgment-findings-out.json")
  if ! grep -Fq '**Needs human judgment** — 1 non-blocking finding.' <<<"${body}" ||
     ! grep -q '### Medium (1)' <<<"${body}" ||
     ! grep -q '## TODO' <<<"${body}" ||
     ! grep -Fxq 'Findings' <<<"${body}"; then
    echo "FAIL judgment-findings: status, severity group, or TODO missing" >&2
    fail=1
  else
    echo "PASS below-bar review yields comment/needs-human and keeps the finding visible"
  fi

  # A blocking-severity finding still blocks when a judgment finding is present.
  render_fixture blocking-plus-judgment request-changes "{${common},\"findings\":[{\"severity\":\"medium\",\"category\":\"style-conventions\",\"file\":\"a.ts\",\"description\":\"Naming drift.\",\"why\":\"Export renamed.\"},{\"severity\":\"high\",\"category\":\"logic-error\",\"file\":\"b.ts\",\"line\":4,\"description\":\"Crash.\",\"why\":\"Null dereference.\",\"remediation\":\"Guard the value.\"}],\"product_ask\":{\"status\":\"none\"}}"

  # A failed readiness check still blocks when a judgment finding is present.
  render_fixture judgment-plus-check request-changes "{${common},\"findings\":[{\"severity\":\"medium\",\"category\":\"style-conventions\",\"file\":\"a.ts\",\"description\":\"Naming drift.\",\"why\":\"Export renamed.\"}],\"checks\":[{\"id\":\"pr-description-review\",\"status\":\"fail\",\"summary\":\"Problem missing.\"}],\"producers\":{\"dispatched\":[\"pr-description-review\"],\"adapters\":[],\"skipped\":[],\"returned\":[\"pr-description-review\"],\"raised\":{},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}},\"product_ask\":{\"status\":\"none\"}}"

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

  # Compute the expected GitHub diff anchor rather than hardcoding a digest:
  # a literal sha256 in a fixture reads like a live link and can drift from the
  # path it is supposed to describe.
  diff_anchor() {
    python3 -c 'import hashlib,sys; print(hashlib.sha256(sys.argv[1].encode("utf-8")).hexdigest())' "$1"
  }
  local a_anchor b_anchor
  a_anchor="$(diff_anchor a.ts)"
  b_anchor="$(diff_anchor b.ts)"

  body=$(jq -r .body "${tmp}/request-changes-out.json")
  if ! grep -Fq '**Waiting on author** — 1 blocking finding' <<<"${body}" ||
     ! grep -Fq "[a.ts:12](https://github.com/o/r/pull/1/changes#diff-${a_anchor}R12)" <<<"${body}" ||
     grep -Fq '/blob/' <<<"${body}"; then
    echo "FAIL request-changes: status count or PR Files-changed link missing" >&2
    fail=1
  else
    echo "PASS request-changes status and PR Files-changed link"
  fi

  # A finding without a line anchors the file only; a result with no PR number
  # falls back to the commit-pinned blob URL instead of dropping the link.
  jq -n --argjson common "$(printf '{%s}' "${common}")" \
    '$common * {findings: [{severity: "medium", category: "style-conventions", file: "b.ts", description: "Nit."}]}' \
    > "${tmp}/loc-noline.json"
  body=$(transform_review_result "${tmp}/loc-noline.json" | jq -r .body)
  if ! grep -Fq "changes#diff-${b_anchor})" <<<"${body}" ||
     grep -Eq 'diff-[0-9a-f]{64}R' <<<"${body}"; then
    echo "FAIL loc-noline: line-less finding should anchor the file without a line suffix" >&2
    fail=1
  else
    echo "PASS line-less finding anchors the file without a line suffix"
  fi

  jq -n --argjson common "$(printf '{%s}' "${common}")" \
    '$common * {findings: [{severity: "medium", category: "style-conventions", file: "b.ts", line: 7, description: "Nit."}]} | del(.pr_number)' \
    > "${tmp}/loc-no-pr.json"
  body=$(transform_review_result "${tmp}/loc-no-pr.json" | jq -r .body)
  if ! grep -Fq 'blob/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/b.ts#L7' <<<"${body}"; then
    echo "FAIL loc-no-pr: missing pr_number should fall back to the commit-pinned blob URL" >&2
    fail=1
  else
    echo "PASS missing pr_number falls back to the commit-pinned blob URL"
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
  if ! jq -e --arg anchor "${a_anchor}R12" '(.findings[0] | has("line") | not) and (.body | contains($anchor))' "${tmp}/summary-only.json" >/dev/null; then
    echo "FAIL summary-only: expected linked PR-diff body location without structured line" >&2
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
  # fullsend post-review adds the review-agent marker and escapes any copy in
  # the body, so the rendered header must not carry one.
  if grep -q '<!-- fullsend:review-agent' <<<"${body}"; then
    echo "FAIL header: rendered body carries its own review-agent marker" >&2
    fail=1
  else
    echo "PASS header leaves the review-agent marker to fullsend post-review"
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

  # Production hands the changed files over as a file, never in the
  # environment. The same case must hold on that path.
  printf '%s\n' '.github/workflows/ci.yaml' 'src/app.ts' > "${tmp}/pp-files.txt"
  (
    unset REVIEW_CHANGED_FILES
    export REVIEW_PROTECTED_PATHS=".github/,scripts/"
    export REVIEW_CHANGED_FILES_FILE="${tmp}/pp-files.txt"
    transform_review_result "${tmp}/pp-real.json"
  ) > "${tmp}/pp-file-out.json"
  if ! jq -e '
      .action == "comment"
      and ((.findings // []) | length) == 1
      and ((.todo // [])
           | map(if type == "string" then . else .text end)
           | any(contains(".github/workflows/ci.yaml")))
    ' "${tmp}/pp-file-out.json" >/dev/null; then
    echo "FAIL protected-path-file: changed files passed by file were not used" >&2
    fail=1
  else
    echo "PASS protected-path gate reads the changed files passed by file"
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
  # ok + empty findings must still approve.
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
  elif ! jq -e '.action == "approve"' "${tmp}/adapter-status-out.json" >/dev/null; then
    echo "FAIL adapter-status: ok + empty findings must approve" >&2
    fail=1
  else
    echo "PASS adapter status on result.producers distinguishes unavailable from ran-clean and approves"
  fi

  # Adapter error must refuse approve and surface error on Status.
  printf '%s' "{${common},\"findings\":[],\"producers\":{\"dispatched\":[],\"adapters\":[{\"id\":\"coderabbit\",\"status\":\"error\",\"reason\":\"cli-unavailable\"}],\"skipped\":[],\"returned\":[],\"raised\":{},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/adapter-error.json"
  transform_review_result "${tmp}/adapter-error.json" > "${tmp}/adapter-error-out.json"
  body=$(jq -r .body "${tmp}/adapter-error-out.json")
  if ! grep -qE '^\| CodeRabbit \| findings \| ❌ \| cli unavailable' <<<"${body}"; then
    echo "FAIL adapter-error: status=error adapter was not marked errored" >&2
    fail=1
  elif ! jq -e '.action == "comment"' "${tmp}/adapter-error-out.json" >/dev/null; then
    echo "FAIL adapter-error: status=error must refuse approve (comment action)" >&2
    fail=1
  elif ! grep -q 'Review incomplete' <<<"${body}"; then
    echo "FAIL adapter-error: status=error must show Review incomplete on Status" >&2
    fail=1
  elif ! grep -qi 'CodeRabbit' <<<"$(grep 'Review incomplete' <<<"${body}")"; then
    echo "FAIL adapter-error: Status must name the failed producer" >&2
    fail=1
  elif jq -e '.confidence.level == "high"' "${tmp}/adapter-error-out.json" >/dev/null; then
    echo "FAIL adapter-error: confidence must not be left high with an errored adapter" >&2
    fail=1
  elif ! jq -e '(.inspected.could_not_verify // []) | any(.[]; . == "CodeRabbit (cli unavailable)")' "${tmp}/adapter-error-out.json" >/dev/null; then
    echo "FAIL adapter-error: inspected.could_not_verify must use label (reason) for errored adapter" >&2
    fail=1
  else
    echo "PASS adapter error refuses approve, surfaces incomplete Status, caps confidence"
  fi

  # A below-bar finding no longer blocks, but the Status must still report
  # the incomplete review and name the failed producer.
  printf '%s' "{${common},\"findings\":[{\"severity\":\"medium\",\"category\":\"logic-error\",\"file\":\"a.ts\",\"description\":\"Off by one.\"}],\"producers\":{\"dispatched\":[],\"adapters\":[{\"id\":\"coderabbit\",\"status\":\"error\",\"reason\":\"review-failed\"}],\"skipped\":[],\"returned\":[],\"raised\":{},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/adapter-error-blocking.json"
  transform_review_result "${tmp}/adapter-error-blocking.json" > "${tmp}/adapter-error-blocking-out.json"
  body=$(jq -r .body "${tmp}/adapter-error-blocking-out.json")
  if ! jq -e '.action == "comment"' "${tmp}/adapter-error-blocking-out.json" >/dev/null; then
    echo "FAIL adapter-error-blocking: expected comment" >&2
    fail=1
  elif ! grep -qE '\*\*Review incomplete\*\*.*CodeRabbit \(review failed\)' <<<"${body}"; then
    echo "FAIL adapter-error-blocking: Status must report the incomplete review" >&2
    fail=1
  else
    echo "PASS adapter error with judgment findings defers to a human and reports incompleteness"
  fi

  # An approach-rejected action keeps its headline, but must still report an
  # incomplete review when an adapter errored.
  printf '%s' "{${common},\"findings\":[{\"severity\":\"medium\",\"category\":\"approach-rejected\",\"file\":\"a.ts\",\"description\":\"Approach rejected.\"}],\"producers\":{\"dispatched\":[],\"adapters\":[{\"id\":\"coderabbit\",\"status\":\"error\",\"reason\":\"review-failed\"}],\"skipped\":[],\"returned\":[],\"raised\":{},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/adapter-error-reject.json"
  transform_review_result "${tmp}/adapter-error-reject.json" > "${tmp}/adapter-error-reject-out.json"
  body=$(jq -r .body "${tmp}/adapter-error-reject-out.json")
  if ! jq -e '.action == "reject"' "${tmp}/adapter-error-reject-out.json" >/dev/null; then
    echo "FAIL adapter-error-reject: expected reject" >&2
    fail=1
  elif ! grep -qE '\*\*Approach rejected\.\*\*.*Review incomplete — CodeRabbit \(review failed\)' <<<"${body}"; then
    echo "FAIL adapter-error-reject: Status must keep Approach rejected and report the incomplete review" >&2
    fail=1
  else
    echo "PASS adapter error with approach-rejected findings reports incompleteness"
  fi

  # Adapter ids come from the result, not the registry: a forged id must not
  # inject headings, HTML, mentions, carriage-return blocks, or links into
  # host-authored Status / Evidence.
  printf '%s' "{${common},\"producers\":{\"dispatched\":[],\"adapters\":[{\"id\":\"evil\\n## FAKE <b>x</b> @octocat\",\"status\":\"error\",\"reason\":\"review-failed\"},{\"id\":\"evil\\r## CRFAKE [CodeRabbit](https://example.com/)\",\"status\":\"error\",\"reason\":\"review-failed\"}],\"skipped\":[],\"returned\":[],\"raised\":{},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/adapter-inject.json"
  transform_review_result "${tmp}/adapter-inject.json" > "${tmp}/adapter-inject-out.json"
  body=$(jq -r .body "${tmp}/adapter-inject-out.json")
  if grep -qE '^## (FAKE|CRFAKE)' <<<"${body}"; then
    echo "FAIL adapter-inject: adapter id injected a heading" >&2
    fail=1
  elif grep -qF '<b>' <<<"${body}"; then
    echo "FAIL adapter-inject: adapter id injected raw HTML" >&2
    fail=1
  elif grep -qF '@octocat' <<<"${body}"; then
    echo "FAIL adapter-inject: adapter id injected a mention" >&2
    fail=1
  elif grep -qF $'\r' <<<"${body}"; then
    echo "FAIL adapter-inject: standalone carriage return survived" >&2
    fail=1
  elif grep -qE '(^|[^\\])\]\(https://example\.com/' <<<"${body}"; then
    echo "FAIL adapter-inject: adapter id rendered as a Markdown link" >&2
    fail=1
  elif ! grep -qF '\[CodeRabbit\]' <<<"${body}"; then
    echo "FAIL adapter-inject: link-shaped adapter id was not escaped" >&2
    fail=1
  else
    echo "PASS adapter id cannot inject headings, HTML, mentions, carriage returns, or links"
  fi

  # Finding text is result data too: CR blocks and HTML must not escape the
  # main Findings list.
  printf '%s' "{${common},\"findings\":[{\"severity\":\"medium\",\"category\":\"logic\",\"file\":\"a.ts\",\"description\":\"body\\r## FAKE2 <b>y</b>\"}]}" > "${tmp}/finding-inject.json"
  transform_review_result "${tmp}/finding-inject.json" > "${tmp}/finding-inject-out.json"
  body=$(jq -r .body "${tmp}/finding-inject-out.json")
  if grep -qE '^## FAKE2' <<<"${body}"; then
    echo "FAIL finding-inject: finding description injected a heading" >&2
    fail=1
  elif grep -qF '<b>' <<<"${body}"; then
    echo "FAIL finding-inject: finding description injected raw HTML" >&2
    fail=1
  elif grep -qF $'\r' <<<"${body}"; then
    echo "FAIL finding-inject: finding description kept a standalone carriage return" >&2
    fail=1
  else
    echo "PASS finding text cannot inject headings, HTML, or carriage returns"
  fi

  # Adapter skipped must still allow approve when otherwise clean.
  printf '%s' "{${common},\"findings\":[],\"producers\":{\"dispatched\":[\"correctness\"],\"adapters\":[{\"id\":\"coderabbit\",\"status\":\"skipped\",\"reason\":\"all-files-ignored\"}],\"skipped\":[],\"returned\":[\"correctness\"],\"raised\":{\"correctness\":[]},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/adapter-skipped.json"
  transform_review_result "${tmp}/adapter-skipped.json" > "${tmp}/adapter-skipped-out.json"
  if ! jq -e '.action == "approve"' "${tmp}/adapter-skipped-out.json" >/dev/null; then
    echo "FAIL adapter-skipped: skipped adapter must still allow approve" >&2
    fail=1
  else
    echo "PASS adapter skipped still allows approve"
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

  # Claiming an empty-set skip while findings exist is the exact shape run 243
  # produced. The host must contradict it in plain language, not schema jargon.
  printf '%s' "{${common},\"findings\":[{\"severity\":\"high\",\"category\":\"off-by-one\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"description\":\"Out of bounds.\",\"why\":\"undefined.\",\"remediation\":\"length - 1.\"}],\"producers\":{\"dispatched\":[\"correctness\"],\"adapters\":[],\"skipped\":[],\"returned\":[\"correctness\"],\"raised\":{\"correctness\":[{\"severity\":\"high\",\"category\":\"off-by-one\",\"dimension\":\"correctness\",\"file\":\"a.ts\",\"description\":\"Out of bounds.\",\"why\":\"undefined.\",\"remediation\":\"length - 1.\"}]},\"challenger\":{\"status\":\"skipped\",\"reason\":\"no findings to adjudicate\"}}}" > "${tmp}/ch.json"
  transform_review_result "${tmp}/ch.json" > "${tmp}/ch-out.json"
  body=$(jq -r .body "${tmp}/ch-out.json")
  if grep -qE 'result\.producers|producers\.(challenger|raised|dispatched)' <<<"${body}"; then
    echo "FAIL challenger-contradiction: sticky exposed schema/field jargon" >&2
    fail=1
  elif ! grep -q 'Challenger was marked skipped with no findings to adjudicate, but 1 finding(s) were reported' <<<"${body}"; then
    echo "FAIL challenger-contradiction: host did not report the skip/findings mismatch" >&2
    fail=1
  elif ! jq -e '
    .confidence.level == "medium"
    and (.inspected.could_not_verify | any(.[]; contains("marked skipped with no findings to adjudicate")))
  ' "${tmp}/ch-out.json" >/dev/null; then
    echo "FAIL challenger-contradiction: confidence/limits did not use matching user-facing wording" >&2
    fail=1
  else
    echo "PASS contradictory challenger record is reported in plain language and caps confidence"
  fi

  # A finding the orchestrator raises after the step 6d skip decision (6e)
  # does not disprove an empty-set skip.
  printf '%s' "{${common},\"findings\":[{\"severity\":\"medium\",\"category\":\"scope-exceeded\",\"dimension\":\"orchestrator\",\"file\":\"N/A\",\"description\":\"Scope exceeds the linked issue.\",\"why\":\"Adds capability.\"}]}" > "${tmp}/ch-orch.json"
  transform_review_result "${tmp}/ch-orch.json" > "${tmp}/ch-orch-out.json"
  if grep -q 'records the challenger as skipped for an empty finding set' <<<"$(jq -r .body "${tmp}/ch-orch-out.json")" \
    || ! jq -e '.confidence.level == "high"' "${tmp}/ch-orch-out.json" >/dev/null; then
    echo "FAIL challenger-orchestrator-only: a step 6e finding was read as disproving an empty-set skip" >&2
    fail=1
  else
    echo "PASS orchestrator-only findings do not contradict an empty-set skip"
  fi

  # Nor does an unstamped protected-path finding: step 6e raises those too.
  printf '%s' "{${common},\"findings\":[{\"severity\":\"medium\",\"category\":\"protected-path\",\"file\":\".github/x.yml\",\"description\":\"d\",\"why\":\"w\"}]}" > "${tmp}/ch-pp.json"
  ( unset REVIEW_PROTECTED_PATHS; transform_review_result "${tmp}/ch-pp.json" ) > "${tmp}/ch-pp-out.json"
  if grep -q 'records the challenger as skipped for an empty finding set' <<<"$(jq -r .body "${tmp}/ch-pp-out.json")" \
    || ! jq -e '.confidence.level == "high"' "${tmp}/ch-pp-out.json" >/dev/null; then
    echo "FAIL challenger-protected-path: an unstamped protected-path finding was read as disproving an empty-set skip" >&2
    fail=1
  else
    echo "PASS an unstamped protected-path finding does not contradict an empty-set skip"
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
  # Same boundaries the author helper parses by: ## Findings up to the next
  # ## heading or the <details> review block.
  findings_section=$(awk '/^## Findings$/{f=1; next} f && (/^## / || /^<details>/){exit} f' <<<"${body}")
  if [[ "$(jq -r .action "${tmp}/justified-out.json")" != "approve" ]]; then
    echo "FAIL justified: justified-only findings must not block disposition" >&2
    fail=1
  elif ! grep -q '## Findings' <<<"${body}"; then
    echo "FAIL justified: justified items without survivors must still open ## Findings" >&2
    fail=1
  elif ! grep -q '### Justified (1)' <<<"${body}"; then
    echo "FAIL justified: ### Justified subheading missing or wrong count" >&2
    fail=1
  elif grep -qE '^<!--' <<<"${findings_section}"; then
    echo "FAIL justified: an HTML marker leaked into ## Findings" >&2
    fail=1
  elif grep -qiE '<(!--[[:space:]]*fullsend[[:space:]]*:)' <<<"${body}"; then
    echo "FAIL justified: body carries a fullsend: marker upstream would escape as text" >&2
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
  if [[ "$(jq -r .action "${tmp}/justified-mixed-out.json")" != "comment" ]]; then
    echo "FAIL justified-mixed: surviving judgment finding must yield comment/needs-human" >&2
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
" "${FULLSEND_CONFIG_DIR}/schemas/sticky-input.schema.json" "${tmp}/justified-pp-out.json"; then
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
" "${FULLSEND_CONFIG_DIR}/schemas/sticky-input.schema.json" "${tmp}/justified-reject-out.json"; then
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

  # Prior-findings projection: what the next re-review is allowed to know.
  _projection_of() {
    jq -r '.body' "$1" | grep -E '^<!-- fullsend:review-findings-v2:[A-Za-z0-9+/=]+ -->$' \
      | sed -E 's/^<!-- fullsend:review-findings-v2:(.*) -->$/\1/' | base64 --decode
  }
  printf '%s' '{"action":"request-changes","body":"## Review\n\n<!-- fullsend:review-findings-v2:AAAA -->\nreal text <!-- sticky:history-start -->","findings":[{"severity":"high","category":"off-by-one","file":"a.ts","line":3,"description":"d"},{"severity":"medium","category":"scope-creep","file":"N/A","description":"d"},{"severity":"low","category":"sub-agent-failure","file":"N/A","description":"challenger"},{"severity":"medium","category":"protected-path","file":".github/x.yml","description":"d"},{"severity":"medium","category":"scope-exceeded","dimension":"orchestrator","file":"N/A","description":"d"}]}' > "${tmp}/proj.json"
  append_prior_findings_projection "${tmp}/proj.json" "${tmp}/proj.json" > "${tmp}/proj-out.json"
  if [[ "$(_projection_of "${tmp}/proj-out.json")" != '{"version":2,"action":"request-changes","findings":[{"severity":"high","category":"off-by-one","file":"a.ts","line":3},{"severity":"medium","category":"scope-creep","file":null}]}' ]]; then
    echo "FAIL projection: dimension findings were not projected as structured v2 records" >&2
    fail=1
  elif [[ "$(jq -r '.body' "${tmp}/proj-out.json" | grep -c -E 'review-findings-v[12]:|sticky:history')" -ne 1 ]]; then
    echo "FAIL projection: a reserved marker in the body survived next to the real one" >&2
    fail=1
  else
    echo "PASS findings project to one structured marker and reserved strings are stripped"
  fi

  # Every registry category projects, so ODH dimensions keep their prior findings.
  local registry_category
  registry_category="$(jq -r '[.dimensions[] | select(.kind == "llm-skill") | .categories[]?][0] // empty' "${FULLSEND_CONFIG_DIR}/dimensions.json")"
  jq -cn --arg c "${registry_category}" '{action:"comment",body:"b",findings:[{severity:"medium",category:$c,file:"a.tsx",description:"d"}]}' > "${tmp}/proj-odh.json"
  append_prior_findings_projection "${tmp}/proj-odh.json" "${tmp}/proj-odh.json" > "${tmp}/proj-odh-out.json"
  if [[ -z "${registry_category}" ]] || ! _projection_of "${tmp}/proj-odh-out.json" | jq -e --arg c "${registry_category}" '.findings[0].category == $c' >/dev/null; then
    echo "FAIL projection: a category owned by an ODH registry row was not projected" >&2
    fail=1
  else
    echo "PASS registry-owned categories project"
  fi

  # A category no registry row owns, or a dimension that failed, makes the
  # projection lossy: emit the withheld marker so the next run reviews from
  # scratch.
  printf '%s' '{"action":"comment","body":"b","findings":[{"severity":"medium","category":"made-up-category","file":"a.ts","description":"d"}]}' > "${tmp}/proj-unknown.json"
  append_prior_findings_projection "${tmp}/proj-unknown.json" "${tmp}/proj-unknown.json" > "${tmp}/proj-unknown-out.json"
  printf '%s' '{"action":"approve","body":"b"}' > "${tmp}/proj-filtered.json"
  printf '%s' '{"action":"approve","body":"b","findings":[{"severity":"info","category":"sub-agent-failure","file":"N/A","description":"docs-currency returned nothing"}]}' > "${tmp}/proj-unfiltered.json"
  append_prior_findings_projection "${tmp}/proj-filtered.json" "${tmp}/proj-unfiltered.json" > "${tmp}/proj-failed-out.json"
  printf '%s' '{"action":"approve","body":"b","findings":[{"severity":"info","category":"sub-agent-failure","dimension":"orchestrator","file":"N/A","description":"docs-currency returned nothing"}]}' > "${tmp}/proj-unfiltered-orch.json"
  append_prior_findings_projection "${tmp}/proj-filtered.json" "${tmp}/proj-unfiltered-orch.json" > "${tmp}/proj-failed-orch-out.json"
  printf '%s' '{"action":"failure","reason":"tool-failure","body":"b"}' > "${tmp}/proj-failure.json"
  append_prior_findings_projection "${tmp}/proj-failure.json" "${tmp}/proj-failure.json" > "${tmp}/proj-failure-out.json"
  local withheld='{"version":2,"withheld":true}'
  if [[ "$(_projection_of "${tmp}/proj-unknown-out.json")" != "${withheld}" || "$(_projection_of "${tmp}/proj-failed-out.json")" != "${withheld}" || "$(_projection_of "${tmp}/proj-failed-orch-out.json")" != "${withheld}" || "$(_projection_of "${tmp}/proj-failure-out.json")" != "${withheld}" ]]; then
    echo "FAIL projection: a lossy or failed review did not carry the withheld marker" >&2
    fail=1
  elif [[ "$(jq -r '.body' "${tmp}/proj-failed-out.json" | sed 1d)" != "b" || "$(jq -r '.body' "${tmp}/proj-failed-out.json" | grep -c 'review-findings-v')" -ne 1 ]]; then
    echo "FAIL projection: the withheld marker is not the single first line of an otherwise unchanged body" >&2
    fail=1
  else
    echo "PASS lossy, failed-dimension and failure results carry a withheld marker"
  fi

  # The agent definition has the agent drop below-threshold findings, so an
  # info-tier failure may never reach the result. result.producers still shows it.
  printf '%s' '{"action":"approve","body":"b","findings":[{"severity":"low","category":"logic-error","file":"a.ts","description":"d"}],"producers":{"dispatched":["correctness","docs-currency","rating"],"adapters":[],"skipped":[],"returned":["correctness","rating"]}}' > "${tmp}/proj-unreturned.json"
  printf '%s' '{"action":"approve","body":"b","findings":[{"severity":"low","category":"logic-error","file":"a.ts","description":"d"}],"producers":{"dispatched":["correctness","docs-currency","rating","coderabbit"],"adapters":[],"skipped":[],"returned":["correctness"],"raised":{"docs-currency":[]}}}' > "${tmp}/proj-returned.json"
  append_prior_findings_projection "${tmp}/proj-unreturned.json" "${tmp}/proj-unreturned.json" > "${tmp}/proj-unreturned-out.json"
  append_prior_findings_projection "${tmp}/proj-returned.json" "${tmp}/proj-returned.json" > "${tmp}/proj-returned-out.json"
  if [[ "$(_projection_of "${tmp}/proj-unreturned-out.json")" != "${withheld}" ]]; then
    echo "FAIL projection: a findings row dispatched but not returned still emitted a projection" >&2
    fail=1
  elif ! _projection_of "${tmp}/proj-returned-out.json" | jq -e '.findings | length == 1' >/dev/null; then
    echo "FAIL projection: a non-findings row missing from returned withheld the projection" >&2
    fail=1
  else
    echo "PASS a findings row dispatched but not returned withholds the projection"
  fi

  # The approve gate refuses a file list it cannot show to be whole.
  if pr_file_list_incomplete 3000 3000 || pr_file_list_incomplete 3001 3000 \
    || ! pr_file_list_incomplete 3000 3412 || ! pr_file_list_incomplete 12 "" \
    || ! pr_file_list_incomplete "" 12 || ! pr_file_list_incomplete 12 "null"; then
    echo "FAIL file-list: a cut-off or uncounted file list was treated as complete" >&2
    fail=1
  else
    echo "PASS approve gate treats a cut-off or uncounted file list as incomplete"
  fi

  # Round trip: the stock pre-script accepts what this script writes, ids
  # included. Its validator needs bash 4 and the forge environment, so run only
  # the jq program it validates a decoded marker with.
  local stock_pre="${FULLSEND_CONFIG_DIR}/scripts/stock/pre-review.sh" stock_filter
  stock_filter="$(awk '
    /jq -ce --argjson marker_version "\$\{marker_version\}" \x27$/ && !started {started = 1; next}
    started && /^  \x27 > "\$\{tmp_file\}"; then$/ {exit}
    started {print}' "${stock_pre}" 2>/dev/null || true)"
  jq -cn '{action:"request-changes",body:"b",findings:[
    {severity:"high",category:"off-by-one",file:"a.ts",line:3,description:"d",id:"f_1db6e46ed513e263",actionable:true,dimension:"correctness"},
    {severity:"medium",category:"scope-creep",file:"N/A",description:"d",dimension:"intent-coherence,correctness",id:"f_1db6e46ed513e263"},
    {severity:"medium",category:"coderabbit",file:"b.ts",line:"9",description:"d",dimension:"coderabbit"}]}' > "${tmp}/proj-stock.json"
  append_prior_findings_projection "${tmp}/proj-stock.json" "${tmp}/proj-stock.json" > "${tmp}/proj-stock-out.json"
  if [[ -z "${stock_filter}" ]]; then
    echo "FAIL projection: no marker validator found in scripts/stock/pre-review.sh" >&2
    fail=1
  elif [[ "$(_projection_of "${tmp}/proj-stock-out.json")" != '{"version":2,"action":"request-changes","findings":[{"severity":"high","category":"off-by-one","file":"a.ts","id":"f_1db6e46ed513e263","line":3,"actionable":true,"dimension":"correctness"},{"severity":"medium","category":"scope-creep","file":null}]}' ]]; then
    echo "FAIL projection: ids were not carried, or a host adapter finding reached the marker" >&2
    fail=1
  elif ! _projection_of "${tmp}/proj-stock-out.json" | jq -ce --argjson marker_version 2 "${stock_filter}" \
      | jq -e '(.findings | length == 2) and .findings[0].id == "f_1db6e46ed513e263" and .action == "request-changes"' >/dev/null \
    || ! _projection_of "${tmp}/proj-out.json" | jq -ce --argjson marker_version 2 "${stock_filter}" >/dev/null; then
    echo "FAIL projection: the stock pre-review validator rejected the marker post-review.sh wrote" >&2
    fail=1
  elif _projection_of "${tmp}/proj-stock-out.json" | jq -c '.findings += [{severity:"low",category:"coderabbit",file:"b.ts"}]' \
      | jq -ce --argjson marker_version 2 "${stock_filter}" >/dev/null 2>&1; then
    echo "FAIL projection: the stock validator accepted a coderabbit category, so the exclusion is untested" >&2
    fail=1
  elif printf '%s' "${withheld}" | jq -ce --argjson marker_version 2 "${stock_filter}" >/dev/null 2>&1; then
    echo "FAIL projection: the stock validator accepted the withheld sentinel, so a lossy review would not force a first review" >&2
    fail=1
  else
    echo "PASS projection carries ids, leaves out host adapter findings and passes the stock pre-review validator"
  fi

  # ---------------------------------------------------------------------------
  # normalize_stock_result: stock result + side files + host files -> sticky
  # input. Each case gets its own run directory and config directory.
  # ---------------------------------------------------------------------------
  local sha="85e0a624c3102f71836b6c3c117557a78cda5700" case_dir norm out
  # Usage: norm_setup <name> — a clean run: no findings, every side file valid,
  # both adapters ok. Cases edit the files before norm_run.
  norm_setup() {
    case_dir="${tmp}/norm-$1"
    mkdir -p "${case_dir}/config/.run" "${case_dir}/output/odh"
    cp "${FULLSEND_CONFIG_DIR}/dimensions.json" "${FULLSEND_CONFIG_DIR}/rating-policy.json" "${case_dir}/config/"
    jq '{version: 1, personas: ([.dimensions[] | select(.kind != "cli-adapter")
          | {name: .id, role: "dimension"}
            + (if (.id | IN("security", "rbac-review", "style-review", "docs-currency", "cross-repo-contracts", "intent-coherence")) then {} else {always: true} end)]
          + [{name: "challenger", role: "synthesis"}])}' \
      "${FULLSEND_CONFIG_DIR}/dimensions.json" > "${case_dir}/personas.json"
    jq -n --arg sha "${sha}" '{action: "request-changes", pr_number: 117, repo: "o/r", head_sha: $sha,
      body: "AGENT BODY", findings: [], risk_assessment: {score: 2, level: "moderate"}}' > "${case_dir}/output/agent-result.json"
    printf '%s' '[{"id":"jira-snapshot","dimension":"jira-snapshot","kind":"cli-adapter","output":"context","status":"none","reason":"no-issue-key"},{"id":"coderabbit","dimension":"coderabbit","kind":"cli-adapter","output":"findings","status":"ok","findings":[]}]' > "${case_dir}/config/.run/collected.json"
    printf '%s' '{"risk":{"level":"low","why":"One internal helper changes."},"confidence":{"level":"high","why":"The diff matches the stated intent."},"change_summary":"The diff adds a getPageItems helper and getLastPage."}' > "${case_dir}/output/odh/rating.json"
    printf '%s' '{"product_ask":{"status":"aligned","aligned":["The PR does what the issue asks."],"mismatched":[],"needs_human":false}}' > "${case_dir}/output/odh/product-ask-review.json"
    printf '%s' '{"check":{"id":"test-impact","status":"pass","summary":"Unit tests cover the helper.","details":["Automation: pass.","Could not verify image evidence: the screenshot was not available."]}}' > "${case_dir}/output/odh/test-impact-review.json"
    printf '%s' '{"check":{"id":"pr-description","status":"pass","summary":"Problem, Solution and Evidence are present."}}' > "${case_dir}/output/odh/pr-description-review.json"
  }
  # Usage: norm_run — writes ${norm} (sticky input) and ${out} (transformed).
  norm_run() {
    norm="${case_dir}/normalized.json"
    out="${case_dir}/out.json"
    (
      export FULLSEND_CONFIG_DIR="${case_dir}/config"
      unset FULLSEND_PERSONAS_FILE
      cd "${case_dir}"
      normalize_stock_result output/agent-result.json output/odh "$(find_personas_file output/agent-result.json)" output/../transcripts > "${norm}"
      transform_review_result "${norm}" > "${out}"
    )
    body=$(jq -r '.body // ""' "${out}")
  }
  sticky_input_valid() {
    python3 -c "
import json, sys
from jsonschema import Draft202012Validator
Draft202012Validator(json.load(open(sys.argv[1], encoding='utf-8'))).validate(json.load(open(sys.argv[2], encoding='utf-8')))
" "${FULLSEND_CONFIG_DIR}/schemas/sticky-input.schema.json" "$1"
  }
  # Usage: norm_expect <label> <jq filter on the transformed result> [body regex...]
  norm_expect() {
    local label="$1" filter="$2" pattern
    shift 2
    if ! jq -e "${filter}" "${out}" >/dev/null; then
      echo "FAIL normalize ${label}: ${filter}" >&2
      fail=1
      return
    fi
    for pattern in "$@"; do
      if ! grep -qE -- "${pattern}" <<<"${body}"; then
        echo "FAIL normalize ${label}: body lacks ${pattern}" >&2
        fail=1
        return
      fi
    done
    echo "PASS normalize ${label}"
  }

  # Clean run: the agent's action and body are ignored, the challenger was
  # skipped, the host approves.
  norm_setup clean
  norm_run
  if ! sticky_input_valid "${norm}"; then
    echo "FAIL normalize clean: sticky input is not schema-valid" >&2
    fail=1
  elif grep -q 'AGENT BODY' <<<"${body}" || jq -e 'has("risk_assessment")' "${norm}" >/dev/null; then
    echo "FAIL normalize clean: the agent body or a stock-only field reached the sticky" >&2
    fail=1
  else
    norm_expect "clean run approves from side files" \
      '.action == "approve" and .change_summary == "The diff adds a getPageItems helper and getLastPage."
       and .risk.level == "low" and .confidence.level == "high" and .product_ask.status == "aligned"
       and ([.checks[].id] == ["test-impact-review", "pr-description-review"])
       and .producers.challenger == {"status": "skipped", "reason": "no findings to adjudicate"}
       and (.producers.dispatched | index("correctness") and index("rating") and index("product-ask-review") and index("test-impact-review"))
       and ([.producers.skipped[] | select(.id == "rbac-review")][0].reason == "no findings or not selected")
       and (.inspected.could_not_verify | index("Could not verify image evidence: the screenshot was not available."))' \
      '^Skipped — no findings to adjudicate\.$' \
      '^\| Test impact \| ✅ pass \|' \
      '^\| RBAC \| findings \| ➖ \| no findings or not selected \|' \
      '^\| Jira \| context \| ⚪ \| no issue key \|' \
      '^\| CodeRabbit \| findings \| ✅ \| No findings\. \|'
  fi

  # Full run: findings with ids, challenger audit, CodeRabbit finding.
  norm_setup full
  jq '.findings = [
      {severity: "medium", category: "off-by-one", file: "frontend/src/utilities/pageRange.ts", line: 5, description: "The slice bounds skip the first page.", remediation: "Use (page - 1) * perPage.", actionable: true, dimension: "correctness", id: "f_1db6e46ed513e263"},
      {severity: "low", category: "naming-convention", file: "frontend/src/utilities/pageRange.ts", line: 13, description: "Merged naming note.", actionable: false, dimension: "style-conventions", id: "f_7aff804f420b4abd"}]' \
    "${case_dir}/output/agent-result.json" > "${case_dir}/r.json" && mv "${case_dir}/r.json" "${case_dir}/output/agent-result.json"
  jq -n '
    {severity: "medium", category: "off-by-one", file: "frontend/src/utilities/pageRange.ts", line: 5, description: "The slice bounds skip the first page.", actionable: true, dimension: "correctness"} as $kept
    | {severity: "low", category: "naming-convention", file: "frontend/src/utilities/pageRange.ts", line: 13, description: "Merged naming note.", dimension: "style-conventions"} as $survivor
    | {severity: "low", category: "naming-convention", file: "frontend/src/utilities/pageRange.ts", line: 14, description: "Same naming note again.", dimension: "style-conventions"} as $absorbed
    | {severity: "high", category: "xss", file: "a.tsx", line: 2, description: "Unescaped <b>html</b> @someone.", dimension: "security"} as $removed
    | {severity: "medium", category: "missing-test", file: "b.ts", description: "No test for the helper.", dimension: "correctness"} as $justified
    | {as_raised: [$kept, $survivor, $absorbed, $removed, $justified],
       adjudicated: [
         $kept + {challenger_action: "kept", challenger_reason: "Reproduced."},
         $survivor + {challenger_action: "merged", challenger_reason: "Same note twice."},
         $absorbed + {challenger_action: "merged", challenger_reason: "Same note twice.", merged_into: {category: "naming-convention", file: "frontend/src/utilities/pageRange.ts", line: 13}},
         $removed + {challenger_action: "removed", challenger_reason: "The value is escaped by React."},
         $justified + {challenger_action: "justified", challenger_reason: "The PR Justifications explain the follow-up test PR."},
         {challenger_action: "removed"}, "junk"]}' > "${case_dir}/output/odh/challenger.json"
  printf '%s' '[{"id":"jira-snapshot","kind":"cli-adapter","output":"context","status":"ok"},{"id":"coderabbit","kind":"cli-adapter","output":"findings","status":"ok","findings":[{"severity":"low","category":"coderabbit","file":"frontend/src/x.ts","line":"8","description":"Handle the rejected promise.","actionable":true},{"severity":"bogus","file":"y.ts","description":"dropped"}]}]' > "${case_dir}/config/.run/collected.json"
  norm_run
  if ! sticky_input_valid "${norm}"; then
    echo "FAIL normalize full: sticky input is not schema-valid" >&2
    fail=1
  elif grep -q '  - Why:' <<<"${body}" || grep -q '<b>html' <<<"${body}" || grep -q '@someone' <<<"${body}"; then
    echo "FAIL normalize full: a Why line was rendered without a why, or side-file text was not escaped" >&2
    fail=1
  else
    norm_expect "full run folds side files, audit and CodeRabbit into the sticky" \
      '.action == "comment" and (.findings | length == 3)
       and (.findings[2] | .dimension == "coderabbit" and .category == "coderabbit" and .line == 8 and (has("id") | not))
       and .findings[0].id == "f_1db6e46ed513e263"
       and (.producers.challenger | .status == "ran" and .input == 5 and .kept == 2 and .removed == 2 and .merged == 1 and .downgraded == 0
            and ([.removed_findings[].challenger_action] == ["removed", "justified"]))
       and (.producers.raised | (.correctness | length == 2) and (.security | length == 1) and (."style-conventions" | length == 2) and (.coderabbit | length == 1))
       and (.producers.dispatched | index("security"))
       and ([.producers.adapters[].status] == ["ok", "ok"])' \
      '^### Justified \(1\)$' \
      '  - Justification: The PR Justifications explain the follow-up test PR\.' \
      '^Adjudicated 5 findings; kept 2 \(removed 1, justified 1, merged 1\)\.$' \
      '  - Removal reason: The value is escaped by React\.' \
      '^\| CodeRabbit \| findings \| ✅ \| 1 finding: coderabbit \|' \
      '^\| Security \| findings \| ✅ \| 1 finding: xss \|' \
      'Needs human judgment'
  fi
  # The marker for the next run: ids carried, CodeRabbit left out, inline
  # comments still suppressed in the copy handed to the CLI.
  append_prior_findings_projection "${out}" "${norm}" > "${case_dir}/projected.json"
  prepare_summary_only_result "${case_dir}/projected.json" "${case_dir}/posted.json"
  if [[ "$(_projection_of "${case_dir}/projected.json")" != '{"version":2,"action":"comment","findings":[{"severity":"medium","category":"off-by-one","file":"frontend/src/utilities/pageRange.ts","id":"f_1db6e46ed513e263","line":5,"actionable":true,"dimension":"correctness"},{"severity":"low","category":"naming-convention","file":"frontend/src/utilities/pageRange.ts","id":"f_7aff804f420b4abd","line":13,"actionable":false,"dimension":"style-conventions"}]}' ]]; then
    echo "FAIL normalize marker: expected the two reviewer findings with ids and no CodeRabbit finding" >&2
    fail=1
  elif ! _projection_of "${case_dir}/projected.json" | jq -ce --argjson marker_version 2 "${stock_filter}" >/dev/null; then
    echo "FAIL normalize marker: the stock pre-review validator rejected it" >&2
    fail=1
  elif jq -e '[.findings[] | select(has("line"))] | length > 0' "${case_dir}/posted.json" >/dev/null; then
    echo "FAIL normalize marker: a line number reached the CLI payload" >&2
    fail=1
  else
    echo "PASS normalize marker carries ids, leaves CodeRabbit out, and the CLI payload has no line numbers"
  fi

  # Each side file missing, then malformed.
  local variant
  for variant in missing malformed; do
    norm_break() {
      if [[ "${variant}" == "missing" ]]; then rm -f "${case_dir}/output/odh/$1.json"; else printf '%s' "$2" > "${case_dir}/output/odh/$1.json"; fi
    }
    norm_setup "${variant}-rating"
    norm_break rating '{"risk":"low","confidence":{"level":"certain","why":"x"},"change_summary":7}'
    norm_run
    norm_expect "${variant} rating.json refuses approve" \
      '.action == "comment" and .risk.level == "medium" and .confidence.level == "low"
       and .change_summary == "No change summary was recorded for this run."
       and ([.producers.skipped[] | select(.id == "rating")][0].reason == "did not report")' \
      'Cannot approve.*low confidence' '^\| Rating \| signal \| ➖ \| did not report \|'

    norm_setup "${variant}-test-impact"
    norm_break test-impact-review '{"check":{"status":"passed","summary":["x"]}}'
    norm_run
    norm_expect "${variant} test-impact-review.json is could-not-verify and refuses approve" \
      '.action == "comment" and ([.checks[] | select(.id == "test-impact-review")][0].status == "could-not-verify") and .confidence.level == "medium"' \
      '^\| Test impact \| ❔ could-not-verify \| Test impact (did not report a result for this run|wrote a result the host could not read)\.'

    norm_setup "${variant}-pr-description"
    norm_break pr-description-review '[]'
    norm_run
    norm_expect "${variant} pr-description-review.json is could-not-verify and refuses approve" \
      '.action == "comment" and ([.checks[] | select(.id == "pr-description-review")][0].status == "could-not-verify")' \
      '^\| PR description \| ❔ could-not-verify \|'

    norm_setup "${variant}-product-ask"
    norm_break product-ask-review '{"product_ask":{"status":"fine","needs_human":"no"}}'
    norm_run
    if grep -q '^## Product ask' <<<"${body}"; then
      echo "FAIL normalize ${variant} product-ask-review.json: a product-ask section was rendered" >&2
      fail=1
    else
      norm_expect "${variant} product-ask-review.json renders no section and does not change the verdict" \
        '.action == "approve" and (has("product_ask") | not) and (.inspected.could_not_verify | any(startswith("Product ask ")))' \
        '^\| Product ask \| section \| ➖ \| did not report \|'
    fi

    norm_setup "${variant}-challenger"
    jq '.findings = [{severity: "low", category: "naming-convention", file: "a.ts", line: 3, description: "Name it better.", actionable: false, dimension: "style-conventions"}]' \
      "${case_dir}/output/agent-result.json" > "${case_dir}/r.json" && mv "${case_dir}/r.json" "${case_dir}/output/agent-result.json"
    norm_break challenger '{"as_raised":"none","adjudicated":{}}'
    norm_run
    if [[ "${variant}" == "missing" ]]; then
      norm_expect "missing challenger.json with findings is a skipped challenger and raised falls back to the findings" \
        '.action == "approve" and .producers.challenger.status == "skipped" and (.producers.raised."style-conventions" | length == 1)' \
        '^Skipped — no challenger audit was recorded' '^\| Style conventions \| findings \| ✅ \| 1 finding: naming-convention \|'
    else
      norm_expect "malformed challenger.json is a challenger without counts" \
        '.action == "approve" and .producers.challenger == {"status": "ran"} and (.producers.raised."style-conventions" | length == 1)' \
        '^Challenger ran, but adjudication counts were not recorded\.$'
    fi
  done

  # A mismatch the product-ask reviewer reports floors confidence on the host.
  norm_setup product-ask-floor
  printf '%s' '{"product_ask":{"status":"mismatch-unjustified","mismatched":["The issue asks for a different page."]}}' > "${case_dir}/output/odh/product-ask-review.json"
  norm_run
  norm_expect "unjustified product-ask mismatch floors confidence and refuses approve" \
    '.action == "comment" and .confidence.level == "low" and .product_ask.needs_human == true' '^## Product ask$'

  # CodeRabbit adapter error refuses approve; no collected.json is not an error.
  norm_setup adapter-error
  printf '%s' '[{"id":"coderabbit","kind":"cli-adapter","output":"findings","status":"error","reason":"cli-unavailable","findings":[]}]' > "${case_dir}/config/.run/collected.json"
  norm_run
  norm_expect "CodeRabbit adapter error refuses approve" \
    '.action == "comment" and .confidence.level == "medium"' \
    'Review incomplete' '^\| CodeRabbit \| findings \| ❌ \| cli unavailable \|' '^\| Jira \| context \| ⚪ \| not run \|'
  norm_setup no-collected
  rm -f "${case_dir}/config/.run/collected.json"
  norm_run
  norm_expect "absent collected.json means no adapter ran, not an adapter error" \
    '.action == "approve" and ([.producers.adapters[].status] == ["skipped", "skipped"])' \
    '^\| CodeRabbit \| findings \| ⚪ \| not run \|'

  # CodeRabbit findings with no reviewer findings: the challenger skip is not
  # read as a contradiction.
  norm_setup coderabbit-only
  printf '%s' '[{"id":"coderabbit","kind":"cli-adapter","output":"findings","status":"ok","findings":[{"severity":"high","category":"coderabbit","file":"x.ts","description":"Guard the empty list.","remediation":"if (!items.length) {\n  return null;\n}"}]}]' > "${case_dir}/config/.run/collected.json"
  norm_run
  norm_expect "CodeRabbit finding alone counts toward the verdict without a challenger contradiction" \
    '.action == "request-changes" and .confidence.level == "high"' \
    '^Skipped — no reviewer findings to adjudicate \(host adapter findings are not challenged\)\.$'

  # A side-file persona reported as failed although its side file is valid ran;
  # without the side file the failure stands.
  norm_setup side-file-failure
  jq '.findings = [{severity: "info", category: "sub-agent-failure", file: "N/A", description: "rating returned no findings.", dimension: "rating"},
                   {severity: "info", category: "sub-agent-failure", file: "N/A", description: "pr-description-review returned no findings.", dimension: "pr-description-review"},
                   {severity: "info", category: "sub-agent-failure", file: "N/A", description: "docs-currency timed out.", dimension: "docs-currency"}]' \
    "${case_dir}/output/agent-result.json" > "${case_dir}/r.json" && mv "${case_dir}/r.json" "${case_dir}/output/agent-result.json"
  rm -f "${case_dir}/output/odh/pr-description-review.json"
  norm_run
  norm_expect "a failure finding for a side-file persona is dropped only when its side file is valid" \
    '([.findings[].dimension] == ["pr-description-review", "docs-currency"]) and (.producers.dispatched | index("rating"))
     and ([.producers.skipped[] | select(.id == "docs-currency" or .id == "pr-description-review") | .reason] | unique == ["did not return a result (sub-agent failure)"])' \
    '^\| Docs currency \| findings \| ➖ \| did not return a result \(sub-agent failure\) \|'

  # Challenger failure recorded by the stock orchestrator.
  norm_setup challenger-failed
  jq '.findings = [{severity: "low", category: "sub-agent-failure", file: "N/A", description: "The challenger sub-agent did not return findings: timeout. Using pre-challenger finding set.", actionable: false}]' \
    "${case_dir}/output/agent-result.json" > "${case_dir}/r.json" && mv "${case_dir}/r.json" "${case_dir}/output/agent-result.json"
  norm_run
  norm_expect "stock challenger-failure finding is a failed challenger" \
    '.producers.challenger == {"status": "failed"}' '^Challenger failed; using the pre-challenger finding set\.$'

  # Change summary longer than the contract allows is cut to 500 characters.
  norm_setup long-summary
  jq --arg s "$(printf 'word %.0s' $(seq 1 200))" '.change_summary = $s' "${case_dir}/output/odh/rating.json" > "${case_dir}/r.json" && mv "${case_dir}/r.json" "${case_dir}/output/odh/rating.json"
  norm_run
  norm_expect "change summary is cut to 500 characters" '(.change_summary | length) == 500 and (.change_summary | endswith("…"))'

  # No manifest: nothing is claimed to have run without evidence.
  norm_setup no-manifest
  rm -f "${case_dir}/personas.json"
  norm_run
  norm_expect "without a persona manifest a reviewer with no evidence is not shown as ran" \
    '.action == "approve" and (.producers.dispatched | index("correctness") | not)' \
    '^\| Correctness \| findings \| ➖ \| no findings or not selected \|'

  # action: failure keeps the failure path; an unreadable result becomes one.
  norm_setup failure
  printf '%s' '{"action":"failure","reason":"time-budget","pr_number":117,"repo":"o/r"}' > "${case_dir}/output/agent-result.json"
  norm_run
  norm_expect "action failure takes the failure path" \
    '.action == "failure" and .reason == "time-budget" and (has("findings") | not)' \
    'This review did not complete \(`time-budget`\)'
  norm_setup unreadable
  printf '%s' '[not json' > "${case_dir}/output/agent-result.json"
  norm_run
  norm_expect "unreadable agent result becomes a failure notice" '.action == "failure" and .reason == "tool-failure"'

  # TODO buckets come from the normalized data; a clean run has no TODO.
  norm_setup todo
  jq '.findings = [
      {severity: "high", category: "logic-error", file: "a.ts", line: 4, description: "Empty list throws.", remediation: "Guard the\nempty list.", actionable: true, dimension: "correctness"},
      {severity: "medium", category: "edge-case", file: "N/A", description: "No handling for <b>zero</b> pages.", dimension: "correctness"},
      {severity: "low", category: "naming-convention", file: "b.ts", description: "Rename tmp.", actionable: true, dimension: "style-conventions"},
      {severity: "low", category: "doc-style", file: "c.md", description: "Not actionable.", actionable: false, dimension: "style-conventions"}]' \
    "${case_dir}/output/agent-result.json" > "${case_dir}/r.json" && mv "${case_dir}/r.json" "${case_dir}/output/agent-result.json"
  printf '%s' '{"check":{"id":"test-impact","status":"fail","summary":"No test covers the new helper."}}' > "${case_dir}/output/odh/test-impact-review.json"
  rm -f "${case_dir}/output/odh/pr-description-review.json"
  printf '%s' '{"risk":{"level":"high","why":"Shared pagination helper."},"confidence":{"level":"low","why":"No proof."},"change_summary":"s"}' > "${case_dir}/output/odh/rating.json"
  printf '%s' '{"product_ask":{"status":"mismatch-justified","needs_human":true}}' > "${case_dir}/output/odh/product-ask-review.json"
  printf '%s' '[{"id":"coderabbit","kind":"cli-adapter","output":"findings","status":"ok","findings":[{"severity":"info","category":"coderabbit","file":"d.ts","line":"2","description":"Drop the unused import.","actionable":true}]}]' > "${case_dir}/config/.run/collected.json"
  norm_run
  if grep -q '<b>zero' <<<"${body}"; then
    echo "FAIL normalize todo: TODO text was not escaped" >&2
    fail=1
  else
    norm_expect "TODO buckets are built on the host" \
      '([.todo[] | select(.category == "findings") | .text] == ["a.ts:4: Guard the empty list.", "No handling for <b>zero</b> pages."])
       and ([.todo[] | select(.category == "checks") | .text] == ["No test covers the new helper."])
       and ([.todo[] | select(.category == "judgement")] | length == 4)
       and ([.todo[] | select(.category == "nits") | .text] == ["b.ts: Rename tmp.", "d.ts:2: Drop the unused import."])' \
      '^## TODO$' '^- a\.ts:4: Guard the empty list\.$' '^- No test covers the new helper\.$' \
      '^- Verify PR description by hand: ' '^- A human must decide whether to approve: risk is high\.' \
      '^- A human must decide whether to approve: confidence is low\.' '^- Decide whether the PR can go ahead' \
      '^- d\.ts:2: Drop the unused import\.$'
  fi
  norm_setup todo-empty
  norm_run
  if grep -q '^## TODO' <<<"${body}"; then
    echo "FAIL normalize todo-empty: a clean run rendered a TODO section" >&2
    fail=1
  else
    norm_expect "a clean run has no TODO" '.action == "approve" and (has("todo") | not)'
  fi

  # Transcripts are the dispatch evidence when the directory is there.
  norm_setup transcripts
  mkdir -p "${case_dir}/transcripts"
  : > "${case_dir}/transcripts/review-2026-11-24T20-12-50-827Z_01a2.jsonl"
  : > "${case_dir}/transcripts/review-sub1-security-2026-11-24T20-19-17-256Z_01a2.jsonl"
  : > "${case_dir}/transcripts/review-sub2-style-conventions-2026-11-24T20-19-17-350Z_01a2.jsonl"
  : > "${case_dir}/transcripts/review-sub3-pr-description-review-2026-11-24T20-19-18-350Z_01a2.jsonl"
  rm -f "${case_dir}/output/odh/pr-description-review.json"
  norm_run
  norm_expect "transcripts decide which reviewers were dispatched" \
    '(.producers.dispatched | index("security") and index("style-conventions") and (index("correctness") | not))
     and ([.producers.skipped[] | select(.id == "correctness" or .id == "rbac-review") | .reason] == ["not selected", "not selected"])' \
    '^\| Security \| findings \| ✅ \| No findings\. \|' '^\| Correctness \| findings \| ➖ \| not selected \|' \
    '^\| PR description \| check \| ➖ \| ran but did not report \|'

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
# Fold the stock result, the personas' side files and the host adapter output
# into the sticky input. Everything below works on that object.
NORMALIZED_RESULT=$(mktemp)
CLEANUP_FILES+=("${NORMALIZED_RESULT}")
normalize_stock_result "${RESULT_FILE}" "$(dirname "${RESULT_FILE}")/odh" \
  "$(find_personas_file "${RESULT_FILE}")" "$(dirname "${RESULT_FILE}")/../transcripts" > "${NORMALIZED_RESULT}"
RESULT_FILE="${NORMALIZED_RESULT}"
# The severity filter below can drop an info-level sub-agent-failure. Keep the
# unfiltered result so the projection still sees every failed dimension.
UNFILTERED_RESULT_FILE="${RESULT_FILE}"

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
# Use the paginated /pulls/{n}/files REST endpoint rather than the
# `gh pr view --json files` summary field: that field stops at 100 files, and
# fullsend-ai/fullsend#2093 found empty results correlated with recent
# merge-commit updates. The files endpoint reflects the computed diff more
# directly.
fetch_pr_files() {
  local files
  if ! files=$(gh api "repos/${REPO_FULL_NAME}/pulls/${PR_NUMBER}/files" \
    --paginate --jq '.[].filename' 2>/dev/null); then
    return 1
  fi
  [[ -n "${files}" ]] && printf '%s\n' "${files}"
}
REVIEW_CHANGED_FILES=$(fetch_pr_files) || REVIEW_CHANGED_FILES=""
# Handed to the renderer as a file, not exported: one environment string is
# limited to 128 KiB on Linux, and a larger one fails every later exec.
REVIEW_CHANGED_FILES_FILE=$(mktemp)
CLEANUP_FILES+=("${REVIEW_CHANGED_FILES_FILE}")
printf '%s\n' "${REVIEW_CHANGED_FILES}" > "${REVIEW_CHANGED_FILES_FILE}"
export REVIEW_CHANGED_FILES_FILE
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
  # Reuse the list the renderer adjudicated against (fetch_pr_files above),
  # so the gate and the rendered comment are decided on the same files.
  # A failed first fetch left the list empty, so one check covers both a
  # failure and an empty result.
  PR_FILES="${REVIEW_CHANGED_FILES}"
  if [ -z "${PR_FILES}" ]; then
    # An empty file list may be a transient forge data race. Retry once
    # before refusing to approve, so a genuinely non-empty PR is not failed.
    echo "::notice::PR files came back empty; retrying once in case of a transient forge data race" >&2
    sleep 10
    PR_FILES=$(fetch_pr_files) || PR_FILES=""
  fi
  if [ -z "${PR_FILES}" ]; then
    echo "::error::Failed to fetch PR files or PR has no changed files — refusing to approve (pulls/${PR_NUMBER}/files)" >&2
    exit 1
  fi
  # The list must also be whole: compare it with the PR's own file count.
  PR_FILES_EXPECTED=$(gh api "repos/${REPO_FULL_NAME}/pulls/${PR_NUMBER}" --jq '.changed_files' 2>/dev/null || true)
  PR_FILES_FETCHED=$(printf '%s\n' "${PR_FILES}" | grep -c . || true)
  if pr_file_list_incomplete "${PR_FILES_FETCHED}" "${PR_FILES_EXPECTED}"; then
    [[ "${PR_FILES_EXPECTED}" =~ ^[0-9]+$ ]] || PR_FILES_EXPECTED="an unknown number"
    echo "::error::PR file list is incomplete (${PR_FILES_FETCHED} of ${PR_FILES_EXPECTED} changed files) — refusing to approve" >&2
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

# Make a value safe to print inside a GitHub Actions workflow command.
_gha_sanitize() { printf '%s' "$1" | tr -d '\n\r' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/%/%25/g; s/::/%3A%3A/g'; }

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

    # Decide on the values as given; print only _gha_sanitize copies.
    LA_ACTION_SHOWN=$(_gha_sanitize "${LA_ACTION}")
    LA_LABEL_SHOWN=$(_gha_sanitize "${LA_LABEL}")

    if [[ "${LA_LABEL}" == *::* || ! "${LA_LABEL}" =~ ^[a-zA-Z0-9._/:\ +\-]+$ ]]; then
      echo "::warning::Refused label '${LA_LABEL_SHOWN}' -- contains invalid characters or a double colon"
      continue
    fi

    if is_control_label "${LA_LABEL}"; then
      echo "::warning::Refused to ${LA_ACTION_SHOWN} control label '${LA_LABEL}' -- control labels are managed by the review pipeline"
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
        echo "::warning::Unknown label action '${LA_ACTION_SHOWN}' for label '${LA_LABEL}'"
        ;;
    esac
  done

  # The host-rendered Review details section already explains label_actions.
  # Validation controls which of those proposed mutations are actually synced.
fi

# ---------------------------------------------------------------------------
# Re-review context: put the prior-findings marker on the first line of the
# final body. Runs last so it sees the action and findings that get posted.
# ---------------------------------------------------------------------------
PROJECTED_RESULT=$(mktemp)
CLEANUP_FILES+=("${PROJECTED_RESULT}")
append_prior_findings_projection "${RESULT_FILE}" "${UNFILTERED_RESULT_FILE}" > "${PROJECTED_RESULT}"
RESULT_FILE="${PROJECTED_RESULT}"

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

# ---------------------------------------------------------------------------
# Explicit failure result: the agent could not complete a real review (e.g.
# tool-failure, missing-context, time-budget). The failure notice above was
# published successfully — that is publication success, not review success.
# Propagate a failed task outcome so the run does not report Success for a
# review that never happened. This runs after the stale-label loop: a failed
# run must not leave an earlier run's outcome label in place.
# (fullsend-ai/agents#1612)
# ---------------------------------------------------------------------------
if [ "${ACTION}" = "failure" ]; then
  FAILURE_REASON=$(jq -r '.reason // "unknown"' "${RESULT_FILE}")
  echo "::error::Review result reported action=failure (reason: $(_gha_sanitize "${FAILURE_REASON}")) — failure notice was published, but propagating a failed task outcome (PR #${PR_NUMBER} in ${REPO_FULL_NAME})" >&2
  exit 1
fi

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
