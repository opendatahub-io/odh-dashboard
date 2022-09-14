import axios from 'axios';
import { Route } from '../types';

export const getRoute = (namespace: string, routeName: string): Promise<Route> => {
  const url = `/api/route/${namespace}/${routeName}`;
  return axios.get(url).then((response) => {
    return response.data;
  });
};
