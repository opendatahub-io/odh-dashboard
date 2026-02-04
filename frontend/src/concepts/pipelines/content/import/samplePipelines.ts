const helloWorldTemplate = `components:
  comp-say-hello:
    executorLabel: exec-say-hello
    inputDefinitions:
      parameters:
        text:
          parameterType: STRING
    outputDefinitions:
      parameters:
        Output:
          parameterType: STRING
deploymentSpec:
  executors:
    exec-say-hello:
      container:
        args:
        - --executor_input
        - '{{$}}'
        - --function_to_execute
        - say_hello
        command:
        - sh
        - -c
        - |
          if ! [ -x "$(command -v pip)" ]; then
              python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip
          fi

          PIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet --no-warn-script-location 'kfp==2.5.0' '--no-deps' 'typing-extensions>=3.7.4,<5; python_version<"3.9"' && "$0" "$@"
        - sh
        - -ec
        - |
          program_path=$(mktemp -d)
          printf "%s" "$0" > "$program_path/ephemeral_component.py"
          _KFP_RUNTIME=true python3 -m kfp.dsl.executor_main --component_module_path "$program_path/ephemeral_component.py" "$@"
        - |
          import kfp
          from kfp import dsl
          from kfp.dsl import *
          from typing import *

          def say_hello(text: str) -> str:
              print(text)
              return text
        image: __IMAGE_PLACEHOLDER__
pipelineInfo:
  name: hello-pipeline
root:
  dag:
    tasks:
      say-hello:
        cachingOptions:
          enableCache: true
        componentRef:
          name: comp-say-hello
        inputs:
          parameters:
            text:
              componentInputParameter: msg
        taskInfo:
          name: say-hello
  inputDefinitions:
    parameters:
      msg:
        defaultValue: Hello from UBI8 Python!
        isOptional: true
        parameterType: STRING
schemaVersion: 2.1.0
sdkVersion: kfp-2.5.0
`;

const metricTemplate = `components:
  comp-compute-dummy-metrics:
    executorLabel: exec-compute-dummy-metrics
    outputDefinitions:
      artifacts:
        metrics:
          artifactType:
            schemaTitle: system.Metrics
            schemaVersion: 0.0.1
deploymentSpec:
  executors:
    exec-compute-dummy-metrics:
      container:
        args:
        - --executor_input
        - '{{$}}'
        - --function_to_execute
        - compute_dummy_metrics
        command:
        - sh
        - -c
        - |
          if ! [ -x "$(command -v pip)" ]; then
              python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip
          fi

          PIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet --no-warn-script-location 'kfp==2.5.0' '--no-deps' 'typing-extensions>=3.7.4,<5; python_version<"3.9"' && "$0" "$@"
        - sh
        - -ec
        - |
          program_path=$(mktemp -d)
          printf "%s" "$0" > "$program_path/ephemeral_component.py"
          _KFP_RUNTIME=true python3 -m kfp.dsl.executor_main --component_module_path "$program_path/ephemeral_component.py" "$@"
        - |
          import kfp
          from kfp import dsl
          from kfp.dsl import *
          from typing import *

          def compute_dummy_metrics(metrics: Output[Metrics]):
              import random

              accuracy = 0.8 + random.random() * 0.2
              loss = random.random()

              metrics.log_metric("accuracy", accuracy)
              metrics.log_metric("loss", loss)
        image: __IMAGE_PLACEHOLDER__
pipelineInfo:
  name: metrics-demo-pipeline
root:
  dag:
    outputs:
      artifacts:
        compute-dummy-metrics-metrics:
          artifactSelectors:
          - outputArtifactKey: metrics
            producerSubtask: compute-dummy-metrics
    tasks:
      compute-dummy-metrics:
        cachingOptions:
          enableCache: true
        componentRef:
          name: comp-compute-dummy-metrics
        taskInfo:
          name: compute-dummy-metrics
  inputDefinitions:
    parameters:
      run_label:
        defaultValue: first-run
        isOptional: true
        parameterType: STRING
  outputDefinitions:
    artifacts:
      compute-dummy-metrics-metrics:
        artifactType:
          schemaTitle: system.Metrics
          schemaVersion: 0.0.1
schemaVersion: 2.1.0
sdkVersion: kfp-2.5.0
`;

export const makeSample =
  (template: string) =>
  (image: string): string =>
    template.replace('__IMAGE_PLACEHOLDER__', image);

export const makeHelloSample = makeSample(helloWorldTemplate);
export const makeMetricSample = makeSample(metricTemplate);
