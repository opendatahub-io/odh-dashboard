import { OdhDocument } from '#~/types';

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
      url: 'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_cloud_service/1/html/working_with_connected_applications/using_the_jupyter_application#installing-python-packages-on-your-notebook-server_connected-apps',
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
      description: 'Manage the settings or the notebook image on your notebook server.',
      displayName: 'How to manage notebook server settings',
      durationMinutes: 15,
      type: 'how-to',
      url: 'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_cloud_service/1/html/managing_resources/managing-notebook-servers_notebook-mgmt',
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
      description: 'Connect to data in S3 Storage.',
      displayName: 'How to use data from an S3-compatible object store',
      durationMinutes: 15,
      type: 'how-to',
      url: 'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_cloud_service/1/html/working_with_data_in_an_s3-compatible_object_store/index',
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
      url: 'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_cloud_service/1/html/working_with_connected_applications/using_the_jupyter_application#viewing-python-packages-installed-on-your-notebook-server_connected-apps',
    },
  },
];
