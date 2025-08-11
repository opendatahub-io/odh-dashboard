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
  const connectedModels = useInferenceServicesForConnection(connection);

  if (!notebooksLoaded) {
    return <Spinner size="sm" />;
  }

  if (!connectedNotebooks.length && !connectedModels.length) {
    return '--';
  }

  const renderNotebookLabels = () =>
    connectedNotebooks.map((notebook) => (
      <ResourceLabel
        key={notebook.metadata.name}
        resourceType={ProjectObjectType.build}
        title={getDisplayNameFromK8sResource(notebook)}
        outlineColor="teal"
      />
    ));

  const renderModelLabels = () =>
    connectedModels.map((model) => (
      <ResourceLabel
        key={model.metadata.name}
        resourceType={ProjectObjectType.deployedModelsList}
        title={getDisplayNameFromK8sResource(model)}
        outlineColor="purple"
      />
    ));

  return (
    <LabelGroup>
      {renderNotebookLabels()}
      {renderModelLabels()}
    </LabelGroup>
  );
};

export default ConnectedResources;
