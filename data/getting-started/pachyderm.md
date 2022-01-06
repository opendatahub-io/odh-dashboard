# Pachyderm

# Pachyderm

[Pachyderm](https://www.pachyderm.com/) provides the data layer that allows data science teams to productionize and scale their machine learning lifecycle. With Pachyderm’s industry-leading data versioning, pipelines, and lineage, teams gain data-driven automation, petabyte scalability, and end-to-end reproducibility. Teams using Pachyderm get their ML projects to market faster, lower data processing and storage costs, and can more easily meet regulatory compliance requirements.

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

## Installing Pachyderm Operator
### Prerequisites
Before installing Pachyderm's Operator, read about Pachyderm's [main concepts](https://docs.pachyderm.com/latest/concepts/) in our documentation.
Additionally, you will interact with Pachyderm using `pachctl` (Pachyderm's command-line tool) from the cells of your notebooks. Read through our written demo [Open CV](https://docs.pachyderm.com/latest/getting_started/beginner_tutorial/) to familiarize yourself with the main commands. 

### Install The Operator
Pachyderm Operator has a **Red Hat marketplace listing**.

- Subscribe to the operator on Marketplace
  https://marketplace.redhat.com/en-us/products/pachyderm
- Install the operator and validate
  https://marketplace.redhat.com/en-us/documentation/operators

### Post Deployment

1. Reach Red Hat OpenShift Data Science Platform from your **Cluster Management Console** by clicking on the multi-squared icon, then select **Red Hat OpenShift Data Science** in OpenShift Managed Services.

1. **Run a Jupyter Lab server**: Select the Image and Container size of your choice (At a minimum, we recommend the *Standard Data Science* Image and *Medium* container size.) then start your Jupyter Lab server.

1. Configure your Notebook to connect to your cluster:

    - Before experimenting with Pachyderm in notebook, run the following command line in a new cell:

        The command installs Pachyderm’s CLI (`pachchtl`) in your notebook environment.

        **Note**: The version of `pachctl` must match the version of Pachyderm deployed by the Operator. Pachyderm’s version is available on the Operator’s description. 
        At a minimum, you should always use the identical major & minor versions of `pachctl` and Pachyderm (`pachd`). Note that the following package `/v2.0.2/pachctl_2.0.2_linux_amd64.tar.gz` (see command line below) refers to version 2.0.2 of Pachyderm. Depending on the version currently deployed by the Operator, you might need to update the version of `pachctl` (i.e.change `2.0.2` to `2.1.0` for example) in the command line.

        ```shell
        ! curl -o /tmp/pachctl.tar.gz -L https://github.com/pachyderm/pachyderm/releases/download/v2.0.2/pachctl_2.0.2_linux_amd64.tar.gz && tar -xvf /tmp/pachctl.tar.gz  -C /tmp && cp /tmp/pachctl_2.0.2_linux_amd64/pachctl  /opt/app-root/bin/
        ```

    - Create a new context for your CLI to connect to your cluster:

        In the following command, update **“pachyderm-operator-install”** in the pachd_address with your project name. The pattern should be: `pachd.`your-project-name`.svc.cluster.local:30650`.

        ```shell
        !echo '{"pachd_address":"pachd.pachyderm-operator-install.svc.cluster.local:30650"}' | pachctl config set context pachyderm --overwrite
        ```

    - Finally, switch `pachctl` context to your newly created context:
        ```shell
        !pachctl config set active-context pachyderm
        ```

    - Verify that your active context is the new context pachyderm
        ```shell
        !pachctl config get active-context
        ```

    - You are all set. Run: 
        ```shell
        !pachctl version 
        ```
        This should print the versions of pachctl and Pachyderm deployed. 
        For example:
        ```
        COMPONENT           VERSION             
        pachctl             2.0.2             
        pachd               2.0.2
        ```

You are ready to run your first pipelines in a notebook. Check our **Quick Start** in the `Enabled` Menu of your OpenShift Data Science Console. You can later extend this first notebook by following the steps in this written [tutorial](https://docs.pachyderm.com/latest/getting_started/beginner_tutorial/) on our documentation website.

Note that you might need to install additional libraries depending on the notebook you chose. For example, our [Housing prices notebook](https://github.com/pachyderm/examples/blob/master/housing-prices-intermediate/housing-prices.ipynb) requires the additional installation of [Pachyderm's python client](https://python-pachyderm.readthedocs.io/en/stable/): `pip install python-pachyderm`.

