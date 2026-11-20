import * as React from 'react';
import {
  Badge,
  Content,
  ExpandableSection,
  ExpandableSectionToggle,
  Bullseye,
  Spinner,
} from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { ConnectedResourceLabel } from '@odh-dashboard/plugin-core/extension-points';
import { NotebookKind } from '#~/k8sTypes';
import { useNotebooksStates } from '#~/pages/projects/notebook/useNotebooksStates';

type ConnectedResourcesDeleteModalProps = {
  loaded: boolean;
  connectedNotebooks: NotebookKind[];
  connectedResources: ConnectedResourceLabel[];
  namespace: string;
};

const ConnectedResourcesDeleteModal: React.FC<ConnectedResourcesDeleteModalProps> = ({
  loaded,
  connectedNotebooks,
  connectedResources,
  namespace,
}) => {
  const [modelsExpanded, setModelsExpanded] = React.useState<boolean>(false);
  const [notebooksExpanded, setNotebooksExpanded] = React.useState<boolean>(false);
  const [notebookStates] = useNotebooksStates(connectedNotebooks, namespace);

  const getNotebookStatusText = React.useCallback(
    (notebook: NotebookKind) =>
      notebookStates.find((n) => n.notebook.metadata.name === notebook.metadata.name)?.isRunning
        ? ' (Running)'
        : '',
    [notebookStates],
  );
  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }
  return connectedNotebooks.length !== 0 || connectedResources.length !== 0 ? (
    <>
      <div className="pf-v6-u-mt-md">
        {!connectedNotebooks.length && !connectedResources.length ? null : (
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
                      <Content component="ul" className="pf-v6-u-ml-lg">
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
            {connectedResources.length ? (
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
                    {connectedResources.length}
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
                      <Content component="ul" className="pf-v6-u-ml-lg">
                        {connectedResources.map((resource) => (
                          <Content
                            component="li"
                            key={resource.key}
                            data-testid="connections-delete-models-item"
                          >
                            {resource.title}
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
    </>
  ) : null;
};

export default ConnectedResourcesDeleteModal;
