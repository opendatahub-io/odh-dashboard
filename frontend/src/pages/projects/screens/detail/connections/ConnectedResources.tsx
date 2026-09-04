import * as React from 'react';
import { LabelGroup, Spinner } from '@patternfly/react-core';
import type { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';
import type { EitherNotBoth } from '@odh-dashboard/foundation';
import type { ConnectedResourceLabel } from '@odh-dashboard/plugin-core/extension-points';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import {
  useRelatedNotebooks,
  ConnectedNotebookContext,
} from '#~/pages/projects/notebook/useRelatedNotebooks';
import { Connection } from '#~/concepts/connectionTypes/types';
import { ProjectObjectType } from '#~/concepts/design/utils';
import ResourceLabel from '#~/pages/projects/screens/detail/connections/ResourceLabel';
import { useInferenceServicesForConnection } from '#~/pages/projects/useInferenceServicesForConnection';

// Host owns how each contributed resource kind renders (icon + color); extensions only pick a kind.
const CONNECTED_RESOURCE_LABEL_STYLES: Record<
  ConnectedResourceLabel['kind'],
  Pick<React.ComponentProps<typeof ResourceLabel>, 'resourceType' | 'outlineColor'>
> = {
  'connected-models': { resourceType: ProjectObjectType.connectedModels, outlineColor: 'purple' },
};

export type ConnectedResourcesProps = EitherNotBoth<
  { connection: Connection },
  { pvc: PersistentVolumeClaimKind }
> & {
  additionalResources?: ConnectedResourceLabel[];
  additionalResourcesLoaded?: boolean;
};

const ConnectedResources: React.FC<ConnectedResourcesProps> = ({
  connection,
  pvc,
  additionalResources = [],
  additionalResourcesLoaded = true,
}) => {
  const { notebooks: connectedNotebooks, loaded: notebooksLoaded } = useRelatedNotebooks(
    connection
      ? ConnectedNotebookContext.EXISTING_DATA_CONNECTION
      : ConnectedNotebookContext.EXISTING_PVC,
    connection ? connection.metadata.name : pvc.metadata.name,
  );
  const connectedModels = useInferenceServicesForConnection(connection ?? pvc);

  if (!notebooksLoaded || !additionalResourcesLoaded) {
    return <Spinner size="sm" />;
  }

  if (!connectedNotebooks.length && !connectedModels.length && !additionalResources.length) {
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
        resourceType={ProjectObjectType.connectedModels}
        title={getDisplayNameFromK8sResource(model)}
        outlineColor="purple"
      />
    ));

  const renderAdditionalResourceLabels = () =>
    additionalResources.map(({ key, title, kind }) => (
      <ResourceLabel key={key} title={title} {...CONNECTED_RESOURCE_LABEL_STYLES[kind]} />
    ));

  return (
    <LabelGroup>
      {renderNotebookLabels()}
      {renderModelLabels()}
      {renderAdditionalResourceLabels()}
    </LabelGroup>
  );
};

export default ConnectedResources;
