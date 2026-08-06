import type { Connection } from '@odh-dashboard/k8s-core';
import { getSecretsByLabel } from '#~/api/k8s/secrets';
import { isConnection } from '#~/concepts/connectionTypes/utils';

const fetchConnections = async (
  namespace: string,
  labelSelector?: string,
): Promise<Connection[]> => {
  const secrets = await getSecretsByLabel(labelSelector ?? '', namespace);
  if (!Array.isArray(secrets)) {
    return [];
  }
  return secrets.filter(isConnection);
};

export default fetchConnections;
