import { DeploymentMode } from 'mod-arch-core';
import { DEPLOYMENT_MODE } from '~/app/utilities/const';

const routeBase =
  DEPLOYMENT_MODE === DeploymentMode.Federated ? '/ai-hub/connections' : '/main-view';

export const connectionDetailsRoute = (connectionId: string, namespace: string): string =>
  `${routeBase}/connections/${encodeURIComponent(connectionId)}?project=${encodeURIComponent(namespace)}`;

export const projectHomeRoute = (namespace: string): string | undefined =>
  DEPLOYMENT_MODE === DeploymentMode.Federated ? `/projects/${namespace}` : undefined;
