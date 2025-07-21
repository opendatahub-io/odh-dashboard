import * as React from 'react';
import { LabelGroup, Spinner } from '@patternfly/react-core';
import {
  useRelatedNotebooks,
  ConnectedNotebookContext,
} from '#~/pages/projects/notebook/useRelatedNotebooks';
import { Connection } from '#~/concepts/connectionTypes/types';
import { ProjectObjectType } from '#~/concepts/design/utils';
import ResourceLabel from '#~/pages/projects/screens/detail/connections/ResourceLabel';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { useInferenceServicesForConnection } from '#~/pages/projects/useInferenceServicesForConnection';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { isModelStorage } from '#~/pages/projects/screens/detail/storage/utils';
import { EitherNotBoth } from '#~/typeHelpers';

export type ConnectedResourcesProps = EitherNotBoth<
  { connection: Connection },
  { pvc: PersistentVolumeClaimKind }
>;

const ConnectedResources: React.FC<ConnectedResourcesProps> = ({ connection, pvc }) => {
  const { notebooks: connectedNotebooks, loaded: notebooksLoaded } = useRelatedNotebooks(
    connection
      ? ConnectedNotebookContext.EXISTING_DATA_CONNECTION
      : ConnectedNotebookContext.EXISTING_PVC,
    connection ? connection.metadata.name : pvc.metadata.name,
  );
  const modelName = React.useMemo(
    () => pvc?.metadata.annotations?.['dashboard.opendatahub.io/model-name'],
    [pvc],
  );
  const modelStorage = React.useMemo(() => (pvc ? isModelStorage(pvc) : false), [pvc]);
  const connectedModels = useInferenceServicesForConnection(connection);

  if (!notebooksLoaded) {
    return <Spinner size="sm" />;
  }

  if (!connectedNotebooks.length && !connectedModels.length && !modelStorage) {
    return '-';
  }

  const renderNotebookLabels = () =>
    connectedNotebooks.map((notebook) => (
      <ResourceLabel
        key={notebook.metadata.name}
        resourceType={ProjectObjectType.build}
        title={getDisplayNameFromK8sResource(notebook)}
      />
    ));

  const renderModelLabels = () =>
    connectedModels.map((model) => (
      <ResourceLabel
        key={model.metadata.name}
        resourceType={ProjectObjectType.deployedModelsList}
        title={getDisplayNameFromK8sResource(model)}
      />
    ));

  const renderPVCModelLabel = () =>
    modelStorage ? (
      <ResourceLabel
        key={modelName ?? 'Unknown model'}
        resourceType={ProjectObjectType.deployedModelsList}
        title={modelName ?? 'Unknown model'}
      />
    ) : null;

  return (
    <LabelGroup>
      {renderNotebookLabels()}
      {renderModelLabels()}
      {renderPVCModelLabel()}
    </LabelGroup>
  );
};

export default ConnectedResources;
