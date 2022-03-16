import axios from 'axios';
import { Notebook, NotebookList, Project, ProjectList } from '../types';
import { store } from '../redux/store/store';

export const getDataProjects = (): Promise<ProjectList> => {
  const url = '/api/data-projects';
  const searchParams = new URLSearchParams();
  const labels = [
    'opendatahub.io/odh-managed=true',
    `opendatahub.io/user=${store.getState().appState.user}`,
  ];
  searchParams.set('labels', labels.join(','));
  const options = { params: searchParams };
  return axios
    .get(url, options)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const getDataProject = (name: string): Promise<Project> => {
  const url = `/api/data-projects/${name}`;
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      const error: any = new Error(e.response.data.message);
      error.statusCode = e.response.data.statusCode;
      throw error;
    });
};

export const createDataProject = (name: string, description: string): Promise<Project> => {
  const url = '/api/data-projects';

  //TODO: instead of store.getState().appState.user, we need to use session and proper auth permissions
  const data = {
    metadata: {
      name,
      labels: {
        'opendatahub.io/odh-managed': 'true',
        'opendatahub.io/user': store.getState().appState.user,
      },
    },
    description,
  };

  return axios
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const deleteDataProject = (name: string): Promise<Project> => {
  const url = `/api/data-projects/${name}`;

  return axios
    .delete(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const getDataProjectNotebooks = (name: string): Promise<NotebookList> => {
  const url = `/api/data-projects/${name}/notebooks`;
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const createDataProjectNotebook = (
  projectName: string,
  notebookName: string,
  annotations?: { [key: string]: string },
): Promise<Notebook> => {
  const url = `/api/data-projects/${projectName}/notebooks`;

  //TODO: instead of store.getState().appState.user, we need to use session and proper auth permissions
  const data = {
    apiVersion: 'kubeflow.org/v1',
    kind: 'Notebook',
    metadata: {
      labels: {
        app: 'ephemeral-nb-server',
        'opendatahub.io/odh-managed': 'true',
        'opendatahub.io/user': store.getState().appState.user,
      },
      // annotations: {
      //   'opendatahub.io/user': store.getState().appState.user,
      // },
      name: notebookName,
      namespace: projectName,
    },
    spec: {
      template: {
        spec: {
          containers: [
            {
              image: 'quay.io/thoth-station/s2i-minimal-notebook:v0.2.2',
              imagePullPolicy: 'Always',
              name: notebookName,
              env: [
                {
                  name: 'NOTEBOOK_ARGS',
                  value: "--NotebookApp.token='' --NotebookApp.password=''",
                },
              ],
              resources: {
                limits: {
                  cpu: '1',
                  memory: '2Gi',
                },
                requests: {
                  cpu: '500m',
                  memory: '1Gi',
                },
              },
            },
          ],
        },
      },
    },
  };

  return axios
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const deleteDataProjectNotebook = (
  projectName: string,
  notebookName: string,
): Promise<Project> => {
  const url = `/api/data-projects/${projectName}/notebooks/${notebookName}`;

  return axios
    .delete(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
