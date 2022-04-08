import axios from 'axios';
import { Notebook, NotebookCreateRequest, NotebookUpdateRequest } from '../types';

export const fetchNotebooks = (): Promise<Notebook[]> => {
  const url = '/api/notebook';
  return axios
    .get(url)
    .then((response) => {
      return response.data.notebooks;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const importNotebook = (notebook: NotebookCreateRequest): Promise<Notebook> => {
  const url = '/api/notebook';
  return axios
    .post(url, notebook)
    .then((response) => {
      return response.data.notebook;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const deleteNotebook = (notebook: Notebook): Promise<Notebook> => {
  const url = `/api/notebook/${notebook.id}`;
  return axios
    .delete(url, notebook)
    .then((response) => {
      return response.data.notebook;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const updateNotebook = (notebook: NotebookUpdateRequest): Promise<Notebook> => {
  const url = `/api/notebook/${notebook.id}`;
  return axios
    .put(url, notebook)
    .then((response) => {
      return response.data.notebook;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
