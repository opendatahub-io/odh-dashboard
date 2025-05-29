import React from 'react';
import {
  Badge,
  Bullseye,
  ExpandableSection,
  ExpandableSectionToggle,
  Spinner,
  Content,
} from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { Connection } from '#~/concepts/connectionTypes/types';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import {
  useRelatedNotebooks,
  ConnectedNotebookContext,
} from '#~/pages/projects/notebook/useRelatedNotebooks';
import { useNotebooksStates } from '#~/pages/projects/notebook/useNotebooksStates';
import { NotebookKind } from '#~/k8sTypes';
import { useInferenceServicesForConnection } from '#~/pages/projects/useInferenceServicesForConnection';
import { deleteSecret, removeNotebookSecret } from '#~/api';

type Props = {
  namespace: string;
  deleteConnection: Connection;
  onClose: (deleted?: boolean) => void;
};

export const ConnectionsDeleteModal: React.FC<Props> = ({
  namespace,
  deleteConnection,
  onClose,
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
      onClose={onClose}
      submitButtonLabel="Delete"
      onDelete={() => {
        setIsDeleting(true);
        setError(undefined);
        Promise.all(
          connectedNotebooks.map((notebook) =>
            removeNotebookSecret(
              notebook.metadata.name,
              notebook.metadata.namespace,
              deleteConnection.metadata.name,
            ),
          ),
        )
          .then(() =>
            deleteSecret(deleteConnection.metadata.namespace, deleteConnection.metadata.name),
          )
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
        <div className="pf-v6-u-mt-md">
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
                      <Content>
                        <Content component="ul">
                          {connectedNotebooks.map((notebook) => (
                            <Content
                              component="li"
                              key={notebook.metadata.name}
                              data-testid="connections-delete-notebooks-item"
                            >
                              {getDisplayNameFromK8sResource(notebook)}
                              {getNotebookStatusText(notebook)}
                            </Content>
                          ))}
                        </Content>
                      </Content>
                    </ExpandableSection>
                  ) : null}
                </>
              ) : null}
              {connectedModels.length ? (
                <>
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
                      <Content>
                        <Content component="ul">
                          {connectedModels.map((model) => (
                            <Content
                              component="li"
                              key={model.metadata.name}
                              data-testid="connections-delete-models-item"
                            >
                              {getDisplayNameFromK8sResource(model)}
                            </Content>
                          ))}
                        </Content>
                      </Content>
                    </ExpandableSection>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </div>
      )}
    </DeleteModal>
  );
};
