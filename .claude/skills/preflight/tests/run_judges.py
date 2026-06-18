"""Judge runner — loads judge modules dynamically and evaluates traces.

Follows the mlflow/skills pattern: each judge module exposes get_judges()
which returns a list of @scorer functions. Results are logged to MLflow
as an evaluation run via mlflow.genai.evaluate().

Usage:
    # Evaluate the trace for a specific commit (CI mode):
    python run_judges.py --judges judges/posted_review.py --commit abc123

    # Evaluate all traces (backfill):
    python run_judges.py --judges judges/posted_review.py
"""

import argparse
import importlib.util
import json
import math
import os
import sys
import warnings

import mlflow

warnings.filterwarnings("ignore")


def load_judges(judge_paths, base_dir):
    """Dynamically load judge modules and collect all scorers."""
    all_judges = []
    for i, path in enumerate(judge_paths):
        full_path = os.path.join(base_dir, path) if not os.path.isabs(path) else path
        if not os.path.exists(full_path):
            print(f"[ERROR] Judge file not found: {full_path}", file=sys.stderr)
            sys.exit(1)

        spec = importlib.util.spec_from_file_location(f"judge_{i}", full_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        if not hasattr(module, "get_judges"):
            print(f"[ERROR] {path} missing get_judges() function", file=sys.stderr)
            sys.exit(1)

        judges = module.get_judges()
        all_judges.extend(judges)
        print(f"[LOAD] {path} -> {len(judges)} judge(s)")

    return all_judges


def run(judge_paths, experiment_id, base_dir, commit=None):
    """Fetch traces, run judges via mlflow.genai.evaluate(), return results.

    Args:
        commit: Filter to the trace matching this git commit SHA.
                Each preflight run produces a trace tagged with the
                PR head commit, so this uniquely identifies the trace.
    """
    judges = load_judges(judge_paths, base_dir)

    traces = mlflow.search_traces(
        experiment_ids=[experiment_id],
        return_type="list",
    )

    if commit:
        traces = [
            t for t in traces
            if (t.info.request_metadata or {}).get("mlflow.source.git.commit", "").startswith(commit)
        ]
        print(f"[FILTER] Traces for commit {commit[:12]}: {len(traces)} found")

    if not traces:
        print("[ERROR] No traces found to evaluate", file=sys.stderr)
        sys.exit(1)

    print(f"[EVAL] Running {len(judges)} judges on {len(traces)} traces")

    results = mlflow.genai.evaluate(data=traces, scorers=judges)
    df = results.tables["eval_results"]

    judge_names = []
    for judge in judges:
        judge_names.append(getattr(judge, "name", str(judge)))

    output = []
    for _, row in df.iterrows():
        trace_id = row["trace_id"]
        for name in judge_names:
            value_col = f"{name}/value"
            value = row.get(value_col, "unknown")
            value_str = str(value).lower()
            if isinstance(value, (int, float)):
                passed = not math.isnan(value) and value == 0
            elif isinstance(value, (list, dict)):
                passed = True
            else:
                try:
                    f = float(value_str)
                    passed = not math.isnan(f)
                except (ValueError, TypeError):
                    passed = value_str in ("yes", "true", "pass")

            output.append({
                "judge_name": name,
                "trace_id": trace_id,
                "value": str(value),
                "pass": passed,
            })

    return output


def main():
    parser = argparse.ArgumentParser(description="Run preflight judges")
    parser.add_argument("--judges", nargs="+", required=True)
    parser.add_argument("--experiment-id", default="1")
    parser.add_argument("--base-dir", default=os.path.dirname(__file__))
    parser.add_argument("--commit", default=None,
                        help="Evaluate only the trace for this git commit SHA")
    args = parser.parse_args()

    results = run(args.judges, args.experiment_id, args.base_dir,
                  commit=args.commit)

    print(json.dumps(results, indent=2))

    all_passed = all(r["pass"] for r in results)
    if not all_passed:
        failures = [r for r in results if not r["pass"]]
        print(f"\n[FAIL] {len(failures)} judge(s) failed:", file=sys.stderr)
        for f in failures:
            print(f"  {f['judge_name']} on {f['trace_id'][:16]}", file=sys.stderr)
        sys.exit(3)
    else:
        print(f"\n[PASS] All {len(results)} judgments passed")


if __name__ == "__main__":
    main()
