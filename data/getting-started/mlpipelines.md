# Getting Started With ML Pipelines

Below are the list of samples that are currently running end to end taking the compiled Tekton yaml and deploying on a Tekton cluster directly.
If you are interested more in the larger list of pipelines samples we are testing for whether they can be 'compiled to Tekton' format, please [look at the corresponding status page](https://github.com/kubeflow/kfp-tekton/tree/master/sdk/python/tests/README.md)

[KFP Tekton User Guide](https://github.com/kubeflow/kfp-tekton/tree/master/guides/kfp-user-guide) is a guideline for the possible ways to develop and consume Kubeflow Pipeline with Tekton. It's recommended to go over at least one of the methods in the user guide before heading into the KFP Tekton Samples.

## Prerequisites
- Install [Openshift Pipelines Operator](https://docs.openshift.com/container-platform/4.7/cicd/pipelines/installing-pipelines.html). Then connect the cluster to the current shell with `oc`
- Install [kfp-tekton](https://github.com/kubeflow/kfp-tekton/tree/master/sdk/README.md) SDK
    ```
    # Set up the python virtual environment
    python3 -m venv .venv
    source .venv/bin/activate

    # Install the kfp-tekton SDK
    pip install kfp-tekton
    ```

## Samples

+ [MNIST End to End example with Kubeflow components](https://github.com/kubeflow/kfp-tekton/tree/master/samples/e2e-mnist)
+ [Hyperparameter tuning using Katib](https://github.com/kubeflow/kfp-tekton/tree/master/samples/katib)
+ [Trusted AI Pipeline with AI Fairness 360 and Adversarial Robustness 360 components](https://github.com/kubeflow/kfp-tekton/tree/master/samples/trusted-ai)
+ [Training and Serving Models with Watson Machine Learning](https://github.com/kubeflow/kfp-tekton/tree/master/samples/watson-train-serve#training-and-serving-models-with-watson-machine-learning)
+ [Lightweight python components example](https://github.com/kubeflow/kfp-tekton/tree/master/samples/lightweight-component)
+ [The flip-coin pipeline](https://github.com/kubeflow/kfp-tekton/tree/master/samples/flip-coin)
+ [Nested pipeline example](https://github.com/kubeflow/kfp-tekton/tree/master/samples/nested-pipeline)
+ [Pipeline with Nested loops](https://github.com/kubeflow/kfp-tekton/tree/master/samples/nested-loops)
+ [Using Tekton Custom Task on KFP](https://github.com/kubeflow/kfp-tekton/tree/master/samples/tekton-custom-task)
+ [The flip-coin pipeline using custom task](https://github.com/kubeflow/kfp-tekton/tree/master/samples/flip-coin-custom-task)
+ [Retrieve KFP run metadata using Kubernetes downstream API](https://github.com/kubeflow/kfp-tekton/tree/master/samples/k8s-downstream-api)
