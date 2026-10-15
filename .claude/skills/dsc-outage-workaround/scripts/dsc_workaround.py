#!/usr/bin/env python3
"""Diagnose and remediate known DSC infrastructure outages."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from typing import Any


DEFAULT_DSC = "default-dsc"
DEFAULT_PLATFORM = "default"
DEFAULT_NAMESPACE = "redhat-ods-applications"
FEAST_ROLE_NAME = "feast-operator-apiservers-workaround"


def run_command(
    command: list[str],
    input_text: str | None = None,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        command,
        input=input_text,
        text=True,
        capture_output=True,
    )
    if check and result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip() or "unknown error"
        raise RuntimeError(f"Command failed: {' '.join(command)}\n{message}")
    return result


def oc_json(args: list[str]) -> dict[str, Any] | None:
    result = run_command(["oc", *args, "-o", "json"], check=False)
    if result.returncode != 0 or not result.stdout.strip():
        return None
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return None


def get_server() -> str:
    result = run_command(["oc", "whoami", "--show-server"])
    return result.stdout.strip()


def assert_authenticated() -> None:
    run_command(["oc", "whoami"])


def summarize_conditions(resource: dict[str, Any] | None) -> list[dict[str, str]]:
    if not resource:
        return []
    conditions = resource.get("status", {}).get("conditions", [])
    return [
        {
            "type": condition.get("type", ""),
            "status": condition.get("status", ""),
            "reason": condition.get("reason", ""),
            "message": condition.get("message", ""),
        }
        for condition in conditions
    ]


def condition_status(resource: dict[str, Any] | None, condition_type: str) -> str | None:
    if not resource:
        return None
    for condition in resource.get("status", {}).get("conditions", []):
        if condition.get("type") == condition_type:
            return condition.get("status")
    return None


def failing_modules(dsc: dict[str, Any] | None) -> list[str]:
    if not dsc:
        return []
    modules: list[str] = []
    for condition in dsc.get("status", {}).get("conditions", []):
        condition_type = condition.get("type", "")
        status = condition.get("status", "")
        reason = condition.get("reason", "")
        if (
            condition_type.endswith("Ready")
            and condition_type != "Ready"
            and status != "True"
            and reason != "Removed"
        ):
            modules.append(condition_type)
    return modules


def get_deployment(namespace: str, name: str) -> dict[str, Any] | None:
    return oc_json(["get", "deployment", name, "-n", namespace])


def get_pods(namespace: str, selector: str) -> dict[str, Any] | None:
    return oc_json(["get", "pods", "-n", namespace, "-l", selector])


def get_feast_operator(namespace: str, name: str = "default-feastoperator") -> dict[str, Any] | None:
    return oc_json(["get", "feastoperator", name, "-n", namespace])


def get_workaround_role() -> dict[str, Any] | None:
    return oc_json(["get", "clusterrole", FEAST_ROLE_NAME])


def get_workaround_binding() -> dict[str, Any] | None:
    return oc_json(["get", "clusterrolebinding", FEAST_ROLE_NAME])


def role_has_required_rule(role: dict[str, Any] | None) -> bool:
    if not role:
        return False
    for rule in role.get("rules", []):
        if (
            "config.openshift.io" in rule.get("apiGroups", [])
            and "apiservers" in rule.get("resources", [])
            and all(verb in rule.get("verbs", []) for verb in ["get", "list", "watch"])
        ):
            return True
    return False


def feast_auth_allowed(namespace: str) -> bool:
    service_account = (
        f"system:serviceaccount:{namespace}:feast-operator-controller-manager"
    )
    result = run_command(
        [
            "oc",
            "auth",
            "can-i",
            "get",
            "apiservers.config.openshift.io/cluster",
            "--as",
            service_account,
        ],
        check=False,
    )
    return result.returncode == 0 and result.stdout.strip().lower() == "yes"


def crashing_pod_name(pods: dict[str, Any] | None) -> str | None:
    if not pods:
        return None
    for pod in pods.get("items", []):
        statuses = pod.get("status", {}).get("containerStatuses", [])
        if any(
            status.get("state", {}).get("waiting", {}).get("reason")
            in {"CrashLoopBackOff", "Error"}
            for status in statuses
        ):
            return pod.get("metadata", {}).get("name")
    return None


def feast_logs(namespace: str, pod_name: str | None) -> str | None:
    if not pod_name:
        return None
    result = run_command(
        [
            "oc",
            "logs",
            "-n",
            namespace,
            pod_name,
            "--previous",
            "--tail=120",
        ],
        check=False,
    )
    if result.returncode == 0 and result.stdout.strip():
        return result.stdout.strip()
    result = run_command(
        ["oc", "logs", "-n", namespace, pod_name, "--tail=120"],
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else None


def deployment_available(deployment: dict[str, Any] | None) -> bool:
    if not deployment:
        return False
    desired = deployment.get("spec", {}).get("replicas", 1)
    available = deployment.get("status", {}).get("availableReplicas", 0)
    return available >= desired


def feast_state(namespace: str) -> dict[str, Any]:
    deployment = get_deployment(namespace, "feast-operator-controller-manager")
    pods = get_pods(namespace, "app.opendatahub.io/feastoperator=true")
    feast_operator = get_feast_operator(namespace)
    pod_name = crashing_pod_name(pods)
    logs = feast_logs(namespace, pod_name)
    role = get_workaround_role()
    binding = get_workaround_binding()
    auth_allowed = feast_auth_allowed(namespace)

    known_error = bool(
        logs
        and "TLS bootstrap failed" in logs
        and "apiservers.config.openshift.io" in logs
    )
    diagnosis = "feast-tls-rbac-missing"
    recommended_fix = "feast-rbac"

    return {
        "deployment": {
            "name": "feast-operator-controller-manager",
            "namespace": namespace,
            "available": deployment_available(deployment),
        },
        "crashing_pod": pod_name,
        "operator_conditions": summarize_conditions(feast_operator),
        "operator_ready": condition_status(feast_operator, "Ready") == "True",
        "logs": logs,
        "known_error": known_error,
        "service_account_has_permission": auth_allowed,
        "workaround_role_exists": role is not None,
        "workaround_binding_exists": binding is not None,
        "workaround_role_has_required_rule": role_has_required_rule(role),
        "diagnosis": diagnosis if known_error or not auth_allowed else None,
        "recommended_fix": recommended_fix if known_error or not auth_allowed else None,
    }


def diagnose(args: argparse.Namespace) -> dict[str, Any]:
    assert_authenticated()
    dsc = oc_json(["get", "dsc", args.dsc_name])
    platform = oc_json(["get", "platform", DEFAULT_PLATFORM])
    if dsc is None:
        raise RuntimeError(f"DSC {args.dsc_name} was not found or is not readable")
    if platform is None:
        raise RuntimeError(f"Platform {DEFAULT_PLATFORM} was not found or is not readable")
    feast = feast_state(args.namespace)

    dsc_ready = condition_status(dsc, "Ready") == "True"
    platform_ready = condition_status(platform, "Ready") == "True"

    return {
        "cluster": get_server(),
        "dsc": {
            "name": args.dsc_name,
            "ready": dsc_ready,
            "conditions": summarize_conditions(dsc),
            "failing_modules": failing_modules(dsc),
        },
        "platform": {
            "name": DEFAULT_PLATFORM,
            "ready": platform_ready,
            "conditions": summarize_conditions(platform),
        },
        "feast": feast,
    }


FEAST_RBAC_YAML_TEMPLATE = """apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: feast-operator-apiservers-workaround
  labels:
    app.opendatahub.io/feastoperator: "true"
    platform.opendatahub.io/part-of: feastoperator-workaround
rules:
- apiGroups:
  - config.openshift.io
  resources:
  - apiservers
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: feast-operator-apiservers-workaround
  labels:
    app.opendatahub.io/feastoperator: "true"
    platform.opendatahub.io/part-of: feastoperator-workaround
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: feast-operator-apiservers-workaround
subjects:
- kind: ServiceAccount
  name: feast-operator-controller-manager
  namespace: __NAMESPACE__
"""


def feast_rbac_yaml(namespace: str) -> str:
    return FEAST_RBAC_YAML_TEMPLATE.replace("__NAMESPACE__", namespace)


def fix_feast_rbac(args: argparse.Namespace) -> dict[str, Any]:
    diagnosis = diagnose(args)
    feast = diagnosis["feast"]

    if feast.get("recommended_fix") != "feast-rbac":
        raise RuntimeError(
            "The cluster does not match the known Feast TLS RBAC issue. "
            "Do not apply this workaround."
        )

    if args.dry_run:
        return {
            "action": "dry-run",
            "patch": feast_rbac_yaml(args.namespace),
        }

    if not args.yes:
        raise RuntimeError(
            "Refusing to modify the cluster without --yes. "
            "Ask the user for explicit authorization first."
        )

    run_command(["oc", "apply", "-f", "-"], input_text=feast_rbac_yaml(args.namespace))
    run_command(
        [
            "oc",
            "rollout",
            "restart",
            "deployment/feast-operator-controller-manager",
            "-n",
            args.namespace,
        ]
    )
    run_command(
        [
            "oc",
            "rollout",
            "status",
            "deployment/feast-operator-controller-manager",
            "-n",
            args.namespace,
            "--timeout=180s",
        ]
    )
    run_command(
        [
            "oc",
            "wait",
            f"dsc/{args.dsc_name}",
            "--for=condition=Ready",
            "--timeout=180s",
        ]
    )
    run_command(
        [
            "oc",
            "wait",
            f"platform/{DEFAULT_PLATFORM}",
            "--for=condition=Ready",
            "--timeout=180s",
        ]
    )

    return {
        "action": "fix-feast-rbac",
        "resources": [
            f"ClusterRole/{FEAST_ROLE_NAME}",
            f"ClusterRoleBinding/{FEAST_ROLE_NAME}",
        ],
        "restarted_deployment": f"{args.namespace}/feast-operator-controller-manager",
    }


def verify(args: argparse.Namespace) -> dict[str, Any]:
    assert_authenticated()
    dsc = oc_json(["get", "dsc", args.dsc_name])
    platform = oc_json(["get", "platform", DEFAULT_PLATFORM])
    if dsc is None:
        raise RuntimeError(f"DSC {args.dsc_name} was not found or is not readable")
    if platform is None:
        raise RuntimeError(f"Platform {DEFAULT_PLATFORM} was not found or is not readable")
    feast_operator = get_feast_operator(args.namespace)
    deployment = get_deployment(args.namespace, "feast-operator-controller-manager")

    return {
        "cluster": get_server(),
        "dsc_ready": condition_status(dsc, "Ready") == "True",
        "platform_ready": condition_status(platform, "Ready") == "True",
        "feast_operator_ready": condition_status(feast_operator, "Ready") == "True",
        "feast_deployment_available": deployment_available(deployment),
        "feast_service_account_has_permission": feast_auth_allowed(args.namespace),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--namespace", default=DEFAULT_NAMESPACE)
    common.add_argument("--dsc-name", default=DEFAULT_DSC)

    diagnose_parser = subparsers.add_parser(
        "diagnose",
        parents=[common],
        help="Inspect DSC, Platform, Feast, and RBAC state",
    )
    diagnose_parser.set_defaults(func=diagnose)

    fix_parser = subparsers.add_parser(
        "fix",
        parents=[common],
        help="Apply a known workaround",
    )
    fix_parser.add_argument("fix_type", choices=["feast-rbac"])
    fix_parser.add_argument("--dry-run", action="store_true")
    fix_parser.add_argument("--yes", action="store_true")
    fix_parser.set_defaults(func=fix_feast_rbac)

    verify_parser = subparsers.add_parser(
        "verify",
        parents=[common],
        help="Verify DSC and Platform readiness",
    )
    verify_parser.set_defaults(func=verify)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        result = args.func(args)
        print(json.dumps(result, indent=2))
        return 0
    except RuntimeError as error:
        print(json.dumps({"error": str(error)}, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
