import { OdhDocument } from '~/types';

export const mockDocs = (): OdhDocument[] => [
  {
    metadata: {
      annotations: {
        'internal.config.kubernetes.io/previousKinds': 'OdhDocument',
        'internal.config.kubernetes.io/previousNames': 'jupyterhub-install-python-packages',
        'internal.config.kubernetes.io/previousNamespaces': 'default',
        'opendatahub.io/categories': 'Package management,Notebook environments,Getting started',
      },
      name: 'jupyterhub-install-python-packages',
    },
    spec: {
      appName: 'jupyter',
      description: 'Install additional python packages into your notebook server.',
      displayName: 'How to install Python packages on your notebook server',
      durationMinutes: 15,
      type: 'how-to',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html-single/working_on_data_science_projects/index#installing-python-packages-on-your-notebook-server_nb-server/index',
    },
  },
  {
    metadata: {
      annotations: {
        'internal.config.kubernetes.io/previousKinds': 'OdhDocument',
        'internal.config.kubernetes.io/previousNames': 'jupyterhub-update-server-settings',
        'internal.config.kubernetes.io/previousNamespaces': 'default',
        'opendatahub.io/categories': 'Notebook environments,Getting started',
      },
      name: 'jupyterhub-update-server-settings',
    },
    spec: {
      appName: 'jupyter',
      description: 'Update the settings or the notebook image on your notebook server.',
      displayName: 'How to update notebook server settings',
      durationMinutes: 15,
      type: 'how-to',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html-single/how_to_update_notebook_server_settings/index',
    },
  },
  {
    metadata: {
      annotations: {
        'internal.config.kubernetes.io/previousKinds': 'OdhDocument',
        'internal.config.kubernetes.io/previousNames': 'jupyterhub-use-s3-bucket-data',
        'internal.config.kubernetes.io/previousNamespaces': 'default',
        'opendatahub.io/categories': 'Data management,Notebook environments',
      },
      name: 'jupyterhub-use-s3-bucket-data',
    },
    spec: {
      appName: 'jupyter',
      description: 'Connect to data in S3 Storage using environment variables.',
      displayName: 'How to use data from Amazon S3 buckets',
      durationMinutes: 15,
      type: 'how-to',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html-single/how_to_use_data_from_amazon_s3_buckets/index',
    },
  },
  {
    metadata: {
      annotations: {
        'internal.config.kubernetes.io/previousKinds': 'OdhDocument',
        'internal.config.kubernetes.io/previousNames': 'jupyterhub-view-installed-packages',
        'internal.config.kubernetes.io/previousNamespaces': 'default',
        'opendatahub.io/categories': 'Package management,Notebook environments,Getting started',
      },
      name: 'jupyterhub-view-installed-packages',
    },
    spec: {
      appName: 'jupyter',
      description: 'See which packages are installed into your running notebook server.',
      displayName: 'How to view installed packages on your notebook server',
      durationMinutes: 15,
      type: 'how-to',
      url: 'https://access.redhat.com/documentation/en-us/red_hat_openshift_data_science/1/html-single/how_to_view_installed_packages_on_your_notebook_server/index',
    },
  },
];
