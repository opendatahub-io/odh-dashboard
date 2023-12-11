import * as React from 'react';
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Modal,
  Title,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PasswordHiddenText from '~/components/PasswordHiddenText';
import useDataConnections from '~/pages/projects/screens/detail/data-connections/useDataConnections';
import { DataConnection } from '~/pages/projects/types';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import {
  convertAWSSecretData,
  getDataConnectionDisplayName,
} from '~/pages/projects/screens/detail/data-connections/utils';
import { dataEntryToRecord } from '~/utilities/dataEntryToRecord';
import { AWS_KEYS } from '~/pages/projects/dataConnections/const';
import useNamespaceSecret from '~/concepts/projects/apiHooks/useNamespaceSecret';
import { EXTERNAL_DATABASE_SECRET } from '~/concepts/pipelines/content/configurePipelinesServer/const';
import { DSPipelineKind } from '~/k8sTypes';

type ViewPipelineServerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  pipelineNamespaceCR: DSPipelineKind | null;
};

const ViewPipelineServerModal: React.FC<ViewPipelineServerModalProps> = ({
  isOpen,
  onClose,
  pipelineNamespaceCR,
}) => {
  const { namespace } = usePipelinesAPI();
  const { data: dataConnections } = useContextResourceData<DataConnection>(
    useDataConnections(namespace),
  );
  const [result] = useNamespaceSecret(namespace, EXTERNAL_DATABASE_SECRET.NAME);
  const databaseSecret = dataEntryToRecord(result?.values?.data ?? []);

  const objectStorageDataConnection = dataConnections.find(
    (dc) =>
      dc.data.metadata.name ===
      pipelineNamespaceCR?.spec.objectStorage?.externalStorage?.s3CredentialsSecret?.secretName,
  );

  const objectStorageRecord: Partial<Record<AWS_KEYS, string>> = objectStorageDataConnection
    ? dataEntryToRecord(convertAWSSecretData(objectStorageDataConnection))
    : {};

  return (
    <Modal
      title="View pipeline server"
      isOpen={isOpen}
      onClose={onClose}
      actions={[
        <Button key="done-button" variant="link" onClick={onClose}>
          Done
        </Button>,
      ]}
      variant="small"
    >
      {pipelineNamespaceCR && (
        <DescriptionList termWidth="20ch" isHorizontal>
          {!!objectStorageDataConnection &&
            !!pipelineNamespaceCR?.spec.objectStorage?.externalStorage &&
            !!objectStorageRecord && (
              <>
                <Title headingLevel="h2">Object storage connection</Title>
                <DescriptionListGroup>
                  {/* TODO: is this the pipeline name or the secret name? */}
                  <DescriptionListTerm>Name</DescriptionListTerm>
                  <DescriptionListDescription>
                    {getDataConnectionDisplayName(objectStorageDataConnection)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Access key</DescriptionListTerm>
                  <DescriptionListDescription>
                    {objectStorageRecord?.AWS_ACCESS_KEY_ID}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Secret key</DescriptionListTerm>
                  <DescriptionListDescription>
                    <PasswordHiddenText
                      password={objectStorageRecord?.AWS_SECRET_ACCESS_KEY ?? ''}
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Endpoint</DescriptionListTerm>
                  <DescriptionListDescription>
                    {pipelineNamespaceCR.spec.objectStorage.externalStorage?.scheme &&
                    pipelineNamespaceCR.spec.objectStorage.externalStorage?.host
                      ? `${pipelineNamespaceCR.spec.objectStorage.externalStorage?.scheme}://${pipelineNamespaceCR.spec.objectStorage.externalStorage?.host}`
                      : ''}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Bucket</DescriptionListTerm>
                  <DescriptionListDescription>
                    {pipelineNamespaceCR.spec.objectStorage.externalStorage?.bucket}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Folder path</DescriptionListTerm>
                  <DescriptionListDescription>/pipelines</DescriptionListDescription>
                </DescriptionListGroup>
              </>
            )}
          {!!pipelineNamespaceCR?.spec?.database &&
            !!pipelineNamespaceCR.spec.database.externalDB &&
            !!databaseSecret[EXTERNAL_DATABASE_SECRET.KEY] && (
              <>
                <Title headingLevel="h2">Database</Title>
                <DescriptionListGroup>
                  <DescriptionListTerm>Host</DescriptionListTerm>
                  <DescriptionListDescription>
                    {pipelineNamespaceCR.spec.database.externalDB?.host}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Port</DescriptionListTerm>
                  <DescriptionListDescription>
                    {pipelineNamespaceCR.spec.database.externalDB?.port}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Username</DescriptionListTerm>
                  <DescriptionListDescription>
                    {pipelineNamespaceCR.spec.database.externalDB?.username}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Password</DescriptionListTerm>
                  <DescriptionListDescription>
                    <PasswordHiddenText password={databaseSecret[EXTERNAL_DATABASE_SECRET.KEY]} />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Database</DescriptionListTerm>
                  <DescriptionListDescription>
                    {pipelineNamespaceCR.spec.database.externalDB?.pipelineDBName}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </>
            )}
        </DescriptionList>
      )}
    </Modal>
  );
};

export default ViewPipelineServerModal;
