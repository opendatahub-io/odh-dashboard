import axios from 'axios';
import { Project, ProjectList } from '../types';
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
        'modelmesh-enabled': 'true',
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
