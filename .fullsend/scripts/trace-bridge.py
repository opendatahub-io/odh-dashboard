#!/usr/bin/env python3
"""Turn a Fullsend review artifact into OTLP spans and send them to an OTLP endpoint (MLflow).

Fullsend on the Pi runtime only exports run / sandbox / agent spans. Everything else
we want lives in the `fullsend-review` artifact. This script reads it and adds:

  persona <name>        one per review sub-agent: model, cost, tokens, duration, stop reason,
                        tool counts, files read by category, guidance read and missed
  execute_tool <name>   one per tool call (path or command, file category, duration, error)
  context_coverage      applicable guidance for the PR vs. guidance any sub-agent opened
  review_result         verdict, finding counts, risk, confidence, dispatched / skipped producers

All spans use the run's own trace ID and deterministic span IDs, so a re-run of the
bridge for the same run overwrites instead of duplicating.

The artifact is untrusted data (the sandbox read PR code). It is only parsed as JSON;
nothing from it is executed or interpolated into a shell.

Usage:
  trace-bridge.py --self-test
  trace-bridge.py --artifact DIR [--pr-files FILE] [--guidance FILE] [--pr-author LOGIN]
                  [--run-url URL] [--out FILE] [--no-base-spans] [--dry-run]

Environment:
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT   full URL, e.g. https://mlflow.example/v1/traces
  OTEL_EXPORTER_OTLP_TRACES_HEADERS    "k=v,k2=v2" (URL-encoded values), e.g.
                                       Authorization=Basic%20...,x-mlflow-experiment-id=3
"""
import argparse
import collections
import datetime
import glob
import hashlib
import http.client
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOTS = ("/sandbox/workspace/target-repo/", "/sandbox/workspace/pr-head/")
GUIDANCE_RE = re.compile(
    r"(\.claude/rules/[\w.-]+\.md|\.claude/skills/[\w.-]+/[\w./-]+\.md"
    r"|(?:packages/[\w-]+/)?docs/adr/[\w.-]+\.md|(?:[\w./-]*/)?(?:AGENTS|BOOKMARKS)\.md)"
)
# Values that look like credentials anywhere in an exported string.
SECRET_RE = re.compile(
    r"(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}"
    r"|AKIA[0-9A-Z]{16}|eyJ[\w-]{8,}\.eyJ[\w-]{8,}\.[\w-]{8,}"
    r"|-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)"
    r"|(?i:bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,})"
)
SENSITIVE = r"(?:token|passw(?:or)?d|passwd|secret|api[_-]?key|authorization|auth|credentials?" \
            r"|client[_-]?secret|access[_-]?key|private[_-]?key|cookie|session[_-]?id)"
# key=value, key: value, "key": "value" (JSON) and --key value / --key=value (CLI flags).
# Quantifiers are bounded so redaction stays linear on long, adversarial strings.
SECRET_KV_RE = re.compile(
    r"(?i)((?<![\w-])[\"']?[\w-]{0,40}" + SENSITIVE + r"[\w-]{0,40}[\"']?[ \t]{0,8}[:=][ \t]{0,8})"
    r"(\"[^\"]{0,2000}\"|'[^']{0,2000}'|[^\s,;&|)}\]]{1,2000})")
SECRET_FLAG_RE = re.compile(
    r"(?i)(--[\w-]{0,40}" + SENSITIVE + r"[\w-]{0,40}[ \t]{1,8})(\"[^\"]{0,2000}\"|'[^']{0,2000}'|[^\s-]\S{0,2000})")
SENSITIVE_KEY_RE = re.compile(r"(?i)" + SENSITIVE)
# Tool arguments exported as attributes; anything else (file contents for write/edit, prompts) is dropped.
TOOL_ARG_ALLOWLIST = ("path", "pattern", "glob", "offset", "limit", "description", "subagent_type")
MAX_STR = 1000
# Strings are cut to this before redaction. It is well above MAX_STR, so any secret that
# could survive the final cut is fully inside the scanned window.
MAX_SCAN = 4 * MAX_STR
OTLP_ID_RE = {"traceId": re.compile(r"[0-9a-f]{32}"), "spanId": re.compile(r"[0-9a-f]{16}"),
              "parentSpanId": re.compile(r"[0-9a-f]{16}")}
# Fields kept from Fullsend's own spans; events, links and status messages are dropped.
BASE_SPAN_FIELDS = ("traceId", "spanId", "parentSpanId", "name", "kind", "startTimeUnixNano",
                    "endTimeUnixNano", "flags")
BRIDGE_VERSION = "2"
VERDICTS = ("approve", "request-changes", "comment")
LOOKUP_TIMEOUT = 30


# ---------- helpers ----------

def span_id(trace_id, *parts):
    return hashlib.sha256("/".join((trace_id,) + parts).encode()).hexdigest()[:16]


def num(v):
    """A finite, non-negative number from untrusted JSON, else None (lists, strings,
    booleans and NaN would otherwise be multiplied or exported as-is)."""
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    return v if v == v and 0 <= v < 1e15 else None


def text(v):
    """A short, redacted string from untrusted JSON, else None."""
    return clean(v)[:200] if isinstance(v, str) and v else None


MAX_NS = 2**63 - 1  # OTLP timestamps are fixed64; stay in the signed range receivers accept


def clamp_ns(v):
    return min(max(int(v), 0), MAX_NS)


def otlp_ns(v):
    """An OTLP timestamp string/number -> int ns, or None if malformed."""
    try:
        v = int(v)
    except (TypeError, ValueError):
        return None
    return v if 0 < v <= MAX_NS else None


def ns(ts):
    """ISO string or epoch ms -> epoch ns; None for anything malformed or out of range."""
    try:
        if isinstance(ts, (int, float)) and not isinstance(ts, bool):
            v = int(ts * 1_000_000)
        elif isinstance(ts, str):
            v = int(datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp() * 1e9)
        else:
            return None
    except (ValueError, OverflowError, OSError):
        return None
    return v if 0 < v <= MAX_NS else None


def redact(s):
    s = SECRET_RE.sub("[REDACTED]", str(s)[:MAX_SCAN])
    s = SECRET_KV_RE.sub(lambda m: m.group(1) + "[REDACTED]", s)
    return SECRET_FLAG_RE.sub(lambda m: m.group(1) + "[REDACTED]", s)


def redact_obj(v):
    """Redact a JSON-like value: sensitive keys lose their values, strings are scanned."""
    if isinstance(v, dict):
        # Numbers under sensitive-looking keys (token counts) are kept; text is not.
        return {k: "[REDACTED]" if SENSITIVE_KEY_RE.search(str(k)) and not isinstance(x, (int, float, bool))
                else redact_obj(x) for k, x in v.items()}
    if isinstance(v, list):
        return [redact_obj(x) for x in v]
    return redact(v) if isinstance(v, str) else v


def clean(s):
    s = redact(s)
    return s if len(s) <= MAX_STR else s[:MAX_STR] + "…"


def attr(k, v):
    if isinstance(v, bool):
        val = {"boolValue": v}
    elif isinstance(v, int):
        val = {"intValue": str(v)}
    elif isinstance(v, float):
        val = {"doubleValue": v}
    elif isinstance(v, (list, tuple)):
        val = {"arrayValue": {"values": [{"stringValue": clean(x)} for x in v]}}
    elif isinstance(v, dict):
        val = {"stringValue": clean(json.dumps(redact_obj(v), sort_keys=True))}
    else:
        val = {"stringValue": clean(v)}
    return {"key": k, "value": val}


def attrs(d):
    return [attr(k, v) for k, v in d.items() if v is not None and v != "" and v != []]


def span(trace_id, sid, parent, name, start, end, a, error=False):
    s = {
        "traceId": trace_id, "spanId": sid, "name": name, "kind": 1,
        "startTimeUnixNano": str(clamp_ns(start)), "endTimeUnixNano": str(clamp_ns(max(end, start))),
        "attributes": attrs(a), "status": {"code": 2 if error else 1},
    }
    if parent:
        s["parentSpanId"] = parent
    return s


def sanitize_value(v, sensitive=False):
    """Redact an OTLP AnyValue recursively. Text under a sensitive key is dropped."""
    v = v if isinstance(v, dict) else {}
    if "stringValue" in v:
        return {"stringValue": "[REDACTED]" if sensitive else clean(v["stringValue"])}
    if "arrayValue" in v:
        return {"arrayValue": {"values": [sanitize_value(x, sensitive)
                                          for x in (v["arrayValue"].get("values") or [])]}}
    if "kvlistValue" in v:
        return {"kvlistValue": {"values": [sanitize_attr(x, sensitive)
                                           for x in (v["kvlistValue"].get("values") or [])]}}
    for k in ("intValue", "doubleValue", "boolValue"):
        if k in v:
            return {k: v[k]}
    return {"stringValue": "[REDACTED]"}  # bytesValue or unknown


def sanitize_attr(a, sensitive=False):
    key = str(a.get("key", ""))[:200]
    return {"key": key, "value": sanitize_value(a.get("value"), sensitive or bool(SENSITIVE_KEY_RE.search(key)))}


def sanitize_base_span(s):
    """Keep only the fields MLflow needs from one of Fullsend's own spans, redacted."""
    if any(k in s and not OTLP_ID_RE[k].fullmatch(str(s[k])) for k in OTLP_ID_RE):
        return None
    out = {k: s[k] for k in BASE_SPAN_FIELDS if k in s}
    out["name"] = clean(out.get("name", ""))[:200]
    out["attributes"] = [sanitize_attr(x) for x in s.get("attributes") or [] if isinstance(x, dict)]
    code = (s.get("status") or {}).get("code")
    if code in (0, 1, 2):
        out["status"] = {"code": code}
    return out


def read_jsonl(path):
    out = []
    try:
        with open(path, errors="replace") as f:
            for line in f:
                try:
                    out.append(json.loads(line))
                except ValueError:
                    pass
    except OSError:
        pass
    return out


def load_json(path, default=None):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def rel_path(p):
    """Return (repo-relative path or None, root label)."""
    for root in ROOTS:
        if p.startswith(root):
            return p[len(root):], "pr-head" if "pr-head" in root else "base"
    if p.startswith("/sandbox/workspace/"):
        return None, "run-input"
    if p.startswith("/sandbox/pi-config/skills/"):
        return None, "pi-skill"
    return (p, "base") if not p.startswith("/") else (None, "other")


def category(p):
    if p is None:
        return "run-input"
    if p.startswith(".fullsend/"):
        return "fullsend-scaffold"
    if p.startswith(".claude/rules/"):
        return "rule"
    if p.startswith(".claude/skills/"):
        return "skill"
    if re.search(r"(^|/)docs/adr/", p):
        return "adr"
    if re.search(r"(^|/)(AGENTS|CLAUDE|BOOKMARKS)\.md$", p):
        return "agents-md"
    if re.search(r"(__tests__|\.test\.|\.spec\.|(^|/)cypress/)", p):
        return "test"
    if re.search(r"(^|/)docs/|README|\.md$", p):
        return "doc"
    return "source"


def _norm_guidance(p):
    rel = rel_path(p)[0] if p.startswith("/") else p
    rel = rel[2:] if rel and rel.startswith("./") else rel
    return rel if rel and GUIDANCE_RE.fullmatch(rel) else None


READ_CMD_RE = re.compile(r"^\s*(?:sudo\s+)?(cat|head|tail|less|more|bat|nl|sed|awk)\b")


def guidance_opened(c):
    """Guidance files whose content this call returned. Failed calls, searches (grep/find/rg),
    and paths that only appear in prompts do not count."""
    if c.get("error") or c.get("end") is None:
        return set()
    a = c["args"]
    if c["name"] == "read":
        g = _norm_guidance(str(a.get("path", "")))
        return {g} if g else set()
    if c["name"] == "bash":
        got = set()
        for seg in re.split(r"\|\||&&|[;|\n]", str(a.get("command", ""))):
            if READ_CMD_RE.match(seg):
                for tok in re.findall(r"[\w@./*-]+\.md", seg):
                    g = _norm_guidance(tok) if "*" not in tok else None
                    if g:
                        got.add(g)
        return got
    return set()


# ---------- artifact parsing ----------

def find_run_dir(artifact):
    """The host's run directory: metrics.json next to run-telemetry.jsonl, outside any
    iteration-*/ tree (those are written from inside the sandbox). Shallowest wins."""
    hits = [os.path.dirname(h) for h in glob.glob(os.path.join(artifact, "**", "metrics.json"), recursive=True)]
    hits = [d for d in hits if os.path.isfile(os.path.join(d, "run-telemetry.jsonl"))
            and not re.search(r"(^|/)iteration-\d+(/|$)", os.path.relpath(d, artifact))]
    return min(hits, key=lambda d: (d.count(os.sep), d)) if hits else None


def base_spans(run_dir):
    spans = []
    for doc in read_jsonl(os.path.join(run_dir, "run-telemetry.jsonl")):
        for rs in doc.get("resourceSpans", []):
            for ss in rs.get("scopeSpans", []):
                spans.extend(ss.get("spans", []))
    return spans


def persona_of(transcript, entries):
    """Persona from the filename, else from the first prompt (sub-agents/<name>/SKILL.md)."""
    name = os.path.basename(transcript)
    m = re.match(r"review-sub(\d+)-(.*?)-?\d{4}-\d\d-\d\dT", name)
    if not m:
        return None, "orchestrator"
    seq, persona = int(m.group(1)), m.group(2)
    if not persona:
        for e in entries:
            msg = e.get("message") or {}
            if msg.get("role") != "user":
                continue
            text = json.dumps(msg.get("content"))
            mm = re.search(r"sub-agents/([\w-]+?)(?:/SKILL)?\.md", text)
            persona = mm.group(1) if mm else f"sub{seq}"
            break
    return seq, persona or f"sub{seq}"


def tool_calls(entries):
    """Yield dicts for each tool call with timing from its matching toolResult."""
    calls, order = {}, []
    for e in entries:
        msg = e.get("message") or {}
        role = msg.get("role")
        if role == "assistant":
            for c in msg.get("content") or []:
                if isinstance(c, dict) and c.get("type") == "toolCall":
                    calls[c.get("id")] = {"name": c.get("name"), "args": c.get("arguments") or {},
                                          "start": ns(e.get("timestamp")), "end": None}
                    order.append(c.get("id"))
        elif role == "toolResult":
            c = calls.get(msg.get("toolCallId"))
            if c is not None:
                end = ns(msg.get("timestamp")) or ns(e.get("timestamp"))
                dur = msg.get("durationMs")
                c["end"] = end
                if end and isinstance(dur, (int, float)):
                    c["start"] = end - int(dur * 1_000_000)
                c["error"] = bool(msg.get("isError"))
                c["result_bytes"] = len(json.dumps(msg.get("content") or ""))
    return [calls[i] for i in order]


HEREDOC_RE = re.compile(r"<<-?[ \t]{0,4}(['\"]?)([A-Za-z_][\w]{0,40})\1")
INLINE_SCRIPT_RE = re.compile(
    r"\b((?:python[\d.]*|node|deno|ruby|perl|php|bash|sh|zsh|jq|awk)\b[^|;&\n]{0,80}?\s-[a-zA-Z]{0,4}[ce][ \t]{1,8})"
    r"(\"(?:[^\"\\]|\\.){0,20000}\"|'[^']{0,20000}')")
LONG_QUOTED_RE = re.compile(r"\"(?:[^\"\\]|\\.){120,20000}\"|'[^']{120,20000}'")


def minimize_command(cmd):
    """A shell command without the data it carries: heredoc bodies, inline scripts
    (python -c, node -e, bash -c, ...) and long quoted strings become placeholders, so a
    shell write can't export file contents that the write/edit filtering would drop."""
    lines, out, end = str(cmd)[:20000].split("\n"), [], None
    skipped = 0
    for line in lines:
        if end is not None:
            if line.strip() == end:
                out.append(f"[heredoc: {skipped} lines]")
                out.append(line)
                end, skipped = None, 0
            else:
                skipped += 1
            continue
        out.append(line)
        m = HEREDOC_RE.search(line)
        if m:
            end = m.group(2)
    if end is not None:
        out.append(f"[heredoc: {skipped} lines]")
    s = "\n".join(out)
    s = INLINE_SCRIPT_RE.sub(lambda m: f"{m.group(1)}[inline script: {len(m.group(2)) - 2} chars]", s)
    return LONG_QUOTED_RE.sub(lambda m: f"[quoted: {len(m.group(0)) - 2} chars]", s)


def describe_call(c):
    a, name = c["args"], c["name"]
    out = {"gen_ai.operation.name": "execute_tool", "gen_ai.tool.name": name}
    target = a.get("path") or a.get("pattern") or a.get("command") or a.get("prompt") or ""
    if a.get("path"):
        rel, root = rel_path(a["path"])
        out.update({"fullsend.tool.path": rel or a["path"], "fullsend.file.root": root,
                    "fullsend.file.category": category(rel) if root != "pi-skill" else "pi-skill"})
    if name == "bash":
        out["fullsend.tool.command"] = minimize_command(a.get("command", ""))
    elif name in ("grep", "find"):
        out["fullsend.tool.pattern"] = a.get("pattern", "")
        if a.get("path"):
            out["fullsend.tool.path"] = rel_path(a["path"])[0] or a["path"]
    for k in TOOL_ARG_ALLOWLIST:
        if k not in ("path", "pattern") and isinstance(a.get(k), (str, int, float)):
            out[f"fullsend.tool.{k}"] = a[k]
    out["fullsend.tool.result_bytes"] = c.get("result_bytes")
    return out, target


# ---------- main build ----------

def build(args):
    run_dir = find_run_dir(args.artifact)
    if not run_dir:
        sys.exit("no metrics.json under artifact; nothing to trace")
    base = base_spans(run_dir)
    run_span = next((s for s in base if s.get("name") == "run"), None)
    if not run_span:
        sys.exit("run-telemetry.jsonl has no run span; cannot attach")
    trace_id, run_sid = run_span["traceId"], run_span["spanId"]
    run_start = otlp_ns(run_span.get("startTimeUnixNano"))
    run_end = otlp_ns(run_span.get("endTimeUnixNano"))
    if run_start is None:
        sys.exit("run span has a malformed start time; refusing to export")
    run_end = run_end if run_end and run_end >= run_start else run_start
    if not (OTLP_ID_RE["traceId"].fullmatch(str(trace_id)) and OTLP_ID_RE["spanId"].fullmatch(str(run_sid))):
        sys.exit("run span has a malformed traceId/spanId; refusing to export")
    agent_by_iter = {}
    for s in base:
        if s.get("name") == "agent":
            it = next((int(a["value"].get("intValue", 1)) for a in s.get("attributes", [])
                       if a["key"] == "iteration"), 1)
            agent_by_iter[it] = s

    metrics = load_json(os.path.join(run_dir, "metrics.json"), {})
    iters = sorted(glob.glob(os.path.join(run_dir, "iteration-*")),
                   key=lambda p: int(re.sub(r"\D", "", os.path.basename(p)) or 0))
    last = iters[-1] if iters else run_dir
    result = load_json(os.path.join(last, "output", "agent-result.json"), {}) or {}
    result = result if isinstance(result, dict) else {}
    # agent-result.json is written in the sandbox: keep only well-formed values.
    pr = result.get("pr_number") if isinstance(result.get("pr_number"), int) else None
    repo = result.get("repo") if isinstance(result.get("repo"), str) \
        and re.fullmatch(r"[\w.-]{1,100}/[\w.-]{1,100}", result["repo"]) else None
    if not pr:
        shared = os.path.join(last, "output", "context", "shared.md")
        try:
            m = re.search(r"PR:\s*([\w.-]+/[\w.-]+)#(\d+)", open(shared).read())
            repo, pr = (m.group(1), int(m.group(2))) if m else (repo, None)
        except OSError:
            pass

    common = {"session.id": f"{repo}#{pr}" if pr else None, "user.id": args.pr_author,
              "fullsend.repo": repo, "fullsend.pr_number": pr,
              "fullsend.head_sha": result.get("head_sha")}

    applicable = set()
    if args.guidance:
        g = load_json(args.guidance, {}) or {}
        applicable = {d.get("path") for d in g.get("documents", []) if d.get("path")}

    spans, read_all, persona_rows = [], set(), []
    for it_dir in iters:
        it = int(re.sub(r"\D", "", os.path.basename(it_dir)) or 1)
        agent = agent_by_iter.get(it) or (agent_by_iter.get(max(agent_by_iter)) if agent_by_iter else None)
        agent_sid = agent["spanId"] if agent else run_sid
        usage = {u.get("seq"): u for u in read_jsonl(
            next(iter(glob.glob(os.path.join(it_dir, "transcripts", "*subagents-usage.jsonl"))), ""))
            if isinstance(u, dict) and isinstance(u.get("seq"), int)}
        for t in sorted(glob.glob(os.path.join(it_dir, "transcripts", "review*.jsonl"))):
            if "usage" in os.path.basename(t):
                continue
            entries = read_jsonl(t)
            seq, persona = persona_of(t, entries)
            u = usage.get(seq, {}) if seq is not None else {}
            calls = tool_calls(entries)
            # The file name keeps IDs unique when an iteration has several transcripts with
            # the same persona and seq (e.g. two orchestrator sessions after a restart).
            key = f"it{it}/{persona}/{seq}/{os.path.basename(t)}"
            if seq is None:
                parent_sid = agent_sid  # orchestrator tools hang off the agent span
            else:
                parent_sid = span_id(trace_id, key)
            counts, cats, reads, got = collections.Counter(), collections.Counter(), [], set()
            for i, c in enumerate(calls):
                a, target = describe_call(c)
                counts[c["name"]] += 1
                if c["name"] == "read" and "fullsend.file.category" in a:
                    cats[a["fullsend.file.category"]] += 1
                    if a["fullsend.file.category"] not in ("run-input", "fullsend-scaffold", "pi-skill"):
                        reads.append(a["fullsend.tool.path"])
                got |= guidance_opened(c)
                a.update({"fullsend.persona": persona, "fullsend.iteration": it})
                start = c["start"] or ns(u.get("startedAt")) or run_start
                spans.append(span(trace_id, span_id(trace_id, key, "tool", str(i)), parent_sid,
                                  f"execute_tool {c['name']}", start, c["end"] or start, a, c.get("error")))
            read_all |= got
            if seq is None:
                continue
            start = ns(u.get("startedAt")) or min((c["start"] for c in calls if c["start"]), default=None) \
                or run_start
            dur = num(u.get("durationMs"))
            end = start + int(dur * 1_000_000) if dur else \
                max((c["end"] for c in calls if c["end"]), default=start)
            us = u.get("usage") if isinstance(u.get("usage"), dict) else {}
            a = {
                "gen_ai.operation.name": "invoke_agent", "gen_ai.agent.name": persona,
                "gen_ai.request.model": text(u.get("model")), "fullsend.persona": persona,
                "fullsend.persona.seq": seq, "fullsend.persona.description": text(u.get("description")),
                "fullsend.persona.named_in_usage": bool(u.get("persona")),
                "fullsend.iteration": it, "fullsend.cost_usd": num(us.get("cost")),
                "fullsend.usage.input_tokens": num(us.get("input")),
                "fullsend.usage.output_tokens": num(us.get("output")),
                "fullsend.usage.cache_read_tokens": num(us.get("cacheRead")),
                "fullsend.usage.cache_write_tokens": num(us.get("cacheWrite")),
                "fullsend.stop_reason": text(u.get("stopReason")), "fullsend.tool_calls": len(calls),
                "fullsend.tool_counts": dict(counts), "fullsend.reads_by_category": dict(cats),
                "fullsend.files_read": sorted(set(reads)),
                "fullsend.guidance.read": sorted(got),
                "fullsend.guidance.missed": sorted(applicable - got) if applicable else None,
            }
            a.update(common)
            spans.append(span(trace_id, parent_sid, agent_sid, f"persona {persona}", start, end, a,
                              u.get("isError") is True))
            persona_rows.append((persona, num(us.get("cost")) or 0.0))


    # context coverage
    hit = applicable & read_all
    cov = {"fullsend.guidance.applicable": sorted(applicable), "fullsend.guidance.read": sorted(read_all),
           "fullsend.guidance.missed": sorted(applicable - read_all),
           "fullsend.guidance.extra": sorted(read_all - applicable) if applicable else None,
           "fullsend.guidance.applicable_count": len(applicable), "fullsend.guidance.hit_count": len(hit),
           "fullsend.guidance.coverage": round(len(hit) / len(applicable), 3) if applicable else None,
           "fullsend.pr_files_count": args.pr_files_count}
    cov.update(common)
    spans.append(span(trace_id, span_id(trace_id, "context_coverage"), run_sid, "context_coverage",
                      run_end, run_end, cov))

    # review result
    findings = result.get("findings") or []
    sev = collections.Counter(f.get("severity", "?") for f in findings)
    dim = collections.Counter(f.get("dimension", "?") for f in findings)
    prod = result.get("producers") or {}
    risk, conf = result.get("risk") or {}, result.get("confidence") or {}

    def level(v):
        v = v.get("level") if isinstance(v, dict) else v
        return v if v in ("low", "medium", "high", "critical") else None
    verdict = result.get("action") if result.get("action") in VERDICTS else None
    verdict = verdict or (args.verdict if args.verdict in VERDICTS else None)
    rr = {"fullsend.verdict": verdict, "fullsend.findings.count": len(findings),
          "fullsend.findings.by_severity": dict(sev), "fullsend.findings.by_dimension": dict(dim),
          "fullsend.risk": level(risk), "fullsend.confidence": level(conf),
          "fullsend.producers.dispatched": prod.get("dispatched"),
          "fullsend.producers.skipped": [s.get("id") for s in prod.get("skipped") or []],
          "fullsend.adapters": {a.get("id"): a.get("status") for a in prod.get("adapters") or []},
          "fullsend.iterations": metrics.get("iterations"), "fullsend.num_turns": metrics.get("num_turns"),
          "fullsend.total_cost_usd": metrics.get("total_cost_usd"),
          "fullsend.per_model_cost": {k: v.get("cost_usd") for k, v in (metrics.get("per_model_usage") or {}).items()},
          "fullsend.persona_cost": {p: round(c, 6) for p, c in persona_rows},
          "fullsend.run_url": args.run_url}
    rr.update(common)
    spans.append(span(trace_id, span_id(trace_id, "review_result"), run_sid, "review_result",
                      run_end, run_end, rr))

    resource = [attr("service.name", "fullsend-trace-bridge"), attr("service.version", "1")]
    out = {"resourceSpans": [{"resource": {"attributes": resource},
                              "scopeSpans": [{"scope": {"name": "odh-dashboard/fullsend-trace-bridge"},
                                              "spans": spans}]}]}
    base_ids = set()
    if not args.no_base_spans:
        for s in base:
            s = sanitize_base_span(s)
            if s is None or s.get("traceId") != trace_id:
                continue
            base_ids.add(s["spanId"])
            if s["spanId"] == run_sid:
                s = dict(s, attributes=s.get("attributes", []) + attrs(common))
                if args.run_url:
                    s["attributes"].append(attr("fullsend.run_url", args.run_url))
            out["resourceSpans"][0]["scopeSpans"][0]["spans"].append(s)
    summary = {"trace_id": trace_id, "pr": pr, "spans": len(out["resourceSpans"][0]["scopeSpans"][0]["spans"]),
               "personas": len(persona_rows), "coverage": cov["fullsend.guidance.coverage"],
               "missed": cov["fullsend.guidance.missed"], "base_span_ids": sorted(base_ids)}
    # MLflow trace tags: filterable and sortable in the trace table. MLflow's own cost
    # column prices tokens without cache discounts, so the real cost goes here too.
    tags = {"fullsend.pr": f"{repo}#{pr}" if pr else None, "fullsend.verdict": verdict,
            "fullsend.cost_usd": num(metrics.get("total_cost_usd")),
            "fullsend.guidance.coverage": cov["fullsend.guidance.coverage"],
            "fullsend.guidance.missed_count": len(cov["fullsend.guidance.missed"]) if applicable else None,
            "fullsend.findings.count": len(findings), "fullsend.risk": rr["fullsend.risk"],
            "fullsend.personas": len(persona_rows), "fullsend.run_url": args.run_url,
            "fullsend.bridge.version": BRIDGE_VERSION}
    summary["tags"] = {k: (round(v, 4) if isinstance(v, float) else v if isinstance(v, int) else clean(v)[:500])
                       for k, v in tags.items() if v is not None}
    return out, summary


def parse_headers(headers_env):
    headers = {"Content-Type": "application/json"}
    for pair in filter(None, (headers_env or "").split(",")):
        k, _, v = pair.partition("=")
        headers[k.strip()] = urllib.parse.unquote(v.strip())
    return headers


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Never follow redirects: they would forward the Authorization header."""
    def redirect_request(self, *args, **kwargs):
        return None


_OPENER = urllib.request.build_opener(_NoRedirect)


def check_endpoint(endpoint):
    u = urllib.parse.urlparse(endpoint)
    local = u.hostname in ("localhost", "127.0.0.1", "::1")
    if not u.hostname or not (u.scheme == "https" or (u.scheme == "http" and local)):
        sys.exit("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT must be an https URL (http only for localhost)")


def post(payload, endpoint, headers):
    req = urllib.request.Request(endpoint, data=json.dumps(payload).encode(), headers=headers, method="POST")
    with _OPENER.open(req, timeout=60) as r:
        return r.status


def mlflow_trace_state(endpoint, headers, trace_id):
    """(exists, bridged): whether MLflow has this trace, and whether this bridge already
    sent its spans to it (its tags are present). Unknown counts as absent."""
    base = re.sub(r"/v1/traces/?$", "", endpoint)
    req = urllib.request.Request(f"{base}/api/3.0/mlflow/traces/tr-{trace_id}", headers=headers)
    try:
        with _OPENER.open(req, timeout=LOOKUP_TIMEOUT) as r:
            info = (json.load(r).get("trace") or {}).get("trace_info") or {}
    except urllib.error.HTTPError as e:
        if e.code != 404:
            print(f"warning: trace lookup returned HTTP {e.code}; treating the trace as new", file=sys.stderr)
        return False, False
    except (urllib.error.URLError, ValueError, OSError, http.client.HTTPException) as e:
        # OSError covers read timeouts; HTTPException covers IncompleteRead and bad status lines
        print(f"warning: trace lookup failed ({e}); treating the trace as new", file=sys.stderr)
        return False, False
    tags = info.get("tags") or {}
    # fullsend.pr marks traces sent by bridge version 1, before fullsend.bridge.version existed.
    return True, ("fullsend.bridge.version" in tags or "fullsend.pr" in tags)


def set_mlflow_tags(endpoint, headers, trace_id, tags):
    """Best effort: PATCH /api/2.0/mlflow/traces/tr-<id>/tags. Never fails the run."""
    base = re.sub(r"/v1/traces/?$", "", endpoint)
    url = f"{base}/api/2.0/mlflow/traces/tr-{trace_id}/tags"
    failed = 0
    for k, v in tags.items():
        body = json.dumps({"key": k, "value": clean(v)[:500]}).encode()
        try:
            _OPENER.open(urllib.request.Request(url, data=body, headers=headers, method="PATCH"),
                         timeout=30).close()
        except Exception as e:  # noqa: BLE001 - tags are optional
            failed += 1
            last = e
    if failed:
        print(f"warning: {failed}/{len(tags)} trace tags not set ({last})", file=sys.stderr)
    return len(tags) - failed


def _self_test_network():
    """Exercise the HTTP paths against a throwaway local server."""
    import http.server
    import tempfile
    import threading

    class H(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def _send(self, code, body=b"", extra=None):
            self.send_response(code)
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            tid = self.path.rsplit("tr-", 1)[-1]
            tags = {"b" * 32: {"fullsend.bridge.version": "2"}, "c" * 32: {"other": "x"}}
            if tid in tags:
                self._send(200, json.dumps({"trace": {"trace_info": {"tags": tags[tid]}}}).encode())
            elif tid == "e" * 32:
                self._send(500)
            elif tid == "d" * 32:  # declares more body than it sends, then closes
                self.send_response(200)
                self.send_header("Content-Length", "1000")
                self.end_headers()
                self.wfile.write(b'{"trace": ')
                self.close_connection = True
            elif tid == "f" * 32:
                import time
                self.send_response(200)
                self.send_header("Content-Length", "100")
                self.end_headers()
                time.sleep(1.5)
            else:
                self._send(404)

        def do_POST(self):
            self._send(302, extra={"Location": "http://example.invalid/steal"})

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    ep = f"http://127.0.0.1:{srv.server_address[1]}/v1/traces"
    states = [mlflow_trace_state(ep, {}, t) for t in ("a" * 32, "b" * 32, "c" * 32, "e" * 32)]
    try:
        truncated_state = mlflow_trace_state(ep, {}, "d" * 32)
    except Exception:  # noqa: BLE001 - the check is that nothing escapes
        truncated_state = "raised"
    global LOOKUP_TIMEOUT
    saved, LOOKUP_TIMEOUT = LOOKUP_TIMEOUT, 0.3
    try:
        timeout_state = mlflow_trace_state(ep, {}, "f" * 32)
    except Exception:  # noqa: BLE001 - the check is that nothing escapes
        timeout_state = "raised"
    LOOKUP_TIMEOUT = saved
    try:
        post({}, ep, {})
        redirect_blocked = False
    except urllib.error.HTTPError as e:
        redirect_blocked = e.code == 302
    try:
        check_endpoint("http://mlflow.example.com/v1/traces")
        http_rejected = False
    except SystemExit:
        http_rejected = True
    srv.shutdown()
    bad = tempfile.mkdtemp(prefix="trace-bridge-badid-")
    with open(os.path.join(bad, "metrics.json"), "w") as f:
        f.write("{}")
    with open(os.path.join(bad, "run-telemetry.jsonl"), "w") as f:
        f.write(json.dumps({"resourceSpans": [{"scopeSpans": [{"spans": [
            {"traceId": "../x", "spanId": "1" * 16, "name": "run"}]}]}]}))
    try:
        build(argparse.Namespace(artifact=bad, guidance=None, pr_author=None, run_url=None,
                                 pr_files_count=None, no_base_spans=False, verdict=None))
        bad_id_rejected = False
    except SystemExit:
        bad_id_rejected = True
    return {"states": states, "timeout_state": timeout_state, "truncated_state": truncated_state, "redirect_blocked": redirect_blocked, "http_rejected": http_rejected,
            "bad_id_rejected": bad_id_rejected}


def self_test():
    """Build a small synthetic artifact and check the spans the bridge produces."""
    import tempfile
    tmp = tempfile.mkdtemp(prefix="trace-bridge-test-")
    run = os.path.join(tmp, "fs-rev-x")
    tr = os.path.join(run, "iteration-1", "transcripts")
    out_dir = os.path.join(run, "iteration-1", "output")
    os.makedirs(tr)
    os.makedirs(out_dir)
    tid, run_sid, agent_sid = "ab" * 16, "1" * 16, "2" * 16

    def otlp(sp):
        return json.dumps({"resourceSpans": [{"scopeSpans": [{"spans": [sp]}]}]}) + "\n"
    with open(os.path.join(run, "run-telemetry.jsonl"), "w") as f:
        f.write(otlp({"traceId": tid, "spanId": run_sid, "name": "run",
                      "startTimeUnixNano": "1000000000", "endTimeUnixNano": "9000000000",
                      "attributes": [{"key": "cmd", "value": {"stringValue": "--api-key s3cr3tvalue1"}},
                                     {"key": "fullsend.mint.token", "value": {"stringValue": "plainValue9x"}},
                                     {"key": "gen_ai.usage.input_tokens", "value": {"intValue": "42"}},
                                     {"key": "nested", "value": {"kvlistValue": {"values": [
                                         {"key": "password", "value": {"stringValue": "nestedPw77"}}]}}}],
                      "events": [{"name": "e", "attributes": [{"key": "x", "value": {"stringValue": "eventLeak5"}}]}],
                      "status": {"code": 1, "message": "statusLeak6"}}))
        f.write(otlp({"traceId": tid, "spanId": agent_sid, "parentSpanId": run_sid, "name": "agent",
                      "startTimeUnixNano": "2000000000", "endTimeUnixNano": "8000000000",
                      "attributes": [{"key": "iteration", "value": {"intValue": "1"}}]}))
    json.dump({"total_cost_usd": 0.5, "iterations": 1}, open(os.path.join(run, "metrics.json"), "w"))
    json.dump({}, open(os.path.join(out_dir, "metrics.json"), "w"))
    with open(os.path.join(out_dir, "run-telemetry.jsonl"), "w") as f:
        f.write(otlp({"traceId": "../../evil", "spanId": "x", "name": "run",
                      "startTimeUnixNano": "1", "endTimeUnixNano": "2"}))
    json.dump({"action": "request-changes", "pr_number": 7, "repo": "o/r", "risk": {"level": "low"},
               "findings": [{"severity": "high", "dimension": "correctness"}],
               "producers": {"dispatched": ["style-conventions", "test-impact-review"]}},
              open(os.path.join(out_dir, "agent-result.json"), "w"))
    with open(os.path.join(tr, "review-subagents-usage.jsonl"), "w") as f:
        f.write(json.dumps({"seq": 1, "persona": "style-conventions", "model": "m", "startedAt":
                            "2026-11-03T00:00:01Z", "durationMs": 1000, "usage": {"cost": 0.01}}) + "\n")
        f.write(json.dumps({"seq": 2, "model": "m", "startedAt": "2026-11-03T00:00:01Z",
                            "durationMs": 1000, "usage": {"cost": 0.02}}) + "\n")
        f.write(json.dumps({"seq": 3, "persona": "hostile", "durationMs": [1] * 1000, "startedAt": "not-a-date",
                            "usage": {"cost": "9" * 50, "input": [1]}, "model": {"x": 1}}) + "\n")
        f.write(json.dumps(["not", "a", "row"]) + "\n")

    def msg(role, content=None, **kw):
        return json.dumps({"type": "message", "timestamp": "2026-11-03T00:00:01Z",
                           "message": dict(role=role, content=content or [], **kw)}) + "\n"
    call = lambda i, name, a: {"type": "toolCall", "id": i, "name": name, "arguments": a}
    with open(os.path.join(tr, "review-sub1-style-conventions-2026-11-03T00-00-01Z_a.jsonl"), "w") as f:
        f.write(msg("assistant", [call("c1", "read", {"path": "/sandbox/workspace/pr-head/.claude/rules/react.md"}),
                                  call("c2", "bash", {"command": "curl -H 'Authorization: Bearer abcdefghijklmnop'"})]))
        f.write(msg("assistant", [
            call("c3", "read", {"path": "/sandbox/workspace/target-repo/docs/adr/0009-x.md"}),
            call("c4", "grep", {"pattern": "flag", "path": "/sandbox/workspace/target-repo/docs/adr/0009-x.md"}),
            call("c5", "bash", {"command": "rg -n flag docs/adr/0009-x.md && cat AGENTS.md | head"}),
            call("c6", "bash", {"command": 'curl -d \'{"password": "hunter2pass"}\' --token tok3nvalue x'}),
            call("c7", "write", {"path": "/sandbox/workspace/out.json", "content": "client_secret=leakedvalue"}),
            call("c8", "bash", {"command": "cat > /tmp/x.py <<'EOF'\nheredocBody1 = 1\nEOF\npython3 -c 'inlineBody2()' && ls"})]))
        f.write(msg("toolResult", toolCallId="c1", durationMs=250, timestamp=1793664001500))
        f.write(msg("toolResult", toolCallId="c2", durationMs=10, timestamp=1793664001600, isError=True))
        f.write(msg("toolResult", toolCallId="c3", durationMs=5, timestamp=1793664001700, isError=True))
        for i in ("c4", "c5", "c6", "c7", "c8"):
            f.write(msg("toolResult", toolCallId=i, durationMs=5, timestamp=1793664001800))
    with open(os.path.join(tr, "review-sub2-2026-11-03T00-00-01Z_b.jsonl"), "w") as f:
        f.write(msg("user", [{"type": "text", "text": "Read /x/sub-agents/test-impact-review/SKILL.md first"}]))
        f.write(msg("assistant", [call("d1", "read", {"path": "/sandbox/workspace/pr-head/./docs/adr/0009-x.md"})]))
    with open(os.path.join(tr, "review-sub3-hostile-2026-11-03T00-00-01Z_h.jsonl"), "w") as f:
        f.write(msg("assistant", [call("h1", "read", {"path": "/sandbox/workspace/target-repo/x.ts"})]))
        f.write(msg("toolResult", toolCallId="h1", durationMs=5, timestamp="garbage"))
        f.write(msg("assistant", [call("h2", "read", {"path": "/sandbox/workspace/target-repo/z.ts"})]))
        f.write(msg("toolResult", toolCallId="h2", durationMs=1e300, timestamp=10**30))
    for name in ("review-2026-11-03T00-00-00Z_o2.jsonl", "review-2026-11-03T00-10-00Z_o3.jsonl"):
        with open(os.path.join(tr, name), "w") as f:  # two orchestrator sessions in one iteration
            f.write(msg("assistant", [call("p1", "read", {"path": "/sandbox/workspace/target-repo/y.ts"})]))
            f.write(msg("toolResult", toolCallId="p1", durationMs=5, timestamp=1793664001950))
    with open(os.path.join(tr, "review-2026-11-03T00-00-00Z_o.jsonl"), "w") as f:
        f.write(msg("assistant", [call("o1", "Agent", {"description": "style",
                                                       "prompt": "Apply docs/adr/0009-x.md"})]))
        f.write(msg("toolResult", toolCallId="o1", durationMs=5, timestamp=1793664001900))
    guidance = os.path.join(tmp, "guidance.json")
    json.dump({"documents": [{"path": ".claude/rules/react.md"}, {"path": "docs/adr/0009-x.md"}]},
              open(guidance, "w"))

    args = argparse.Namespace(artifact=tmp, guidance=guidance, pr_author="alice", run_url=None,
                              pr_files_count=3, no_base_spans=False, verdict=None)
    payload, summary = build(args)
    spans = payload["resourceSpans"][0]["scopeSpans"][0]["spans"]
    by = {}
    for sp in spans:
        by.setdefault(sp["name"], sp)  # first span of each name, in transcript order
    get = lambda s, k: next((list(a["value"].values())[0] for a in s["attributes"] if a["key"] == k), None)
    blob = json.dumps(spans)
    persona_sc = by["persona style-conventions"]
    base_run = next(x for x in spans if x["name"] == "run")
    base_attrs = {x["key"]: x["value"] for x in base_run["attributes"]}
    shell = next(get(x, "fullsend.tool.command") for x in spans
                 if "heredoc" in str(get(x, "fullsend.tool.command") or ""))
    net = _self_test_network()
    t0 = datetime.datetime.now()
    redact("--" * 50000 + "token" + "-a" * 50000)
    redact_secs = (datetime.datetime.now() - t0).total_seconds()
    hostile = by.get("persona hostile")
    sc_read = next(x for x in spans if x["name"] == "execute_tool read"
                   and get(x, "fullsend.persona") == "style-conventions")
    import shutil
    bad_result = tempfile.mkdtemp(prefix="trace-bridge-result-")
    shutil.copytree(tmp, bad_result, dirs_exist_ok=True)
    json.dump({"action": "<x>" * 5000, "pr_number": "7; rm", "repo": "a/b c" * 100,
               "risk": {"level": ["high"]}, "confidence": "token=abcdefgh123"},
              open(os.path.join(bad_result, "fs-rev-x", "iteration-1", "output", "agent-result.json"), "w"))
    _, bad_summary = build(argparse.Namespace(**dict(vars(args), artifact=bad_result, verdict="<y>")))
    checks = [
        ("hostile usage row: no crash, persona kept, bad numbers dropped",
         hostile is not None and get(hostile, "fullsend.cost_usd") is None
         and get(hostile, "fullsend.usage.input_tokens") is None and get(hostile, "gen_ai.request.model") is None
         and int(hostile["endTimeUnixNano"]) >= int(hostile["startTimeUnixNano"])),
        ("two orchestrator transcripts in one iteration keep distinct span ids",
         sum(1 for x in spans if get(x, "fullsend.tool.path") == "y.ts") == 2),
        ("hostile agent-result: no verdict, risk, PR or repo in tags",
         not any(k in bad_summary["tags"] for k in ("fullsend.verdict", "fullsend.risk", "fullsend.pr"))
         and bad_summary["pr"] is None),
        ("lookup timeout treated as a new trace", net["timeout_state"] == (False, False)),
        ("truncated lookup response treated as a new trace", net["truncated_state"] == (False, False)),
        ("malformed and out-of-range timestamps are rejected",
         ns("garbage") is None and ns(True) is None and ns([1]) is None and ns(1e300) is None
         and ns("2026-11-03T00:00:01Z") is not None),
        ("every span time stays within the OTLP range",
         all(0 <= int(x[k]) <= MAX_NS for x in spans for k in ("startTimeUnixNano", "endTimeUnixNano"))
         and int(span(tid, "1" * 16, None, "x", 5, 10**30, {})["endTimeUnixNano"]) == MAX_NS),
        ("host run dir chosen over sandbox-written decoy", base_run["spanId"] == run_sid and summary["trace_id"] == tid),
        ("text under a sensitive key in Fullsend's spans redacted", "plainValue9x" not in blob),
        ("token counts under token-named keys kept", base_attrs.get("gen_ai.usage.input_tokens") == {"intValue": "42"}),
        ("nested OTLP values redacted", "nestedPw77" not in blob),
        ("events and status messages dropped", "eventLeak5" not in blob and "statusLeak6" not in blob),
        ("heredoc body and inline script stripped from commands",
         "heredocBody1" not in blob and "inlineBody2" not in blob and "[heredoc: 1 lines]" in shell
         and "ls" in shell),
        ("redaction stays fast on long adversarial input", redact_secs < 2),
        ("malformed trace ids rejected", net["bad_id_rejected"]),
        ("plain http to a remote host rejected", net["http_rejected"]),
        ("redirects are not followed", net["redirect_blocked"]),
        ("missing trace is new; bridge-tagged trace is bridged; Fullsend-only trace is not",
         net["states"] == [(False, False), (True, True), (True, False), (False, False)]),
        ("failed read, search, prompt mention and unanswered call don't count as opened",
         get(persona_sc, "fullsend.guidance.read") is not None
         and "docs/adr/0009-x.md" not in json.dumps(get(persona_sc, "fullsend.guidance.read"))),
        ("cat in a shell command counts as opened", "AGENTS.md" in json.dumps(get(persona_sc, "fullsend.guidance.read"))),
        ("JSON credential redacted", "hunter2pass" not in blob),
        ("CLI flag credential redacted", "tok3nvalue" not in blob),
        ("write contents and prompts not exported", "leakedvalue" not in blob and "Apply docs" not in blob),
        ("secret in Fullsend's own span redacted", "s3cr3tvalue1" not in blob),
        ("unnamed persona recovered from prompt", "persona test-impact-review" in by),
        ("persona parented to agent span", by["persona style-conventions"].get("parentSpanId") == agent_sid),
        ("pr-head path counted as a rule", get(sc_read, "fullsend.file.category") == "rule"),
        ("tool start from toolResult duration",
         int(sc_read["startTimeUnixNano"]) == 1793664001500 * 1_000_000 - 250_000_000),
        ("tool error status", by["execute_tool bash"]["status"]["code"] == 2),
        ("secret redacted", "abcdefghijklmnop" not in get(by["execute_tool bash"], "fullsend.tool.command")),
        ("coverage is 1 of 2", summary["coverage"] == 0.5 and summary["missed"] == ["docs/adr/0009-x.md"]),
        ("session and user set", get(by["review_result"], "session.id") == "o/r#7"
         and get(by["review_result"], "user.id") == "alice"),
        ("tags carry real cost and verdict", summary["tags"].get("fullsend.cost_usd") == 0.5
         and summary["tags"].get("fullsend.verdict") == "request-changes"),
        ("single trace, unique span ids", len({s["traceId"] for s in spans}) == 1
         and len({s["spanId"] for s in spans}) == len(spans)),
        ("span ids are deterministic", [s["spanId"] for s in build(args)[0]["resourceSpans"][0]
                                        ["scopeSpans"][0]["spans"]] == [s["spanId"] for s in spans]),
    ]
    failed = [name for name, ok in checks if not ok]
    for name, ok in checks:
        print(("PASS " if ok else "FAIL ") + name)
    if failed:
        sys.exit(f"{len(failed)} trace-bridge self-test(s) failed")
    print("All trace-bridge self-tests passed")


def main():
    if sys.argv[1:] == ["--self-test"]:
        return self_test()
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--artifact", required=True, help="downloaded fullsend-review artifact directory")
    p.add_argument("--guidance", help="output of fetch-guidance-context.sh for the PR's changed files")
    p.add_argument("--pr-files", help="file with the PR's changed paths, one per line (for counts)")
    p.add_argument("--pr-author", help="PR author login, used as MLflow user")
    p.add_argument("--run-url", help="link to the Fullsend workflow run")
    p.add_argument("--verdict", help="review verdict to use when agent-result.json has no action "
                                     "(the host post-script decides it after the artifact is captured)")
    p.add_argument("--out", help="also write the OTLP JSON payload here")
    p.add_argument("--no-base-spans", action="store_true",
                   help="do not re-send run/agent spans (use once Fullsend exports them itself)")
    p.add_argument("--no-tags", action="store_true", help="skip setting MLflow trace tags after export")
    p.add_argument("--force", action="store_true",
                   help="send spans even if this bridge already sent them (doubles MLflow's token totals)")
    p.add_argument("--dry-run", action="store_true", help="build and print the summary, do not POST")
    args = p.parse_args()
    args.pr_files_count = None
    if args.pr_files:
        try:
            args.pr_files_count = sum(1 for line in open(args.pr_files) if line.strip())
        except OSError:
            pass

    payload, summary = build(args)
    if args.out:
        with open(args.out, "w") as f:
            json.dump(payload, f, indent=1)
    print(json.dumps({k: v for k, v in summary.items() if k != "base_span_ids"}))
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
    if args.dry_run or not endpoint:
        if not endpoint and not args.dry_run:
            print("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT not set; skipping export", file=sys.stderr)
        return
    check_endpoint(endpoint)
    headers = parse_headers(os.environ.get("OTEL_EXPORTER_OTLP_TRACES_HEADERS"))
    exists, bridged = mlflow_trace_state(endpoint, headers, summary["trace_id"])
    if bridged and not args.force:
        print("bridge spans already in MLflow; skipping span export (use --force to resend)")
    else:
        if exists and not bridged:
            # Fullsend exported its own spans: add ours without re-sending theirs.
            drop = set(summary["base_span_ids"])
            for rs in payload["resourceSpans"]:
                for ss in rs["scopeSpans"]:
                    ss["spans"] = [x for x in ss["spans"] if x["spanId"] not in drop]
            print("trace exists without bridge spans; sending bridge spans only")
        status = post(payload, endpoint, headers)
        print(f"exported to OTLP endpoint: HTTP {status}")
    if not args.no_tags:
        n = set_mlflow_tags(endpoint, headers, summary["trace_id"], summary["tags"])
        print(f"set {n} MLflow trace tags")


if __name__ == "__main__":
    main()
