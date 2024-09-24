import React from 'react';
import { Alert, Modal } from '@patternfly/react-core';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import ConnectionTypeForm from '~/concepts/connectionTypes/ConnectionTypeForm';
import {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTypeFieldType,
  ConnectionTypeValueType,
  isConnectionTypeDataField,
} from '~/concepts/connectionTypes/types';
import { ProjectKind, SecretKind } from '~/k8sTypes';
import { useK8sNameDescriptionFieldData } from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import {
  assembleConnectionSecret,
  getDefaultValues,
  parseConnectionSecretValues,
} from '~/concepts/connectionTypes/utils';
import { K8sNameDescriptionFieldData } from '~/concepts/k8s/K8sNameDescriptionField/types';

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
  const [error, setError] = React.useState<Error>();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isModified, setIsModified] = React.useState(false);

  const enabledConnectionTypes = React.useMemo(
    () =>
      connectionTypes.filter((t) => t.metadata.annotations?.['opendatahub.io/enabled'] === 'true'),
    [connectionTypes],
  );

  const [selectedConnectionType, setSelectedConnectionType] = React.useState<
    ConnectionTypeConfigMapObj | undefined
  >(() => {
    if (isEdit && connection) {
      return connectionTypes.find(
        (t) =>
          t.metadata.name === connection.metadata.annotations['opendatahub.io/connection-type'],
      );
    }
    if (enabledConnectionTypes.length === 1) {
      return enabledConnectionTypes[0];
    }
    return undefined;
  });
  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData({
    initialData: connection,
  });
  const [connectionValues, setConnectionValues] = React.useState<{
    [key: string]: ConnectionTypeValueType;
  }>(() => {
    if (connection?.data) {
      return parseConnectionSecretValues(connection, selectedConnectionType);
    }
    if (enabledConnectionTypes.length === 1) {
      return getDefaultValues(enabledConnectionTypes[0]);
    }
    return {};
  });

  const [validations, setValidations] = React.useState<{
    [key: string]: boolean;
  }>({});
  const isFormValid = React.useMemo(
    () =>
      !!selectedConnectionType &&
      !!nameDescData.name &&
      !selectedConnectionType.data?.fields?.find(
        (field) =>
          isConnectionTypeDataField(field) &&
          field.required &&
          !connectionValues[field.envVar] &&
          field.type !== ConnectionTypeFieldType.Boolean,
      ) &&
      !Object.values(validations).includes(false),
    [selectedConnectionType, nameDescData, connectionValues, validations],
  );

  // if user changes connection types, don't discard previous entries in case of accident
  const previousValues = React.useRef<{
    [connectionTypeName: string]: {
      [key: string]: ConnectionTypeValueType;
    };
  }>({});
  const changeSelectionType = React.useCallback(
    (type?: ConnectionTypeConfigMapObj) => {
      // save previous connection values
      if (selectedConnectionType) {
        previousValues.current[selectedConnectionType.metadata.name] = connectionValues;
        // clear previous values
        setConnectionValues({});
        setValidations({});
      }
      // load saved values?
      if (type?.metadata.name && type.metadata.name in previousValues.current) {
        setConnectionValues(previousValues.current[type.metadata.name]);
      } else if (type) {
        // first time load, so add default values
        setConnectionValues(getDefaultValues(type));
      }

      setSelectedConnectionType(type);
    },
    [selectedConnectionType, connectionValues],
  );

  return (
    <Modal
      title={isEdit ? 'Edit connection' : 'Add connection'}
      isOpen
      onClose={() => {
        onClose();
      }}
      variant="medium"
      footer={
        <DashboardModalFooter
          submitLabel={isEdit ? 'Save' : 'Create'}
          onCancel={onClose}
          onSubmit={() => {
            setIsSaving(true);
            setError(undefined);

            // this shouldn't ever happen, but type safety
            if (!selectedConnectionType) {
              setError(new Error('No connection type selected'));
              setIsSaving(false);
              return;
            }

            onSubmit(
              assembleConnectionSecret(
                project,
                selectedConnectionType,
                nameDescData,
                connectionValues,
              ),
            )
              .then(() => {
                onClose(true);
              })
              .catch((e) => {
                setError(e);
                setIsSaving(false);
              });
          }}
          error={error}
          isSubmitDisabled={!isFormValid || !isModified}
          isSubmitLoading={isSaving}
          alertTitle=""
        />
      }
    >
      {isEdit && (
        <Alert
          style={{ marginBottom: 32 }}
          variant="warning"
          isInline
          title="Dependent resources require further action"
        >
          Connection changes are not applied to dependent resources until those resources are
          restarted, redeployed, or otherwise regenerated.
        </Alert>
      )}
      <ConnectionTypeForm
        connectionTypes={enabledConnectionTypes}
        connectionType={selectedConnectionType}
        setConnectionType={(obj?: ConnectionTypeConfigMapObj) => {
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
        onValidate={(field, isValid) =>
          setValidations((prev) => ({ ...prev, [field.envVar]: isValid }))
        }
        disableTypeSelection={isEdit || enabledConnectionTypes.length === 1}
      />
    </Modal>
  );
};
