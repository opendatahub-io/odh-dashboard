import * as React from 'react';
import type { K8sModelCommon, WatchK8sResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { K8sResourceCommon, K8sWatchResult } from '@odh-dashboard/k8s-core';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';

export type DeploymentWatchSnapshot = K8sWatchResult<K8sResourceCommon[]>;

type WatchProps = {
  id: string;
  resource: WatchK8sResource;
  model: K8sModelCommon;
  publish: (id: string, result: DeploymentWatchSnapshot) => void;
  remove: (id: string) => void;
};

const DeploymentEventsWatch: React.FC<WatchProps> = ({ id, resource, model, publish, remove }) => {
  const [data, loaded, error] = useK8sWatchResourceList<K8sResourceCommon[]>(resource, model);
  React.useEffect(() => () => remove(id), [id, remove]);
  React.useEffect(() => publish(id, [data, loaded, error]), [id, data, loaded, error, publish]);
  return null;
};

export default DeploymentEventsWatch;
