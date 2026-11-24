import * as React from 'react';
import type { K8sModelCommon, WatchK8sResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';

export type DeploymentWatchSnapshot = {
  data: K8sResourceCommon[];
  loaded: boolean;
  error: Error | undefined;
};

type WatchProps = {
  id: string;
  resource: WatchK8sResource;
  model: K8sModelCommon;
  publish: (id: string, result: DeploymentWatchSnapshot) => void;
  remove: (id: string) => void;
};

// Render one keyed child per source so React can add or remove individual watches.
const DeploymentEventsWatch: React.FC<WatchProps> = ({ id, resource, model, publish, remove }) => {
  const [data, loaded, error] = useK8sWatchResourceList<K8sResourceCommon[]>(resource, model);
  // Remove the snapshot on teardown, not every time the watch publishes new data.
  React.useEffect(() => () => remove(id), [id, remove]);
  React.useEffect(() => publish(id, { data, loaded, error }), [id, data, loaded, error, publish]);
  return null;
};

export default DeploymentEventsWatch;
