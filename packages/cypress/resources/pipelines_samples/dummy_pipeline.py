from kfp import compiler, dsl

common_base_image = "registry.redhat.io/ubi9/python-311@sha256:82a16d7c4da926081c0a4cc72a84d5ce37859b50a371d2f9364313f66b89adf7"


@dsl.component(base_image=common_base_image)
def dummy(message: str):
    """Print a message"""
    print(message)


@dsl.pipeline(name="dummy-pipeline", description="Dummy Pipeline")
def dummy_pipeline():
    dummy_task = dummy(message="Im a dummy pipeline")


if __name__ == "__main__":
    compiler.Compiler().compile(dummy_pipeline,
                                package_path=__file__.replace(".py", "_compiled.yaml"))
