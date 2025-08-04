import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Title,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Button,
  ActionGroup,
  Spinner,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import PasswordHiddenText from '#~/components/PasswordHiddenText';
import { dataEntryToRecord } from '#~/utilities/dataEntryToRecord';
import useNamespaceSecret from '#~/concepts/projects/apiHooks/useNamespaceSecret';
import { ExternalDatabaseSecret } from '#~/concepts/pipelines/content/configurePipelinesServer/const';
import { DSPipelineAPIServerStore, DSPipelineKind } from '#~/k8sTypes';
import { updatePipelineCaching } from '#~/api/pipelines/k8s';
import useNotification from '#~/utilities/useNotification';
import PipelineKubernetesStoreCheckbox from './PipelineKubernetesStoreCheckbox';
import { MANAGE_PIPELINE_SERVER_TITLE } from './const';
import { PipelineCachingSection } from './configurePipelinesServer/PipelineCachingSection';

type ManagePipelineServerModalProps = {
  onClose: () => void;
  pipelineNamespaceCR: DSPipelineKind | null;
};

const ManagePipelineServerModal: React.FC<ManagePipelineServerModalProps> = ({
  onClose,
  pipelineNamespaceCR,
}) => {
  const { namespace } = usePipelinesAPI();
  const notification = useNotification();
  const [pipelineResult] = useNamespaceSecret(
    namespace,
    pipelineNamespaceCR?.spec.objectStorage.externalStorage?.s3CredentialsSecret.secretName ?? '',
  );
  const pipelineSecret = dataEntryToRecord(pipelineResult?.values?.data ?? []);
  const [result] = useNamespaceSecret(namespace, ExternalDatabaseSecret.NAME);
  const databaseSecret = dataEntryToRecord(result?.values?.data ?? []);

  const initCachingEnabled = pipelineNamespaceCR?.spec.apiServer?.cacheEnabled || false;

  // State for caching configuration
  const [enableCaching, setEnableCaching] = React.useState<boolean>(initCachingEnabled);

  // Track if changes have been made
  const hasChanges = enableCaching !== initCachingEnabled;

  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
    const value = pipelineNamespaceCR?.spec.apiServer?.cacheEnabled ?? false;

    setEnableCaching(value);
  }, [pipelineNamespaceCR]);

  const updateCaching = () => {
    setIsUpdating(true);

    updatePipelineCaching(namespace, enableCaching)
      .then(() => {
        notification.success(
          'Pipeline caching updated',
          `Caching has been ${enableCaching ? 'enabled' : 'disabled'} successfully.`,
        );

        setIsUpdating(false);
        onClose();
      })
      .catch((error: unknown) => {
        console.error('Failed to update caching:', error);

        let errorMessage = 'An unexpected error occurred while updating caching settings.';
        if (
          error &&
          typeof error === 'object' &&
          'message' in error &&
          typeof (error as any).message === 'string'
        ) {
          errorMessage = (error as any).message;
        }

        notification.error('Failed to update pipeline caching', errorMessage);

        setIsUpdating(false);
      });
  };

  return (
    <Modal isOpen onClose={onClose} variant="small">
      <ModalHeader title={MANAGE_PIPELINE_SERVER_TITLE} />
      <ModalBody>
        {!pipelineNamespaceCR && (
          <>
            Loading ... <Spinner size="lg" />
          </>
        )}
        {pipelineNamespaceCR && (
          <DescriptionList termWidth="20ch" isHorizontal>
            {!!pipelineNamespaceCR.spec.objectStorage.externalStorage?.s3CredentialsSecret
              .secretName && (
              <>
                <Title headingLevel="h2">Object storage connection</Title>
                <DescriptionListGroup>
                  <DescriptionListTerm>Access key</DescriptionListTerm>
                  <DescriptionListDescription data-testid="access-key-field">
                    {pipelineSecret[
                      pipelineNamespaceCR.spec.objectStorage.externalStorage.s3CredentialsSecret
                        .accessKey
                    ] || ''}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Secret key</DescriptionListTerm>
                  <DescriptionListDescription data-testid="secret-key-field">
                    <PasswordHiddenText
                      password={
                        pipelineSecret[
                          pipelineNamespaceCR.spec.objectStorage.externalStorage.s3CredentialsSecret
                            .secretKey
                        ] ?? ''
                      }
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Endpoint</DescriptionListTerm>
                  <DescriptionListDescription data-testid="endpoint-field">
                    {pipelineNamespaceCR.spec.objectStorage.externalStorage.scheme &&
                    pipelineNamespaceCR.spec.objectStorage.externalStorage.host
                      ? `${pipelineNamespaceCR.spec.objectStorage.externalStorage.scheme}://${pipelineNamespaceCR.spec.objectStorage.externalStorage.host}`
                      : ''}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Bucket</DescriptionListTerm>
                  <DescriptionListDescription data-testid="bucket-field">
                    {pipelineNamespaceCR.spec.objectStorage.externalStorage.bucket}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </>
            )}
            {!!pipelineNamespaceCR.spec.database &&
              !!pipelineNamespaceCR.spec.database.externalDB &&
              !!databaseSecret[ExternalDatabaseSecret.KEY] && (
                <>
                  <Title headingLevel="h2">Database</Title>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Host</DescriptionListTerm>
                    <DescriptionListDescription>
                      {pipelineNamespaceCR.spec.database.externalDB.host}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Port</DescriptionListTerm>
                    <DescriptionListDescription>
                      {pipelineNamespaceCR.spec.database.externalDB.port}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Username</DescriptionListTerm>
                    <DescriptionListDescription>
                      {pipelineNamespaceCR.spec.database.externalDB.username}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Password</DescriptionListTerm>
                    <DescriptionListDescription>
                      <PasswordHiddenText password={databaseSecret[ExternalDatabaseSecret.KEY]} />
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Database</DescriptionListTerm>
                    <DescriptionListDescription>
                      {pipelineNamespaceCR.spec.database.externalDB.pipelineDBName}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </>
              )}
            <>
              <Title headingLevel="h2" data-testid="additionalConfig-headerText">
                Additional configurations
              </Title>
              <DescriptionList isHorizontal>
                <DescriptionListGroup>
                  <DescriptionListTerm>Pipeline definition storage</DescriptionListTerm>
                  <DescriptionListDescription>
                    <PipelineKubernetesStoreCheckbox
                      isDisabled
                      isChecked={
                        pipelineNamespaceCR.spec.apiServer?.pipelineStore ===
                        DSPipelineAPIServerStore.KUBERNETES
                      }
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <PipelineCachingSection
                  enableCaching={enableCaching}
                  setEnableCaching={setEnableCaching}
                  variant="description"
                />
              </DescriptionList>
            </>
          </DescriptionList>
        )}
      </ModalBody>
      <ModalFooter>
        <ActionGroup>
          <Button
            variant="primary"
            onClick={updateCaching}
            isLoading={isUpdating}
            isDisabled={!hasChanges || isUpdating}
            data-testid="managePipelineServer-modal-saveBtn"
          >
            Save
          </Button>
          <Button
            variant="link"
            onClick={onClose}
            data-testid="managePipelineServer-modal-cancelBtn"
          >
            Cancel
          </Button>
        </ActionGroup>
      </ModalFooter>
    </Modal>
  );
};

export default ManagePipelineServerModal;
