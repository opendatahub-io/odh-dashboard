import * as React from 'react';
import {
  Alert,
  Button,
  ClipboardCopy,
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import AgentConfigurationCard from '~/app/AIAssets/components/agentprofiles/AgentConfigurationCard';
import { AgentDeploymentSummary } from '~/app/agentProfile/types';
import { AIModel } from '~/app/types';
import { PLAYGROUND_AGENT_EVENTS } from '~/app/tracking/playgroundAgentTrackingConstants';
import {
  buildResponseAPICurl,
  responseAPIURL,
  sortDeploymentsByMostRecent,
} from '~/app/agentProfile/deploymentUtils';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import DeleteModal from '~/app/shared/DeleteModal';

type AgentDeploymentsModalProps = {
  agentName: string;
  deployments: AgentDeploymentSummary[];
  initialDeploymentName: string;
  aiModels?: AIModel[];
  onClose: () => void;
  onDeleted: () => void;
};

const AgentDeploymentsModal: React.FC<AgentDeploymentsModalProps> = ({
  agentName,
  deployments,
  initialDeploymentName,
  aiModels,
  onClose,
  onDeleted,
}) => {
  const { api, apiAvailable } = useGenAiAPI();
  const [activeDeploymentName, setActiveDeploymentName] = React.useState(initialDeploymentName);
  const [details, setDetails] = React.useState<Partial<Record<string, AgentDeploymentSummary>>>({});
  const [loadingDeployment, setLoadingDeployment] = React.useState<string | null>(null);
  const [detailsError, setDetailsError] = React.useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<Error | undefined>();
  const sortedDeployments = React.useMemo(
    () => sortDeploymentsByMostRecent(deployments),
    [deployments],
  );

  const activeDeployment = sortedDeployments.find(
    (deployment) => deployment.name === activeDeploymentName,
  );
  const deploymentDetails = activeDeployment ? details[activeDeployment.name] : undefined;
  const routeUrl = deploymentDetails?.routeUrl ?? activeDeployment?.routeUrl;
  const endpoint = responseAPIURL(routeUrl);
  const responseAPICurl = buildResponseAPICurl(routeUrl);

  React.useEffect(() => {
    setActiveDeploymentName(initialDeploymentName);
  }, [initialDeploymentName]);

  React.useEffect(() => {
    setDetailsError(null);

    if (activeDeployment === undefined) {
      return;
    }

    if (details[activeDeployment.name]) {
      return;
    }

    let active = true;
    setLoadingDeployment(activeDeployment.name);
    void api
      .getAgentDeployment({ id: activeDeployment.name })
      .then((result) => {
        if (active) {
          setDetails((current) => ({ ...current, [activeDeployment.name]: result }));
        }
      })
      .catch(() => {
        if (active) {
          setDetailsError('Unable to load this deployment snapshot.');
        }
      })
      .finally(() => {
        if (active) {
          setLoadingDeployment(null);
        }
      });

    return () => {
      active = false;
    };
  }, [activeDeployment?.name, api, details, activeDeployment]);

  const handleCopyCurl = React.useCallback(() => {
    void navigator.clipboard.writeText(responseAPICurl).catch(() => {
      // Clipboard access is not available in every browser context.
    });
  }, [responseAPICurl]);

  const handleDelete = React.useCallback(async () => {
    if (!activeDeployment || !apiAvailable) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(undefined);
    try {
      await api.deleteAgentDeployment({ id: activeDeployment.name });
      setIsDeleteModalOpen(false);
      onDeleted();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error : new Error('Unable to delete this agent deployment.'),
      );
    } finally {
      setIsDeleting(false);
    }
  }, [activeDeployment, api, apiAvailable, onDeleted]);

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        variant="large"
        aria-labelledby="agent-deployments-modal-title"
        data-testid="agent-deployments-modal"
      >
        <ModalHeader title={`${agentName} Deployments`} labelId="agent-deployments-modal-title" />
        <ModalBody>
          <Tabs
            activeKey={activeDeploymentName}
            onSelect={(_event, key) => setActiveDeploymentName(String(key))}
          >
            {sortedDeployments.map((deployment) => (
              <Tab
                key={deployment.name}
                eventKey={deployment.name}
                title={<TabTitleText>{deployment.displayName || deployment.name}</TabTitleText>}
                data-testid={`agent-deployment-tab-${deployment.name}`}
              >
                {activeDeploymentName === deployment.name && (
                  <Stack hasGutter className="pf-v6-u-mt-lg">
                    {loadingDeployment === deployment.name && (
                      <StackItem>
                        <Spinner size="md" aria-label="Loading deployment details" />
                      </StackItem>
                    )}
                    {detailsError && (
                      <StackItem>
                        <Alert variant="warning" isInline title={detailsError} />
                      </StackItem>
                    )}
                    {endpoint && (
                      <StackItem>
                        <Content component="h2">API endpoint</Content>
                        <ClipboardCopy
                          isReadOnly
                          hoverTip="Copy endpoint"
                          clickTip="Copied"
                          aria-label={`API endpoint for ${deployment.name}`}
                        >
                          {endpoint}
                        </ClipboardCopy>
                      </StackItem>
                    )}
                    {responseAPICurl && (
                      <StackItem>
                        <Content component="h2">Curl</Content>
                        <CodeBlock
                          actions={
                            <CodeBlockAction>
                              <ClipboardCopyButton
                                id={`agent-deployment-${deployment.name}-curl-copy`}
                                aria-label="Copy Responses API curl command"
                                onClick={handleCopyCurl}
                                variant="plain"
                              >
                                Copy
                              </ClipboardCopyButton>
                            </CodeBlockAction>
                          }
                        >
                          <CodeBlockCode>{responseAPICurl}</CodeBlockCode>
                        </CodeBlock>
                      </StackItem>
                    )}
                    {deploymentDetails?.config && (
                      <StackItem>
                        <AgentConfigurationCard
                          profile={deploymentDetails.config}
                          title="Configuration snapshot"
                          deployedAt={deployment.createdAt}
                          aiModels={aiModels}
                        />
                      </StackItem>
                    )}
                  </Stack>
                )}
              </Tab>
            ))}
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="link"
            isDanger
            onClick={() => setIsDeleteModalOpen(true)}
            data-testid="delete-agent-deployment-button"
          >
            Delete deployment
          </Button>
        </ModalFooter>
      </Modal>
      {isDeleteModalOpen && activeDeployment && (
        <DeleteModal
          title="Delete deployment?"
          testId="delete-agent-deployment-modal"
          onClose={() => {
            fireMiscTrackingEvent(PLAYGROUND_AGENT_EVENTS.DEPLOYMENT_DELETE_CONFIRMED, {
              outcome: 'cancel',
            });
            setIsDeleteModalOpen(false);
            setDeleteError(undefined);
          }}
          deleting={isDeleting}
          onDelete={() => {
            fireMiscTrackingEvent(PLAYGROUND_AGENT_EVENTS.DEPLOYMENT_DELETE_CONFIRMED, {
              outcome: 'submit',
            });
            void handleDelete();
          }}
          deleteName={activeDeployment.displayName || activeDeployment.name}
          submitButtonLabel="Delete deployment"
          error={deleteError}
        >
          This action cannot be undone. This will delete the deployed endpoint and its associated
          resources.
        </DeleteModal>
      )}
    </>
  );
};

export default AgentDeploymentsModal;
