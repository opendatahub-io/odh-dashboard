"""Preflight skill test harness.

Follows the mlflow/skills Trace → Judge → Refine pattern.
Loads a YAML config, connects to MLflow, fetches traces,
and runs judges against them.

Usage:
    # CI mode — evaluate the trace for the current commit:
    python test_skill.py configs/preflight_check.yaml --commit $(git rev-parse HEAD)

    # Backfill — evaluate all traces:
    python test_skill.py configs/preflight_check.yaml

Exit codes:
    0 - All judges passed on all traces
    1 - Setup/config error
    3 - One or more judges failed
"""

import argparse
import os
import sys
import warnings

import yaml

warnings.filterwarnings("ignore")

EXIT_SUCCESS = 0
EXIT_SETUP_FAILED = 1
EXIT_VERIFICATION_FAILED = 3


def load_config(config_path):
    with open(config_path) as f:
        return yaml.safe_load(f)


def setup_mlflow(config):
    """Configure MLflow connection from config and environment."""
    import mlflow

    tracking_uri = os.environ.get("MLFLOW_TRACKING_URI", config.get("tracking_uri"))
    if not tracking_uri:
        print("[ERROR] No MLFLOW_TRACKING_URI set and no tracking_uri in config", file=sys.stderr)
        sys.exit(EXIT_SETUP_FAILED)

    workspace = os.environ.get("MLFLOW_WORKSPACE", config.get("workspace"))
    if workspace:
        os.environ["MLFLOW_WORKSPACE"] = workspace

    experiment_id = config.get("experiment_id", "1")

    try:
        client = mlflow.MlflowClient()
        exp = client.get_experiment(experiment_id)
        print(f"[SETUP] Connected to experiment: {exp.name} (id={experiment_id})")
    except Exception as e:
        print(f"[ERROR] Cannot connect to MLflow: {e}", file=sys.stderr)
        sys.exit(EXIT_SETUP_FAILED)

    return experiment_id


def run_judges(config, experiment_id, base_dir, commit=None):
    """Load and execute all judges from config."""
    from run_judges import run

    judge_paths = config.get("judges", [])
    if not judge_paths:
        print("[ERROR] No judges specified in config", file=sys.stderr)
        sys.exit(EXIT_SETUP_FAILED)

    results = run(judge_paths, experiment_id, base_dir, commit=commit)
    return results


def print_results(results):
    """Print results summary."""
    print("\n" + "=" * 60)
    print("JUDGE RESULTS")
    print("=" * 60)

    for r in results:
        status = "[PASS]" if r["pass"] else "[FAIL]"
        value = r.get("value", "")
        label = f"  {status} {r['judge_name']} on {r['trace_id'][:16]}"
        if value not in ("yes", "no", "true", "false", "pass", "fail"):
            label += f" = {value}"
        print(label)

    passed = sum(1 for r in results if r["pass"])
    total = len(results)
    print(f"\n  {passed}/{total} passed")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Preflight skill test harness")
    parser.add_argument("config", help="Path to YAML test config")
    parser.add_argument("--commit", default=None,
                        help="Evaluate only the trace for this git commit SHA")
    args = parser.parse_args()

    tests_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = args.config
    if os.path.isabs(config_path) or os.path.exists(config_path):
        config_path = os.path.abspath(config_path)
    else:
        config_path = os.path.join(tests_dir, config_path)

    config = load_config(config_path)
    print(f"[CONFIG] Loaded: {config['name']}")

    experiment_id = setup_mlflow(config)
    results = run_judges(config, experiment_id, tests_dir, commit=args.commit)
    print_results(results)

    if not results:
        print("[ERROR] No results — cannot determine pass/fail", file=sys.stderr)
        sys.exit(EXIT_SETUP_FAILED)

    all_passed = all(r["pass"] for r in results)
    sys.exit(EXIT_SUCCESS if all_passed else EXIT_VERIFICATION_FAILED)


if __name__ == "__main__":
    main()
