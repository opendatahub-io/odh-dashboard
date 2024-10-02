import React from 'react';
import { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import {
  Badge,
  Bullseye,
  ExpandableSection,
  ExpandableSectionToggle,
  Spinner,
  TextContent,
  TextList,
  TextListItem,
} from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { Connection } from '~/concepts/connectionTypes/types';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import {
  useRelatedNotebooks,
  ConnectedNotebookContext,
} from '~/pages/projects/notebook/useRelatedNotebooks';
import { useNotebooksStates } from '~/pages/projects/notebook/useNotebooksStates';
import { NotebookKind } from '~/k8sTypes';
import { useInferenceServicesForConnection } from '~/pages/projects/useInferenceServicesForConnection';

type Props = {
  namespace: string;
  deleteConnection: Connection;
  onClose: (deleted?: boolean) => void;
  onDelete: () => Promise<K8sStatus>;
};

export const ConnectionsDeleteModal: React.FC<Props> = ({
  namespace,
  deleteConnection,
  onClose,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const { notebooks: connectedNotebooks, loaded } = useRelatedNotebooks(
    ConnectedNotebookContext.EXISTING_DATA_CONNECTION,
    deleteConnection.metadata.name,
  );
  const [notebookStates] = useNotebooksStates(connectedNotebooks, namespace);
  const [notebooksExpanded, setNotebooksExpanded] = React.useState<boolean>(false);
  const connectedModels = useInferenceServicesForConnection(deleteConnection);
  const [modelsExpanded, setModelsExpanded] = React.useState<boolean>(false);

  const getNotebookStatusText = React.useCallback(
    (notebook: NotebookKind) =>
      notebookStates.find((n) => n.notebook.metadata.name === notebook.metadata.name)?.isRunning
        ? ' (Running)'
        : '',
    [notebookStates],
  );

  return (
    <DeleteModal
      title="Delete connection?"
      isOpen
      onClose={onClose}
      submitButtonLabel="Delete"
      onDelete={() => {
        setIsDeleting(true);
        setError(undefined);

        onDelete()
          .then(() => {
            onClose(true);
          })
          .catch((e) => {
            setError(e);
            setIsDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={getDisplayNameFromK8sResource(deleteConnection)}
    >
      The <b>{getDisplayNameFromK8sResource(deleteConnection)}</b> connection will be deleted, and
      its dependent resources will stop working.
      {loaded && !connectedNotebooks.length && !connectedModels.length ? null : (
        <div className="pf-v5-u-mt-md">
          {!loaded ? (
            <Bullseye>
              <Spinner size="md" />
            </Bullseye>
          ) : (
            <>
              {connectedNotebooks.length ? (
                <>
                  <ExpandableSectionToggle
                    isExpanded={notebooksExpanded}
                    onToggle={setNotebooksExpanded}
                    id="expand-connected-notebooks-toggle"
                    contentId="expanded-connected-notebooks"
                    data-testid="connections-delete-notebooks-toggle"
                  >
                    <span>Workbenches </span>
                    <Badge isRead data-testid="connections-delete-notebooks-count">
                      {connectedNotebooks.length}
                    </Badge>
                  </ExpandableSectionToggle>
                  {notebooksExpanded ? (
                    <ExpandableSection
                      isExpanded
                      isDetached
                      contentId="expanded-connected-notebooks"
                      toggleId="expand-connected-notebooks-toggle"
                    >
                      <TextContent>
                        <TextList>
                          {connectedNotebooks.map((notebook) => (
                            <TextListItem
                              key={notebook.metadata.name}
                              data-testid="connections-delete-notebooks-item"
                            >
                              {getDisplayNameFromK8sResource(notebook)}
                              {getNotebookStatusText(notebook)}
                            </TextListItem>
                          ))}
                        </TextList>
                      </TextContent>
                    </ExpandableSection>
                  ) : null}
                </>
              ) : null}
              <ExpandableSectionToggle
                isExpanded={modelsExpanded}
                onToggle={setModelsExpanded}
                id="expand-connected-models-toggle"
                contentId="expanded-connected-models"
                data-testid="connections-delete-models-toggle"
              >
                <span>Model deployments </span>
                <Badge isRead data-testid="connections-delete-models-count">
                  {connectedModels.length}
                </Badge>
              </ExpandableSectionToggle>
              {modelsExpanded ? (
                <ExpandableSection
                  isExpanded
                  isDetached
                  toggleId="expand-connected-models-toggle"
                  contentId="expanded-connected-models"
                >
                  <TextContent>
                    <TextList>
                      {connectedModels.map((model) => (
                        <TextListItem
                          key={model.metadata.name}
                          data-testid="connections-delete-models-item"
                        >
                          {getDisplayNameFromK8sResource(model)}
                        </TextListItem>
                      ))}
                    </TextList>
                  </TextContent>
                </ExpandableSection>
              ) : null}
            </>
          )}
        </div>
      )}
    </DeleteModal>
  );
};
