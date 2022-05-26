import axios from 'axios';
import { Notebook, NotebookCreateRequest, NotebookUpdateRequest, ResponseStatus } from '../types';

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

export const importNotebook = (notebook: NotebookCreateRequest): Promise<ResponseStatus> => {
  const url = '/api/notebook';
  return axios
    .post(url, notebook)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const deleteNotebook = (notebook: Notebook): Promise<ResponseStatus> => {
  const url = `/api/notebook/${notebook.id}`;
  return axios
    .delete(url, notebook)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const updateNotebook = (notebook: NotebookUpdateRequest): Promise<ResponseStatus> => {
  const url = `/api/notebook/${notebook.id}`;
  return axios
    .put(url, notebook)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
