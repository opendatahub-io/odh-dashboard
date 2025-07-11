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
  Checkbox,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import PasswordHiddenText from '#~/components/PasswordHiddenText';
import { dataEntryToRecord } from '#~/utilities/dataEntryToRecord';
import useNamespaceSecret from '#~/concepts/projects/apiHooks/useNamespaceSecret';
import { ExternalDatabaseSecret } from '#~/concepts/pipelines/content/configurePipelinesServer/const';
import { DSPipelineAPIServerStore, DSPipelineKind } from '#~/k8sTypes';

type ViewPipelineServerModalProps = {
  onClose: () => void;
  pipelineNamespaceCR: DSPipelineKind | null;
};

const ViewPipelineServerModal: React.FC<ViewPipelineServerModalProps> = ({
  onClose,
  pipelineNamespaceCR,
}) => {
  const { namespace } = usePipelinesAPI();
  const [pipelineResult] = useNamespaceSecret(
    namespace,
    pipelineNamespaceCR?.spec.objectStorage.externalStorage?.s3CredentialsSecret.secretName ?? '',
  );
  const pipelineSecret = dataEntryToRecord(pipelineResult?.values?.data ?? []);
  const [result] = useNamespaceSecret(namespace, ExternalDatabaseSecret.NAME);
  const databaseSecret = dataEntryToRecord(result?.values?.data ?? []);

  return (
    <Modal isOpen onClose={onClose} variant="small">
      <ModalHeader title="View pipeline server" />
      <ModalBody>
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
            {!!pipelineNamespaceCR.spec.apiServer?.pipelineStore && (
              <>
                <Title headingLevel="h2">Additional Configurations</Title>
                <DescriptionListGroup>
                  <DescriptionListTerm>Pipeline Store</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Checkbox
                      id="pipeline-configure-server-kubernetes-store-checkbox"
                      isDisabled
                      label="Store pipeline yaml files in Kubernetes"
                      isChecked={
                        pipelineNamespaceCR.spec.apiServer.pipelineStore ===
                        DSPipelineAPIServerStore.KUBERNETES
                      }
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </>
            )}
          </DescriptionList>
        )}
      </ModalBody>
    </Modal>
  );
};

export default ViewPipelineServerModal;
