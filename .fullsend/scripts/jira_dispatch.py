"""Fan out Jira poll records, one run each, and check where they came from.

Modes: launch (one run per record), validate (the records come from the
main-branch poller), select (one record as a one-entry matrix), keys (name the
issues of records that could not be saved, then fail). Works around
fullsend#8961; delete with fullsend-code-jira.yaml once fullsend#9003 ships.
"""

from datetime import datetime, timedelta, timezone
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import time

# The fork runs the same workflows for smoke tests, so the repository comes
# from the run rather than being fixed here.
REPOSITORY = os.environ.get("GITHUB_REPOSITORY", "opendatahub-io/odh-dashboard")
POLL_WORKFLOW = ".github/workflows/fullsend-poll-jira.yaml"
CODE_WORKFLOW = "fullsend-code-jira.yaml"
# RHAI is where new issues go; RHOAIENG stays until it is retired.
JIRA_PROJECTS = ("RHAI", "RHOAIENG")
JIRA_BROWSE_URL = "https://redhat.atlassian.net/browse/"
# launch dispatches seconds after the poll; anything older is a replay.
MAX_POLL_AGE = timedelta(hours=2)
# Waits between dispatch attempts. The poller has already committed the
# Jira checkpoint by now, so a record whose dispatch fails is not picked up
# again by a later poll (a Fullsend limitation for GitHub targets).
DISPATCH_RETRY_DELAYS = (5, 15)


def launch(records, run_id, attempt, api, sleep=time.sleep):
    """Attempt every checkpointed record, retrying each dispatch a few times."""
    failures = []
    for index, _ in enumerate(records):
        payload = {
            "ref": "main",
            "inputs": {
                "poll_run_id": str(run_id),
                "poll_attempt": str(attempt),
                "record_index": str(index),
            },
        }
        for delay in (*DISPATCH_RETRY_DELAYS, None):
            try:
                api(
                    f"repos/{REPOSITORY}/actions/workflows/{CODE_WORKFLOW}/dispatches",
                    payload,
                )
                break
            except subprocess.CalledProcessError:
                if delay is None:
                    failures.append(index)
                else:
                    sleep(delay)
    if failures:
        raise RuntimeError(
            f"Failed to dispatch records {failures}. Within 2 hours, start "
            f"{CODE_WORKFLOW} on main with poll_run_id={run_id}, "
            f"poll_attempt={attempt} and each record_index; later, comment "
            "/fs-code on the issue again."
        )


def validate_run(run, attempt, compare_status, now):
    """Only recent artifacts from the main-branch poller may reach credentials.

    compare_status is GitHub's compare status from the poll run's commit to
    this run's commit: "identical", or "ahead" when main moved in between.
    """
    created = datetime.fromisoformat(run["created_at"].replace("Z", "+00:00"))
    if (
        run["repository"]["full_name"] != REPOSITORY
        or run["head_repository"]["full_name"] != REPOSITORY
        or run["path"] != POLL_WORKFLOW
        or run["head_branch"] != "main"
        or run["event"] not in ("schedule", "workflow_dispatch")
        or compare_status not in ("identical", "ahead")
        or run["run_attempt"] != int(attempt)
        or not timedelta(0) <= now - created <= MAX_POLL_AGE
    ):
        raise ValueError(
            "Untrusted poll run or revision mismatch; inspect run and retry with /fs-code"
        )


def select_record(records, index):
    index = int(index)
    if index < 0 or index >= len(records):
        raise ValueError("Record index is outside the poll artifact")
    record = records[index]
    if record["agent"] != "code" or record["source_repo"] != REPOSITORY:
        raise ValueError("Unexpected agent or target repository")
    event = json.loads(record["event_payload"])["_normalized_event"]
    if event["source"]["system"] != "jira" or event["repo"] != REPOSITORY:
        raise ValueError("Unexpected event source")
    key = event["entity"]["key"]
    project, _, number = key.rpartition("-")
    if (
        project not in JIRA_PROJECTS
        or not number.isdigit()
        or event["entity"]["url"] != JIRA_BROWSE_URL + key
    ):
        raise ValueError("Unexpected Jira project or tenant")
    return {"include": [record]}


def issue_keys(records):
    """Jira keys of the records, for a log line; never the event content."""
    keys = []
    for record in records:
        try:
            keys.append(json.loads(record["event_payload"])["_normalized_event"]["entity"]["key"])
        except (KeyError, TypeError, ValueError):
            keys.append("<unreadable record>")
    return keys


def api(endpoint, payload=None):
    args = ["gh", "api", endpoint]
    if payload is not None:
        args.extend(["--method", "POST", "--input", "-"])
    try:
        result = subprocess.run(
            args,
            input=json.dumps(payload) if payload is not None else None,
            text=True,
            capture_output=True,
            check=True,
        )
    except subprocess.CalledProcessError as err:
        # Log only the endpoint, exit code and HTTP status: gh's error text can
        # echo response content, which does not belong in a public job log.
        status = re.search(r"HTTP (\d{3})", err.stderr or "")
        print(
            f"gh api {endpoint} failed (exit {err.returncode}, "
            f"HTTP {status.group(1) if status else 'unknown'})",
            file=sys.stderr,
        )
        raise
    return json.loads(result.stdout) if result.stdout.strip() else None


def main():
    mode = sys.argv[1]
    if mode == "validate":
        run_id = int(os.environ["POLL_RUN_ID"])
        attempt = int(os.environ["POLL_ATTEMPT"])
        run = api(f"repos/{REPOSITORY}/actions/runs/{run_id}")
        compare = api(
            f"repos/{REPOSITORY}/compare/{run['head_sha']}...{os.environ['GITHUB_SHA']}"
        )
        validate_run(run, attempt, compare["status"], datetime.now(timezone.utc))
    else:
        records = json.loads(Path("dispatches.json").read_text())
        if not isinstance(records, list):
            raise ValueError("Poll output must be an array")
        if mode == "launch":
            launch(
                records,
                os.environ["GITHUB_RUN_ID"],
                os.environ["GITHUB_RUN_ATTEMPT"],
                api,
            )
        elif mode == "keys":
            raise RuntimeError(
                "Could not save the poll records, so no run was started for: "
                + ", ".join(issue_keys(records))
                + ". Their checkpoints are saved; comment /fs-code on each again."
            )
        elif mode == "select":
            matrix = select_record(records, os.environ["RECORD_INDEX"])
            with open(os.environ["GITHUB_OUTPUT"], "a") as output:
                output.write(
                    "matrix=" + json.dumps(matrix, separators=(",", ":")) + "\n"
                )
        else:
            raise ValueError(f"Unknown mode: {mode}")


if __name__ == "__main__":
    main()
