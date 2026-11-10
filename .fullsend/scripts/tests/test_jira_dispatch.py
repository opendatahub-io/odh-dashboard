"""Unit tests for .fullsend/scripts/jira_dispatch.py and the Jira workflow contracts.

No GitHub or Jira calls. Run:
  python3 .fullsend/scripts/tests/test_jira_dispatch.py
"""

import copy
from datetime import datetime, timedelta, timezone
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest import mock

import yaml

ROOT = Path(__file__).resolve().parents[3]
SPEC = importlib.util.spec_from_file_location(
    "jira_dispatch", ROOT / ".fullsend/scripts/jira_dispatch.py"
)
dispatch = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(dispatch)

NOW = datetime(2026, 11, 5, 18, 0, tzinfo=timezone.utc)
POLL_SHA = "a" * 40
RUN_SHA = "b" * 40


def record(key, repo=dispatch.REPOSITORY, url=None):
    return {
        "agent": "code",
        "source_repo": repo,
        "event_payload": json.dumps(
            {
                "_normalized_event": {
                    "source": {"system": "jira"},
                    "repo": repo,
                    "entity": {
                        "key": key,
                        "url": url or f"https://redhat.atlassian.net/browse/{key}",
                    },
                }
            }
        ),
    }


def workflow(name):
    return yaml.safe_load((ROOT / ".github/workflows" / name).read_text())


class LaunchTests(unittest.TestCase):
    def setUp(self):
        self.records = [record("RHOAIENG-123"), record("RHOAIENG-456")]

    def test_two_issues_get_separate_runs(self):
        calls = []
        dispatch.launch(
            self.records, 42, 1, lambda endpoint, payload: calls.append((endpoint, payload))
        )
        self.assertEqual(len(calls), 2)
        for index, (endpoint, payload) in enumerate(calls):
            self.assertEqual(
                endpoint,
                f"repos/{dispatch.REPOSITORY}/actions/workflows/fullsend-code-jira.yaml/dispatches",
            )
            self.assertEqual(payload["ref"], "main")
            self.assertEqual(
                payload["inputs"],
                {"poll_run_id": "42", "poll_attempt": "1", "record_index": str(index)},
            )

    def test_failed_launch_retries_then_does_not_skip_later_records(self):
        attempted, slept = [], []

        def api(endpoint, payload):
            attempted.append(payload["inputs"]["record_index"])
            if payload["inputs"]["record_index"] == "0":
                raise subprocess.CalledProcessError(1, "gh")

        with self.assertRaisesRegex(
            RuntimeError, r"records \[0\].*poll_run_id=42, poll_attempt=1"
        ):
            dispatch.launch(self.records, 42, 1, api, sleep=slept.append)
        self.assertEqual(attempted, ["0", "0", "0", "1"])
        self.assertEqual(slept, list(dispatch.DISPATCH_RETRY_DELAYS))

    def test_transient_dispatch_error_is_retried(self):
        calls = []

        def api(endpoint, payload):
            calls.append(payload["inputs"]["record_index"])
            if len(calls) == 1:
                raise subprocess.CalledProcessError(1, "gh")

        dispatch.launch(self.records[:1], 42, 1, api, sleep=lambda _: None)
        self.assertEqual(calls, ["0", "0"])

    def test_empty_poll_launches_nothing(self):
        dispatch.launch([], 42, 1, lambda *_: self.fail("unexpected dispatch"))


class ValidateRunTests(unittest.TestCase):
    def setUp(self):
        self.run = {
            "repository": {"full_name": dispatch.REPOSITORY},
            "head_repository": {"full_name": dispatch.REPOSITORY},
            "path": dispatch.POLL_WORKFLOW,
            "head_branch": "main",
            "event": "schedule",
            "head_sha": POLL_SHA,
            "run_attempt": 1,
            "created_at": "2026-11-05T17:30:00Z",
        }

    def test_scheduled_and_manual_main_polls_are_valid(self):
        for event in ("schedule", "workflow_dispatch"):
            self.run["event"] = event
            dispatch.validate_run(self.run, "1", "identical", NOW)

    def test_main_moving_between_poll_and_launch_is_valid(self):
        dispatch.validate_run(self.run, "1", "ahead", NOW)

    def test_poll_commit_not_behind_this_run_is_rejected(self):
        for status in ("behind", "diverged"):
            with self.subTest(status=status), self.assertRaises(ValueError):
                dispatch.validate_run(self.run, "1", status, NOW)

    def test_old_or_future_poll_runs_are_rejected(self):
        for created in ("2026-11-05T15:59:00Z", "2026-11-05T18:01:00Z"):
            with self.subTest(created=created), self.assertRaises(ValueError):
                dispatch.validate_run(self.run | {"created_at": created}, "1", "identical", NOW)

    def test_poll_run_just_inside_the_window_is_valid(self):
        created = (NOW - dispatch.MAX_POLL_AGE).strftime("%Y-%m-%dT%H:%M:%SZ")
        dispatch.validate_run(self.run | {"created_at": created}, "1", "identical", NOW)

    def test_untrusted_provenance_is_rejected(self):
        changes = [
            {"repository": {"full_name": "someone/fork"}},
            {"head_repository": {"full_name": "someone/fork"}},
            {"path": ".github/workflows/other.yaml"},
            {"head_branch": "feature"},
            {"event": "pull_request"},
            {"run_attempt": 2},
        ]
        for change in changes:
            with self.subTest(change=change), self.assertRaises(ValueError):
                dispatch.validate_run(self.run | change, "1", "identical", NOW)

    def test_validate_mode_compares_poll_commit_to_this_run(self):
        calls = []

        def api(endpoint, payload=None):
            calls.append(endpoint)
            if "/compare/" in endpoint:
                return {"status": "ahead"}
            return self.run | {"created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}

        env = {"POLL_RUN_ID": "42", "POLL_ATTEMPT": "1", "GITHUB_SHA": RUN_SHA}
        with mock.patch.object(dispatch, "api", api), mock.patch.dict(os.environ, env), mock.patch(
            "sys.argv", ["jira_dispatch.py", "validate"]
        ):
            dispatch.main()
        self.assertEqual(
            calls,
            [
                f"repos/{dispatch.REPOSITORY}/actions/runs/42",
                f"repos/{dispatch.REPOSITORY}/compare/{POLL_SHA}...{RUN_SHA}",
            ],
        )


class SelectRecordTests(unittest.TestCase):
    def setUp(self):
        self.records = [record("RHOAIENG-123"), record("RHOAIENG-456")]

    def test_selects_one_record_as_a_matrix(self):
        self.assertEqual(dispatch.select_record(self.records, "1"), {"include": [self.records[1]]})

    def test_select_mode_writes_the_matrix_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, "dispatches.json").write_text(json.dumps(self.records))
            output = Path(tmp, "github_output")
            env = {"RECORD_INDEX": "0", "GITHUB_OUTPUT": str(output)}
            cwd = os.getcwd()
            try:
                os.chdir(tmp)
                with mock.patch.dict(os.environ, env), mock.patch(
                    "sys.argv", ["jira_dispatch.py", "select"]
                ):
                    dispatch.main()
            finally:
                os.chdir(cwd)
            line = output.read_text().strip()
        self.assertTrue(line.startswith("matrix="))
        self.assertEqual(json.loads(line[len("matrix="):]), {"include": [self.records[0]]})

    def test_out_of_range_index_is_rejected(self):
        for index in (-1, 2):
            with self.subTest(index=index), self.assertRaises(ValueError):
                dispatch.select_record(self.records, index)

    def test_other_agent_or_repo_is_rejected(self):
        for change in ({"agent": "review"}, {"source_repo": "someone/fork"}):
            records = copy.deepcopy(self.records)
            records[0].update(change)
            with self.subTest(change=change), self.assertRaises(ValueError):
                dispatch.select_record(records, 0)

    def test_non_jira_source_or_other_event_repo_is_rejected(self):
        for change in ({"source": {"system": "github"}}, {"repo": "someone/fork"}):
            bad = record("RHOAIENG-1")
            event = json.loads(bad["event_payload"])
            event["_normalized_event"].update(change)
            bad["event_payload"] = json.dumps(event)
            with self.subTest(change=change), self.assertRaises(ValueError):
                dispatch.select_record([bad], 0)

    def test_rhai_and_rhoaieng_issues_are_accepted(self):
        for key in ("RHAI-1", "RHOAIENG-1"):
            with self.subTest(key=key):
                selected = dispatch.select_record([record(key)], 0)
                self.assertEqual(selected, {"include": [record(key)]})

    def test_other_project_or_tenant_is_rejected(self):
        for bad in (
            record("RHAISTRAT-1"),
            record("AIPCC-1"),
            record("RHAI-"),
            record("RHAI-RHOAIENG-1"),
            record("RHOAIENG-1", url="https://other.atlassian.net/browse/RHOAIENG-1"),
            record("RHOAIENG-1", url="https://redhat.atlassian.net/browse/RHOAIENG-2"),
        ):
            with self.subTest(bad=bad["event_payload"]), self.assertRaises(ValueError):
                dispatch.select_record([bad], 0)


class KeysTests(unittest.TestCase):
    def test_keys_mode_names_only_the_issues_and_fails(self):
        records = [record("RHOAIENG-123"), {"event_payload": "not json"}]
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, "dispatches.json").write_text(json.dumps(records))
            cwd = os.getcwd()
            try:
                os.chdir(tmp)
                with mock.patch("sys.argv", ["jira_dispatch.py", "keys"]), self.assertRaises(
                    RuntimeError
                ) as raised:
                    dispatch.main()
            finally:
                os.chdir(cwd)
        message = str(raised.exception)
        self.assertIn("RHOAIENG-123, <unreadable record>", message)
        self.assertIn("/fs-code", message)
        self.assertNotIn("redhat.atlassian.net", message)


class ApiTests(unittest.TestCase):
    def _logged_failure(self, stderr_text):
        err = subprocess.CalledProcessError(1, "gh", stderr=stderr_text)
        with mock.patch.object(dispatch.subprocess, "run", side_effect=err), mock.patch(
            "sys.stderr"
        ) as stderr, self.assertRaises(subprocess.CalledProcessError):
            dispatch.api("repos/x/y/actions/runs/1")
        return "".join(call.args[0] for call in stderr.write.call_args_list)

    def test_failed_gh_call_logs_status_only_and_raises(self):
        logged = self._logged_failure(
            'gh: Not Found (HTTP 404)\n{"message":"Not Found","secret_hint":"s3cr3t-value"}\n'
        )
        self.assertIn("gh api repos/x/y/actions/runs/1 failed (exit 1, HTTP 404)", logged)
        self.assertNotIn("s3cr3t-value", logged)
        self.assertNotIn("Not Found", logged)

    def test_failed_gh_call_without_status_says_unknown(self):
        logged = self._logged_failure("connection reset by peer token=abc123\n")
        self.assertIn("(exit 1, HTTP unknown)", logged)
        self.assertNotIn("abc123", logged)


class WorkflowContractTests(unittest.TestCase):
    def test_both_workflows_stay_off_until_enabled_and_run_only_on_main(self):
        gate = "vars.FULLSEND_JIRA_CODE_ENABLED == 'true' && github.ref == 'refs/heads/main'"
        poll = workflow("fullsend-poll-jira.yaml")
        code = workflow("fullsend-code-jira.yaml")
        self.assertEqual(poll["jobs"]["poll"]["if"], gate)
        self.assertEqual(code["jobs"]["validate"]["if"], gate)
        self.assertEqual(code["jobs"]["code"]["needs"], "validate")
        for wf in (poll, code):
            self.assertEqual(wf["permissions"], {})

    def test_ci_runs_this_suite_on_relevant_changes(self):
        ci = workflow("fullsend-scripts-test.yaml")
        on = ci.get("on", ci.get(True))
        paths = on["pull_request"]["paths"]
        for path in (
            ".fullsend/scripts/**",
            ".github/workflows/fullsend-poll-jira.yaml",
            ".github/workflows/fullsend-code-jira.yaml",
        ):
            self.assertIn(path, paths)
        self.assertEqual(ci["permissions"], {"contents": "read"})
        runs = [s.get("run", "") for s in ci["jobs"]["test"]["steps"]]
        self.assertTrue(any(".fullsend/scripts/tests/test_jira_dispatch.py" in r for r in runs))

    def test_job_permissions_do_not_grow_silently(self):
        # The code job's set is the union reusable-dispatch.yml (v0.54.0)
        # requires; see the comment in fullsend-code-jira.yaml.
        self.assertEqual(
            workflow("fullsend-poll-jira.yaml")["jobs"]["poll"]["permissions"],
            {"contents": "read", "actions": "write"},
        )
        code = workflow("fullsend-code-jira.yaml")["jobs"]
        self.assertEqual(code["validate"]["permissions"], {"contents": "read", "actions": "read"})
        self.assertEqual(
            code["code"]["permissions"],
            {
                "actions": "write",
                "id-token": "write",
                "contents": "write",
                "issues": "write",
                "packages": "read",
                "pull-requests": "write",
            },
        )

    def test_jql_keeps_unlabeled_issues_and_skips_autofix(self):
        jql = workflow("fullsend-poll-jira.yaml")["jobs"]["poll"]["steps"][2]["env"]["JQL"]
        self.assertIn('(labels = "ready-to-code" OR comment ~ "\\"fs-code\\"")', jql)
        self.assertIn("(labels is EMPTY OR labels not in (", jql)
        self.assertIn("project in (RHAI, RHOAIENG)", jql)
        for label in ("opt-in-autofix", "jira-autofix", "jira-autofix-pending", "jira-autofix-review"):
            self.assertIn(f'"{label}"', jql)

    def test_records_are_kept_and_launched_after_a_failed_poll(self):
        steps = {s.get("name"): s for s in workflow("fullsend-poll-jira.yaml")["jobs"]["poll"]["steps"]}
        save = steps["Save poll records"]
        self.assertEqual(save["if"], "${{ !cancelled() && hashFiles('dispatches.json') != '' }}")
        self.assertTrue(save["continue-on-error"])
        retry = steps["Save poll records (retry)"]
        self.assertEqual(retry["if"], "${{ !cancelled() && steps.save.outcome == 'failure' }}")
        self.assertEqual(retry["with"]["name"], save["with"]["name"])

    def test_launch_needs_a_saved_artifact(self):
        steps = {s.get("name"): s for s in workflow("fullsend-poll-jira.yaml")["jobs"]["poll"]["steps"]}
        self.assertEqual(
            steps["Launch one workflow run per record"]["if"],
            "${{ !cancelled() && (steps.save.outcome == 'success' || steps.save-retry.outcome == 'success') }}",
        )
        lost = steps["List issues that were not launched"]
        self.assertEqual(
            lost["if"],
            "${{ !cancelled() && steps.save.outcome == 'failure' && steps.save-retry.outcome != 'success' }}",
        )
        self.assertIn("jira_dispatch.py keys", lost["run"])

    def test_poll_and_code_run_share_one_fullsend_pin(self):
        poll = (ROOT / ".github/workflows/fullsend-poll-jira.yaml").read_text()
        code = (ROOT / ".github/workflows/fullsend-code-jira.yaml").read_text()
        pin = code.split("reusable-dispatch.yml@", 1)[1].split()[0]
        self.assertIn(f"fullsend-ai/fullsend@{pin}", poll)

    def test_poll_cli_archive_is_checksum_pinned(self):
        steps = {s.get("name"): s for s in workflow("fullsend-poll-jira.yaml")["jobs"]["poll"]["steps"]}
        install = steps["Install Fullsend v0.54.0"]
        env = install["env"]
        self.assertEqual(env["FULLSEND_ARCHIVE"], f"fullsend_{env['FULLSEND_TAG'][1:]}_linux_amd64.tar.gz")
        self.assertRegex(env["FULLSEND_SHA256"], r"^[0-9a-f]{64}$")
        run = install["run"]
        self.assertLess(run.index("sha256sum -c -"), run.index("tar -xzf"))

    def test_every_action_is_pinned_by_sha(self):
        for name in ("fullsend-poll-jira.yaml", "fullsend-code-jira.yaml", "fullsend-scripts-test.yaml"):
            for line in (ROOT / ".github/workflows" / name).read_text().splitlines():
                if "uses:" in line and not line.lstrip().startswith("#"):
                    ref = line.split("uses:", 1)[1].split("#")[0].strip()
                    sha = ref.rsplit("@", 1)[1]
                    with self.subTest(workflow=name, ref=ref):
                        self.assertRegex(sha, r"^[0-9a-f]{40}$")


if __name__ == "__main__":
    unittest.main()
