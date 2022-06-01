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
      shownOnEnabledPage: true,
      isEnabled: true,
      link: 'https://jupyterhub-redhat-ods-applications.apps.jephilli-4-9-06-21-0953.devcluster.openshift.com',
      getStartedMarkDown:
        "# Quickstart\n\n## Prerequisites\n\nBefore installing JupyterHub, you will need:\n\n- a Linux/Unix based system\n- [Python](https://www.python.org/downloads/) 3.5 or greater\n\n  An understanding\n  of using [`pip`](https://pip.pypa.io/en/stable/) or\n  [`conda`](https://conda.io/docs/get-started.html) for\n  installing Python packages is helpful.\n\n- [nodejs/npm](https://www.npmjs.com/)\n\n  [Install nodejs/npm](https://docs.npmjs.com/getting-started/installing-node),\n  using your operating system's package manager.\n\n  - If you are using **`conda`**, the nodejs and npm dependencies will be installed for\n    you by conda.\n\n  - If you are using **`pip`**, install a recent version of\n    [nodejs/npm](https://docs.npmjs.com/getting-started/installing-node).\n    For example, install it on Linux (Debian/Ubuntu) using:\n\n    ```\n    sudo apt-get install npm nodejs-legacy\n    ```\n\n    The `nodejs-legacy` package installs the `node` executable and is currently\n    required for npm to work on Debian/Ubuntu.\n\n- A [pluggable authentication module (PAM)](https://en.wikipedia.org/wiki/Pluggable_authentication_module)\n  to use the [default Authenticator](./getting-started/authenticators-users-basics.md)\n\n  PAM is often available by default on most distributions, if this is not the case it can be installed by\n  using the operating system's package manager.\n\n- TLS certificate and key for HTTPS communication\n\n- Domain name\n\nBefore running the single-user notebook servers (which may be on the same\nsystem as the Hub or not), you will need:\n\n- [Jupyter Notebook](https://jupyter.readthedocs.io/en/latest/install.html)\n  version 4 or greater\n\n## Installation\n\nJupyterHub can be installed with `pip` (and the proxy with `npm`) or `conda`:\n\n**pip, npm:**\n\n```bash\npython3 -m pip install jupyterhub\nnpm install -g configurable-http-proxy\npython3 -m pip install notebook  # needed if running the notebook servers locally\n```\n\n**conda** (one command installs jupyterhub and proxy):\n\n```bash\nconda install -c conda-forge jupyterhub  # installs jupyterhub and proxy\nconda install notebook  # needed if running the notebook servers locally\n```\n\nTest your installation. If installed, these commands should return the packages'\nhelp contents:\n\n```bash\njupyterhub -h\nconfigurable-http-proxy -h\n```\n\n## Start the Hub server\n\nTo start the Hub server, run the command:\n\n```bash\njupyterhub\n```\n\nVisit `https://localhost:8000` in your browser, and sign in with your unix\ncredentials.\n\nTo **allow multiple users to sign in** to the Hub server, you must start\n`jupyterhub` as a _privileged user_, such as root:\n\n```bash\nsudo jupyterhub\n```\n\nThe [wiki](https://github.com/jupyterhub/jupyterhub/wiki/Using-sudo-to-run-JupyterHub-without-root-privileges)\ndescribes how to run the server as a _less privileged user_. This requires\nadditional configuration of the system.\n",
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
      shownOnEnabledPage: true,
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
      getStartedMarkDown:
        "# Quickstart\n\n## Prerequisites\n\nBefore installing JupyterHub, you will need:\n\n- a Linux/Unix based system\n- [Python](https://www.python.org/downloads/) 3.5 or greater\n\n  An understanding\n  of using [`pip`](https://pip.pypa.io/en/stable/) or\n  [`conda`](https://conda.io/docs/get-started.html) for\n  installing Python packages is helpful.\n\n- [nodejs/npm](https://www.npmjs.com/)\n\n  [Install nodejs/npm](https://docs.npmjs.com/getting-started/installing-node),\n  using your operating system's package manager.\n\n  - If you are using **`conda`**, the nodejs and npm dependencies will be installed for\n    you by conda.\n\n  - If you are using **`pip`**, install a recent version of\n    [nodejs/npm](https://docs.npmjs.com/getting-started/installing-node).\n    For example, install it on Linux (Debian/Ubuntu) using:\n\n    ```\n    sudo apt-get install npm nodejs-legacy\n    ```\n\n    The `nodejs-legacy` package installs the `node` executable and is currently\n    required for npm to work on Debian/Ubuntu.\n\n- A [pluggable authentication module (PAM)](https://en.wikipedia.org/wiki/Pluggable_authentication_module)\n  to use the [default Authenticator](./getting-started/authenticators-users-basics.md)\n\n  PAM is often available by default on most distributions, if this is not the case it can be installed by\n  using the operating system's package manager.\n\n- TLS certificate and key for HTTPS communication\n\n- Domain name\n\nBefore running the single-user notebook servers (which may be on the same\nsystem as the Hub or not), you will need:\n\n- [Jupyter Notebook](https://jupyter.readthedocs.io/en/latest/install.html)\n  version 4 or greater\n\n## Installation\n\nJupyterHub can be installed with `pip` (and the proxy with `npm`) or `conda`:\n\n**pip, npm:**\n\n```bash\npython3 -m pip install jupyterhub\nnpm install -g configurable-http-proxy\npython3 -m pip install notebook  # needed if running the notebook servers locally\n```\n\n**conda** (one command installs jupyterhub and proxy):\n\n```bash\nconda install -c conda-forge jupyterhub  # installs jupyterhub and proxy\nconda install notebook  # needed if running the notebook servers locally\n```\n\nTest your installation. If installed, these commands should return the packages'\nhelp contents:\n\n```bash\njupyterhub -h\nconfigurable-http-proxy -h\n```\n\n## Start the Hub server\n\nTo start the Hub server, run the command:\n\n```bash\njupyterhub\n```\n\nVisit `https://localhost:8000` in your browser, and sign in with your unix\ncredentials.\n\nTo **allow multiple users to sign in** to the Hub server, you must start\n`jupyterhub` as a _privileged user_, such as root:\n\n```bash\nsudo jupyterhub\n```\n\nThe [wiki](https://github.com/jupyterhub/jupyterhub/wiki/Using-sudo-to-run-JupyterHub-without-root-privileges)\ndescribes how to run the server as a _less privileged user_. This requires\nadditional configuration of the system.\n",
    },
  },
];
