# Pachyderm

# Pachyderm

[Pachyderm](https://www.pachyderm.com/) provides the data layer that allows machine learning teams to productionize and scale their machine learning lifecycle. With Pachyderm’s industry-leading data versioning, pipelines, and lineage, teams gain data-driven automation, petabyte scalability, and end-to-end reproducibility. Teams using Pachyderm get their ML projects to market faster, lower data processing and storage costs, and meet regulatory compliance requirements more easily.

Read about how our Customers leveraged Pachyderm to face their ML/AI challenges and operationalize their pipelines: [Case studies](https://www.pachyderm.com/case-studies/)

## Features include

- **Data-driven pipelines**
    - Our containerized (language-agnostic) pipelines execute whenever new data is committed
    - Pachyderm is "Kubernetes native" and autoscale with parallel processing of data without writing additional code
    - Incremental processing saves compute by only processing differences and automatically skipping duplicate data

- **Automated data versioning**
    Pachyderm’s Data Versioning gives teams an automated and performant way to keep track of all data changes.
    - Our file-based, git-like versioning core feature provides a complete audit trail for all data and artifacts across pipeline stages, including intermediate results
    - Our optimized storage framework supports petabytes of unstructured data while minimizing storage costs

- **Immutable data lineage**
    We provide an immutable record for all activities and assets in the ML lifecycle:
    - We track every version of your code, models, and data and manage relationships between historical data states so you can maintain the reproducibility of data and code for compliance
    - Our Global IDs feature makes it easy for teams to track any result all the way back to its raw input, including all analysis, parameters, code, and intermediate results

- Our **Console** provides an intuitive visualization of your DAG (directed acyclic graph)

- Our **Notebooks** provide an easy way to interact with Pachyderm data versioning and pipelines via Jupyter notebooks bridging the worlds of data science and data engineering


## Installing Pachyderm Operator

### Prerequisites
Before installing Pachyderm Operator, you will need to install `pachctl`, the command-line tool that you will use to interact with a Pachyderm cluster in your terminal.
Follow the instructions in our [documentation](https://docs.pachyderm.com/2.0.x-rc/getting_started/local_installation/#install-pachctl) .

### Install The Operator
Pachyderm Operator has a **Red Hat marketplace listing**.

- Subscribe to the operator on Marketplace
  https://marketplace.redhat.com/en-us/products/pachyderm
- Install the operator and validate
  https://marketplace.redhat.com/en-us/documentation/operators

### Post Deployment
Finally, connect your client to your cluster.
In your terminal:

1. Create a new Pachyderm context with the embedded Kubernetes context by running:

    ```
    pachctl config import-kube <name-your-new-pachyderm-context> -k `kubectl config current-context`
    ```

1. Verify that the context was successfully created:

    ```
    pachctl config get context <name-your-new-pachyderm-context>
    ```

1. Activate the new Pachyderm context:

    ```
    pachctl config set active-context <name-your-new-pachyderm-context>
    ```

1. Verify that the new context has been activated:

    ```
    pachctl config get active-context
    ```

1. You should be all set to start using Pachyderm

    * Run the following command to make sure that your cluster is responsive:
        ```
        pachctl version
        ```
        **System Response**
        ```
        COMPONENT           VERSION
        pachctl             2.0.0
        pachd               2.0.0
        ```
    * Then run your first pipelines by following the following [tutorial](https://docs.pachyderm.com/latest/getting_started/beginner_tutorial/) or check our Quick Start in the `Enabled` Menu of your OpenShift Data Science Console.

    