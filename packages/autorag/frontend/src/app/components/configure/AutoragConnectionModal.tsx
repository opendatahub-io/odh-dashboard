import React from 'react';
import { Form, Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';
import ConnectionTypeForm from '@odh-dashboard/internal/concepts/connectionTypes/ConnectionTypeForm';
import {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTypeFieldType,
  ConnectionTypeValueType,
} from '@odh-dashboard/internal/concepts/connectionTypes/types';
import { K8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/types';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import {
  assembleConnectionSecret,
  filterEnabledConnectionTypes,
  getDefaultValues,
  isConnectionTypeDataField,
  getConnectionProtocolType,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { createSecret } from '@odh-dashboard/internal/api/k8s/secrets';

type Props = {
  connectionTypes: ConnectionTypeConfigMapObj[];
  project: string;
  onClose: (submitted?: boolean) => void;
  onSubmit: (connection: Connection) => void;
};

export const AutoragConnectionModal: React.FC<Props> = ({
  connectionTypes,
  project,
  onClose,
  onSubmit,
}) => {
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isModified, setIsModified] = React.useState(false);

  const enabledConnectionTypes = React.useMemo(
    () => filterEnabledConnectionTypes(connectionTypes),
    [connectionTypes],
  );

  const [selectedConnectionType, setSelectedConnectionType] = React.useState<
    ConnectionTypeConfigMapObj | undefined
  >(() => {
    if (enabledConnectionTypes.length === 1) {
      return enabledConnectionTypes[0];
    }
    return undefined;
  });

  const connectionTypeName = selectedConnectionType?.metadata.name;

  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData();

  const [connectionValues, setConnectionValues] = React.useState<{
    [key: string]: ConnectionTypeValueType;
  }>(() => {
    if (selectedConnectionType) {
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
      !selectedConnectionType.data?.fields?.find(
        (field) =>
          isConnectionTypeDataField(field) &&
          field.required &&
          !connectionValues[field.envVar] &&
          field.type !== ConnectionTypeFieldType.Boolean,
      ) &&
      !Object.values(connectionErrors).find((e) => !!e),
    [connectionTypeName, selectedConnectionType, nameDescData, connectionValues, connectionErrors],
  );

  const protocolType = selectedConnectionType
    ? getConnectionProtocolType(selectedConnectionType)
    : undefined;

  const handleConnectionTypeChange = (name: string) => {
    const obj = connectionTypes.find((c) => c.metadata.name === name);
    if (!isModified) {
      setIsModified(true);
    }
    setSelectedConnectionType(obj);
    if (obj) {
      setConnectionValues(getDefaultValues(obj));
      setConnectionErrors({});
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => {
        onClose();
      }}
      variant="medium"
    >
      <ModalHeader title="Add a connection" />
      <ModalBody>
        <Form>
          <ConnectionTypeForm
            options={enabledConnectionTypes}
            connectionType={selectedConnectionType}
            setConnectionType={handleConnectionTypeChange}
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
            connectionErrors={connectionErrors}
          />
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Add connection"
          onCancel={onClose}
          onSubmit={() => {
            setIsSaving(true);
            setSubmitError(undefined);

            if (!connectionTypeName) {
              setSubmitError(new Error('No connection type selected'));
              setIsSaving(false);
              return;
            }

            const assembledConnection = assembleConnectionSecret(
              project,
              connectionTypeName,
              nameDescData,
              connectionValues,
            );
            assembledConnection.metadata.annotations = {
              ...assembledConnection.metadata.annotations,
              ...(protocolType && { 'opendatahub.io/connection-type-protocol': protocolType }),
            };

            createSecret(assembledConnection)
              .then(() => {
                onSubmit(assembledConnection);
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
