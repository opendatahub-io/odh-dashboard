import { OdhDocument } from '../src/types';

export const mockDocs = [
  {
    metadata: {
      name: 'jupyterhub-install-python-packages',
      type: 'how-to',
      annotations: { 'opendatahub.io/categories': 'AI/Machine learning,Jupyter notebook,Python' },
    },
    spec: {
      displayName: 'How to install Python packages on your notebook server',
      appName: 'jupyterhub',
      description: 'Install additional python packages into your notebook server.',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html-single/how_to_install_python_packages_on_your_notebook_server/index',
      durationMinutes: 15,
    },
  },
  {
    metadata: {
      name: 'jupyterhub-update-server-settings',
      type: 'how-to',
      annotations: { 'opendatahub.io/categories': 'AI/Machine learning,Jupyter notebook,Python' },
    },
    spec: {
      displayName: 'How to update notebook server settings',
      appName: 'jupyterhub',
      description: 'Update the settings or the notebook image on your notebook server.',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html-single/how_to_update_notebook_server_settings/index',
      durationMinutes: 15,
    },
  },
  {
    metadata: {
      name: 'jupyterhub-use-s3-bucket-data',
      type: 'how-to',
      annotations: {
        'opendatahub.io/categories': 'AI/Machine learning,Data management,Jupyter notebook,Python',
      },
    },
    spec: {
      displayName: 'How to use data from Amazon S3 buckets',
      appName: 'jupyterhub',
      description: 'Connect to data in S3 Storage using environment variables.',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html-single/how_to_use_data_from_amazon_s3_buckets/index',
      durationMinutes: 15,
    },
  },
  {
    metadata: {
      name: 'jupyterhub-view-installed-packages',
      type: 'how-to',
      annotations: { 'opendatahub.io/categories': 'AI/Machine learning,Jupyter notebook,Python' },
    },
    spec: {
      displayName: 'How to view installed packages on your notebook server',
      appName: 'jupyterhub',
      description: 'See which packages are installed into your running notebook server.',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html-single/how_to_view_installed_packages_on_your_notebook_server/index',
      durationMinutes: 15,
    },
  },
] as never as OdhDocument[];
