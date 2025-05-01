from kfp import compiler, dsl

common_base_image = "registry.redhat.io/ubi9/python-39@sha256:59f3aa83a24152eeee04c27d4cc5c2b9f50519a67acc153cdb382ac914f3d503"


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
