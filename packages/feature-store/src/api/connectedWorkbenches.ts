import { proxyGET } from '@odh-dashboard/internal/api/proxyUtils';
import { ConnectedWorkbenchesResponse } from '../types/connectedWorkbenches';

export const getProjectsWithWorkbenches = (): Promise<ConnectedWorkbenchesResponse> =>
  proxyGET<ConnectedWorkbenchesResponse>('', '/api/featurestores/projects-with-workbenches');
