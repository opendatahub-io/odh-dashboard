import { OdhApplication } from '../src/types';

export const mockEnabledApplications: OdhApplication[] = [
  {
    metadata: {
      name: 'jupyterhub',
      annotations: { 'opendatahub.io/categories': 'Jupyter notebook' },
    },
    spec: {
      displayName: 'JupyterHub',
      provider: 'Jupyter',
      description:
        'A multi-user version of the notebook designed for companies, classrooms and research labs.',
      route: 'jupyterhub',
      routeNamespace: null,
      routeSuffix: null,
      serviceName: null,
      endpoint: null,
      link: 'https://jupyterhub-redhat-ods-applications.apps.jephilli-4-9-06-21-0953.devcluster.openshift.com',
      img: 'images/jupyterhub.svg',
      docsLink: 'https://jupyter.org/hub',
      getStartedLink: 'https://jupyterhub.readthedocs.io/en/stable/getting-started/index.html',
      category: 'Red Hat managed',
      support: 'red hat',
      quickStart: 'create-jupyter-notebook',
      comingSoon: false,
      isEnabled: true,
      kfdefApplications: ['jupyterhub', 'notebook-images'],
      csvName: '',
    },
  },
];
