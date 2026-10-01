import { commonFetch } from '@openshift/dynamic-plugin-sdk-utils';
import { getGenericErrorCode } from './errorUtils';
import type { K8sAPIOptions } from '../k8sTypes';

export type K8sResourceIdentifier = { group: string; version: string; resource: string };

export class DiscoveryForbiddenError extends Error {}

/** Discover one API resource through the host's authenticated Kubernetes transport. */
export const discoverK8sResource = async (
  { group, version, resource }: K8sResourceIdentifier,
  opts?: Pick<K8sAPIOptions, 'signal'>,
): Promise<boolean> => {
  if (
    ![version, resource].every((part) => /^[a-z0-9][a-z0-9-]*$/.test(part)) ||
    (group !== '' && !/^[a-z0-9][a-z0-9.-]*$/.test(group))
  ) {
    throw new Error('Invalid Kubernetes resource identifier.');
  }
  const path = group ? `/apis/${group}/${version}` : `/api/${version}`;
  let response: Response;
  try {
    response = await commonFetch(path, { signal: opts?.signal }, undefined, true);
  } catch (error) {
    // RHOAI's SDK adapter throws Kubernetes Status errors; RHAII returns responses.
    const code = getGenericErrorCode(error);
    if (code === 404) {
      return false;
    }
    if (code === 403) {
      throw new DiscoveryForbiddenError('API discovery is forbidden.');
    }
    throw error;
  }
  if (response.status === 404) {
    return false;
  }
  if (response.status === 403) {
    throw new DiscoveryForbiddenError('API discovery is forbidden.');
  }
  if (!response.ok) {
    throw new Error(`API discovery failed (${response.status}).`);
  }
  const body: unknown = await response.json();
  if (
    !body ||
    typeof body !== 'object' ||
    !('resources' in body) ||
    !Array.isArray(body.resources) ||
    !body.resources.every(
      (entry: unknown) =>
        entry !== null &&
        typeof entry === 'object' &&
        'name' in entry &&
        typeof entry.name === 'string',
    )
  ) {
    throw new Error('Invalid API discovery response.');
  }
  return body.resources.some((entry: { name: string }) => entry.name === resource);
};
