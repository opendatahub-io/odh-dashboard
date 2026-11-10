#!/usr/bin/env python3
"""Offline tests for the DSC outage workaround helper."""

from __future__ import annotations

import contextlib
import importlib.util
import io
import subprocess
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "dsc_workaround.py"
SPEC = importlib.util.spec_from_file_location("dsc_workaround", SCRIPT_PATH)
assert SPEC is not None and SPEC.loader is not None
workaround = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(workaround)


def completed_process(
    returncode: int = 0,
    stdout: str = "",
    stderr: str = "",
) -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(
        args=[],
        returncode=returncode,
        stdout=stdout,
        stderr=stderr,
    )


def unavailable_deployment() -> dict[str, object]:
    return {"spec": {"replicas": 1}, "status": {"availableReplicas": 0}}


def unready_feast_operator() -> dict[str, object]:
    return {
        "status": {
            "conditions": [
                {"type": "Ready", "status": "False", "reason": "InstallFailed"}
            ]
        }
    }


def matching_feast_state() -> dict[str, object]:
    return {
        "recommended_fix": "feast-rbac",
        "diagnosis": "feast-tls-rbac-missing",
    }


def dsc_with_data_failure(extra_module: str | None = None) -> dict[str, object]:
    conditions = [
        {"type": "Ready", "status": "False", "reason": "InstallFailed"},
        {
            "type": "DataReady",
            "status": "False",
            "reason": "DeploymentsNotReady",
        },
    ]
    if extra_module:
        conditions.append(
            {"type": extra_module, "status": "False", "reason": "InstallFailed"}
        )
    return {"status": {"conditions": conditions}}


class NamespaceAndManifestTests(unittest.TestCase):
    def test_rejects_invalid_namespace(self) -> None:
        with self.assertRaises(ValueError):
            workaround.validate_namespace("bad\n---\napiVersion: v1")

        with self.assertRaises(ValueError):
            workaround.validate_namespace("-invalid-")

    def test_manifest_serializes_namespace(self) -> None:
        namespace = "redhat-ods-applications"
        manifest = workaround.feast_rbac_manifest(namespace)

        self.assertEqual(manifest[1]["subjects"][0]["namespace"], namespace)
        self.assertNotIn("__NAMESPACE__", workaround.feast_rbac_json(namespace))


class CommandTests(unittest.TestCase):
    def test_run_command_has_a_bounded_timeout(self) -> None:
        with mock.patch.object(workaround.subprocess, "run") as subprocess_run:
            subprocess_run.return_value = completed_process()
            workaround.run_command(["oc", "whoami"], timeout_seconds=12)

        subprocess_run.assert_called_once()
        self.assertEqual(subprocess_run.call_args.kwargs["timeout"], 12)

    def test_timeout_becomes_a_diagnostic_error(self) -> None:
        with mock.patch.object(
            workaround.subprocess,
            "run",
            side_effect=subprocess.TimeoutExpired(cmd="oc", timeout=12),
        ):
            with self.assertRaises(RuntimeError):
                workaround.run_command(["oc", "whoami"], timeout_seconds=12)


class AuthorizationTests(unittest.TestCase):
    def test_distinguishes_allowed_denied_and_unknown(self) -> None:
        cases = [
            (0, "yes\n", "allowed"),
            (1, "no\n", "denied"),
            (1, "", "unknown"),
        ]
        for returncode, stdout, expected in cases:
            with self.subTest(stdout=stdout):
                with mock.patch.object(
                    workaround,
                    "run_command",
                    return_value=completed_process(returncode, stdout),
                ):
                    self.assertEqual(
                        workaround.feast_auth_status("redhat-ods-applications"),
                        expected,
                    )


class HealthStateTests(unittest.TestCase):
    def test_detects_terminated_error_pods(self) -> None:
        pods = {
            "items": [
                {
                    "metadata": {"name": "feast-controller"},
                    "status": {
                        "containerStatuses": [
                            {"state": {"terminated": {"reason": "Error"}}}
                        ]
                    },
                }
            ]
        }

        self.assertEqual(workaround.crashing_pod_name(pods), "feast-controller")

    def test_detects_crash_loop_backoff_pods(self) -> None:
        pods = {
            "items": [
                {
                    "metadata": {"name": "feast-controller"},
                    "status": {
                        "containerStatuses": [
                            {"state": {"waiting": {"reason": "CrashLoopBackOff"}}}
                        ]
                    },
                }
            ]
        }

        self.assertEqual(workaround.crashing_pod_name(pods), "feast-controller")

    def test_zero_replicas_is_not_available(self) -> None:
        deployment = {"spec": {"replicas": 0}, "status": {"availableReplicas": 0}}

        self.assertFalse(workaround.deployment_available(deployment))

    def test_deployment_needs_all_desired_replicas(self) -> None:
        self.assertTrue(
            workaround.deployment_available(
                {"spec": {"replicas": 1}, "status": {"availableReplicas": 1}}
            )
        )
        self.assertFalse(
            workaround.deployment_available(
                {"spec": {"replicas": 2}, "status": {"availableReplicas": 1}}
            )
        )


class FeastDiagnosisTests(unittest.TestCase):
    def local_feast_state(
        self,
        *,
        auth_status: str = "denied",
        logs: str | None = "TLS bootstrap failed apiservers.config.openshift.io",
        deployment: dict[str, object] | None = None,
    ) -> dict[str, object]:
        with mock.patch.multiple(
            workaround,
            get_deployment=mock.DEFAULT,
            get_pods=mock.DEFAULT,
            get_feast_operator=mock.DEFAULT,
            fetch_feast_logs=mock.DEFAULT,
            get_workaround_role=mock.DEFAULT,
            get_workaround_binding=mock.DEFAULT,
            feast_auth_status=mock.DEFAULT,
        ) as patches:
            patches["get_deployment"].return_value = (
                deployment or unavailable_deployment()
            )
            patches["get_pods"].return_value = None
            patches["get_feast_operator"].return_value = unready_feast_operator()
            patches["fetch_feast_logs"].return_value = logs
            patches["get_workaround_role"].return_value = None
            patches["get_workaround_binding"].return_value = None
            patches["feast_auth_status"].return_value = auth_status
            return workaround.feast_state("redhat-ods-applications")

    def test_requires_local_failure_logs_and_denial(self) -> None:
        state = self.local_feast_state()

        self.assertEqual(state["diagnosis"], "feast-tls-rbac-missing")
        self.assertEqual(state["recommended_fix"], "feast-rbac")
        self.assertNotIn("logs", state)

    def test_unknown_authorization_does_not_recommend_fix(self) -> None:
        state = self.local_feast_state(auth_status="unknown")

        self.assertIsNone(state["diagnosis"])
        self.assertIsNone(state["recommended_fix"])

    def test_missing_known_error_does_not_recommend_fix(self) -> None:
        state = self.local_feast_state(logs="unrelated error")

        self.assertIsNone(state["diagnosis"])
        self.assertIsNone(state["recommended_fix"])

    def test_healthy_deployment_does_not_recommend_fix(self) -> None:
        deployment = {"spec": {"replicas": 1}, "status": {"availableReplicas": 1}}
        state = self.local_feast_state(deployment=deployment)

        self.assertIsNone(state["diagnosis"])
        self.assertIsNone(state["recommended_fix"])


class DiagnosisGateTests(unittest.TestCase):
    def run_diagnosis(self, dsc: dict[str, object]) -> dict[str, object]:
        platform = {
            "status": {"conditions": [{"type": "Ready", "status": "True"}]}
        }
        with mock.patch.object(workaround, "assert_authenticated"), mock.patch.object(
            workaround, "oc_json", side_effect=[dsc, platform]
        ), mock.patch.object(
            workaround, "feast_state", return_value=matching_feast_state()
        ), mock.patch.object(
            workaround, "get_server", return_value="https://example.test:6443"
        ):
            return workaround.diagnose(
                SimpleNamespace(
                    namespace="redhat-ods-applications",
                    dsc_name="default-dsc",
                )
            )

    def test_isolated_data_failure_keeps_recommendation(self) -> None:
        result = self.run_diagnosis(dsc_with_data_failure())

        self.assertEqual(result["feast"]["recommended_fix"], "feast-rbac")

    def test_multi_module_failure_clears_recommendation(self) -> None:
        result = self.run_diagnosis(
            dsc_with_data_failure(extra_module="ModelMetricsReady")
        )

        self.assertIsNone(result["feast"]["recommended_fix"])
        self.assertIsNone(result["feast"]["diagnosis"])


class FixGateTests(unittest.TestCase):
    def args(self, *, dry_run: bool, yes: bool) -> SimpleNamespace:
        return SimpleNamespace(
            namespace="redhat-ods-applications",
            dsc_name="default-dsc",
            dry_run=dry_run,
            yes=yes,
        )

    def test_dry_run_returns_structured_patch_without_mutation(self) -> None:
        with mock.patch.object(
            workaround, "diagnose", return_value={"feast": matching_feast_state()}
        ), mock.patch.object(workaround, "run_command") as run_command:
            result = workaround.fix_feast_rbac(
                self.args(dry_run=True, yes=False)
            )

        run_command.assert_not_called()
        self.assertEqual(result["action"], "dry-run")
        self.assertEqual(len(result["patch"]), 2)

    def test_fix_requires_explicit_confirmation(self) -> None:
        with mock.patch.object(
            workaround, "diagnose", return_value={"feast": matching_feast_state()}
        ), mock.patch.object(workaround, "run_command") as run_command:
            with self.assertRaises(RuntimeError):
                workaround.fix_feast_rbac(self.args(dry_run=False, yes=False))

        run_command.assert_not_called()


class VerificationTests(unittest.TestCase):
    def successful_result(self) -> dict[str, object]:
        return {
            "dsc_ready": True,
            "platform_ready": True,
            "feast_operator_ready": True,
            "feast_deployment_available": True,
            "feast_service_account_permission": "allowed",
        }

    def test_verify_failure_returns_nonzero(self) -> None:
        result = self.successful_result()
        result["dsc_ready"] = False

        with mock.patch.object(workaround, "verify", return_value=result), mock.patch(
            "sys.argv", ["dsc_workaround.py", "verify"]
        ), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(workaround.main(), 2)

    def test_verify_success_returns_zero(self) -> None:
        result = self.successful_result()

        with mock.patch.object(workaround, "verify", return_value=result), mock.patch(
            "sys.argv", ["dsc_workaround.py", "verify"]
        ), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(workaround.main(), 0)


if __name__ == "__main__":
    unittest.main()
