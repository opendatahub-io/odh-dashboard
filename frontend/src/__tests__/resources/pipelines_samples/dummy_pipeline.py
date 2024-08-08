from kfp import compiler, dsl

common_base_image = "registry.redhat.io/ubi8/python-39@sha256:3523b184212e1f2243e76d8094ab52b01ea3015471471290d011625e1763af61"


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
