import React from 'react';
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  Stack,
  StackItem,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- project settings card needs project context
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- reusing existing DeleteModal pattern
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';
import NIMAccountStatusAlerts from './NIMAccountStatusAlerts';
import NIMApiKeyModal from './NIMApiKeyModal';
import useNIMAccountStatus, { NIMAccountStatus } from './useNIMAccountStatus';
import { deleteNIMResources } from './nimK8sUtils';

const NIM_DESCRIPTION =
  'NVIDIA NIM, part of NVIDIA AI Enterprise, is a set of easy-to-use microservices designed ' +
  'for secure, reliable deployment of high-performance AI model inferencing across the cloud, ' +
  'data center and workstations. Supporting a wide range of AI models, including open-source ' +
  'community and NVIDIA AI Foundation models, it ensures seamless, scalable AI inferencing, ' +
  'on-premises or in the cloud, leveraging industry standard APIs.';

const NIMSettingsCard: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;

  const { status, nimAccount, errorMessages, refresh } = useNIMAccountStatus(namespace);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isReplacing, setIsReplacing] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<Error>();

  const existingSecretName = nimAccount?.spec.apiKeySecret.name;

  const handleEnableClick = () => {
    setIsReplacing(false);
    setIsModalOpen(true);
  };

  const handleReplaceKeyClick = () => {
    setIsReplacing(true);
    setIsModalOpen(true);
  };

  const handleDisableConfirm = async () => {
    setIsDeleting(true);
    setDeleteError(undefined);
    try {
      await deleteNIMResources(namespace);
      setIsDeleteModalOpen(false);
      refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e : new Error('Failed to disable NIM.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const renderFooterContent = () => {
    switch (status) {
      case NIMAccountStatus.NOT_FOUND:
        return (
          <Button variant="secondary" onClick={handleEnableClick} data-testid="nim-enable-button">
            Enable with personal API key
          </Button>
        );
      case NIMAccountStatus.PENDING:
      case NIMAccountStatus.ERROR:
      case NIMAccountStatus.READY:
        return (
          <Stack hasGutter>
            <StackItem>
              <NIMAccountStatusAlerts status={status} errorMessages={errorMessages} />
            </StackItem>
            {(status === NIMAccountStatus.ERROR || status === NIMAccountStatus.READY) && (
              <StackItem>
                <Flex>
                  <FlexItem>
                    <Button
                      variant="secondary"
                      onClick={() => setIsDeleteModalOpen(true)}
                      data-testid="nim-disable-button"
                    >
                      Disable
                    </Button>
                  </FlexItem>
                  <FlexItem>
                    <Button
                      variant="link"
                      onClick={handleReplaceKeyClick}
                      data-testid="nim-replace-key-button"
                    >
                      Replace key
                    </Button>
                  </FlexItem>
                </Flex>
              </StackItem>
            )}
          </Stack>
        );
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

      {isModalOpen && (
        <NIMApiKeyModal
          onClose={() => setIsModalOpen(false)}
          namespace={namespace}
          isReplacing={isReplacing}
          existingSecretName={existingSecretName}
          onActionComplete={refresh}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteModal
          title="Disable NVIDIA NIM"
          onClose={() => setIsDeleteModalOpen(false)}
          onDelete={handleDisableConfirm}
          submitButtonLabel="Disable"
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
