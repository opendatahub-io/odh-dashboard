"""Fan out Jira poll records, one run each, and check where they came from.

Modes: launch (one run per record), validate (the records come from the
main-branch poller), select (one record as a one-entry matrix). Works around
fullsend#8961; delete with fullsend-code-jira.yaml once fullsend#9003 ships.
"""

from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import subprocess
import sys

# The fork runs the same workflows for smoke tests, so the repository comes
# from the run rather than being fixed here.
REPOSITORY = os.environ.get("GITHUB_REPOSITORY", "opendatahub-io/odh-dashboard")
POLL_WORKFLOW = ".github/workflows/fullsend-poll-jira.yaml"
CODE_WORKFLOW = "fullsend-code-jira.yaml"
JIRA_PROJECT = "RHOAIENG"
JIRA_BROWSE_URL = "https://redhat.atlassian.net/browse/"
# launch dispatches seconds after the poll; anything older is a replay.
MAX_POLL_AGE = timedelta(hours=2)


def launch(records, run_id, attempt, api):
    """Attempt every checkpointed record, even if an earlier API call fails."""
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
        try:
            api(
                f"repos/{REPOSITORY}/actions/workflows/{CODE_WORKFLOW}/dispatches",
                payload,
            )
        except subprocess.CalledProcessError:
            failures.append(index)
    if failures:
        raise RuntimeError(
            f"Failed to dispatch records {failures}; inspect poll artifact and retry with /fs-code"
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
    if not key.startswith(JIRA_PROJECT + "-") or event["entity"]["url"] != (
        JIRA_BROWSE_URL + key
    ):
        raise ValueError("Unexpected Jira project or tenant")
    return {"include": [record]}


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
        # Keep gh's error message in the job log; callers still see the raise.
        print(f"gh api {endpoint} failed: {err.stderr.strip()}", file=sys.stderr)
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
