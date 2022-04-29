# Pachyderm
[Pachyderm](https://www.pachyderm.com/) provides the data layer that allows data science teams to productionize and scale their machine learning lifecycle. With Pachyderm’s industry-leading data versioning, pipelines, and lineage, teams gain data-driven automation, petabyte scalability, and end-to-end reproducibility. Teams using Pachyderm get their ML projects to market faster, lower data processing and storage costs, and can more easily meet regulatory compliance requirements.

Read about how our Customers leveraged Pachyderm to face their ML/AI challenges and operationalize their pipelines: [Case studies](https://www.pachyderm.com/case-studies/).
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

## Before Installing Pachyderm Operator

Before you start the operator installation process, you will need to:

- Familiarize yourself with Pachyderm's **[main concepts](https://docs.pachyderm.com/latest/concepts/)**, and Pachyderm's command-line tool `pachctl`. You will interact with Pachyderm using `pachctl` from the cells of your notebooks. Read through our written demo [Open CV](https://docs.pachyderm.com/latest/getting_started/beginner_tutorial/) to get used to the main commands. 
- Prepare the installation of Pachyderm by creating an **external object store** (Pachyderm supports all s3-compatible storage solutions) for your data. Make sure to match your cluster's region.

    * Ceph Nano users: Retrieve the `Cluster IP` of your service (in Networking > Services),  your `AWS_ACCESS_KEY_ID` (base 64), and `AWS_SECRET_ACCESS_KEY` (base 64).
    
    * AWS users: Retrieve the `arn` of your S3 bucket, create a User, then add an inline policy to grant this user a set of permissions on this bucket.

        Copy/Paste the following in the JSON tab of the policy. Replace <arn:AWS:...> with the arn of your bucket.
        ```
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [
                            "s3:ListBucket"
                        ],
                        "Resource": [
                            "<arn:aws:...>"
                        ]
                    },
                    {
                        "Effect": "Allow",
                        "Action": [
                            "s3:PutObject",
                            "s3:GetObject",
                            "s3:DeleteObject"
                        ],
                        "Resource": [
                            "<arn:aws:...>/*"
                        ]
                    }
                ]
            }
        ```


- In Red Hat OpenShift Console, we will guide you through the creation of a new namespace for your cluster as well as a secret holding your bucket's credentials.

    * **A- Create a Project/Namespace**
    In the Administrator view, on the left menu, create a new project from the Home > Project page.

    * **B- Create the Secret that will hold your user credentials and bucket name**, granting your cluster access to your bucket.
  
         Select Workloads > Secrets > Create a secret from YAML on the left menu.
         
         Choose your secret name, then fill in:

         - your namespace/project name
         - your IAM user access key and IAM user secret
         - your bucket's name
         - your bucket's region.

         **Attention Ceph Users!** You need to add an endpoint to the stringData section of your secret: `custom-endpoint:"http://ClusterIP:80"`
	
            ``` 
            apiVersion: v1
            kind: Secret
            metadata:
                name: <name-your-secret>
                namespace: <your-namespace>
            type: Opaque
            stringData:
                access-id: <IAM-user-access-key>
                access-secret: <IAM-user-secret>
                bucket: <bucket-name>
                region: <bucket-region>
            ```
		 For more information on creating a namespace, see [Red Hat Marketplace Docs](https://marketplace.redhat.com/en-us/documentation/clusters).

## Install The Operator
Pachyderm Operator has a **Red Hat marketplace listing**.

- [Subscribe to the operator on Marketplace.](https://marketplace.redhat.com/en-us/products/pachyderm)
  
- [Install the operator and validate.](https://marketplace.redhat.com/en-us/documentation/operators)

## Deploy Pachyderm

Make sure to select the project you created above on the top of the screen. 

On the left menu, select Operator > Installed Operators.
Find Pachyderm's Operator then:

- Click on Pachyderm operator from the list
- Move to *Pachyderm* tab
- Click on *Create Pachyderm*
- Select the *YAML view* and insert the following values:

    - Your namespace in `metadata.namespace`.
    - Your secret name in `storage.amazon.credentialSecretName`.

- Click *Create*. 
- On the left menu, select *Workloads > Pods*.
After a couple of minutes, all the pods of your project should be running. At a minimum, you should see a pod for pachd alongside etcd, postgres, and pg-bouncer:

    ```
    NAME                           READY   STATUS    RESTARTS   AGE
    etcd-0                         1/1     Running   0          18h
    pachd-5db79fb9dd-b2gdq         1/1     Running   2          18h
    postgres-0                     1/1     Running   0          18h
    pg-bouncer-76d9cd855c-nfnhx    1/1     Running   0          18h
    ```

You just installed Pachyderm.
## Post Deployment

1. Launch the **JupyterHub** application: From the `Enabled` menu, click `Launch application` from the **JupyterHub** tile.

1. Run a **Jupyter Lab server**: Select the Image and Container size of your choice (At a minimum, we recommend the *Standard Data Science* Image and *Medium* container size.) then start your Jupyter Lab server.

1. Configure your Notebook to connect to your cluster:

    - Before experimenting with Pachyderm in notebook, run the following command line in a new cell:

        The command installs Pachyderm’s CLI (`pachchtl`) in your notebook environment.

        **Note**: The version of `pachctl` must match the version of Pachyderm deployed by the Operator. You can find Pachyderm’s version by clicking on the tab *Pachyderm*  in the Operator details page. 
        At a minimum, you should always use the identical major & minor versions of `pachctl` and Pachyderm (`pachd`). Note that the following package `/v2.0.5/pachctl_2.0.5_linux_amd64.tar.gz` (see command line below) refers to version 2.0.5 of Pachyderm. Depending on the version currently deployed by the Operator, you might need to update the version of `pachctl` (i.e.change `2.0.5` to `2.1.0` for example) in the command line.

        ```
        ! curl -o /tmp/pachctl.tar.gz -L https://github.com/pachyderm/pachyderm/releases/download/v2.0.5/pachctl_2.0.5_linux_amd64.tar.gz && tar -xvf /tmp/pachctl.tar.gz  -C /tmp && cp /tmp/pachctl_2.0.5_linux_amd64/pachctl  /opt/app-root/bin/
        ```

    - Create a new context for your CLI to connect to your cluster:

        In the following command, update **“pachyderm-operator-install”** in the pachd_address with your project name. The pattern should be: `pachd.`your-project-name`.svc.cluster.local:30650`.

        ```
        !echo '{"pachd_address":"pachd.pachyderm-operator-install.svc.cluster.local:30650"}' | pachctl config set context pachyderm --overwrite
        ```

    - Finally, switch `pachctl` context to your newly created context:
        ```
        !pachctl config set active-context pachyderm
        ```

    - Verify that your active context is the new context pachyderm
        ```
        !pachctl config get active-context
        ```

    - You are all set. Run: 
        ```
        !pachctl version 
        ```

        This should print the versions of pachctl and Pachyderm deployed. 
        For example:
        ```
        COMPONENT           VERSION             
        pachctl             2.0.5          
        pachd               2.0.5
        ```

You are ready to run your first pipelines in a notebook. Check our **Quick Start** in the `Enabled` menu of your OpenShift Data Science Console. You can later extend this first notebook by following the steps in this written [tutorial](https://docs.pachyderm.com/latest/getting_started/beginner_tutorial/) on our documentation website.

Note that you might need to install additional libraries depending on the notebook you chose. For example, our [Housing prices notebook](https://github.com/pachyderm/examples/blob/master/housing-prices-intermediate/housing-prices.ipynb) requires the additional installation of [Pachyderm's python client](https://python-pachyderm.readthedocs.io/en/stable/): `pip install python-pachyderm`.

