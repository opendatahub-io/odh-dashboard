#!/usr/bin/env python3
"""Run with python3 scripts/tests/test_setup_kind.py; requires Bash.

All CLIs (kind, kubectl, container runtimes) are stubbed through isolated
fixtures driven by a JSON config; these tests never contact a real runtime
or Kind installation.
"""

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "setup-kind.sh"
NODE = "rhaii-tilt-control-plane"
REGISTRY = "kind-registry"
CLUSTER = "rhaii-tilt"
RUNTIMES = ("docker", "nerdctl", "podman", "finch", "nerdctl.lima")


def save_config(root, config):
    (root / "config.json").write_text(json.dumps(config))


def fixture_cli():
    root = Path(os.environ["SETUP_KIND_TEST_DIR"])
    config = json.loads((root / "config.json").read_text())
    name, args = Path(sys.argv[0]).name, sys.argv[1:]
    with (root / "calls.jsonl").open("a") as log:
        log.write(json.dumps([name, args, os.environ.get("KIND_EXPERIMENTAL_PROVIDER")]) + "\n")

    if name == "kind":
        if args[:2] == ["get", "clusters"]:
            if config.get("discovery_failure"):
                return 1
            if config.get("cluster_exists"):
                print(CLUSTER)
            return 0
        if args[:2] == ["create", "cluster"]:
            if config.get("create_failure"):
                return 1
            config["cluster_exists"] = True
            save_config(root, config)
            return 0
        if args[:2] == ["get", "nodes"]:
            if not config.get("cluster_exists") or config.get("empty_nodes"):
                return 1
            print("\n".join(config.get("nodes", [NODE])))
            return 0
        return 2

    if name == "kubectl":
        if args[:2] == ["config", "use-context"]:
            return 1 if config.get("context_failure") else 0
        if "--raw=/readyz" in args:
            counter = root / "readiness"
            attempts = int(counter.read_text()) if counter.exists() else 0
            counter.write_text(str(attempts + 1))
            return 1 if attempts < config.get("readiness_failures", 0) else 0
        if args[:3] == ["create", "namespace", "opendatahub"]:
            print("apiVersion: v1\nkind: Namespace\nmetadata:\n  name: opendatahub")
            return 0
        if args == ["apply", "-f", "-"]:
            body = sys.stdin.read()
            known = ("name: opendatahub", "name: local-registry-hosting")
            return 0 if any(marker in body for marker in known) else 1
        return 2

    runtime = config["installed"].get(name)
    if not runtime:
        return 127
    if args in (["-v"], ["--version"]):
        print("Docker version 28.0.0" if runtime == "docker" else f"{runtime} version 5.0.0")
        return 0
    containers = config["containers"].get(runtime, {})

    def persist():
        config["containers"][runtime] = containers
        save_config(root, config)

    if args[0] == "info":
        print("{}")
        return 0
    if args[0] == "ps":
        if config.get("empty_nodes") and "{{.Names}}" in args:
            return 0
        if containers:
            print("\n".join(containers) if "{{.Names}}" in args else CLUSTER)
        return 0
    if args[:2] == ["network", "inspect"]:
        return 1 if config.get("network_missing") else 0
    if args[:2] == ["network", "connect"]:
        if args[-1] not in containers:
            return 1
        containers[args[-1]]["kind_network"] = True
        persist()
        return 0
    if args[0] == "inspect":
        if config.get("inspect_failure"):
            return 1
        template = args[args.index("--format") + 1]
        names = args[args.index("--format") + 2:]
        if any(node not in containers for node in names):
            return 1
        for node in names:
            container = containers[node]
            if template == "{{.Id}}":
                print(container["id"])
            elif template == "{{json .NetworkSettings.Networks.kind}}":
                print('{"kind":{}}' if container.get("kind_network") else "null")
            elif template.startswith("{{len (index"):
                print(len(container.get("bindings", [])))
            elif template.startswith("{{index (index"):
                bindings = container.get("bindings", [])
                print(bindings[0] if bindings else "")
            else:
                print(str(container["running"]).lower())
        return 0
    if args[0] == "start":
        if config.get("start_failure"):
            return 1
        containers[args[1]]["running"] = True
        persist()
        return 0
    if args[0] == "rm":
        containers.pop(args[-1], None)
        persist()
        return 0
    if args[0] == "run":
        containers[args[args.index("--name") + 1]] = {
            "id": "registry-container",
            "running": True,
            "kind_network": False,
            "bindings": ["{127.0.0.1 5001}"],
        }
        persist()
        return 0


    if args[0] == "exec":
        return 0
    return 2


@unittest.skipUnless(shutil.which("bash"), "requires Bash")
class SetupKindTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="setup-kind-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        bins = self.root / "bin"
        bins.mkdir()
        for name in ("kind", "kubectl"):
            (bins / name).symlink_to(Path(__file__).resolve())
        for name in ("bash", "dirname", "grep", "sleep", "env", "cat"):
            (bins / name).symlink_to(shutil.which(name))
        (bins / "python3").symlink_to(sys.executable)
        self.env = os.environ.copy()
        for key in ("KIND_EXPERIMENTAL_PROVIDER", "KIND_READY_TIMEOUT", "BASH_ENV"):
            self.env.pop(key, None)
        self.env.update(
            PATH=str(bins),
            SETUP_KIND_TEST_DIR=str(self.root),
        )
        self.config = {
            "cluster_exists": True,
            "installed": {"docker": "docker"},
            "containers": {"docker": {NODE: {"id": "docker-node", "running": False}}},
        }

    def run_setup(self, success=True):
        for name in RUNTIMES:
            binary = self.root / "bin" / name
            if binary.is_symlink():
                binary.unlink()
            if name in self.config["installed"]:
                binary.symlink_to(Path(__file__).resolve())
        save_config(self.root, self.config)
        result = subprocess.run(
            [shutil.which("bash"), str(SCRIPT)], env=self.env,
            capture_output=True, text=True, timeout=15,
        )
        calls = self.root / "calls.jsonl"
        self.calls = (
            [json.loads(line) for line in calls.read_text().splitlines()]
            if calls.exists() else []
        )
        self.assertEqual(result.returncode == 0, success, result.stdout + result.stderr)
        for _, _, provider in self.calls:
            self.assertEqual(provider, self.env.get("KIND_EXPERIMENTAL_PROVIDER"))
        return result

    def commands(self, name, operation):
        return [args for cli, args, _ in self.calls if cli == name and args[0] == operation]

    def assert_no_namespace(self):
        self.assertFalse(self.commands("kubectl", "create"))
        self.assertFalse(self.commands("kubectl", "apply"))

    def use_runtime(self, runtime):
        self.config["installed"] = {runtime: runtime}
        self.config["containers"] = {runtime: {NODE: {"id": f"{runtime}-node", "running": False}}}

    def test_docker_restarts_stopped_node(self):
        self.run_setup()
        self.assertEqual(self.commands("docker", "start"), [["start", NODE]])

    def test_running_node_is_not_restarted(self):
        self.config["containers"]["docker"][NODE]["running"] = True
        self.run_setup()
        self.assertFalse(self.commands("docker", "start"))

    def test_podman_docker_wrapper_preserves_native_detection(self):
        self.use_runtime("podman")
        self.config["installed"]["docker"] = "podman"
        self.run_setup()
        # The docker shim may be probed during discovery (it resolves the same
        # podman containers), but must never be used to act on them.
        mutating = ("start", "run", "rm", "exec", "network")
        self.assertFalse(
            [args for cli, args, _ in self.calls if cli == "docker" and args[0] in mutating]
        )
        self.assertEqual(self.commands("podman", "start"), [["start", NODE]])

    def test_finch_only_installation(self):
        self.use_runtime("finch")
        self.run_setup()
        self.assertTrue(self.commands("finch", "run"))
        self.assertEqual(self.commands("finch", "start"), [["start", NODE]])

    def test_nerdctl_installation(self):
        self.use_runtime("nerdctl")
        self.run_setup()
        self.assertEqual(self.commands("nerdctl", "start"), [["start", NODE]])

    def test_explicit_providers_remain_unchanged(self):
        for runtime in RUNTIMES:
            with self.subTest(runtime=runtime):
                self.use_runtime(runtime)
                self.env["KIND_EXPERIMENTAL_PROVIDER"] = runtime
                (self.root / "calls.jsonl").write_text("")
                self.run_setup()
                self.assertEqual(self.commands(runtime, "start"), [["start", NODE]])

    def test_same_node_names_in_different_runtimes_fail_before_start(self):
        self.config["installed"]["podman"] = "podman"
        self.config["containers"]["podman"] = {NODE: {"id": "different-node", "running": False}}
        result = self.run_setup(success=False)
        self.assertIn("Multiple container runtimes", result.stdout)
        self.assertFalse(self.commands("docker", "start"))
        self.assertFalse(self.commands("podman", "start"))
        self.assert_no_namespace()

    def test_explicit_provider_resolves_ambiguous_node_names(self):
        self.config["installed"]["podman"] = "podman"
        self.config["containers"]["podman"] = {NODE: {"id": "different-node", "running": False}}
        self.env["KIND_EXPERIMENTAL_PROVIDER"] = "podman"
        self.run_setup()
        self.assertFalse(self.commands("docker", "inspect"))
        self.assertEqual(self.commands("podman", "start"), [["start", NODE]])

    def test_multi_node_recovery_only_starts_stopped_nodes(self):
        self.config["nodes"] = [NODE, "rhaii-tilt-worker"]
        self.config["containers"]["docker"]["rhaii-tilt-worker"] = {"id": "worker", "running": True}
        self.run_setup()
        self.assertEqual(self.commands("docker", "start"), [["start", NODE]])
        # Every node must receive the registry configuration.
        configured_nodes = {args[1] for args in self.commands("docker", "exec") if "-i" not in args}
        self.assertEqual(configured_nodes, {NODE, "rhaii-tilt-worker"})

    def test_fresh_cluster_registry_uses_node_owning_runtime(self):
        # Kind picks its own provider for creation (no KIND_EXPERIMENTAL_PROVIDER
        # is exported), but the registry must still land in the runtime that
        # owns the freshly created nodes.
        for runtime in ("docker", "podman", "finch"):
            with self.subTest(runtime=runtime):
                self.use_runtime(runtime)
                self.config["cluster_exists"] = False
                (self.root / "calls.jsonl").write_text("")
                self.run_setup()
                self.assertTrue(self.commands("kind", "create"))
                self.assertTrue(self.commands(runtime, "run"))
                self.assertTrue(self.commands(runtime, "network"))
                self.assertTrue(self.commands(runtime, "exec"))

    def test_registry_uses_node_owning_runtime_when_multiple_clis_installed(self):
        # Docker is installed but does not own the Kind nodes; the registry
        # must be created through the runtime that does.
        self.config["installed"] = {"docker": "docker", "podman": "podman"}
        self.config["containers"] = {
            "docker": {},
            "podman": {NODE: {"id": "podman-node", "running": True}},
        }
        self.run_setup()
        self.assertTrue(self.commands("podman", "run"))
        self.assertFalse(self.commands("docker", "run"))

    def test_existing_registry_is_reused(self):
        self.config["containers"]["docker"][REGISTRY] = {
            "id": "registry-container",
            "running": True,
            "kind_network": True,
            "bindings": ["{127.0.0.1 5001}"],
        }
        self.run_setup()
        self.assertFalse(self.commands("docker", "run"))
        self.assertFalse(self.commands("docker", "rm"))
        self.assertFalse(
            [args for args in self.commands("docker", "network") if args[:2] == ["network", "connect"]]
        )
        self.assertTrue(self.commands("kubectl", "apply"))

    def test_registry_is_attached_to_kind_network(self):
        self.run_setup()
        self.assertEqual(
            [args for args in self.commands("docker", "network") if args[:2] == ["network", "connect"]],
            [["network", "connect", "--alias", REGISTRY, "kind", REGISTRY]],
        )
        self.assertTrue(all(args[0] == "exec" for args in self.commands("docker", "exec")))

    def test_stopped_registry_is_started_not_recreated(self):
        # A stopped registry keeps its writable layer (previously pushed
        # images); it must be started, not removed and re-created.
        self.config["containers"]["docker"][REGISTRY] = {
            "id": "registry-container",
            "running": False,
            "kind_network": True,
            "bindings": ["{127.0.0.1 5001}"],
        }
        self.run_setup()
        self.assertIn(["start", REGISTRY], self.commands("docker", "start"))
        self.assertFalse(self.commands("docker", "run"))
        self.assertFalse(self.commands("docker", "rm"))

    def assert_registry_rejected(self, bindings, running):
        self.config["containers"]["docker"][REGISTRY] = {
            "id": "registry-container",
            "running": running,
            "kind_network": True,
            "bindings": bindings,
        }
        result = self.run_setup(success=False)
        self.assertIn("does not publish exactly 127.0.0.1:5001", result.stdout)
        self.assertNotIn(["start", REGISTRY], self.commands("docker", "start"))
        self.assertFalse(self.commands("docker", "run"))

    def test_running_registry_with_wrong_port_is_rejected(self):
        self.assert_registry_rejected(["{127.0.0.1 9999}"], running=True)

    def test_stopped_registry_with_wildcard_binding_is_rejected(self):
        # A stopped registry created with `-p 5001:5000` binds all interfaces;
        # starting it would expose the unauthenticated registry beyond
        # loopback. It must be rejected, not started.
        self.assert_registry_rejected(["{ 5001}"], running=False)

    def test_registry_with_extra_non_loopback_binding_is_rejected(self):
        self.assert_registry_rejected(
            ["{127.0.0.1 5001}", "{0.0.0.0 5001}"], running=True
        )

    def test_discovery_failure_does_not_create_cluster(self):
        self.config["discovery_failure"] = True
        self.run_setup(success=False)
        self.assertFalse(self.commands("kind", "create"))
        self.assert_no_namespace()

    def test_missing_nodes_fail_before_namespace_setup(self):
        self.config["empty_nodes"] = True
        self.run_setup(success=False)
        self.assert_no_namespace()

    def test_inspect_and_start_failures_stop_setup(self):
        for failure in ("inspect_failure", "start_failure"):
            with self.subTest(failure=failure):
                self.config[failure] = True
                (self.root / "calls.jsonl").write_text("")
                self.run_setup(success=False)
                self.assert_no_namespace()
                self.config.pop(failure)

    def test_unready_api_does_not_apply_namespace(self):
        self.env["KIND_READY_TIMEOUT"] = "0"
        self.config["readiness_failures"] = 10
        self.run_setup(success=False)
        self.assert_no_namespace()

    def test_readiness_is_retried_before_applying_namespace(self):
        self.config["readiness_failures"] = 1
        self.run_setup()
        probes = [
            i for i, (name, args, _) in enumerate(self.calls)
            if name == "kubectl" and "--raw=/readyz" in args
        ]
        apply = next(
            i for i, (name, args, _) in enumerate(self.calls)
            if name == "kubectl" and args[0] == "apply"
        )
        self.assertEqual(len(probes), 2)
        self.assertLess(probes[-1], apply)


if __name__ == "__main__":
    if (
        os.environ.get("SETUP_KIND_TEST_DIR")
        and Path(sys.argv[0]).name in ("kind", "kubectl", *RUNTIMES)
    ):
        sys.exit(fixture_cli())
    unittest.main(verbosity=2)
