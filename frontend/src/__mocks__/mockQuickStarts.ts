import { OdhQuickStart } from '#~/k8sTypes';

export const mockQuickStarts = (): OdhQuickStart[] => [
  {
    apiVersion: 'console.openshift.io/v1',
    kind: 'OdhQuickStart',
    metadata: {
      annotations: {
        'internal.config.kubernetes.io/previousKinds': 'OdhQuickStart',
        'internal.config.kubernetes.io/previousNames': 'create-jupyter-notebook',
        'internal.config.kubernetes.io/previousNamespaces': 'default',
        'opendatahub.io/categories': 'Getting started,Notebook environments',
      },
      name: 'create-jupyter-notebook',
    },
    spec: {
      appName: 'jupyter',
      conclusion:
        'You are now able to launch Jupyter notebooks and write Python code.  If you want to learn how to deploy a model written in Python, take the next quick start.',
      description: 'This quick start will walk you through creating a Jupyter notebook.',
      displayName: 'Creating a Jupyter notebook',
      durationMinutes: 5,
      icon: 'images/jupyterhub.svg',
      introduction:
        '### This quick start shows you how to create a Jupyter notebook.\nOpen Data Hub lets you run Jupyter notebooks in a scalable OpenShift hybrid cloud environment.\n\nWe have configured the JupyterHub spawner to support your amazing Data Scientist explorations and model deployments.\n\nWe just know you will absolutely love this amazing environment.  This quick start will get you working in a notebook in just a few minutes.',
      nextQuickStart: ['deploy-python-model'],
      tasks: [
        {
          description:
            '### To find the JupyterHub Launch action:\n1. Click **Applications** &#x2192; **Enabled**.\n2. Find the JupyterHub card.\n3. Click **Launch** on the JupyterHub card to access the JupyterHub **Start a notebook server** page.\n\nA new browser tab will open displaying the **Start a notebook server** page.',
          review: {
            failedTaskHelp: 'This task is not verified yet. Try the task again.',
            instructions:
              '#### To verify you have launched JupyterHub:\nIs a new **JupyterHub** browser tab visible with the **Start a notebook server** page open?',
          },
          summary: {
            failed: 'Try the steps again.',
            success: 'You have launched JupyterHub.',
          },
          title: 'Launch JupyterHub',
        },
        {
          description:
            '### Configuring and starting an environment:\n1. Select a notebook image from the options provided.\n2. Select a container size based on your computation needs.\n3. Click the **Start** button.\n\nThe **Start a notebook server** page will reload and indicate that the system is starting up.',
          review: {
            failedTaskHelp: 'This task is not verified yet. Try the task again.',
            instructions:
              '#### To verify that you have launched the Jupyter notebook:\nDo you see a message in the page that says **The server is starting up**?',
          },
          summary: {
            failed: 'Try the steps again.',
            success:
              'Your server has started and the JupyterLab interface will load shortly. When the page displays a **Stop** option, proceed to the next step.',
          },
          title: 'Configure and start an environment',
        },
        {
          description:
            '### To create a notebook, follow these steps:\n1. In the **Launcher** tab, under the **Notebook** heading, click the **Python 3** tile.\n2. When the new Jupyter notebook opens, verify that you see `Python 3` in the upper right navigation bar.\n\nYou have now launched a Jupyter notebook and can begin writing Python.',
          review: {
            failedTaskHelp: 'This task is not verified yet. Try the task again.',
            instructions:
              '#### Verify that your Jupyter notebook launched with a Python 3 kernel:\nIs `Python 3` displaying in the upper right notification bar of your notebook?',
          },
          summary: {
            failed: 'Try the steps again.',
            success: 'You have created a Jupyter notebook with a Python 3 kernel!',
          },
          title: 'Create your first notebook',
        },
      ],
    },
  },
  {
    apiVersion: 'console.openshift.io/v1',
    kind: 'OdhQuickStart',
    metadata: {
      annotations: {
        'internal.config.kubernetes.io/previousKinds': 'OdhQuickStart',
        'internal.config.kubernetes.io/previousNames': 'deploy-python-model',
        'internal.config.kubernetes.io/previousNamespaces': 'default',
        'opendatahub.io/categories': 'Model serving,Getting started',
      },
      name: 'deploy-python-model',
    },
    spec: {
      appName: 'jupyter',
      conclusion: 'You are now able to deploy a sample model stored in GitHub.',
      description: 'How to deploy a Python model using Flask and OpenShift.',
      displayName: 'Deploying a sample Python application using Flask and OpenShift',
      durationMinutes: 10,
      icon: 'images/jupyterhub.svg',
      introduction:
        '### This quick start shows you how to deploy a Python model.\nOpen Data Hub lets you run Jupyter notebooks in a scalable OpenShift hybrid cloud environment.\n\nThis quick start shows you how to take your model out of a Jupyter notebook and put it into a Flask application running on OpenShift Dedicated, for use as a development sandbox.',
      nextQuickStart: [],
      prerequisites: ['You completed the "Create a Jupyter notebook" quick start.'],
      tasks: [
        {
          description:
            '### To create a new repository from the s2i Flask template:\n1. Navigate to `https://github.com/opendatahub-io/odh-s2i-project-simple`.\n2. Click **Use this template** to create a new repository from this template.\n3. Enter a *Repository name* for your new repository.\n4. Select the **Public** radio button to ensure the repository is visible.\n5. Click **Create repository from template** to complete this step.\n\nA new GitHub repository will be created under **Your repositories** on GitHub.',
          review: {
            failedTaskHelp: 'This task is not verified yet. Try the task again.',
            instructions:
              '#### To verify you have create a new repository:\nIs a new GitHub repository visible with the name you entered?',
          },
          summary: {
            failed: 'Try the steps again.',
            success: 'You have created a new GitHub repository.',
          },
          title: 'Create a new GitHub repository using the s2i Flask template',
        },
        {
          description:
            '### Deploying the sample Flask application on OpenShift:\n1. Click the **code** button from your newly created repository and copy the URL for your project.\n2. Navigate to your OpenShift Dedicated web console and ensure you are in the **Developer** perspective.\n3. Use the **Project** dropdown to select your OpenShift project, or create a new one.\n4. Click **+Add**.\n5. Click on the **From Git** card.\n6. Paste the URL for your project (copied in step 1) into the **Git Repo URL** field. This automatically fills in some of the other fields on the page.\n7. Under **Builder Image**, click **Python**.\n8. Click **Create** and watch the deployment build and start in the Topology view.\n\nThe application will deploy and indicate that the system is running.',
          review: {
            failedTaskHelp: 'This task is not verified yet. Try the task again.',
            instructions:
              '#### To verify that you have deployed the Flask Python model:\nClick on the application in the Topology view and check under **Builds** in the panel that appears. You should see something like `Build #1 is complete (a minute ago)` alongside a green check mark.',
          },
          summary: {
            failed: 'Try the steps again.',
            success: 'The deployed application has started.',
          },
          title: 'Deploy the sample Flask Python model',
        },
        {
          description:
            '### To test the sample Flask application:\n1. Click the application in the Topology view.\n2. In the panel that appears, copy the URL that appears under **Routes**.\n3. In a Jupyter notebook, navigate to a terminal view.\n4. Run this curl command, using the URL you copied in step 1.\n```\ncurl -X POST -d \'{"hello" ":" "world"}\' <URL>/prediction\n```\nFor example:\n```\ncurl -X POST -d \'{"hello" ":" "world"}\' http://example.apps.organization.abc3.p4.openshiftapps.com/prediction\n```\n\nThis should return `{"prediction":"not implemented"}` as output.',
          review: {
            failedTaskHelp:
              'This task is not verified yet. Make sure your application built correctly. Make sure you remembered to add `/prediction` to the end of the application URL to get to the endpoint.',
            instructions:
              '#### Verify that your deployed application is working:\nDid you receive the response `{"prediction" \'\':\'\' "not implemented"}`?',
          },
          summary: {
            failed: 'Try the steps again.',
            success: 'You have verified that the sample model deployment is executing!',
          },
          title: 'Test the prediction function in the deployed model',
        },
      ],
    },
  },
];
