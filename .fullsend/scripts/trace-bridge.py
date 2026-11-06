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
import math
import json
import os
import posixpath
import re
import sys
import time
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
    r"(\"(?:[^\"\\]|\\.){0,2000}\"|'[^']{0,2000}'|[^\s,;&|)}\]]{1,2000})")
SECRET_FLAG_RE = re.compile(
    r"(?i)(--[\w-]{0,40}" + SENSITIVE + r"[\w-]{0,40}[ \t]{1,8})(\"(?:[^\"\\]|\\.){0,2000}\"|'[^']{0,2000}'|(?!--)\S{1,2000})")
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
BRIDGE_VERSION = "3"
# Attributes kept from Fullsend's own spans: metadata only. Anything else (e.g.
# gen_ai.input.messages / gen_ai.output.messages when content capture is on) is dropped.
BASE_ATTR_KEYS = {
    "exit_code", "iteration", "gen_ai.operation.name", "gen_ai.agent.name", "gen_ai.system",
    "gen_ai.provider.name", "gen_ai.request.model", "gen_ai.response.model",
    "fullsend.agent", "fullsend.runtime", "fullsend.cost_usd", "fullsend.tool_calls", "fullsend.num_turns",
    "fullsend.iterations", "fullsend.work_item_id", "fullsend.security_trace_id",
    "fullsend.harness.path", "fullsend.harness.content_sha", "fullsend.prescript.skipped",
    "fullsend.mint.role", "fullsend.mint.attempts", "fullsend.mint.repo_count",
    "http.request.method", "http.response.status_code", "server.address",
}
BASE_ATTR_RE = re.compile(r"gen_ai\.usage\.[a-z_.]{1,60}")  # token counts only
NAME_RE = re.compile(r"[\w.-]{1,60}")  # persona, tool and program names
VERDICTS = ("approve", "request-changes", "comment", "reject", "failure")  # review-result.schema.json
LOOKUP_TIMEOUT = 30
LOOKUP_ATTEMPTS = 3


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
    except (TypeError, ValueError, OverflowError):  # JSON allows Infinity and NaN
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


_CUT = "\x00cut\x00"


def _redact_value(m):
    """Replace a matched secret value. The value patterns are bounded, so a value longer than
    the bound (or one whose closing quote was never found) only matched its start: then
    everything after it is dropped too, rather than exporting the rest of the secret."""
    v = m.group(2)
    # A quoted value is whole only if its closing quote isn't escaped ("a\" is not) and the
    # shell word ends there ('abc'def continues it); an unquoted value with a quote in it may
    # continue past the match ("abc"def ghi"). Any of those: cut everything after it.
    nxt = m.string[m.end():m.end() + 1]
    if v[0] in "\"'":
        whole = bool(re.fullmatch(r'"(?:[^"\\]|\\.)*"' if v[0] == '"' else r"'[^']*'", v)) \
            and (not nxt or nxt.isspace() or nxt in ",;&|)}]")
    else:
        # A quote or a backslash (prefix\ tail: an escaped space) means the shell word may go on
        # past the match.
        # A value stopped by punctuation (password=prefix,tail) may go on past it too: only
        # whitespace or the end of the string ends an unquoted value for sure.
        whole = not any(q in v for q in "\"'`\\") and (not nxt or nxt.isspace())
    whole = whole and len(v) < 2000
    return m.group(1) + "[REDACTED]" + ("" if whole else _CUT)


def redact(s):
    s = SECRET_RE.sub("[REDACTED]", str(s)[:MAX_SCAN])
    # Cut right after each pass (a later pattern must never consume the cut marker), but
    # still run every pass on what is left, so earlier secrets are redacted too.
    cut = False
    for pattern in (SECRET_KV_RE, SECRET_FLAG_RE):
        s = pattern.sub(_redact_value, s)
        if _CUT in s:
            s, cut = s.split(_CUT, 1)[0], True
    return s + "…" if cut else s


def redact_obj(v):
    """Redact a JSON-like value: sensitive keys lose their values, strings are scanned."""
    if isinstance(v, dict):
        # Numbers under sensitive-looking keys (token counts) are kept; text is not. Keys are
        # scanned too, since they can be tool or file names.
        return {redact(k): "[REDACTED]" if SENSITIVE_KEY_RE.search(str(k)) and not isinstance(x, (int, float, bool))
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
        if not -2**63 <= v < 2**63:
            return None
        val = {"intValue": str(v)}
    elif isinstance(v, float):
        if not math.isfinite(v):
            return None
        val = {"doubleValue": v}
    elif isinstance(v, (list, tuple)):
        val = {"arrayValue": {"values": [{"stringValue": clean(x)} for x in v]}}
    elif isinstance(v, dict):
        # Redacted field by field: running the free-text pass over the serialized JSON would
        # read "auth_login": 3 as a secret and cut the rest, leaving invalid JSON.
        text = json.dumps(redact_obj(v), sort_keys=True)
        val = {"stringValue": text if len(text) <= MAX_STR else text[:MAX_STR] + "…"}
    else:
        val = {"stringValue": clean(v)}
    return {"key": k, "value": val}


def attrs(d):
    out = (attr(k, v) for k, v in d.items() if v is not None and v != "" and v != [])
    return [a for a in out if a is not None]


def span(trace_id, sid, parent, name, start, end, a, error=False):
    s = {
        "traceId": trace_id, "spanId": sid, "name": clean(name)[:200], "kind": 1,
        "startTimeUnixNano": str(clamp_ns(start)), "endTimeUnixNano": str(clamp_ns(max(end, start))),
        "attributes": attrs(a), "status": {"code": 2 if error else 1},
    }
    if parent:
        s["parentSpanId"] = parent
    return s


def _list(v, field):
    vals = (v.get(field) or {}).get("values") if isinstance(v.get(field), dict) else None
    return vals if isinstance(vals, list) else []


def sanitize_value(v, sensitive=False, depth=0):
    """Redact an OTLP AnyValue recursively. Text under a sensitive key is dropped; numbers
    must be valid (finite doubles, int64 ints, real booleans) or the value is dropped (None)."""
    if not isinstance(v, dict) or depth > 8:
        return None
    if "stringValue" in v:
        return {"stringValue": "[REDACTED]" if sensitive else clean(v["stringValue"])}
    if "arrayValue" in v:
        vals = (sanitize_value(x, sensitive, depth + 1) for x in _list(v, "arrayValue")[:100])
        return {"arrayValue": {"values": [x for x in vals if x is not None]}}
    if "kvlistValue" in v:
        vals = (sanitize_attr(x, sensitive, depth + 1) for x in _list(v, "kvlistValue")[:100])
        return {"kvlistValue": {"values": [x for x in vals if x is not None]}}
    if "intValue" in v:
        try:
            i = int(v["intValue"]) if not isinstance(v["intValue"], (bool, float)) else None
        except (TypeError, ValueError):
            i = None
        return {"intValue": str(i)} if i is not None and -2**63 <= i < 2**63 else None
    if "doubleValue" in v:
        d = v["doubleValue"]
        if not isinstance(d, (int, float)) or isinstance(d, bool):
            return None
        try:
            d = float(d)  # a huge JSON integer raises OverflowError here
        except OverflowError:
            return None
        return {"doubleValue": d} if math.isfinite(d) else None
    if "boolValue" in v:
        return {"boolValue": v["boolValue"]} if isinstance(v["boolValue"], bool) else None
    return {"stringValue": "[REDACTED]"}  # bytesValue or unknown


def sanitize_attr(a, sensitive=False, depth=0):
    """A redacted OTLP KeyValue, or None if it isn't one or its value is invalid."""
    if not isinstance(a, dict):
        return None
    raw = str(a.get("key", ""))[:MAX_SCAN]
    val = sanitize_value(a.get("value"), sensitive or bool(SENSITIVE_KEY_RE.search(raw)), depth)
    return {"key": clean(raw)[:200], "value": val} if val is not None else None


def sanitize_base_span(s):
    """Keep only the fields MLflow needs from one of Fullsend's own spans, redacted."""
    if any(k in s and not OTLP_ID_RE[k].fullmatch(str(s[k])) for k in OTLP_ID_RE):
        return None
    out = {k: s[k] for k in BASE_SPAN_FIELDS if k in s}
    # Times are re-derived, never copied: JSON allows Infinity/NaN, which OTLP rejects.
    start = otlp_ns(s.get("startTimeUnixNano"))
    if start is None:
        return None
    end = otlp_ns(s.get("endTimeUnixNano"))
    out["startTimeUnixNano"] = str(start)
    out["endTimeUnixNano"] = str(end if end is not None and end >= start else start)
    for k in ("kind", "flags"):
        if k in out and not (isinstance(out[k], int) and not isinstance(out[k], bool) and 0 <= out[k] < 2**32):
            del out[k]
    out["name"] = clean(out.get("name", ""))[:200]
    attrs_in = s.get("attributes") if isinstance(s.get("attributes"), list) else []
    allowed = [a for a in attrs_in[:200] if isinstance(a, dict) and isinstance(a.get("key"), str)
               and (a["key"] in BASE_ATTR_KEYS or BASE_ATTR_RE.fullmatch(a["key"]))]
    out["attributes"] = [x for x in (sanitize_attr(a) for a in allowed) if x is not None]
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




def guidance_opened(c):
    """Guidance files whose content this call returned. Failed calls, searches (grep/find/rg),
    and paths that only appear in prompts do not count."""
    if c.get("error") or c.get("end") is None:
        return set()
    a = c["args"]
    if c["name"] == "read" and isinstance(a.get("path"), str):
        g = _norm_guidance(a["path"])
        return {g} if g else set()
    if c["name"] == "bash" and isinstance(a.get("command"), str):
        return {g for g in (_norm_guidance(t) for t in safe_shell(shell_reads, a["command"], [])) if g}
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
    if persona and not NAME_RE.fullmatch(persona):
        persona = ""
    if not persona:
        for e in entries:
            msg = e.get("message") if isinstance(e, dict) else None
            if not isinstance(msg, dict) or msg.get("role") != "user":
                continue
            text = json.dumps(msg.get("content"))
            mm = re.search(r"sub-agents/([\w-]{1,60}?)(?:/SKILL)?\.md", text)
            persona = mm.group(1) if mm else f"sub{seq}"
            break
    return seq, persona or f"sub{seq}"


def tool_calls(entries):
    """Tool calls with timing from their matching toolResult. Entries are sandbox data, so
    every shape is checked: malformed entries, calls and results are skipped, not fatal."""
    calls, order = {}, []
    for n, e in enumerate(entries):
        msg = e.get("message") if isinstance(e, dict) else None
        if not isinstance(msg, dict):
            continue
        role = msg.get("role")
        content = msg.get("content") if isinstance(msg.get("content"), list) else []
        if role == "assistant":
            for c in content:
                if not (isinstance(c, dict) and c.get("type") == "toolCall"):
                    continue
                cid = c.get("id") if isinstance(c.get("id"), str) else f"anon-{n}-{len(order)}"
                if cid in calls:
                    continue
                name = c.get("name") if isinstance(c.get("name"), str) and NAME_RE.fullmatch(c["name"]) else "unknown"
                args = c.get("arguments") if isinstance(c.get("arguments"), dict) else {}
                calls[cid] = {"name": name, "args": args, "start": ns(e.get("timestamp")), "end": None}
                order.append(cid)
        elif role == "toolResult":
            c = calls.get(msg.get("toolCallId")) if isinstance(msg.get("toolCallId"), str) else None
            if c is None:
                continue
            end = ns(msg.get("timestamp")) or ns(e.get("timestamp"))
            dur = num(msg.get("durationMs"))
            c["end"] = end
            if end and dur is not None and end - int(dur * 1_000_000) > 0:
                c["start"] = end - int(dur * 1_000_000)
            c["error"] = msg.get("isError") is True
            try:
                c["result_bytes"] = len(json.dumps(msg.get("content") or ""))
            except (TypeError, ValueError):
                c["result_bytes"] = None
    return [calls[i] for i in order]


READ_PROGS = {"cat", "head", "tail", "less", "more", "bat", "nl", "sed", "awk"}
# Exported shell "paths" must look like repo files, not other arguments: no @ or :, a
# relative path's first segment may not look like a hostname (dotted, not a dotfile), and
# a bare file name needs a known source/doc extension. Absolute paths must be in the sandbox.
REL_PATH_RE = re.compile(r"(?:\.[\w+-]+|[\w+-]+)(?:/[\w.+-]+)+/?")
FILE_EXTS = r"md|mdx|ts|tsx|js|jsx|mjs|cjs|json|ya?ml|py|go|sh|txt|css|scss|html|toml|mod|sum|lock|snap"
BARE_FILE_RE = re.compile(r"\.?[\w+-]+(?:\.[\w+-]+)*\.(?:" + FILE_EXTS + r")")


class Op(str):
    """An unquoted shell operator token (e.g. >, <, <<<). Quoted text is never an Op, so
    '>' or '; cat x' inside quotes can't be mistaken for a redirection or a separator.
    fd is the file descriptor number attached to a redirection (the 2 in 2>), if any."""
    fd = ""


def is_redirect(t):
    return isinstance(t, Op)


SHELL_OPS = ("<<<", "<<-", "&&", "||", ";;", ">>", "<<", ">&", "<&", "&>", ">|", "<>", "|&",
             "(", ")", ";", "|", "&", "<", ">", "\n")  # longest first
SEPARATORS = {"\n", ";", ";;", "&", "&&", "|", "||", "|&", "(", ")"}


def shell_tokens(cmd):
    """Tokenize a shell command the way a shell splits words: single quotes, double quotes,
    ANSI-C $'...' quotes and backslash escapes are honoured, and only unquoted operator characters form
    operators (returned as Op). # starts a comment only at the start of a word and ends at
    the newline, which still separates commands. Heredoc bodies after an unquoted << are
    skipped. Text after an unclosed quote is dropped."""
    text, out, word, i = str(cmd)[:MAX_SCAN * 5], [], None, 0
    pending, expect_delim = [], False  # heredoc delimiters waiting for the next newline
    fd_digits = True  # current word so far is only unquoted digits (a possible fd like the 2 in 2>)
    escaped_ansi = False  # current word has a $'...' part with backslash escapes (not decoded)
    quoted = False  # current word has a quoted or escaped part (a quoted heredoc delimiter)

    def add(chars, plain_digits=False):
        nonlocal word, fd_digits
        if word is None:
            word = []
        fd_digits = fd_digits and plain_digits
        word.extend(chars)  # in place: rebuilding the list per character is quadratic

    def end_word():
        nonlocal word, expect_delim, fd_digits, escaped_ansi, quoted
        if word is not None:
            value = "".join(word)
            out.append(value)
            if expect_delim:
                # A delimiter with undecoded $'\..' escapes can't be matched reliably: None
                # makes the scanner stop at the heredoc body instead of guessing where it ends.
                pending.append((None if escaped_ansi else value, expect_delim == "<<-", quoted))
                expect_delim = False
        word, fd_digits, escaped_ansi, quoted = None, True, False, False

    n = len(text)
    while i < n:
        c = text[i]
        if c in " \t\r":
            end_word()
            i += 1
        elif c == "$" and text.startswith("'", i + 1):
            # ANSI-C quoting $'...': backslash escapes (including \') are allowed inside.
            buf, j = [], i + 2
            while j < n and text[j] != "'":
                if text[j] == "\\" and j + 1 < n:
                    buf.append(text[j:j + 2])
                    j += 2
                else:
                    buf.append(text[j])
                    j += 1
            if j >= n:
                break  # unclosed quote: drop the rest
            escaped_ansi = escaped_ansi or any(part.startswith("\\") for part in buf)
            quoted = True
            add(buf)
            i = j + 1
        elif c == "'":
            j = text.find("'", i + 1)
            if j < 0:
                break  # unclosed quote: drop the rest
            quoted = True
            add([text[i + 1:j]])
            i = j + 1
        elif c == '"':
            buf, j = [], i + 1
            while j < n and text[j] != '"':
                if text[j] == "\\" and j + 1 < n and text[j + 1] in '"\\$`\n':
                    buf.append(text[j + 1])
                    j += 2
                else:
                    buf.append(text[j])
                    j += 1
            if j >= n:
                break
            quoted = True
            add(buf)
            i = j + 1
        elif c == "\\":
            if i + 1 < n and text[i + 1] == "\n":
                i += 2  # line continuation
                continue
            quoted = True
            add([text[i + 1:i + 2]])
            i += 2
        elif c == "#" and word is None:
            nl = text.find("\n", i)
            i = n if nl < 0 else nl  # keep the newline: it still separates commands
        elif c in "();<>|&\n":
            op = next(o for o in SHELL_OPS if text.startswith(o, i))
            fd = ""
            if word is not None and fd_digits and op[0] in "<>":
                fd = "".join(word)  # an unquoted fd number attached to a redirection (2>, 1>>)
                word = None  # not a word
            end_word()
            tok = Op(op)
            tok.fd = fd
            out.append(tok)
            i += len(op)
            if op in ("<<", "<<-"):
                expect_delim = op
            elif op == "\n" and pending:
                if any(delim is None for delim, _tabs, _q in pending):
                    break  # undecodable heredoc delimiter: drop the body and everything after
                for delim, strip_tabs, quoted_delim in pending:  # skip each body up to its delimiter
                    while i < n:
                        nl = text.find("\n", i)
                        line, i = (text[i:], n) if nl < 0 else (text[i:nl], nl + 1)
                        # The shell ends the body only on an exact delimiter line (<<- also
                        # allows leading tabs); " EOF" or "EOF " is still body text.
                        if (line.lstrip("\t") if strip_tabs else line) == delim:
                            break
                        if not quoted_delim and (len(line) - len(line.rstrip("\\"))) % 2:
                            # An unquoted body joins a backslash-newline with the next line, so
                            # the next line can't end the body: stop rather than guess.
                            i = n
                            break
                pending = []
        else:
            add(c, plain_digits=c.isdigit())
            i += 1
    end_word()
    return out


COMPOUND_OPEN = {"if", "while", "until", "for", "case", "select"}
COMPOUND_CLOSE = {"fi", "done", "esac"}
COMPOUND_INNER = {"then", "else", "elif", "do", "!"}


def shell_segments_ctx(cmd):
    """(operator-before, tokens, conditional, depth, scope) per command; depth is how many groups
    or compounds enclose it, and scope is the innermost subshell, substitution or function
    body around it ({"end": index after its last segment}), or None in the parent shell: an
    exit in a scope ends only that scope. Separators and redirections only
    come from unquoted operators (see shell_tokens). conditional is True inside a group
    ( ... ) or { ...; } opened right after && or ||, inside a conditional group, inside a
    $(...) or <(...) substitution, and inside any if/while/until/for/case compound: those
    commands may not run (or their run status isn't tracked)."""
    segs, op, toks, stack = [], None, [], []  # stack: (kind, conditional) per open block
    starts = [(0, 0)]  # (depth, segment index) where each list or group begins
    neg_pipe = False  # inside a pipeline whose first command was negated with !
    paren_open = None  # (segment count, mid_command) at the last unclosed "("
    func_body = False  # just saw "name()": the next { ... } is a function body

    ncond = 0  # how many open blocks are conditional: cond() stays O(1) however deep
    nsub = 0  # how many open blocks run in their own scope (subshell, function body)
    scopes = []  # open own-scope blocks, innermost last: {"end": segment count at close}

    def cond():
        return ncond > 0

    def push(kind, conditional):
        nonlocal ncond, nsub
        stack.append((kind, conditional))
        ncond += bool(conditional)
        if kind in ("paren", "fbrace"):
            nsub += 1
            scopes.append({"end": None})

    def close(*kinds):
        nonlocal ncond, nsub
        if stack and stack[-1][0] in kinds:  # a closer only closes its own kind of block
            kind, c = stack.pop()
            ncond -= bool(c)
            if kind in ("paren", "fbrace"):
                nsub -= 1
                scopes.pop()["end"] = len(segs)

    def flush():
        nonlocal toks, neg_pipe, func_body
        negated = False
        while toks and toks[0] in COMPOUND_INNER:
            negated = negated or toks[0] == "!"  # ! cmd: the status no longer shows cmd's success
            toks = toks[1:]
        if toks and toks[0] in COMPOUND_OPEN:
            push("compound", True)  # the whole compound is conditional
            toks = toks[1:]
        if toks and toks[0] in COMPOUND_CLOSE:
            close("compound")
            toks = toks[1:]
        if len(toks) == 2 and toks[0] == "function":
            func_body = True  # "function NAME" then a newline: the next { ... } is its body
        if toks:
            # ! negates the whole pipeline, so later | segments of it are negated too.
            neg_pipe = negated or (neg_pipe and op == "|")
            segs.append((op, toks[:200], cond() or neg_pipe, len(stack), scopes[-1] if scopes else None))
            return True
        return False

    for t in shell_tokens(cmd):
        if isinstance(t, Op) and t in SEPARATORS:
            mid_command = bool(toks)  # ( inside a command: $(...) or <(...) substitution
            if flush():
                op = None
            # "name()" with nothing between the parens defines a function; its body only
            # runs if the function is called, which isn't tracked, so it is conditional.
            # A newline may sit between "name()" and its body; a ( ... ) body works too.
            body_paren = t == "(" and func_body
            func_body = (t == ")" and paren_open == (len(segs), True)) or (t == "\n" and func_body)
            paren_open = (len(segs), mid_command) if t == "(" else None
            if t == "(":
                # A substitution's run status follows its command's, which isn't tracked
                # here, so its contents count as conditional (reads there are not counted).
                push("paren", body_paren or mid_command or op in ("&&", "||") or cond())
                starts.append((len(stack), len(segs)))
            elif t == ")":
                close("paren")  # inside case, a pattern's ")" is not a group close
            elif t == "&":
                # A background job's status (and its cd) never reaches this shell: the list
                # the & ends (from its start at this depth) counts as conditional.
                start = next(k for d, k in reversed(starts) if d <= len(stack))
                segs[start:] = [(o, tk, True, d, sc) for o, tk, _c, d, sc in segs[start:]]
                op = "&"
                starts.append((len(stack), len(segs)))
            elif t == "\n" and op in ("&&", "||", "|") and not toks:
                pass  # a newline after &&, || or | continues the same command
            else:
                op = {"\n": ";", ";;": ";", "|&": "|"}.get(t, t)
                if op == ";":
                    starts.append((len(stack), len(segs)))
            toks = []
            continue
        if not isinstance(t, Op) and t == "{" and len(toks) == 2 and toks[0] == "function":
            flush()  # "function NAME {" on one line: the declaration, then its body
            toks = []
            push("fbrace", True)
            func_body = False
            continue
        if not toks and not isinstance(t, Op) and t == "{":
            push("fbrace" if func_body else "brace", func_body or op in ("&&", "||") or cond())
            func_body = False
            starts.append((len(stack), len(segs)))
            continue
        if not toks and not isinstance(t, Op) and t == "}":
            close("brace", "fbrace")
            continue
        toks.append(t)
    flush()
    for sc in scopes:  # unclosed at the end: the scope runs to the last segment
        sc["end"] = len(segs)
    return segs


def shell_segments(cmd):
    """(operator-before, tokens) per command; see shell_segments_ctx."""
    return [(op, toks) for op, toks, *_rest in shell_segments_ctx(cmd)]


EXIT_PROGS = {"exit", "return", "logout"}


def _lists(segs):
    """Segment indexes grouped into lists split at ; & and newline, with their operators."""
    lists, cur = [], []
    for k, (op, *_rest) in enumerate(segs):
        if op in (None, ";", "&") and cur:
            lists.append(cur)
            cur = []
        cur.append((k, op))
    if cur:
        lists.append(cur)
    return lists


def _execs_command(toks):
    """Whether a segment is exec with a command (exec CMD replaces the shell); a bare exec
    with only redirections (exec >log) keeps the shell running."""
    rest = [t for t in toks if not re.fullmatch(r"[A-Za-z_]\w*=.*", str(t))]
    if not rest or rest[0] != "exec":
        return False
    skip = False
    for t in rest[1:]:
        if skip:
            skip = False
            continue
        if is_redirect(t):
            skip = True  # its target follows
            continue
        if str(t) in ("-c", "-l", "--"):
            continue
        if str(t) == "-a":
            skip = True
            continue
        return True
    return False


def _before_exit(segs):
    """Indexes that no exit/return/logout may have skipped. In the parent shell, an exit cuts
    everything after it, unless it has a literal nonzero status (it can't have ended a
    command that succeeded); any other exit (exit, exit 0, exit $x) cuts. In a subshell,
    substitution or function body, an exit cuts only the rest of that scope."""
    ok = set(range(len(segs)))
    for k, (_op, toks, _cond, _depth, scope) in enumerate(segs):
        i, prog = _program(toks)
        if k not in ok:
            continue
        if _execs_command(toks):  # exec CMD runs CMD in place of the shell: nothing after it runs
            if scope is not None:
                ok.difference_update(range(k + 1, scope["end"]))
                continue
            return ok & set(range(k + 1))
        if prog not in EXIT_PROGS:
            continue
        if scope is not None:
            ok.difference_update(range(k + 1, scope["end"]))
            continue
        args = [t for t in toks[i + 1:] if not is_redirect(t)]
        # Exit statuses wrap at 256: exit 256 is a successful exit.
        if args and re.fullmatch(r"\d{1,6}", str(args[0])) and int(str(args[0])) % 256:
            continue
        return ok & set(range(k))
    return ok


def executed_segments(segs):
    """Indexes of segments that certainly ran when the whole command succeeded. A command
    is split into lists at ; & and newline. The first command of each list always runs;
    a later one only when every operator before it in that list is && or |, the list is
    the last one (its success is the command's success) and contains no ||. Nothing after
    an exit/return/logout counts, and neither do commands in a conditional group or
    compound (see shell_segments_ctx)."""
    lists, ran = _lists(segs), set()
    for li, lst in enumerate(lists):
        ran.add(lst[0][0])
        if li == len(lists) - 1 and not any(op == "||" for _k, op in lst):
            ran.update(k for k, _op in lst)
    return {k for k in ran if not segs[k][2]} & _before_exit(segs)


def succeeded_segments(segs):
    """Indexes of segments that certainly ran and succeeded when the whole command did:
    only the last list counts (a failure earlier is masked by later commands), only when
    it has no || (a fallback masks failure), and not a command piped into another (the
    pipeline's status is the last command's)."""
    lists = _lists(segs)
    if not lists or any(op == "||" for _k, op in lists[-1]):
        return set()
    last = lists[-1]
    ok = {k for j, (k, _op) in enumerate(last)
          if j + 1 == len(last) or last[j + 1][1] not in ("|", "|&")}
    return ok & executed_segments(segs)


def _program(toks):
    """Index and basename of the program in a segment, skipping VAR=x prefixes and sudo/env."""
    for i, t in enumerate(toks):
        if re.fullmatch(r"[A-Za-z_]\w*=.*", t) or t in ("sudo", "env", "command", "exec", "time"):
            continue
        name = os.path.basename(t)
        return i, (name if NAME_RE.fullmatch(name) else "other")
    return None, None


def export_path(t, bare_ok=True):
    """A repo-relative path for a shell argument that names a file, else None. Bare names
    (no slash) are only accepted when bare_ok, i.e. the program is known to take files."""
    if not t or len(t) > 300 or t.startswith("-"):
        return None
    if t.startswith("/"):
        t, root = rel_path(t)  # only repo checkouts in the sandbox give a path back
        if root not in ("base", "pr-head") or not t:
            return None
    t = t[2:] if t.startswith("./") else t
    return t if REL_PATH_RE.fullmatch(t) or (bare_ok and BARE_FILE_RE.fullmatch(t)) else None


PATTERN_PROGS = {"grep", "egrep", "fgrep", "rg", "ag", "sed", "awk", "jq", "yq"}
# Per program: options that take values (option -> number of operands), and options whose
# operand is the pattern or script itself (so the next plain argument is already a file).
_GREP = {"-m": 1, "-A": 1, "-B": 1, "-C": 1, "--max-count": 1, "--after-context": 1,
         "--before-context": 1, "--context": 1, "--include": 1, "--exclude": 1, "--exclude-dir": 1,
         "--label": 1, "-d": 1, "-D": 1, "--devices": 1, "--directories": 1}
VALUE_OPTS = {
    "grep": _GREP, "egrep": _GREP, "fgrep": _GREP,
    "rg": {"-m": 1, "-A": 1, "-B": 1, "-C": 1, "-t": 1, "-T": 1, "-g": 1, "-M": 1, "-j": 1,
           "--max-count": 1, "--type": 1, "--type-not": 1, "--glob": 1, "--iglob": 1, "--max-columns": 1,
           "--threads": 1, "--max-depth": 1, "-r": 1, "--replace": 1, "--sort": 1},
    "ag": {"-A": 1, "-B": 1, "-C": 1, "-G": 1, "-m": 1, "--depth": 1},
    "sed": {"-l": 1, "--line-length": 1},
    "awk": {"-v": 1, "-F": 1, "--assign": 1, "--field-separator": 1},
    "jq": {"--arg": 2, "--argjson": 2, "--slurpfile": 2, "--rawfile": 2, "--indent": 1},
    "yq": {"--arg": 2, "--argjson": 2, "--indent": 1, "-I": 1},
}
SCRIPT_OPTS = {  # the pattern/script comes from this option's operand
    "grep": {"-e", "--regexp", "-f", "--file"}, "egrep": {"-e", "--regexp", "-f", "--file"},
    "fgrep": {"-e", "--regexp", "-f", "--file"}, "rg": {"-e", "--regexp", "-f", "--file"},
    "sed": {"-e", "--expression", "-f", "--file"}, "awk": {"-f", "--file"},
    "jq": {"-f", "--from-file"}, "yq": {"-f", "--from-file"},
}


# Long options known to take no operand. Any other long option without "=value" has an
# unknown operand count, so the segment's arguments are not trusted (fail closed).
_GREP_LONG = {"--recursive", "--dereference-recursive", "--ignore-case", "--no-ignore-case", "--invert-match",
              "--count", "--line-number", "--files-with-matches", "--files-without-match", "--only-matching",
              "--quiet", "--silent", "--no-filename", "--with-filename", "--word-regexp", "--line-regexp",
              "--fixed-strings", "--extended-regexp", "--basic-regexp", "--perl-regexp", "--color", "--colour",
              "--no-messages", "--null", "--null-data", "--text", "--byte-offset", "--initial-tab"}
LONG_FLAGS = {
    "grep": _GREP_LONG, "egrep": _GREP_LONG, "fgrep": _GREP_LONG,
    "rg": {"--hidden", "--no-ignore", "--files", "--fixed-strings", "--ignore-case", "--smart-case", "--json",
           "--count", "--line-number", "--no-heading", "--heading", "--with-filename", "--no-filename",
           "--follow", "--multiline", "--pcre2", "--vimgrep", "--stats", "--files-with-matches",
           "--files-without-match", "--only-matching", "--word-regexp", "--invert-match", "--no-messages",
           "--color", "--column", "--trim", "--unrestricted", "--search-zip", "--null"},
    "ag": {"--hidden", "--literal", "--ignore-case", "--count", "--files-with-matches", "--nocolor"},
    "sed": {"--quiet", "--silent", "--regexp-extended", "--in-place", "--null-data", "--separate", "--posix",
            "--debug", "--sandbox", "--unbuffered", "--zero-terminated"},
    "awk": {"--posix", "--traditional", "--lint", "--sandbox"},
    "jq": {"--raw-output", "--compact-output", "--slurp", "--null-input", "--exit-status", "--sort-keys",
           "--tab", "--join-output", "--ascii-output", "--raw-input", "--color-output", "--monochrome-output",
           "--seq", "--stream"},
    "yq": {"--raw-output", "--compact-output", "--slurp", "--null-input", "--exit-status", "--inplace",
           "--prettyPrint", "--no-doc"},
}
OPTIONAL_ATTACHED = {"sed": {"-i"}}  # sed -i[SUFFIX]: the rest of the cluster is its operand
# Read programs whose arguments are all files except option values (no pattern argument).
OPERAND_PROGS = {"cat", "head", "tail", "nl", "bat", "less", "more"}
VALUE_OPTS.update({
    "head": {"-n": 1, "-c": 1, "--lines": 1, "--bytes": 1},
    "tail": {"-n": 1, "-c": 1, "-s": 1, "--lines": 1, "--bytes": 1, "--sleep-interval": 1, "--pid": 1,
             "--max-unchanged-stats": 1},
    "nl": {"-b": 1, "-d": 1, "-f": 1, "-h": 1, "-i": 1, "-l": 1, "-n": 1, "-s": 1, "-v": 1, "-w": 1,
           "--body-numbering": 1, "--section-delimiter": 1, "--footer-numbering": 1,
           "--header-numbering": 1, "--line-increment": 1, "--join-blank-lines": 1,
           "--number-format": 1, "--number-separator": 1, "--starting-line-number": 1, "--number-width": 1},
    "bat": {"-l": 1, "-H": 1, "-r": 1, "-m": 1, "--language": 1, "--highlight-line": 1, "--line-range": 1,
            "--map-syntax": 1, "--style": 1, "--theme": 1, "--tabs": 1, "--wrap": 1, "--color": 1,
            "--paging": 1, "--terminal-width": 1},
    "less": {"-b": 1, "-h": 1, "-j": 1, "-k": 1, "-o": 1, "-O": 1, "-p": 1, "-P": 1, "-t": 1, "-T": 1,
             "-x": 1, "-y": 1, "-z": 1, "-D": 1},
    "more": {"-n": 1, "--lines": 1},
})
LONG_FLAGS.update({
    "cat": {"--show-all", "--number-nonblank", "--show-ends", "--number", "--squeeze-blank",
            "--show-tabs", "--show-nonprinting"},
    "head": {"--quiet", "--silent", "--verbose", "--zero-terminated"},
    "tail": {"--follow", "--retry", "--quiet", "--silent", "--verbose", "--zero-terminated"},
    "nl": {"--no-renumber"},
    "bat": {"--plain", "--number", "--show-all", "--unbuffered", "--no-config"},
    "less": set(), "more": set(),
})
_GREP_SHORT = set("abcEFGHhiILlnoPqrRsTUuVvwxyzZ")
SHORT_FLAGS = {  # operand-free short options; any other letter fails closed
    "grep": _GREP_SHORT, "egrep": _GREP_SHORT, "fgrep": _GREP_SHORT,
    "rg": set("acFHhiILlnNoPpqSsUuvwxz."), "ag": set("iQlcsSwvuUf"),
    "sed": set("nErsuz"), "awk": set(), "jq": set("rcsneSjaCMR"), "yq": set("rcsneiPMC"),
    "cat": set("AbeEnstTuv"), "head": set("qvz"), "tail": set("fFqvzr"), "nl": set("p"),
    "bat": set("pnAPu"), "less": set("RNSFXriIMmseEKgGqQ"), "more": set("dlfpcsu"),
}


class _Args(list):
    """without_patterns' result; unknown is True when it couldn't parse the options."""
    unknown = False


def without_patterns(prog, args):
    """Arguments minus option values, search patterns and scripts. For grep/rg/sed/awk/jq
    the first plain argument is the pattern or script, unless an option such as -e or -f
    already supplied it. Short option clusters (-nA 2, -A2, -ne pat) are read letter by
    letter with per-program arities. A long option with an unknown operand count makes the
    segment untrustworthy: only redirections are returned (fail closed)."""
    if prog not in PATTERN_PROGS and prog not in OPERAND_PROGS:
        return _Args(args)
    values, scripts = VALUE_OPTS.get(prog, {}), SCRIPT_OPTS.get(prog, set())
    long_flags, optional = LONG_FLAGS.get(prog, set()), OPTIONAL_ATTACHED.get(prog, set())
    out, redirects, skip, keep_next, failed = [], [], 0, False, False
    pattern_given = prog not in PATTERN_PROGS  # cat, head, ...: every plain argument is a file
    for t in args:
        if keep_next:  # a redirection target: pass through untouched for the caller
            redirects.append(t)
            keep_next = False
            continue
        # Redirections come before option operands: in `sed -e >/dev/null SCRIPT`, the
        # shell gives SCRIPT (not >) to -e.
        if is_redirect(t):  # callers decide what redirections mean
            redirects.append(t)
            keep_next = True
            continue
        if skip:
            skip -= 1
            continue
        if t.startswith("--"):
            opt, has_value = t.split("=", 1)[0], "=" in t
            if opt in scripts:
                pattern_given = True
                skip = 0 if has_value else 1
            elif opt in values:
                skip = 0 if has_value else values[opt]
            elif not has_value and opt not in long_flags and t != "--":
                failed = True
            continue
        if prog in ("head", "tail") and re.fullmatch(r"-\d{1,9}", t):
            continue  # legacy head -5 / tail -20: a line count
        if t.startswith("-") and len(t) > 1:
            letters, flags = t[1:], SHORT_FLAGS.get(prog, set())
            for j, c in enumerate(letters):
                opt, rest = "-" + c, letters[j + 1:]
                if opt in optional:
                    break
                if opt in scripts:
                    pattern_given = True
                    skip = 0 if rest else 1
                    break
                if opt in values:
                    skip = values[opt] - (1 if rest else 0)
                    break
                if c not in flags:  # unknown arity (e.g. rg -E ENCODING): don't guess
                    failed = True
                    break
            continue
        if not pattern_given:
            pattern_given = True
            continue
        out.append(t)
    if failed:
        result = _Args(redirects)
        result.unknown = True  # file operands are unknown, so stdin may not be what's read
        return result
    return _Args(out + redirects)


def shell_summary(cmd):
    """What a shell command is exported as: the programs it runs and the file paths it
    names. Paths are only files given to read programs (cat, head, sed, ...) and
    redirection targets; other programs' arguments (git, grep, cp, echo, ...) are never
    exported, since their meaning depends on subcommands and options."""
    programs, paths = [], []
    for _op, toks in shell_segments(cmd):
        _i, prog = _program(toks)
        if prog:
            programs.append(prog)
    for f in shell_files(cmd, include_skipped=True)[0] + shell_files(cmd)[1]:
        rel = export_path(f)
        if rel and rel not in paths:
            paths.append(rel)
    return programs[:30], paths[:30]


def resolve_path(cwd, p):
    """p relative to the repository, given the tracked working directory cwd ("" is the repo
    root, None is unknown). Absolute paths are returned unchanged. None when it can't be
    known: unknown cwd, shell expansion ($, ~), or a path that leaves the repository."""
    if p.startswith("/"):
        return p
    if cwd is None or p.startswith("~") or "$" in p:
        return None
    out = posixpath.normpath(posixpath.join(cwd, p))
    return None if out == ".." or out.startswith("../") else out


def chdir_target(cwd, args):
    """New working directory for `cd ARG`, or None when it can't be known."""
    if len(args) != 1 or args[0] in ("-", "--"):
        return None
    d = args[0]
    if d.startswith("/"):
        rel, root = rel_path(d.rstrip("/") + "/")
        return (rel or "").rstrip("/") if root in ("base", "pr-head") else None
    out = resolve_path(cwd, d)
    return "" if out == "." else out


def stdout_reaches_tool(toks):
    """Whether a command's stdout still goes to the tool output after its redirections,
    applied in order (2>/dev/null 1>&2 sends it to /dev/null; 1>&2 2>/dev/null doesn't).
    Descriptors other than 1 and 2 have unknown destinations."""
    dest = {"1": "out", "2": "err"}
    for j, t in enumerate(toks):
        if is_redirect(t) and t == "<>" and t.fd not in ("", "0"):
            dest[t.fd] = "file"  # 1<>f opens f read-write as fd 1: stdout goes to f
            continue
        if not is_redirect(t) or t in ("<", "<<", "<<-", "<<<", "<>", "<&"):
            continue
        target = str(toks[j + 1]) if j + 1 < len(toks) else ""
        if t == "&>" or (t == ">&" and not t.fd and not target.isdigit()):
            dest["1"] = dest["2"] = "file"  # &> f, >& f: both streams to the file
        elif t == ">&" and target.isdigit():
            dest[t.fd or "1"] = dest.get(target, "unknown")
        elif t in (">", ">>", ">|", ">&"):
            dest[t.fd or "1"] = "file"
    return dest["1"] in ("out", "err")


def sed_in_place(args):
    """sed -i / -iSUFFIX / --in-place[=SUFFIX], alone or in a short-option cluster."""
    for a in args:
        a = str(a)
        if a == "--":
            break
        if a == "--in-place" or a.startswith("--in-place="):
            return True
        if a.startswith("-") and not a.startswith("--") and "i" in a[1:].split("e")[0].split("f")[0]:
            return True
    return False


def shell_files(cmd, include_skipped=False):
    """(read files, redirection targets) in a shell command. Read files are the file
    arguments of read programs (cat, head, sed, ...) in segments that certainly ran (see
    succeeded_segments); others are skipped unless include_skipped. Redirection targets (`> f`) are outputs, not reads,
    and here-string text (`<<< text`) is neither."""
    reads, targets = [], []
    segs = shell_segments_ctx(cmd)
    read_ok = succeeded_segments(segs)  # a read or cd counts only if its success is established
    cwd = ""  # repo root; None once a directory change can't be followed
    stdout_gone = False  # a bare exec sent the shell's stdout away: later output isn't seen
    for k, (op, toks, _cond, depth, *_rest) in enumerate(segs):
        if toks and toks[0] == "exec" and not _execs_command(toks) and not stdout_reaches_tool(toks):
            stdout_gone = True  # exec >/dev/null: every later command writes there too
        counts = include_skipped or (k in read_ok and not stdout_gone)
        i, prog = _program(toks)
        if i is None:
            continue
        if prog in ("cd", "pushd", "popd"):
            # Only a top-level cd that succeeded is followed; anything else (in a group,
            # after || or &&-then-;, pushd/popd, cd -, $VAR) leaves the directory unknown.
            args = [t for t in toks[i + 1:] if not is_redirect(t)]
            # A cd is followed only when its success is established (see succeeded_segments):
            # a cd that ran but may have failed (cd x || true; cd x; ...) leaves it unknown.
            ok = prog == "cd" and depth == 0 and k in read_ok and cwd is not None
            cwd = chdir_target(cwd, args) if ok else None
            continue
        # A read program whose stdout ends up anywhere but the tool output returns nothing to the
        # agent, and neither does sed -i (it writes the result back to the file).
        if not stdout_reaches_tool(toks) or (prog == "sed" and sed_in_place(toks[i + 1:])):
            counts = include_skipped
        redirect = None
        stdin = []  # stdin redirections in order: a path, or None for one that isn't a file
        parsed = without_patterns(prog, toks[i + 1:])
        has_operand = parsed.unknown  # a file operand (or unknown ones): it isn't reading stdin
        dash = False  # an explicit "-" operand: stdin is read alongside any files
        for t in parsed:
            if redirect is not None:
                path = resolve_path(cwd, t)
                if redirect.fd not in ("", "0") and redirect[0] == "<":
                    pass  # 3<f opens another descriptor: the program doesn't read it as input
                elif redirect == "<":
                    stdin.append((path, len(targets)))
                elif redirect in ("<<", "<<-", "<<<", "<&", "<>"):
                    stdin.append((None, len(targets)))  # heredoc, here-string, fd copy: replaces stdin
                elif ">" in redirect and redirect not in (">&", "<>") and path:
                    targets.append(path)
                # <<, <<< (heredoc word / here-string text), >& and <& (fd numbers): not files
                redirect = None
                continue
            if is_redirect(t):
                redirect = t
                continue
            if prog in READ_PROGS and t == "-":
                dash = True
                continue
            if prog in READ_PROGS and not t.startswith("-") and "*" not in t:
                has_operand = True
                path = resolve_path(cwd, t)
                if counts and path:
                    reads.append(path)
        # Only the last stdin redirection is what the program reads, and only a read program
        # with no file operands reads stdin at all; the other paths are kept as metadata.
        for j in range(len(stdin) - 1, -1, -1):  # backwards, so the insert positions hold
            path, at = stdin[j]
            if not path:
                continue
            if counts and prog in READ_PROGS and j == len(stdin) - 1 and (dash or not has_operand):
                reads.append(path)
            else:
                targets.insert(at, path)
    return reads, targets


def safe_shell(fn, cmd, fallback):
    """Run a shell parser on untrusted command text; a parser bug loses that command's
    reads and programs, never the whole export."""
    try:
        return fn(cmd)
    except Exception:  # noqa: BLE001 - one malformed command must not stop the export
        return fallback


def shell_reads(cmd):
    """Files whose contents a read program was given (see shell_files)."""
    return shell_files(cmd)[0]


def describe_call(c):
    a, name = c["args"], c["name"]
    out = {"gen_ai.operation.name": "execute_tool", "gen_ai.tool.name": name}
    path = a.get("path") if isinstance(a.get("path"), str) else None
    if path:
        rel, root = rel_path(path)
        out.update({"fullsend.tool.path": rel or path, "fullsend.file.root": root,
                    "fullsend.file.category": category(rel) if root != "pi-skill" else "pi-skill"})
    if name == "bash" and isinstance(a.get("command"), str):
        programs, paths = safe_shell(shell_summary, a["command"], ([], []))
        out["fullsend.tool.programs"] = programs
        out["fullsend.tool.paths"] = paths
    elif name in ("grep", "find") and isinstance(a.get("pattern"), str):
        out["fullsend.tool.pattern"] = a["pattern"]
    for k in TOOL_ARG_ALLOWLIST:
        v = a.get(k)
        if k in ("path", "pattern"):
            continue
        if isinstance(v, str):
            out[f"fullsend.tool.{k}"] = v
        elif num(v) is not None:
            out[f"fullsend.tool.{k}"] = num(v)
    out["fullsend.tool.result_bytes"] = c.get("result_bytes")
    return out


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
    metrics = metrics if isinstance(metrics, dict) else {}
    iters = sorted(glob.glob(os.path.join(run_dir, "iteration-*")),
                   key=lambda p: int(re.sub(r"\D", "", os.path.basename(p)) or 0))
    # The result comes from the latest iteration that wrote one (a later iteration may not).
    with_result = [d for d in iters if os.path.isfile(os.path.join(d, "output", "agent-result.json"))]
    last = (with_result or iters or [run_dir])[-1]
    result = load_json(os.path.join(last, "output", "agent-result.json"), {}) or {}
    result = result if isinstance(result, dict) else {}
    # agent-result.json is written in the sandbox: keep only well-formed values.
    pr = result.get("pr_number")
    pr = pr if isinstance(pr, int) and not isinstance(pr, bool) and 0 < pr < 10**9 else None
    repo = result.get("repo") if isinstance(result.get("repo"), str) \
        and re.fullmatch(r"[\w.-]{1,100}/[\w.-]{1,100}", result["repo"]) else None
    # The reviewed commit: the caller's trusted --head-sha (from the run) replaces the artifact's.
    head_sha = getattr(args, "head_sha", None)
    if head_sha is None:
        head_sha = result.get("head_sha")
    head_sha = head_sha if isinstance(head_sha, str) and re.fullmatch(r"[0-9a-f]{40}", head_sha) else None
    if getattr(args, "pr_number", None) is not None:
        # A trusted identity from the caller replaces the sandbox-written one entirely.
        pr = int(args.pr_number) if re.fullmatch(r"[1-9]\d{0,8}", args.pr_number) else None
        repo = args.repo if pr and isinstance(args.repo, str) \
            and re.fullmatch(r"[\w.-]{1,100}/[\w.-]{1,100}", args.repo) else None
    elif not (pr and repo):
        shared = os.path.join(last, "output", "context", "shared.md")
        try:
            with open(shared, errors="replace") as f:
                m = re.search(r"PR:\s*([\w.-]{1,100}/[\w.-]{1,100})#(\d{1,9})", f.read(MAX_SCAN * 25))
            if m and 0 < int(m.group(2)):
                repo, pr = m.group(1), int(m.group(2))
        except OSError:
            pass

    pr_key = f"{repo}#{pr}" if pr and repo else None  # both or neither: never "None#7"
    common = {"session.id": pr_key, "user.id": args.pr_author,
              "fullsend.repo": repo, "fullsend.pr_number": pr,
              "fullsend.head_sha": head_sha}

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
                a = describe_call(c)
                counts[c["name"]] += 1
                # Only completed, successful reads count as files read; attempts stay in tool_counts.
                if c["name"] == "read" and "fullsend.file.category" in a \
                        and not c.get("error") and c.get("end") is not None:
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
            persona_rows.append((persona, it, seq, num(us.get("cost")) or 0.0))


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
    findings = [f for f in result.get("findings") or [] if isinstance(f, dict)] \
        if isinstance(result.get("findings"), list) else []
    sev = collections.Counter(text(f.get("severity")) or "?" for f in findings)
    dim = collections.Counter(text(f.get("dimension")) or "?" for f in findings)
    prod = result.get("producers") if isinstance(result.get("producers"), dict) else {}

    def items(key):
        v = prod.get(key)
        return v if isinstance(v, list) else []
    dispatched = [text(x) for x in items("dispatched") if text(x)]
    skipped = [text(x.get("id")) for x in items("skipped") if isinstance(x, dict) and text(x.get("id"))]
    adapters = {text(x.get("id")): text(x.get("status")) for x in items("adapters")
                if isinstance(x, dict) and text(x.get("id")) and text(x.get("status"))}
    # Distinct usage records only: one (iteration, seq) is charged once, summed per persona.
    persona_cost, charged = collections.defaultdict(float), set()
    for persona, it, seq, cost in persona_rows:
        if (it, seq) not in charged:
            charged.add((it, seq))
            persona_cost[persona] += cost
    risk, conf = result.get("risk") or {}, result.get("confidence") or {}

    def level(v):
        v = v.get("level") if isinstance(v, dict) else v
        return v if v in ("low", "medium", "high", "critical") else None
    # fullsend.verdict is only the review the host posted (--verdict, from GitHub). The
    # artifact is written in the sandbox, so its action is kept apart as what the agent
    # claimed (unknown values export as "other"); outcomes such as "failure" post no review.
    action = result.get("action")
    verdict = args.verdict if args.verdict in VERDICTS else None
    claimed = None if action is None else action if action in VERDICTS else "other"
    rr = {"fullsend.verdict": verdict, "fullsend.verdict.claimed": claimed, "fullsend.findings.count": len(findings),
          "fullsend.findings.by_severity": dict(sev), "fullsend.findings.by_dimension": dict(dim),
          "fullsend.risk": level(risk), "fullsend.confidence": level(conf),
          "fullsend.producers.dispatched": dispatched, "fullsend.producers.skipped": skipped,
          "fullsend.adapters": adapters,
          "fullsend.iterations": num(metrics.get("iterations")), "fullsend.num_turns": num(metrics.get("num_turns")),
          "fullsend.total_cost_usd": num(metrics.get("total_cost_usd")),
          "fullsend.per_model_cost": {str(k)[:100]: num(v.get("cost_usd")) for k, v in
                                      (metrics.get("per_model_usage") or {}).items() if isinstance(v, dict)}
          if isinstance(metrics.get("per_model_usage"), dict) else None,
          "fullsend.persona_cost": {p: round(c, 6) for p, c in persona_cost.items()},
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
    tags = {"fullsend.pr": pr_key, "fullsend.verdict": verdict,
            "fullsend.verdict.claimed": rr["fullsend.verdict.claimed"],
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


def safe_error(e):
    """A fixed description of a network error: status code or exception type, never its
    message (which can carry URLs, hosts or response text)."""
    if isinstance(e, urllib.error.HTTPError):
        return f"HTTP {e.code}"
    return type(e).__name__


def log_summary(summary):
    """The run summary for the Actions log: counts and tags, no PR identity, URLs, file or
    guidance paths (those stay in MLflow)."""
    keep = {k: summary.get(k) for k in ("trace_id", "spans", "personas", "coverage")}
    keep["tags"] = {k: v for k, v in (summary.get("tags") or {}).items()
                    if k not in ("fullsend.pr", "fullsend.run_url")}
    keep["missed_count"] = len(summary.get("missed") or [])
    return json.dumps(keep)


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


class PartialExport(Exception):
    """The OTLP endpoint answered 200 but rejected some spans (partialSuccess)."""


def post(payload, endpoint, headers):
    """POST the payload; returns the HTTP status. OTLP allows HTTP 200 with
    partialSuccess.rejectedSpans > 0, which raises PartialExport: the export is then not
    complete, so the bridge marker must not be written."""
    # allow_nan=False: OTLP JSON has no Infinity/NaN tokens; fail loudly rather than send them.
    req = urllib.request.Request(endpoint, data=json.dumps(payload, allow_nan=False).encode(),
                                 headers=headers, method="POST")
    with _OPENER.open(req, timeout=60) as r:
        status, body = r.status, r.read(1_000_000)
    try:
        reply = json.loads(body) if body.strip() else {}
    except ValueError:
        reply = {}  # a non-JSON 2xx body (e.g. protobuf-only collectors) carries no rejection info
    partial = reply.get("partialSuccess") if isinstance(reply, dict) else None
    rejected = partial.get("rejectedSpans") if isinstance(partial, dict) else None
    try:
        rejected = int(rejected or 0)
    except (TypeError, ValueError):
        rejected = 1  # unreadable count: treat as incomplete
    if rejected > 0:
        raise PartialExport(f"{rejected} spans rejected")
    return status


PENDING_TAG = "fullsend.bridge.pending"  # set before a bridge-only export; the marker supersedes it


def mlflow_trace_state(endpoint, headers, trace_id):
    """(exists, bridged, pending): whether MLflow has this trace, whether this bridge already
    sent its spans to it (its tags are present), and whether an earlier bridge export to it
    may not have finished (PENDING_TAG). None when the lookup failed: resending then could
    double MLflow's token totals, so the caller retries or stops."""
    base = re.sub(r"/v1/traces/?$", "", endpoint)
    req = urllib.request.Request(f"{base}/api/3.0/mlflow/traces/tr-{trace_id}", headers=headers)
    try:
        with _OPENER.open(req, timeout=LOOKUP_TIMEOUT) as r:
            doc = json.load(r)
        trace = doc.get("trace") if isinstance(doc, dict) else None
        info = trace.get("trace_info") if isinstance(trace, dict) else None
        tags = info.get("tags", {}) if isinstance(info, dict) else None
        if not isinstance(tags, dict):  # a missing tags field is fine; any other shape is unknown
            raise ValueError("unexpected trace lookup response shape")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False, False, False
        print(f"warning: trace lookup returned HTTP {e.code}", file=sys.stderr)
        return None
    except (urllib.error.URLError, ValueError, OSError, http.client.HTTPException) as e:
        # OSError covers read timeouts; HTTPException covers IncompleteRead and bad status lines
        print(f"warning: trace lookup failed ({safe_error(e)})", file=sys.stderr)
        return None
    # fullsend.pr marks traces sent by bridge version 1, before fullsend.bridge.version existed.
    return True, ("fullsend.bridge.version" in tags or "fullsend.pr" in tags), PENDING_TAG in tags


def set_mlflow_tags(endpoint, headers, trace_id, tags):
    """PATCH /api/2.0/mlflow/traces/tr-<id>/tags for each tag; returns how many were set."""
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
        print(f"warning: {failed}/{len(tags)} trace tags not set ({safe_error(last)})", file=sys.stderr)
    return len(tags) - failed


def _timed(fn):
    t0 = datetime.datetime.now()
    fn()
    return (datetime.datetime.now() - t0).total_seconds()


def _self_test_main(endpoint, trace_id="9" * 32, extra=()):
    """Run main() against the local test endpoint (which refuses tag writes); returns the exit text."""
    global LOOKUP_ATTEMPTS
    import tempfile
    art = tempfile.mkdtemp(prefix="trace-bridge-marker-")
    run = os.path.join(art, "r")
    os.makedirs(run)
    with open(os.path.join(run, "run-telemetry.jsonl"), "w") as f:
        f.write(json.dumps({"resourceSpans": [{"scopeSpans": [{"spans": [
            {"traceId": trace_id, "spanId": "8" * 16, "name": "run",
             "startTimeUnixNano": "1000", "endTimeUnixNano": "2000"}]}]}]}) + "\n")
    with open(os.path.join(run, "metrics.json"), "w") as f:
        f.write("{}")
    saved = (sys.argv, os.environ.get("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"), LOOKUP_ATTEMPTS, sys.stdout)
    sys.argv, LOOKUP_ATTEMPTS = ["trace-bridge.py", "--artifact", art, "--no-tags", *extra], 1
    os.environ["OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"] = endpoint
    sys.stdout = open(os.devnull, "w")
    try:
        main()
        result = "no exit"
    except SystemExit as e:
        result = str(e.code)
    finally:
        sys.stdout.close()
        sys.argv, env, LOOKUP_ATTEMPTS, sys.stdout = saved
        if env is None:
            os.environ.pop("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", None)
        else:
            os.environ["OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"] = env
    return result


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
            tags = {"b" * 32: {"fullsend.bridge.version": "2"}, "c" * 32: {"other": "x"},
                    "6" * 32: {"other": "x", "fullsend.bridge.pending": "1"}}
            if tid in tags:
                self._send(200, json.dumps({"trace": {"trace_info": {"tags": tags[tid]}}}).encode())
            elif tid == "e" * 32:
                self._send(500)
            elif tid in ("1" * 32, "2" * 32, "3" * 32, "4" * 32, "5" * 32):  # valid JSON, wrong shape
                body = {"1" * 32: b"[1]", "2" * 32: b"null", "3" * 32: b'{"trace": "x"}',
                        "4" * 32: b'{"trace": {"trace_info": {"tags": ["fullsend.pr"]}}}',
                        "5" * 32: b'{"trace": {"trace_info": {"tags": "fullsend.pr"}}}'}[tid]
                self._send(200, body)
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

        def _drain(self):
            # Read the request body before answering, or the client can see a connection reset.
            self.rfile.read(int(self.headers.get("Content-Length") or 0))

        def do_POST(self):
            self._drain()
            posts.append(self.path)
            if self.path.startswith("/partial/"):
                self._send(200, b'{"partialSuccess": {"rejectedSpans": 2, "errorMessage": "x"}}')
            elif self.path.startswith("/ok/"):
                self._send(200, b"{}")
            else:
                self._send(302, extra={"Location": "http://example.invalid/steal"})

        def do_PATCH(self):
            # Only the pending tag can be written, so marker writes always fail here.
            body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
            self._send(200 if b"fullsend.bridge.pending" in body else 500)

    posts = []
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    ep = f"http://127.0.0.1:{srv.server_address[1]}/v1/traces"
    states = [mlflow_trace_state(ep, {}, t) for t in ("a" * 32, "b" * 32, "c" * 32, "e" * 32)]
    try:
        shape_states = [mlflow_trace_state(ep, {}, t) for t in ("1" * 32, "2" * 32, "3" * 32, "4" * 32, "5" * 32)]
    except Exception:  # noqa: BLE001 - the check is that nothing escapes
        shape_states = "raised"
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
    post_error = None
    try:
        post({}, ep, {})
        redirect_blocked = False
    except urllib.error.HTTPError as e:
        redirect_blocked = e.code == 302
        post_error = safe_error(e)
    try:
        check_endpoint("http://mlflow.example.com/v1/traces")
        http_rejected = False
    except SystemExit:
        http_rejected = True
    ok_ep = f"http://127.0.0.1:{srv.server_address[1]}/ok/v1/traces"
    marker_exit = _self_test_main(ok_ep)
    partial_exit = _self_test_main(f"http://127.0.0.1:{srv.server_address[1]}/partial/v1/traces")
    del posts[:]
    rerun = {"bridged": _self_test_main(ok_ep, "b" * 32), "unmarked": _self_test_main(ok_ep, "c" * 32),
             "mark_only": _self_test_main(ok_ep, "c" * 32, ["--mark-only"]),
        "mark_only_missing": _self_test_main(ok_ep, "a" * 32, ["--mark-only"]),
        "bridge_only_missing": _self_test_main(ok_ep, "a" * 32, ["--no-base-spans"])}
    rerun_posts = list(posts)
    unmarked_force = _self_test_main(ok_ep, "c" * 32, ["--force"])
    rerun_posts_force = len(posts) - len(rerun_posts)
    bridge_only = _self_test_main(ok_ep, "c" * 32, ["--no-base-spans"])
    before_pending = len(posts)
    bridge_only_pending = _self_test_main(ok_ep, "6" * 32, ["--no-base-spans"])
    pending_posts = len(posts) - before_pending
    rerun_posts_bridge_only = len(posts) - len(rerun_posts) - rerun_posts_force
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
    url_error = safe_error(urllib.error.URLError("http://secret-host.internal/x?token=abc"))
    return {"marker_exit": marker_exit, "partial_exit": partial_exit, "post_error": post_error, "url_error": url_error,
            "rerun": rerun, "rerun_posts": rerun_posts, "unmarked_force": unmarked_force,
            "rerun_posts_force": rerun_posts_force, "bridge_only": bridge_only,
            "rerun_posts_bridge_only": rerun_posts_bridge_only,
            "bridge_only_pending": bridge_only_pending, "pending_posts": pending_posts,
            "states": states, "shape_states": shape_states, "timeout_state": timeout_state, "truncated_state": truncated_state, "redirect_blocked": redirect_blocked, "http_rejected": http_rejected,
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
                                     {"key": "fullsend.num_turns", "value": {"doubleValue": float("nan")}},
                                     {"key": "fullsend.tool_calls", "value": {"intValue": [1, 2]}},
                                     {"key": "fullsend.prescript.skipped", "value": {"boolValue": "yes"}},
                                     {"key": "fullsend.iterations", "value": {"doubleValue": 10**400}},
                                     {"key": "fullsend.cost_usd", "value": {"doubleValue": 1.5}},
                                     {"key": "gen_ai.output.messages", "value": {"stringValue": "fileBodyLeak7"}},
                                     {"key": "gen_ai.usage.input_tokens.Bearer keyLeakabcdefghij",
                                      "value": {"intValue": "1"}},
                                     {"key": "Bearer keyLeakabcdefghij", "value": {"stringValue": "v"}},
                                     {"key": "deep", "value": {"arrayValue": {"values": [
                                         {"doubleValue": float("inf")}, {"intValue": "7"}, "junk"]}}},
                                     {"key": "nested", "value": {"kvlistValue": {"values": [
                                         {"key": "password", "value": {"stringValue": "nestedPw77"}}]}}}],
                      "events": [{"name": "e", "attributes": [{"key": "x", "value": {"stringValue": "eventLeak5"}}]}],
                      "status": {"code": 1, "message": "statusLeak6"}}))
        f.write(otlp({"traceId": tid, "spanId": agent_sid, "parentSpanId": run_sid, "name": "agent",
                      "startTimeUnixNano": "2000000000", "endTimeUnixNano": "8000000000",
                      "attributes": [{"key": "iteration", "value": {"intValue": "1"}}]}))
        f.write(otlp({"traceId": tid, "spanId": "3" * 16, "parentSpanId": run_sid, "name": "sandbox_create",
                      "startTimeUnixNano": "1500000000", "endTimeUnixNano": float("inf"), "kind": "x"}))
        f.write(otlp({"traceId": tid, "spanId": "4" * 16, "parentSpanId": run_sid, "name": "bad_start",
                      "startTimeUnixNano": float("nan"), "endTimeUnixNano": "2000000000"}))
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
            call("c5", "bash", {"command": "rg -n flag docs/adr/0009-x.md && cat AGENTS.md"}),
            call("c6", "bash", {"command": 'curl -d \'{"password": "hunter2pass"}\' --token tok3nvalue x'}),
            call("c7", "write", {"path": "/sandbox/workspace/out.json", "content": "client_secret=leakedvalue"}),
            call("c8", "bash", {"command": "cat > /tmp/x.py <<'EOF'\nheredocBody1 = 1\nEOF\npython3 -c 'inlineBody2()' && ls"}),
            call("c9", "bash", {"command": "cat > docs/adr/0009-x.md <<'EOF'\nbody\nEOF"}),
            call("c10", "bash", {"command": "true || cat docs/adr/0009-x.md"}),
            call("c11", "bash", {"command": "printf '%s' 'confidential customer information' > /tmp/report.txt"}),
            call("c12", "bash", {"command": "cat <<< 'hereStringSecret' && wc -l .claude/rules/react.md"}),
            call("c14", "bash", {"command": "cat <<< 'x'\ncat AGENTS.md\ngit config user.email \"mailLeak@example.com\" "
                                            "&& curl api.internal.corp && cat /etc/hosts.md && curl api.internal.sh && "
                                            "echo build.sh && wc -l build.sh && grep 'patLeak.internal.sh' README.md && "
                                            "sed -n '1,5p' docs/x.md && grep -e 'patLeak2.corp.sh' -r src/a.md && "
                                            "grep -m 1 patLeak3.internal.sh README.md && rg -t ts -g '*.md' patLeak4.sh docs/y.md && "
                                            "jq --arg k patLeak5.sh '.a' data/z.json && grep -F -m 1 internal/patLeak6 src/b.md && "
                                            "sed -f t.sed docs/adr/0010-y.md && sed 's/a/b/' src/c.md > .claude/rules/out.md && "
                                            "git commit -m 'gitLeak/needle' && rg -E utf-8 rgLeak/needle src/r.md"}),
            call("c13", "ghp_QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ", {"x": 1})]))
        f.write(msg("toolResult", toolCallId="c1", durationMs=250, timestamp=1793664001500))
        f.write(msg("toolResult", toolCallId="c2", durationMs=10, timestamp=1793664001600, isError=True))
        f.write(msg("toolResult", toolCallId="c3", durationMs=5, timestamp=1793664001700, isError=True))
        for i in ("c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12", "c13", "c14"):
            f.write(msg("toolResult", toolCallId=i, durationMs=5, timestamp=1793664001800))
    with open(os.path.join(tr, "review-sub2-2026-11-03T00-00-01Z_b.jsonl"), "w") as f:
        f.write(msg("user", [{"type": "text", "text": "Read /x/sub-agents/test-impact-review/SKILL.md first"}]))
        f.write(msg("assistant", [call("d1", "read", {"path": "/sandbox/workspace/pr-head/./docs/adr/0009-x.md"})]))
    with open(os.path.join(tr, "review-sub3-hostile-2026-11-03T00-00-01Z_h.jsonl"), "w") as f:
        f.write(msg("assistant", [call("h1", "read", {"path": "/sandbox/workspace/target-repo/x.ts"})]))
        f.write(msg("toolResult", toolCallId="h1", durationMs=5, timestamp="garbage"))
        f.write(msg("assistant", [call("h2", "read", {"path": "/sandbox/workspace/target-repo/z.ts"})]))
        f.write(msg("toolResult", toolCallId="h2", durationMs=1e300, timestamp=10**30))
        f.write("[1, 2]\n" + json.dumps({"message": "str"}) + "\n")
        f.write(msg("assistant", [{"type": "toolCall", "id": [1], "name": {"n": 1}, "arguments": [1]},
                                  call("h3", "read", {"path": 5}), call("h4", "read", {"path": "a.ts"})]))
        f.write(msg("toolResult", toolCallId="h3", durationMs=float("inf"), timestamp=1793664002000))
        f.write(msg("toolResult", toolCallId="h4", durationMs=float("nan"), timestamp=1793664002000))
    for name in ("review-2026-11-03T00-00-00Z_o2.jsonl", "review-2026-11-03T00-10-00Z_o3.jsonl"):
        with open(os.path.join(tr, name), "w") as f:  # two orchestrator sessions in one iteration
            f.write(msg("assistant", [call("p1", "read", {"path": "/sandbox/workspace/target-repo/y.ts"})]))
            f.write(msg("toolResult", toolCallId="p1", durationMs=5, timestamp=1793664001950))
    with open(os.path.join(tr, "review-2026-11-03T00-00-00Z_o.jsonl"), "w") as f:
        f.write(msg("assistant", [call("o1", "Agent", {"description": "style",
                                                       "prompt": "Apply docs/adr/0009-x.md"})]))
        f.write(msg("toolResult", toolCallId="o1", durationMs=5, timestamp=1793664001900))
    with open(os.path.join(tr, "review-sub1-style-conventions-2026-11-03T00-05-00Z_dup.jsonl"), "w") as f:
        f.write(msg("assistant", []))  # same usage record (iteration 1, seq 1) as the _a transcript
    with open(os.path.join(tr, "review-sub9-ghp_QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ-2026-11-03T00-00-01Z_g.jsonl"), "w") as f:
        f.write(msg("assistant", []))
    tr2 = os.path.join(run, "iteration-2", "transcripts")
    os.makedirs(tr2)
    with open(os.path.join(tr2, "review-subagents-usage.jsonl"), "w") as f:
        f.write(json.dumps({"seq": 1, "persona": "style-conventions", "durationMs": 10,
                            "startedAt": "2026-11-03T00:10:00Z", "usage": {"cost": 0.04}}) + "\n")
    with open(os.path.join(tr2, "review-sub1-style-conventions-2026-11-03T00-10-00Z_c.jsonl"), "w") as f:
        f.write(msg("assistant", []))
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
    tool = {}
    for x in spans:
        if x["name"].startswith("execute_tool") and get(x, "fullsend.persona") == "style-conventions":
            tool.setdefault(len(tool), x)
    shell_progs = [[v["stringValue"] for v in get(x, "fullsend.tool.programs")["values"]]
                   for x in spans if get(x, "fullsend.tool.programs")]
    rr_span = next(x for x in spans if x["name"] == "review_result")
    persona_cost = json.loads(get(rr_span, "fullsend.persona_cost"))
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
    result_path = os.path.join(bad_result, "fs-rev-x", "iteration-1", "output", "agent-result.json")

    def variant(result, verdict=None, **over):
        json.dump(result, open(result_path, "w"))
        return build(argparse.Namespace(**dict(vars(args), artifact=bad_result, verdict=verdict, **over)))
    v_failure = variant({"action": "failure"})[1]["tags"].get("fullsend.verdict.claimed")
    v_failure_verdict = variant({"action": "failure"})[1]["tags"].get("fullsend.verdict")
    v_posted = variant({"action": "approve"}, "request-changes")[1]["tags"].get("fullsend.verdict")
    trusted_sha = variant({"head_sha": "b" * 40}, head_sha="c" * 40)[0]
    no_sha = variant({"head_sha": "b" * 40}, head_sha="none")[0]
    no_repo = variant({"pr_number": 7})[1]
    bool_pr = variant({"pr_number": True, "repo": "o/r"})[1]
    trusted_pr = variant({"pr_number": 8, "repo": "evil/x"}, pr_number="7", repo="o/r")[1]
    no_trusted_pr = variant({"pr_number": 8, "repo": "evil/x"}, pr_number="none", repo="o/r")
    v_fallback = variant({}, "approve")[1]["tags"].get("fullsend.verdict")
    v_unknown = variant({"action": "weird"})[1]["tags"].get("fullsend.verdict.claimed")
    junk_payload, junk_summary = variant({
        "findings": ["x", {"severity": float("nan"), "dimension": ["d"]}], "producers": ["a"],
        "head_sha": float("nan")})
    junk2_payload, _ = variant({"producers": {"dispatched": "notalist", "skipped": [1, {"id": {"a": 1}}],
                                              "adapters": [{"id": {"a": 1}, "status": "ok"}, "junk",
                                                           {"id": "jira", "status": float("inf")}]}})
    junk_ok = bool(json.dumps(junk_payload, allow_nan=False)) and bool(json.dumps(junk2_payload, allow_nan=False))
    checks = [
        ("hostile usage row: no crash, persona kept, bad numbers dropped",
         hostile is not None and get(hostile, "fullsend.cost_usd") is None
         and get(hostile, "fullsend.usage.input_tokens") is None and get(hostile, "gen_ai.request.model") is None
         and int(hostile["endTimeUnixNano"]) >= int(hostile["startTimeUnixNano"])),
        ("two orchestrator transcripts in one iteration keep distinct span ids",
         sum(1 for x in spans if get(x, "fullsend.tool.path") == "y.ts") == 2),
        ("hostile agent-result: no verdict, risk, PR or repo in tags",
         not any(k in bad_summary["tags"] for k in ("fullsend.risk", "fullsend.pr"))
         and bad_summary["tags"].get("fullsend.verdict") is None
         and bad_summary["tags"].get("fullsend.verdict.claimed") == "other" and bad_summary["pr"] is None),
        ("here-strings don't swallow later lines; emails, hostnames and outside paths aren't exported",
         any(["cat", "cat", "git", "curl", "cat", "curl", "echo", "wc", "grep", "sed", "grep", "grep",
              "rg", "jq", "grep", "sed", "sed", "git", "rg"] == p for p in shell_progs)
         and "mailLeak" not in blob and "api.internal.corp" not in blob and "/etc/hosts" not in blob
         and "api.internal.sh" not in blob and "AGENTS.md" in blob
         and "patLeak" not in blob and "gitLeak" not in blob and "rgLeak" not in blob
         # only read-program files and redirection targets: no wc/grep/rg/jq/git arguments
         and any(get(x, "fullsend.tool.paths") == {"values": [
             {"stringValue": p} for p in ("AGENTS.md", "docs/x.md", "docs/adr/0010-y.md", "src/c.md",
                                          ".claude/rules/out.md")]}
             for x in spans)),
        ("a trusted --pr-number replaces the artifact's PR identity; 'none' drops it entirely",
         trusted_pr["pr"] == 7 and trusted_pr["tags"].get("fullsend.pr") == "o/r#7"
         and no_trusted_pr[1]["pr"] is None and "fullsend.pr" not in no_trusted_pr[1]["tags"]
         and "evil/x" not in json.dumps(no_trusted_pr[0]) and '"8"' not in json.dumps(no_trusted_pr[0])
         and "evil/x" not in json.dumps(trusted_pr)),
        ("PR key needs both repo and PR number (no 'None#7', no bool PR)",
         "fullsend.pr" not in no_repo["tags"] and no_repo["pr"] == 7 and bool_pr["pr"] is None
         and "None#" not in json.dumps(no_repo)),
        ("fullsend.verdict is only the posted review; the artifact's action is fullsend.verdict.claimed "
         "(failure kept, unknown is 'other'); a trusted --head-sha replaces the artifact's",
         (v_failure, v_unknown, v_fallback, v_posted) == ("failure", "other", "approve", "request-changes")
         and v_failure_verdict is None
         and "c" * 40 in json.dumps(trusted_sha) and "b" * 40 not in json.dumps(trusted_sha)
         and "b" * 40 not in json.dumps(no_sha)),
        ("malformed findings, producers, adapters and head_sha don't break the build or strict JSON",
         junk_ok and "nan" not in json.dumps(junk_summary).lower()),
        ("shell write targets, || branches, printf text and here-strings are not reads or exports",
         "docs/adr/0009-x.md" not in json.dumps(get(persona_sc, "fullsend.guidance.read"))
         and "confidential customer" not in blob and "hereStringSecret" not in blob
         and ["printf"] in shell_progs and ["cat", "wc"] in shell_progs),
        ("malformed transcript entries and non-finite tool durations are skipped",
         any(get(x, "fullsend.tool.path") == "a.ts" and x["startTimeUnixNano"] <= x["endTimeUnixNano"]
             for x in spans)),
        ("persona cost sums distinct usage records across iterations",
         abs(persona_cost.get("style-conventions", 0) - 0.05) < 1e-9),
        ("credential-shaped tool names, persona names and attribute keys are redacted",
         "QQQQQQQQQQQQ" not in blob and "keyLeakabcdefghij" not in blob),
        ("lookup timeout is an unknown state, not a new trace", net["timeout_state"] is None),
        ("truncated lookup response is an unknown state", net["truncated_state"] is None),
        ("logged errors are fixed text: status codes and exception types only",
         net["post_error"] == "HTTP 302" and net["url_error"] == "URLError"),
        ("the run summary in the log has counts, not the PR, run URL, guidance or file paths",
         "docs/adr" not in log_summary(summary) and ".claude/rules" not in log_summary(summary)
         and json.loads(log_summary(summary))["missed_count"] == 1
         and summary["tags"].get("fullsend.pr") == "o/r#7" and "o/r#7" not in log_summary(summary)
         and '"pr"' not in log_summary(summary)
         and "secret" not in log_summary(dict(summary, tags=dict(
             summary["tags"], **{"fullsend.run_url": "https://u:secret@x.invalid/r?token=secret"})))),
        ("non-object lookup responses and malformed tags are an unknown state", net["shape_states"] == [None] * 5),
        ("malformed and out-of-range timestamps are rejected",
         otlp_ns(float("inf")) is None and otlp_ns(float("nan")) is None and otlp_ns("x") is None
         and otlp_ns("1793664001000000000") == 1793664001000000000
         and ns(float("inf")) is None and ns(float("nan")) is None and ns("garbage") is None and ns(True) is None and ns([1]) is None and ns(1e300) is None
         and ns("2026-11-03T00:00:01Z") is not None),
        ("Fullsend span with an infinite end is normalized, one with a NaN start is dropped",
         any(x["name"] == "sandbox_create" and x["endTimeUnixNano"] == "1500000000" and "kind" not in x
             for x in spans) and not any(x["name"] == "bad_start" for x in spans)),
        ("invalid numbers on Fullsend spans are dropped, valid ones kept",
         not any(k in base_attrs for k in ("fullsend.num_turns", "fullsend.tool_calls",
                                           "fullsend.prescript.skipped", "fullsend.iterations"))
         and base_attrs.get("fullsend.cost_usd") == {"doubleValue": 1.5}
         and sanitize_value({"arrayValue": {"values": [{"doubleValue": float("inf")}, {"intValue": "7"}, "junk"]}})
         == {"arrayValue": {"values": [{"intValue": "7"}]}}),
        ("Fullsend span attributes are allowlisted: content and unknown keys are dropped",
         "fileBodyLeak7" not in blob and "gen_ai.output.messages" not in blob and "nested" not in base_attrs
         and set(base_attrs) <= BASE_ATTR_KEYS | {"session.id", "user.id", "fullsend.repo", "fullsend.pr_number",
                                                  "fullsend.head_sha", "fullsend.run_url", "gen_ai.usage.input_tokens"}),
        ("payload serializes as strict JSON (no Infinity/NaN)",
         bool(json.dumps(payload, allow_nan=False))),
        ("every span time stays within the OTLP range",
         all(0 <= int(x[k]) <= MAX_NS for x in spans for k in ("startTimeUnixNano", "endTimeUnixNano"))
         and int(span(tid, "1" * 16, None, "x", 5, 10**30, {})["endTimeUnixNano"]) == MAX_NS),
        ("host run dir chosen over sandbox-written decoy", base_run["spanId"] == run_sid and summary["trace_id"] == tid),
        ("text under a sensitive key in Fullsend's spans redacted", "plainValue9x" not in blob),
        ("token counts under token-named keys kept", base_attrs.get("gen_ai.usage.input_tokens") == {"intValue": "42"}),
        ("nested OTLP values redacted", "nestedPw77" not in blob),
        ("events and status messages dropped", "eventLeak5" not in blob and "statusLeak6" not in blob),
        ("shell commands export only programs and paths (no heredoc bodies or inline scripts)",
         "heredocBody1" not in blob and "inlineBody2" not in blob and ["cat", "python3", "ls"] in shell_progs
         and "fullsend.tool.command" not in blob),
        ("redaction stays fast on long adversarial input", redact_secs < 2),
        ("tokenizing a 20,000-character word stays fast", _timed(lambda: shell_tokens("a" * 20000)) < 1),
        ("malformed trace ids rejected", net["bad_id_rejected"]),
        ("plain http to a remote host rejected", net["http_rejected"]),
        ("redirects are not followed", net["redirect_blocked"]),
        ("missing trace is new; bridge-tagged trace is bridged; Fullsend-only trace is not",
         net["states"] == [(False, False, False), (True, True, False), (True, False, False), None]),
        ("failed read, search, prompt mention and unanswered call don't count as opened",
         get(persona_sc, "fullsend.guidance.read") is not None
         and "docs/adr/0009-x.md" not in json.dumps(get(persona_sc, "fullsend.guidance.read"))
         and "docs/adr/0009-x.md" not in json.dumps(get(persona_sc, "fullsend.files_read"))
         and json.loads(get(persona_sc, "fullsend.tool_counts") or "{}").get("read", 0) >= 1),
        ("cat in a shell command counts as opened", "AGENTS.md" in json.dumps(get(persona_sc, "fullsend.guidance.read"))),
        ("only read-program files and redirection targets are exported (no git/grep/rg/echo args)",
         all(shell_summary(c)[1] == [] for c in (
             "grep -nA 2 internal/customer/acme src/r.md", "grep -ne internal/x src/r.md",
             "grep --binary-files text internal/x src/r.md", "echo 'private/needle'",
             "git commit -m 'private/needle'", "rg -E utf-8 internal/customer/acme src/r.md", "wc -l build.sh"))
         and shell_summary("echo hi > out/x.md")[1] == ["out/x.md"]
         and shell_summary("sort < in/c.md > out/d.md")[1] == ["in/c.md", "out/d.md"]
         and shell_reads("sed -i.bak s/a/b/ src/c.md") == []
         and "src/c.md" in shell_summary("sed -i.bak s/a/b/ src/c.md")[1]
         and shell_reads("sed -X 1 docs/x.md") == [] and shell_reads("cat << EOF\nb\nEOF") == []),
        ("reads count only in commands that certainly ran (|| branches, groups, && before ;)",
         shell_reads("true || (cat .claude/rules/react.md)") == []
         and shell_reads("false && cat .claude/rules/react.md; true") == []
         and shell_reads("a || b && cat e/f.md") == []
         and shell_reads("true && cat .claude/rules/react.md") == [".claude/rules/react.md"]
         and shell_reads("cat a/b.md && cat c/d.md") == ["a/b.md", "c/d.md"]
         and shell_reads("true || (echo hi; cat docs/adr/0009-x.md)") == []
         and shell_reads("[ -f X ] && { echo a; cat docs/adr/0009-x.md; }") == []
         and shell_reads("if [ -f X ]; then cat docs/adr/0009-x.md; fi") == []
         and shell_reads("for f in a; do cat docs/adr/0009-x.md; done; cat k/l.md") == ["k/l.md"]
         and shell_reads("(cat m/n.md)") == ["m/n.md"]
         and shell_reads("{ cat o/p.md; }") == ["o/p.md"]
         and shell_reads("case $x in a) cat s/t.md;; esac; cat u/v.md") == ["u/v.md"]
         and shell_reads("true || echo $(cat docs/adr/0009-x.md)") == []
         and shell_reads("false && out=$(cat docs/adr/0009-x.md)") == []
         and shell_reads("diff <(cat docs/adr/0009-x.md) a; cat w/x.md") == ["w/x.md"]),
        ("shell reads follow a top-level cd; unknown directory changes drop relative reads",
         shell_reads("cd packages/maas && cat AGENTS.md") == ["packages/maas/AGENTS.md"]
         and shell_reads("cd .claude/rules && cat react.md") == [".claude/rules/react.md"]
         and shell_reads("cd /sandbox/workspace/target-repo/docs && cat adr/0009-x.md") == ["docs/adr/0009-x.md"]
         and shell_reads("cd $HOME && cat a.md") == [] and shell_reads("cd .. && cat b.md") == []
         and shell_reads("true || cd x; cat e/f.md") == [] and shell_reads("(cd x; cat y.md)") == []),
        ("an escaped $'...' heredoc delimiter stops the scan instead of exposing the body",
         shell_summary("cat <<$'E\\x4fF'\nEOF\nConfidentialCustomer\nE\\x4fF\ncat z/w.md")[0] == ["cat"]
         and shell_reads("cat <<$'EOF'\nbody\nEOF\ncat z/w.md") == ["z/w.md"]),
        ("heredoc bodies end only on an exact delimiter line (<<- strips leading tabs only)",
         shell_summary("cat <<'EOF'\n EOF\nConfidentialCustomer\nEOF\ncat z/w.md")[0] == ["cat", "cat"]
         and shell_reads("cat <<EOF\nx\nEOF \ncat z/w.md\nEOF\ncat y/v.md") == ["y/v.md"]
         and shell_reads("cat <<-EOF\n\tbody\n\tEOF\ncat z/w.md") == ["z/w.md"]),
        ("a failed bridge-marker write after export fails the run, even with --no-tags",
         "marker" in net["marker_exit"]),
        ("HTTP 200 with partialSuccess.rejectedSpans fails the run before the marker is written",
         "incomplete" in net["partial_exit"]),
        ("a rerun of a bridged trace sends nothing; an unmarked trace stops for explicit recovery",
         net["rerun_posts"] == [] and "marker" in net["rerun"]["bridged"]
         and "without the bridge marker" in net["rerun"]["unmarked"]
         and "marker" in net["rerun"]["mark_only"]
         and "found no trace" in net["rerun"]["mark_only_missing"]
         and "needs the trace to be in MLflow" in net["rerun"]["bridge_only_missing"]),
        ("--force resends all spans to an unmarked trace", net["rerun_posts_force"] == 1
         and "marker" in net["unmarked_force"]),
        ("--no-base-spans adds bridge spans to an unmarked (Fullsend-exported) trace",
         net["rerun_posts_bridge_only"] == 1 and "marker" in net["bridge_only"]),
        ("--no-base-spans refuses a trace whose earlier bridge export didn't finish",
         net["pending_posts"] == 0 and "didn't finish" in net["bridge_only_pending"]),
        ("an unquoted heredoc body line ending in a backslash stops the scan (the next line joins it)",
         shell_summary("cat <<EOF\nprefix\\\nEOF\nConfidentialCustomer\nEOF\ncat z/w.md")[0] == ["cat"]
         and shell_reads("cat <<'EOF'\nprefix\\\nEOF\ncat z/w.md") == ["z/w.md"]
         and shell_reads("cat <<EOF\nprefix\\\\\nEOF\ncat z/w.md") == ["z/w.md"]),
        ("reads count only when their success is established: not after exit, not masked by a "
         "later list, an || fallback or a pipe",
         shell_reads("exit 0; cat .claude/rules/react.md") == []
         and shell_reads("true && exit 0 && cat .claude/rules/react.md") == []
         and shell_reads("cat /sandbox/workspace/pr-head/.claude/rules/react.md 2>/dev/null || true") == []
         and shell_reads("cat a/b.md; ls") == [] and shell_reads("cat i/j.md | head") == []
         and shell_reads("ls; cat c/d.md") == ["c/d.md"]
         and shell_reads("cd docs && ls; cat adr/0009-x.md") == []
         and shell_reads("cd docs && cat adr/0009-x.md") == ["docs/adr/0009-x.md"]),
        ("negated and background reads don't count; a cd in a background job isn't followed",
         shell_reads("! cat .claude/rules/does-not-exist.md") == []
         and shell_reads("cat .claude/rules/does-not-exist.md &") == []
         and shell_reads("(cat a/b.md; cat c/d.md) &") == []
         and shell_reads("cd docs & cat adr/0009-x.md") == []
         and shell_reads("cat x/y.md & wait; cat z/w.md") == ["z/w.md"]),
        ("! negates the whole pipeline; < only counts for read programs; & marks only its own list",
         shell_reads("! true | cat .claude/rules/react.md") == []
         and shell_reads("! true && cat a/b.md") == ["a/b.md"]
         and shell_reads("grep -q flag < .claude/rules/react.md") == []
         and shell_reads("true < .claude/rules/react.md") == []
         and shell_reads("cat < .claude/rules/react.md") == [".claude/rules/react.md"]
         and ".claude/rules/react.md" in shell_summary("grep -q flag < .claude/rules/react.md")[1]
         and shell_reads("true & cd docs && cat adr/0009-x.md") == ["docs/adr/0009-x.md"]
         and shell_reads("(cat a/b.md; true) & cat c/d.md") == ["c/d.md"]
         and shell_reads("(cat a/b.md; cat c/d.md) &") == []
         and shell_reads("(cat a/b.md &); cat c/d.md") == ["c/d.md"]),
        ("a cd is followed only when it succeeded; reads with stdout sent away don't count",
         shell_reads("cd .claude/rules/no-such-dir || true; cat AGENTS.md") == []
         and shell_reads("cd .claude/rules; cat react.md") == []
         and shell_reads("cat .claude/rules/react.md >/dev/null") == []
         and shell_reads("cat .claude/rules/react.md 1>>out.txt") == []
         and shell_reads("cat .claude/rules/react.md &>/dev/null") == []
         and shell_reads("cat .claude/rules/react.md 2>/dev/null") == [".claude/rules/react.md"]
         and ".claude/rules/react.md" in shell_summary("cat .claude/rules/react.md >/dev/null")[1]),
        ("uncalled function bodies and >& file redirects don't count as reads",
         shell_reads("f() { cat docs/adr/0009-x.md; }") == []
         and shell_reads("function g() { cat docs/adr/0009-x.md; }") == []
         and shell_reads("f() { cat a/b.md; }; cat c/d.md") == ["c/d.md"]
         and shell_reads("{ cat o/p.md; }") == ["o/p.md"]
         and shell_reads("cat docs/adr/0009-x.md >& /dev/null") == []
         and shell_reads("cat docs/adr/0009-x.md >&2") == ["docs/adr/0009-x.md"]
         and shell_reads("cat docs/adr/0009-x.md 2>&1") == ["docs/adr/0009-x.md"]
         and shell_reads("f()\n{ cat docs/adr/0009-x.md; }") == []
         and shell_reads("f() ( cat docs/adr/0009-x.md )") == []
         and shell_reads("function g { cat docs/adr/0009-x.md; }") == []
         and shell_reads("function g\n{ cat docs/adr/0009-x.md; }") == []
         and shell_reads("function g\n{ cat a/b.md; }\ncat c/d.md") == ["c/d.md"]
         and shell_reads("cat 3<docs/adr/0009-x.md") == []
         and shell_reads("cat 0<docs/adr/0009-x.md") == ["docs/adr/0009-x.md"]),
        ("a newline after &&, || or | continues the command",
         shell_reads("true ||\ncat docs/adr/0009-x.md") == []
         and shell_reads("cd packages/x &&\ncat AGENTS.md") == ["packages/x/AGENTS.md"]
         and shell_reads("cat a/b.md |\nhead") == []
         and shell_reads("true\ncat c/d.md") == ["c/d.md"]),
        ("stdout destinations follow redirection order; sed -i writes back instead of showing",
         shell_reads("cat .claude/rules/react.md 2>/dev/null 1>&2") == []
         and shell_reads("cat .claude/rules/react.md 1>&2 2>/dev/null") == [".claude/rules/react.md"]
         and shell_reads("cat .claude/rules/react.md 1>&3") == []
         and shell_reads("cat .claude/rules/react.md 2>&1") == [".claude/rules/react.md"]
         and shell_reads("sed -i 's/a/b/' .claude/rules/react.md") == []
         and shell_reads("sed -ni 's/a/b/p' .claude/rules/react.md") == []
         and shell_reads("sed --in-place=.bak 's/a/b/' .claude/rules/react.md") == []
         and shell_reads("sed -n '1,5p' .claude/rules/react.md") == [".claude/rules/react.md"]
         and shell_reads("sed -e 's/i/j/' .claude/rules/react.md") == [".claude/rules/react.md"]
         and ".claude/rules/react.md" in shell_summary("sed -i 's/a/b/' .claude/rules/react.md")[1]),
        ("same-line function bodies stay uncalled; only an exit that may have ended the shell cuts",
         shell_reads("function g { echo hi; cat docs/adr/0009-x.md; }") == []
         and shell_reads("function g { echo hi; }; cat c/d.md") == ["c/d.md"]
         and shell_reads("[ -f x ] || exit 1; cat docs/adr/0009-x.md") == ["docs/adr/0009-x.md"]
         and shell_reads("(exit 3); cat c/d.md") == ["c/d.md"]
         and shell_reads("[ -f x ] && exit 0; cat docs/adr/0009-x.md") == []
         and shell_reads("if [ -f x ]; then exit; fi; cat docs/adr/0009-x.md") == []
         and shell_reads("true || exit $rc; cat docs/adr/0009-x.md") == []
         and shell_reads("[ -f x ] || exit 256; cat docs/adr/0009-x.md") == []
         and shell_reads("[ -f x ] || exit 768; cat docs/adr/0009-x.md") == []
         and shell_reads("[ -f x ] || exit 257; cat docs/adr/0009-x.md") == ["docs/adr/0009-x.md"]),
        ("an exit or return in a subshell or function body doesn't cut the parent shell's reads",
         shell_reads("f() { return; }; cat .claude/rules/react.md") == [".claude/rules/react.md"]
         and shell_reads("(exit 0); cat .claude/rules/react.md") == [".claude/rules/react.md"]
         and shell_reads("function g { exit; }; cat c/d.md") == ["c/d.md"]
         and shell_reads("x=$(exit 0); cat c/d.md") == ["c/d.md"]
         and shell_reads("{ exit 0; }; cat c/d.md") == []
         and shell_reads("[ -f x ] && exit 0; cat c/d.md") == []),
        ("over-long or unterminated secret values are dropped with everything after them",
         "A" * 50 not in clean('cookie="' + "A" * 2500 + '"')
         and "A" * 50 not in clean("password=" + "A" * 2500)
         and "A" * 50 not in clean("--token " + "A" * 2500)
         and "A" * 50 not in clean("x --api-key '" + "A" * 2500 + "'")
         and "A" * 50 not in clean('cookie="' + "A" * 300)
         and clean("password=hunter2 and more") == "password=[REDACTED] and more"
         and clean('cookie="abc" keep') == 'cookie=[REDACTED] keep'),
        ("an exit in a subshell cuts the rest of that subshell only; escaped quotes don't end secrets",
         shell_reads("(exit 0; cat .claude/rules/react.md)") == []
         and shell_reads("(exit 0; cat .claude/rules/react.md) && cat AGENTS.md") == ["AGENTS.md"]
         and shell_reads("(exit 0; (cat a/b.md)); cat c/d.md") == ["c/d.md"]
         and "SensitiveTail" not in clean('{"password": "prefix\\"SensitiveTail"}')
         and "SensitiveTail" not in clean('--token "prefix\\"SensitiveTail" x')
         and "SensitiveTail" not in clean(json.dumps({"q": 'password="a\\"SensitiveTail"'}))
         and clean('password="a\\"b" keep') == "password=[REDACTED] keep"
         and "secret-tail" not in clean('x --token password="AAA BBB-secret-tail')
         and "secret-tail" not in clean('--token password="' + "A" * 2500 + ' secret-tail')
         and "tok3nvalue" not in clean('--token tok3nvalue password="unterminated tail')
         and "tok3nvalue" not in clean('--token tok3nvalue password=' + "A" * 2500)
         and "Xq9secretvalue" not in clean("--api-key -Xq9secretvalue next")
         and "secretvalue" not in clean("run --token -secretvalue")
         and clean("--token --verbose") == "--token --verbose"
         and "SensitiveTail" not in clean('password="a\\" SensitiveTail')
         and "SensitiveTail" not in clean('--token "a\\" SensitiveTail')
         and "SensitiveTail" not in clean("password='a SensitiveTail")
         and clean('password="a\\"b" keep') == "password=[REDACTED] keep"
         and "def" not in clean("--token 'abc'def")
         and "secretTail" not in clean("--password prefix\\ secretTail")
         and "secretTail" not in clean("password=prefix\\ secretTail")
         and "secretTail" not in clean("password=prefix,secretTail")
         and "secretTail" not in clean("password=prefix]secretTail")
         and "secretTail" not in clean("password=prefix}secretTail")
         and "secretTail" not in clean("--token prefix,secretTail")
         and clean("password=hunter2 and more") == "password=[REDACTED] and more"
         and "ghi" not in clean('password=abc"def ghi"')
         and json.loads(clean(json.dumps({"password": "x", "keep": "y"}))
                        .replace("[REDACTED]", '"r"')) == {"password": "r", "keep": "y"}),
        ("only the last stdin redirection counts, and only when the program reads stdin",
         "AGENTS.md" not in shell_reads("cat < AGENTS.md < /dev/null")
         and shell_reads("cat < AGENTS.md <<< ''") == []
         and shell_reads("cat c/d.md < AGENTS.md") == ["c/d.md"]
         and shell_reads("cat < /dev/null < AGENTS.md") == ["AGENTS.md"]
         and shell_reads("cat - < AGENTS.md") == ["AGENTS.md"]
         and shell_reads("cat README.md - < AGENTS.md") == ["README.md", "AGENTS.md"]
         and shell_reads("cat README.md < AGENTS.md") == ["README.md"]
         and "AGENTS.md" in shell_summary("cat < AGENTS.md < /dev/null")[1]
         and "AGENTS.md" in shell_summary("cat c/d.md < AGENTS.md")[1]
         and shell_reads("sed --follow-symlinks -n 1p docs/x.md < .claude/rules/react.md") == []
         and ".claude/rules/react.md" in shell_summary(
             "sed --follow-symlinks -n 1p docs/x.md < .claude/rules/react.md")[1]
         and shell_reads("cat .claude/rules/react.md 1<>out.txt") == []
         and shell_reads("cat .claude/rules/react.md 2<>err.txt") == [".claude/rules/react.md"]
         and shell_reads("cat '<>' .claude/rules/react.md") == ["<>", ".claude/rules/react.md"]
         and shell_reads("cat \\<\\> c/d.md") == ["<>", "c/d.md"]),
        ("option values of read programs aren't files; stdin counts when only options remain",
         shell_reads("head -n 5 < docs/adr/0009-x.md") == ["docs/adr/0009-x.md"]
         and shell_reads("nl -s docs/adr/0009-x.md other.txt") == ["other.txt"]
         and shell_reads("head -n 50 docs/adr/0009-x.md") == ["docs/adr/0009-x.md"]
         and shell_reads("head -20 docs/adr/0009-x.md") == ["docs/adr/0009-x.md"]
         and shell_reads("tail -n +3 docs/adr/0009-x.md") == ["docs/adr/0009-x.md"]
         and shell_reads("cat -n docs/adr/0009-x.md") == ["docs/adr/0009-x.md"]
         and shell_reads("bat -r 1:20 --style plain docs/adr/0009-x.md") == ["docs/adr/0009-x.md"]
         and shell_reads("head --weird docs/adr/0009-x.md") == []),
        ("exec CMD replaces the shell, so later reads don't count; a bare exec with redirections doesn't",
         shell_reads("exec true; cat .claude/rules/react.md") == []
         and shell_reads("FOO=1 exec -a x true; cat c/d.md") == []
         and shell_reads("(exec true); cat c/d.md") == ["c/d.md"]
         and shell_reads("exec 2>/dev/null; cat c/d.md") == ["c/d.md"]
         and shell_reads("exec cat .claude/rules/react.md") == [".claude/rules/react.md"]
         and shell_reads("exec head -n 5 c/d.md") == ["c/d.md"]
         and shell_reads("exec >/dev/null; cat .claude/rules/react.md") == []
         and shell_reads("exec 1>out.log; cat .claude/rules/react.md") == []
         and shell_reads("exec 2>/dev/null; cat c/d.md") == ["c/d.md"]),
        ("count dictionaries stay valid JSON with sensitive-looking keys; secrets in them still go",
         json.loads(attr("c", {"auth_login": 3, "read": 2})["value"]["stringValue"]) == {"auth_login": 3, "read": 2}
         and "hunter2" not in json.dumps(attr("c", {"password": "hunter2", "n": 1}))
         and "ghp_" not in json.dumps(attr("c", {"ghp_" + "a" * 30: 1}))),
        ("comments end at the newline; quotes and escapes inside a word never make operators",
         shell_reads("ls # x\ncat docs/adr/0009-x.md") == ["docs/adr/0009-x.md"]
         and shell_reads("# it's 'odd\ncat k/l.md") == ["k/l.md"]
         and shell_reads("cat a#b.md") == ["a#b.md"]
         and shell_summary("grep x'>internal/customer/acme' README.md")[1] == []
         and shell_summary("grep x\\>internal/customer/acme README.md")[1] == []
         and shell_reads("cat <<'EOF'\nsecret/x\nEOF\ncat z/w.md") == ["z/w.md"]
         and shell_reads("echo '<<EOF'\ncat z/w.md") == ["z/w.md"]
         and shell_reads("# say \\\"hi\\\" and it\\'s fine\ncat k/l.md") == ["k/l.md"]
         and shell_reads("# cat <<EOF\ncat k/l.md && echo EOF") == ["k/l.md"]
         and shell_summary("echo \\> private/needle")[1] == []
         and shell_summary("echo $'\\' > private/secret.md \\''")[1] == []
         and shell_reads("echo $'a\\'b' && cat k/l.md") == ["k/l.md"]
         and shell_reads("echo $'\\' ; cat docs/adr/0009-x.md \\''") == []
         and shell_summary("sed -e >/dev/null 's/private/needle/' README.md")[1] == ["README.md"]
         and shell_summary("sed -e 2>/dev/null 's/private/needle/' README.md")[1] == ["README.md"]
         and shell_tokens("cmd 2>err/e.log '2'>out/o.log 2 >x/y.log")
         == ["cmd", Op(">"), "err/e.log", "2", Op(">"), "out/o.log", "2", Op(">"), "x/y.log"]
         and "docs/r.md" in shell_summary("sed -e 's/a/b/' >/dev/null docs/r.md")[1]),
        ("quoted ; | > text never splits segments or creates redirections; skipped < reads don't count",
         shell_summary("echo 'status; cat ssn/123-45-6789 ; done'")[1] == []
         and shell_summary("echo '>' private/needle")[1] == []
         and shell_summary("echo > private/needle")[1] == ["private/needle"]
         and len(shell_segments("cat a.md | head && sed -n 1p b/c.md; ls")) == 4
         and shell_reads("true || cat < docs/adr/0009-x.md") == []
         and shell_reads("cat < docs/adr/0009-x.md") == ["docs/adr/0009-x.md"]
         and shell_summary("cat 'unterminated")[1] == []),
        ("quoted < and > text is not a redirection; here-string text is never a path",
         shell_summary("echo '>private/needle'")[1] == []
         and shell_summary("grep '>internal/customer/acme' README.md")[1] == []
         and shell_summary("cat <<< 'internal/customer/acme'")[1] == []
         and shell_summary("grep foo <<< 'private/needle'")[1] == []
         and shell_summary("rg --color never internal/customer/acme src/a.md")[1] == []
         and shell_summary("echo hi >out/x.md")[1] == ["out/x.md"]
         and shell_summary("cat <in/a.md")[1] == ["in/a.md"]
         and shell_summary("cat 2>err/e.log docs/a.md")[1] == ["docs/a.md", "err/e.log"]),
        ("sed -f input files count as reads; redirection targets and grep -F/-m patterns don't",
         shell_reads("sed -f t.sed docs/adr/0010-y.md") == ["docs/adr/0010-y.md"]
         and shell_reads("sed 's/a/b/' src/c.md > .claude/rules/out.md") == []
         and "src/c.md" in shell_summary("sed 's/a/b/' src/c.md > .claude/rules/out.md")[1]
         and shell_summary("grep -F -m 1 internal/customer/acme README.md")[1] == []),
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
        ("Bearer token in a command never exported", "abcdefghijklmnop" not in blob),
        ("coverage is 1 of 2", summary["coverage"] == 0.5 and summary["missed"] == ["docs/adr/0009-x.md"]),
        ("session and user set", get(by["review_result"], "session.id") == "o/r#7"
         and get(by["review_result"], "user.id") == "alice"),
        ("tags carry real cost; the artifact's action is only the claimed verdict",
         summary["tags"].get("fullsend.cost_usd") == 0.5
         and summary["tags"].get("fullsend.verdict") is None
         and summary["tags"].get("fullsend.verdict.claimed") == "request-changes"),
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
    p.add_argument("--pr-number", help="trusted PR number, or 'none': overrides the PR identity in "
                                       "the artifact, which is written in the sandbox")
    p.add_argument("--repo", help="trusted owner/name of the repository, used with --pr-number")
    p.add_argument("--head-sha", help="trusted reviewed commit, or 'none': overrides the artifact's")
    p.add_argument("--verdict", help="the verdict of the review the host posted; wins over the "
                                     "artifact's action, which is written in the sandbox")
    p.add_argument("--out", help="also write the OTLP JSON payload here")
    p.add_argument("--no-base-spans", action="store_true",
                   help="do not re-send run/agent spans (use once Fullsend exports them itself)")
    p.add_argument("--no-tags", action="store_true",
                   help="skip the descriptive MLflow trace tags (the bridge marker is always set)")
    p.add_argument("--force", action="store_true",
                   help="send all spans even if MLflow already has the trace (doubles MLflow's token totals)")
    p.add_argument("--mark-only", action="store_true",
                   help="send no spans, only record the bridge marker (when an earlier export "
                        "completed but its marker write failed)")
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
    print(log_summary(summary))
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
    if args.dry_run or not endpoint:
        if not endpoint and not args.dry_run:
            print("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT not set; skipping export", file=sys.stderr)
        return
    check_endpoint(endpoint)
    headers = parse_headers(os.environ.get("OTEL_EXPORTER_OTLP_TRACES_HEADERS"))
    state = None
    for attempt in range(LOOKUP_ATTEMPTS):
        state = mlflow_trace_state(endpoint, headers, summary["trace_id"])
        if state is not None:
            break
        time.sleep(2 ** attempt)
    if state is None and not (args.force or args.mark_only):
        sys.exit("trace lookup failed; not exporting, to avoid doubling MLflow's token totals "
                 "(rerun the job, or pass --force)")
    exists, bridged, pending = state or (False, False, False)
    if args.mark_only:
        if not exists:
            sys.exit("--mark-only needs the trace to be in MLflow already (the lookup "
                     + ("failed" if state is None else "found no trace") + "); not writing the marker")
        print("--mark-only: skipping span export")
    elif bridged and not args.force:
        print("bridge spans already in MLflow; skipping span export (use --force to resend)")
    else:
        if exists and not bridged and not args.force and summary["base_span_ids"]:
            # Without the marker the bridge can't tell which spans MLflow already holds: an
            # earlier export may have been partial or lost its marker, or Fullsend may export
            # its own spans. Guessing could finalize an incomplete trace, so stop.
            sys.exit("trace is in MLflow without the bridge marker: an earlier export was partial "
                     "or its marker write failed, or Fullsend exports its own spans. Check the "
                     "trace, then rerun with --mark-only (spans complete), --force (resend all; "
                     "accepted spans count twice) or --no-base-spans (Fullsend exports its own)")
        if args.no_base_spans and not exists and not args.force:
            # Bridge spans only belong on a trace Fullsend exported itself; posting to a missing
            # trace would skip the pending tag, so a stop before the marker could resend them.
            sys.exit("--no-base-spans needs the trace to be in MLflow already (Fullsend's own export "
                     "may not have landed yet); rerun later, or pass --force")
        if exists and not bridged and not args.force:
            # Bridge spans only (--no-base-spans). A pending tag means an earlier bridge export
            # here may have sent some of them; sending again would duplicate them.
            if pending:
                sys.exit(f"an earlier bridge export to this trace didn't finish ({PENDING_TAG} is "
                         "set); sending again would duplicate the bridge spans. Check the trace, "
                         "then rerun with --mark-only (spans complete) or --force")
            if set_mlflow_tags(endpoint, headers, summary["trace_id"], {PENDING_TAG: "1"}) != 1:
                sys.exit(f"could not record {PENDING_TAG} before a bridge-only export; not exporting")
            print("trace exists without bridge spans; sending bridge spans only")
        try:
            status = post(payload, endpoint, headers)
        except PartialExport as e:
            set_mlflow_tags(endpoint, headers, summary["trace_id"], {PENDING_TAG: "1"})  # best effort
            sys.exit(f"export incomplete ({e}); bridge marker not written. Check the trace, "
                     "then rerun with --force to resend all spans")
        except (urllib.error.URLError, OSError, http.client.HTTPException, ValueError) as e:
            # MLflow may have accepted the spans before the error (a timeout on the reply).
            set_mlflow_tags(endpoint, headers, summary["trace_id"], {PENDING_TAG: "1"})  # best effort
            sys.exit(f"export failed ({safe_error(e)})")
        print(f"exported to OTLP endpoint: HTTP {status}")
    # The bridge marker is what makes reruns idempotent, so it is required (with retries);
    # the other tags are best effort, and --no-tags skips only those.
    marker = {"fullsend.bridge.version": BRIDGE_VERSION}
    for attempt in range(LOOKUP_ATTEMPTS):
        if set_mlflow_tags(endpoint, headers, summary["trace_id"], marker) == 1:
            break
        time.sleep(2 ** attempt)
    else:
        set_mlflow_tags(endpoint, headers, summary["trace_id"], {PENDING_TAG: "1"})  # best effort
        sys.exit("spans exported, but the bridge marker tag could not be recorded; "
                 "rerun with --mark-only to record it")
    if not args.no_tags:
        rest = {k: v for k, v in summary["tags"].items() if k not in marker}
        n = set_mlflow_tags(endpoint, headers, summary["trace_id"], rest)
        print(f"set {n + 1} MLflow trace tags")


if __name__ == "__main__":
    main()
