"""Compile an importable KFP v2 pipeline for pipeline run accessibility checks.

Run this file with kfp==2.14.2 to regenerate pipeline_a11y_scenarios.yaml.
The default run intentionally fails and leaves its successor unexecuted.
Root components use distinct names so their task IDs remain unique beside nested steps.
"""

from pathlib import Path

from kfp import compiler, dsl


BASE_IMAGE = "registry.access.redhat.com/ubi9/ubi-minimal:9.6"


@dsl.container_component
def report_step(message: str):
    return dsl.ContainerSpec(
        image=BASE_IMAGE,
        command=["sh", "-c"],
        args=['printf "Step: %s\\n" "$0"', message],
    )


@dsl.container_component
def start_step():
    return dsl.ContainerSpec(
        image=BASE_IMAGE,
        command=["sh", "-c"],
        args=['printf "Step: Start\\n"'],
    )


@dsl.container_component
def parallel_check():
    return dsl.ContainerSpec(
        image=BASE_IMAGE,
        command=["sh", "-c"],
        args=['printf "Step: Parallel check\\n"'],
    )


@dsl.container_component
def skipped_successor():
    return dsl.ContainerSpec(
        image=BASE_IMAGE,
        command=["sh", "-c"],
        args=['printf "This step should be skipped after the intentional failure\\n"'],
    )


@dsl.container_component
def write_artifact(output: dsl.Output[dsl.Artifact]):
    return dsl.ContainerSpec(
        image=BASE_IMAGE,
        command=["sh", "-c"],
        args=['printf "artifact for accessibility testing\\n" > "$0"', output.path],
    )


@dsl.container_component
def fail_on_purpose():
    return dsl.ContainerSpec(
        image=BASE_IMAGE,
        command=["sh", "-c"],
        args=['echo "Intentional failure for accessibility testing" >&2; exit 42'],
    )


@dsl.pipeline(name="multi-substep-phase")
def multi_substep_phase():
    first = report_step(message="Nested sub-step one: prepare").set_display_name("Prepare inputs")
    second = report_step(message="Nested sub-step two: transform").after(first)
    second.set_display_name("Transform inputs")
    report_step(message="Nested sub-step three: verify").after(second).set_display_name(
        "Verify transformation"
    )


@dsl.pipeline(
    name="pipeline-a11y-scenarios",
    description="Success, parallel work, nested sub-steps, an artifact, and an intentional failure.",
)
def pipeline_a11y_scenarios():
    start = start_step().set_display_name("Start")
    nested = multi_substep_phase().after(start).set_display_name("Three sub-step group")
    parallel = parallel_check().after(start)
    parallel.set_display_name("Parallel check")
    artifact = write_artifact().after(nested).set_display_name("Produce artifact")
    failed = fail_on_purpose().after(artifact, parallel).set_display_name("Intentional failure")
    skipped_successor().after(failed).set_display_name("Skipped after failure")


if __name__ == "__main__":
    compiler.Compiler().compile(
        pipeline_a11y_scenarios,
        package_path=str(Path(__file__).with_suffix(".yaml")),
    )
