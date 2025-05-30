import React from 'react';
import { Alert, Form, Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import ConnectionTypeForm from '#~/concepts/connectionTypes/ConnectionTypeForm';
import {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTypeFieldType,
  ConnectionTypeValueType,
} from '#~/concepts/connectionTypes/types';
import { ProjectKind, SecretKind } from '#~/k8sTypes';
import { K8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/types';
import { isK8sNameDescriptionDataValid } from '#~/concepts/k8s/K8sNameDescriptionField/utils';
import { useK8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import {
  assembleConnectionSecret,
  filterEnabledConnectionTypes,
  getConnectionTypeRef,
  getDefaultValues,
  isConnectionTypeDataField,
  parseConnectionSecretValues,
} from '#~/concepts/connectionTypes/utils';
import usePersistentData from './usePersistentData';

type Props = {
  connection?: Connection;
  connectionTypes: ConnectionTypeConfigMapObj[];
  project: ProjectKind;
  onClose: (submitted?: boolean) => void;
  onSubmit: (connection: Connection) => Promise<SecretKind>;
  isEdit?: boolean;
};

export const ManageConnectionModal: React.FC<Props> = ({
  connection,
  connectionTypes,
  project,
  onClose,
  onSubmit,
  isEdit = false,
}) => {
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isModified, setIsModified] = React.useState(false);

  const enabledConnectionTypes = React.useMemo(
    () => filterEnabledConnectionTypes(connectionTypes),
    [connectionTypes],
  );

  const connectionTypeSource = getConnectionTypeRef(connection);

  const [selectedConnectionType, setSelectedConnectionType] = React.useState<
    ConnectionTypeConfigMapObj | undefined
  >(() => {
    if (isEdit) {
      return connectionTypes.find((t) => t.metadata.name === connectionTypeSource);
    }
    if (enabledConnectionTypes.length === 1) {
      return enabledConnectionTypes[0];
    }
    return undefined;
  });

  const connectionTypeName = selectedConnectionType?.metadata.name || connectionTypeSource;

  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData({
    initialData: connection,
  });
  const [connectionValues, setConnectionValues] = React.useState<{
    [key: string]: ConnectionTypeValueType;
  }>(() => {
    if (isEdit) {
      if (connection) {
        return parseConnectionSecretValues(connection, selectedConnectionType);
      }
    } else if (selectedConnectionType) {
      return getDefaultValues(selectedConnectionType);
    }
    return {};
  });

  const [connectionErrors, setConnectionErrors] = React.useState<{
    [key: string]: boolean | string;
  }>({});
  const isFormValid = React.useMemo(
    () =>
      !!connectionTypeName &&
      isK8sNameDescriptionDataValid(nameDescData) &&
      !selectedConnectionType?.data?.fields?.find(
        (field) =>
          isConnectionTypeDataField(field) &&
          field.required &&
          !connectionValues[field.envVar] &&
          field.type !== ConnectionTypeFieldType.Boolean,
      ) &&
      !Object.values(connectionErrors).find((e) => !!e),
    [connectionTypeName, selectedConnectionType, nameDescData, connectionValues, connectionErrors],
  );

  const { changeSelectionType } = usePersistentData({
    setConnectionValues,
    setConnectionErrors,
    setSelectedConnectionType,
    connectionValues,
    selectedConnectionType,
  });

  return (
    <Modal
      isOpen
      onClose={() => {
        onClose();
      }}
      variant="medium"
    >
      <ModalHeader title={isEdit ? 'Edit connection' : 'Create connection'} />
      <ModalBody>
        {isEdit && (
          <Alert
            className="pf-v6-u-mb-lg"
            variant="warning"
            isInline
            title="Dependent resources require further action"
          >
            Connection changes are not applied to dependent resources until those resources are
            restarted, redeployed, or otherwise regenerated.
          </Alert>
        )}
        <Form>
          <ConnectionTypeForm
            options={!isEdit ? enabledConnectionTypes : undefined}
            connectionType={selectedConnectionType || (isEdit ? connectionTypeSource : undefined)}
            setConnectionType={(name: string) => {
              const obj = connectionTypes.find((c) => c.metadata.name === name);
              if (!isModified) {
                setIsModified(true);
              }
              changeSelectionType(obj);
            }}
            connectionNameDesc={nameDescData}
            setConnectionNameDesc={(key: keyof K8sNameDescriptionFieldData, value: string) => {
              if (!isModified) {
                setIsModified(true);
              }
              setNameDescData(key, value);
            }}
            connectionValues={connectionValues}
            onChange={(field, value) => {
              if (!isModified) {
                setIsModified(true);
              }
              setConnectionValues((prev) => ({ ...prev, [field.envVar]: value }));
            }}
            onValidate={(field, error) =>
              setConnectionErrors((prev) => ({ ...prev, [field.envVar]: !!error }))
            }
          />
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel={isEdit ? 'Save' : 'Create'}
          onCancel={onClose}
          onSubmit={() => {
            setIsSaving(true);
            setSubmitError(undefined);

            // this shouldn't ever happen, but type safety
            if (!connectionTypeName) {
              setSubmitError(new Error('No connection type selected'));
              setIsSaving(false);
              return;
            }

            onSubmit(
              assembleConnectionSecret(
                project.metadata.name,
                connectionTypeName,
                nameDescData,
                connectionValues,
              ),
            )
              .then(() => {
                onClose(true);
              })
              .catch((e) => {
                setSubmitError(e);
                setIsSaving(false);
              });
          }}
          error={submitError}
          isSubmitDisabled={!isFormValid || !isModified || isSaving}
          isSubmitLoading={isSaving}
          alertTitle=""
        />
      </ModalFooter>
    </Modal>
  );
};
