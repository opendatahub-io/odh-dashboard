import { OdhDocument } from '../src/types';

export const mockDocs: OdhDocument[] = [
  {
    metadata: {
      annotations: { 'opendatahub.io/categories': 'AI/Machine learning,Jupyter notebook,Python' },
      name: 'jupyterhub-install-python-packages',
    },
    spec: {
      appName: 'jupyterhub',
      description: 'Install additional python packages into your notebook server.',
      displayName: 'How to install Python packages on your notebook server',
      durationMinutes: 15,
      type: 'how-to',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html-single/how_to_install_python_packages_on_your_notebook_server/index',
      appDisplayName: 'JupyterHub',
      appEnabled: false,
      img: '',
      provider: 'Jupyter',
    },
  },
  {
    metadata: {
      annotations: { 'opendatahub.io/categories': 'AI/Machine learning,Jupyter notebook,Python' },
      name: 'jupyterhub-update-server-settings',
    },
    spec: {
      appName: 'jupyterhub',
      description: 'Update the settings or the notebook image on your notebook server.',
      displayName: 'How to update notebook server settings',
      durationMinutes: 15,
      type: 'how-to',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html-single/how_to_update_notebook_server_settings/index',
      appDisplayName: 'JupyterHub',
      appEnabled: false,
      img: '',
      provider: 'Jupyter',
    },
  },
  {
    metadata: {
      annotations: {
        'opendatahub.io/categories': 'AI/Machine learning,Data management,Jupyter notebook,Python',
      },
      name: 'jupyterhub-use-s3-bucket-data',
    },
    spec: {
      appName: 'jupyterhub',
      description: 'Connect to data in S3 Storage using environment variables.',
      displayName: 'How to use data from Amazon S3 buckets',
      durationMinutes: 15,
      type: 'how-to',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html-single/how_to_use_data_from_amazon_s3_buckets/index',
      appDisplayName: 'JupyterHub',
      appEnabled: false,
      img: '',
      provider: 'Jupyter',
    },
  },
  {
    metadata: {
      annotations: { 'opendatahub.io/categories': 'AI/Machine learning,Jupyter notebook,Python' },
      name: 'jupyterhub-view-installed-packages',
    },
    spec: {
      appName: 'jupyterhub',
      description: 'See which packages are installed into your running notebook server.',
      displayName: 'How to view installed packages on your notebook server',
      durationMinutes: 15,
      type: 'how-to',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html-single/how_to_view_installed_packages_on_your_notebook_server/index',
      appDisplayName: 'JupyterHub',
      appEnabled: false,
      img: '',
      provider: 'Jupyter',
    },
  },
  {
    metadata: { name: 'jupyterhub-doc' },
    spec: {
      appName: 'jupyterhub',
      type: 'documentation',
      provider: 'Jupyter',
      url: 'https://jupyter.org/hub',
      displayName: 'JupyterHub',
      description:
        'A multi-user version of the notebook designed for companies, classrooms and research labs.',
      appDisplayName: 'JupyterHub',
      appEnabled: false,
      img: '',
    },
  },
  {
    metadata: {
      annotations: { 'opendatahub.io/categories': 'Getting started,Jupyter notebook' },
      name: 'create-jupyter-notebook',
    },
    spec: {
      appName: 'jupyterhub',
      description: 'This quick start will walk you through creating a Jupyter notebook.',
      displayName: 'Creating a Jupyter notebook',
      durationMinutes: 5,
      type: 'quickstart',
      appDisplayName: 'JupyterHub',
      appEnabled: false,
      img: '',
      provider: 'Jupyter',
    },
  },
  {
    metadata: {
      annotations: {
        'opendatahub.io/categories':
          'AI/Machine learning,Deployment,Jupyter notebook,Model serving,Python',
      },
      name: 'deploy-python-model',
    },
    spec: {
      appName: 'jupyterhub',
      description: 'How to deploy a Python model using Flask and OpenShift.',
      displayName: 'Deploying a sample Python application using Flask and OpenShift.',
      durationMinutes: 10,
      type: 'quickstart',
      appDisplayName: 'JupyterHub',
      appEnabled: false,
      img: '',
      provider: 'Jupyter',
    },
  },
];
