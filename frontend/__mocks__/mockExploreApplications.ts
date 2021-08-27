import { OdhApplication } from '../src/types';

export const mockExploreApplications: OdhApplication[] = [
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
      kfdefApplications: ['jupyterhub', 'notebook-images'],
      route: 'jupyterhub',
      img: 'images/jupyterhub.svg',
      category: 'Red Hat managed',
      support: 'red hat',
      docsLink: 'https://jupyter.org/hub',
      quickStart: 'create-jupyter-notebook',
      getStartedLink: 'https://jupyterhub.readthedocs.io/en/stable/getting-started/index.html',
      isEnabled: true,
      link: 'https://jupyterhub-redhat-ods-applications.apps.jephilli-4-9-06-21-0953.devcluster.openshift.com',
    },
  },
  {
    metadata: {
      name: 'test-app',
      annotations: { 'opendatahub.io/categories': 'Jupyter notebook' },
    },
    spec: {
      displayName: 'Test App',
      provider: 'Test',
      description: 'Some description',
      route: 'my-route',
      img: 'images/jupyterhub.svg',
      docsLink: 'https://fakelink.org/fake',
      getStartedLink: 'https://jupyterhub.readthedocs.io/en/stable/getting-started/index.html',
      isEnabled: false,
      quickStart: null,
      enable: {
        title: 'Test Enable',
        actionLabel: 'Enable',
        description: '',
        variables: {
          test_key: 'password',
        },
        variableDisplayText: {
          test_key: 'Enter a Key',
        },
        variableHelpText: {
          test_key: 'This key is enables the app',
        },
        validationJob: 'some-validator',
        validationSecret: 'some-secret',
        validationConfigMap: 'some-cm',
      },
    },
  },
];
