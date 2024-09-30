import * as React from 'react';
import { LabelGroup, Spinner } from '@patternfly/react-core';
import {
  useRelatedNotebooks,
  ConnectedNotebookContext,
} from '~/pages/projects/notebook/useRelatedNotebooks';
import { Connection } from '~/concepts/connectionTypes/types';
import { ProjectObjectType } from '~/concepts/design/utils';
import ResourceLabel from '~/pages/projects/screens/detail/connections/ResourceLabel';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { useInferenceServicesForConnection } from '~/pages/projects/useInferenceServicesForConnection';

type Props = {
  connection: Connection;
};

const ConnectedResources: React.FC<Props> = ({ connection }) => {
  const { notebooks: connectedNotebooks, loaded: notebooksLoaded } = useRelatedNotebooks(
    ConnectedNotebookContext.EXISTING_DATA_CONNECTION,
    connection.metadata.name,
  );
  const connectedModels = useInferenceServicesForConnection(connection);

  if (!notebooksLoaded) {
    return <Spinner size="sm" />;
  }

  if (!connectedNotebooks.length) {
    return '-';
  }

  return (
    <LabelGroup>
      {connectedNotebooks.map((notebook) => (
        <ResourceLabel
          key={notebook.metadata.name}
          resourceType={ProjectObjectType.notebook}
          title={getDisplayNameFromK8sResource(notebook)}
        />
      ))}
      {connectedModels.map((model) => (
        <ResourceLabel
          key={model.metadata.name}
          resourceType={ProjectObjectType.deployedModels}
          title={getDisplayNameFromK8sResource(model)}
        />
      ))}
    </LabelGroup>
  );
};

export default ConnectedResources;
