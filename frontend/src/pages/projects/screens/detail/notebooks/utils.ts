import { ContainerResources } from '#~/types';

export type AcceleratorResources = {
  limits?: number | string;
  requests?: number | string;
  identifier?: string;
};

export const extractAcceleratorResources = (
  resources?: ContainerResources,
): AcceleratorResources => {
  const findAcceleratorResource = (res?: { [key: string]: number | string | undefined }) =>
    Object.entries(res || {}).find(([key]) => !['cpu', 'memory'].includes(key));

  const limitsResource = findAcceleratorResource(resources?.limits);
  const requestsResource = findAcceleratorResource(resources?.requests);

  return {
    limits: limitsResource?.[1],
    requests: requestsResource?.[1],
    identifier: limitsResource?.[0] || requestsResource?.[0],
  };
};
