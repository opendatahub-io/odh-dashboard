import React from 'react';
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- project settings card needs project context
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- reusing existing DeleteModal pattern
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';
import NIMAccountStatusAlerts from './NIMAccountStatusAlerts';
import NIMApiKeyModal from './NIMApiKeyModal';
import useNIMAccountStatus, { NIMAccountStatus } from './useNIMAccountStatus';
import { deleteNIMResources } from './nimK8sUtils';

enum ApiKeyModalState {
  CLOSED = 'CLOSED',
  ADDING = 'ADDING',
  REPLACING = 'REPLACING',
}

const NIM_DESCRIPTION =
  'NVIDIA NIM, part of NVIDIA AI Enterprise, is a set of easy-to-use microservices designed ' +
  'for secure, reliable deployment of high-performance AI model inferencing across the cloud, ' +
  'data center and workstations. Supporting a wide range of AI models, including open-source ' +
  'community and NVIDIA AI Foundation models, it ensures seamless, scalable AI inferencing, ' +
  'on-premises or in the cloud, leveraging industry standard APIs.';

const NIMSettingsCard: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;

  const { status, nimAccount, errorMessages, refresh, startRevalidation } =
    useNIMAccountStatus(namespace);

  const [apiKeyModalState, setApiKeyModalState] = React.useState(ApiKeyModalState.CLOSED);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<Error>();

  const existingSecretName = nimAccount?.spec.apiKeySecret.name;
  const isApiKeyModalOpen = apiKeyModalState !== ApiKeyModalState.CLOSED;

  const handleRemoveConfirm = async () => {
    setIsDeleting(true);
    setDeleteError(undefined);
    try {
      await deleteNIMResources(namespace);
      const pollUntilGone = async (retries = 10): Promise<void> => {
        const result = await refresh();
        if (result && retries > 0) {
          await new Promise((resolve) => {
            setTimeout(resolve, 1000);
          });
          return pollUntilGone(retries - 1);
        }
        return undefined;
      };
      await pollUntilGone();
      setIsDeleteModalOpen(false);
    } catch (e) {
      setDeleteError(e instanceof Error ? e : new Error('Failed to remove NIM.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const renderFooterContent = () => {
    switch (status) {
      case NIMAccountStatus.NOT_FOUND:
        return (
          <Button
            variant="secondary"
            onClick={() => setApiKeyModalState(ApiKeyModalState.ADDING)}
            data-testid="nim-enable-button"
          >
            Add personal API key
          </Button>
        );
      case NIMAccountStatus.PENDING:
      case NIMAccountStatus.ERROR:
      case NIMAccountStatus.READY: {
        const actionButtons = (status === NIMAccountStatus.ERROR ||
          status === NIMAccountStatus.READY) && (
          <Flex>
            <FlexItem>
              <Button
                variant="secondary"
                onClick={() => setIsDeleteModalOpen(true)}
                data-testid="nim-remove-button"
              >
                Remove
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                variant="link"
                onClick={() => setApiKeyModalState(ApiKeyModalState.REPLACING)}
                data-testid="nim-replace-key-button"
              >
                Replace key
              </Button>
            </FlexItem>
          </Flex>
        );

        if (status === NIMAccountStatus.READY) {
          return (
            <Stack hasGutter>
              <StackItem>
                <HelperText>
                  <HelperTextItem icon={<CheckCircleIcon />} variant="success">
                    Your personal API key has been saved.
                  </HelperTextItem>
                </HelperText>
              </StackItem>
              <StackItem>{actionButtons}</StackItem>
            </Stack>
          );
        }

        return (
          <Stack hasGutter>
            {!(isApiKeyModalOpen && status === NIMAccountStatus.PENDING) && (
              <StackItem>
                <NIMAccountStatusAlerts status={status} errorMessages={errorMessages} />
              </StackItem>
            )}
            {actionButtons && <StackItem>{actionButtons}</StackItem>}
          </Stack>
        );
      }
      default:
        return null;
    }
  };

  return (
    <>
      <Card style={{ maxWidth: '675px' }} data-testid="nim-settings-card">
        <CardHeader>
          <CardTitle>NVIDIA NIM</CardTitle>
        </CardHeader>
        <CardBody>{NIM_DESCRIPTION}</CardBody>
        <CardFooter>{renderFooterContent()}</CardFooter>
      </Card>

      {isApiKeyModalOpen && (
        <NIMApiKeyModal
          onClose={() => setApiKeyModalState(ApiKeyModalState.CLOSED)}
          namespace={namespace}
          isReplacing={apiKeyModalState === ApiKeyModalState.REPLACING}
          existingSecretName={existingSecretName}
          refresh={refresh}
          startRevalidation={startRevalidation}
          accountStatus={status}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteModal
          title="Remove NVIDIA NIM"
          onClose={() => setIsDeleteModalOpen(false)}
          onDelete={handleRemoveConfirm}
          submitButtonLabel="Remove"
          deleteName="NVIDIA NIM"
          deleting={isDeleting}
          error={deleteError}
        >
          This will remove the NVIDIA NIM account and API key from this project.
        </DeleteModal>
      )}
    </>
  );
};

export default NIMSettingsCard;
