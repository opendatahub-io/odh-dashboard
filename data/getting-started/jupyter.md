# Jupyter

Launch Jupyter and start a notebook server to start working with your notebooks.

## Prerequisites

- You have logged in to Red Hat OpenShift Data Science.

- You know the names and values you want to use for any environment variables in your notebook server environment, for example, `AWS_SECRET_ACCESS_KEY`.

- If you want to work with a very large data set, work with your administrator to proactively increase the storage capacity of your notebook server.

## Procedure

1. Locate the **Jupyter** card on the **Enabled applications** page.

2. Click **Launch application**.

  i. If prompted, select your identity provider.

  ii. Enter your credentials and click **Log in** (or equivalent for your identity provider).

  If you see **Error 403: Forbidden**, you are not in the default user group or the default administrator group for OpenShift Data Science. Contact your administrator so that they can add you to the correct group using [Adding users for OpenShift Data Science](https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html/managing_users_and_user_resources/adding-users-for-openshift-data-science_useradd).

3. Start a notebook server.

  This is not required if you have previously launched Jupyter.

  i. Select the **Notebook image** to use for your server.

  ii. If the notebook image contains multiple versions, select the version of the notebook image from the **Versions** section.

  iii. Select the **Container size** for your server.

  iv. Optional: Select the **Number of GPUs** (graphics processing units) for your server.

  v. Optional: Select and specify values for any new **Environment variables**.

  For example, if you plan to integrate with Red Hat OpenShift Streams for Apache Kafka, create environment variables to store your Kafka bootstrap server and the service account username and password here.

  he interface stores these variables so that you only need to enter them once. Example variable names for common environment variables are automatically provided for frequently integrated environments and frameworks, such as Amazon Web Services (AWS).

  vi. Click **Start server**.
  
  The **Starting server** progress indicator appears. If you encounter a problem during this process, an error message appears with more information. Click **Expand event log** to view additional information on the server creation process. Depending on the deployment size and resources you requested, starting the server can take up to several minutes. After the server starts, the JupyterLab interface opens.

## Verification

The JupyterLab interface opens in the same tab.
