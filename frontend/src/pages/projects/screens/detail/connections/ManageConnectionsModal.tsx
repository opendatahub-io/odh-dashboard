import React from 'react';
import { Alert, Form } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import ConnectionTypeForm from '~/concepts/connectionTypes/ConnectionTypeForm';
import {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTypeFieldType,
  ConnectionTypeValueType,
} from '~/concepts/connectionTypes/types';
import { ProjectKind, SecretKind } from '~/k8sTypes';
import { K8sNameDescriptionFieldData } from '~/concepts/k8s/K8sNameDescriptionField/types';
import { isK8sNameDescriptionDataValid } from '~/concepts/k8s/K8sNameDescriptionField/utils';
import { useK8sNameDescriptionFieldData } from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import {
  assembleConnectionSecret,
  filterEnabledConnectionTypes,
  getConnectionTypeRef,
  getDefaultValues,
  isConnectionTypeDataField,
  parseConnectionSecretValues,
} from '~/concepts/connectionTypes/utils';

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

  const [validations, setValidations] = React.useState<{
    [key: string]: boolean;
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
      !Object.values(validations).includes(false),
    [connectionTypeName, selectedConnectionType, nameDescData, connectionValues, validations],
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
            if (!connectionTypeName) {
              setError(new Error('No connection type selected'));
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
                setError(e);
                setIsSaving(false);
              });
          }}
          error={error}
          isSubmitDisabled={!isFormValid || !isModified || isSaving}
          isSubmitLoading={isSaving}
          alertTitle=""
        />
      }
    >
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
          onValidate={(field, isValid) =>
            setValidations((prev) => ({ ...prev, [field.envVar]: isValid }))
          }
        />
      </Form>
    </Modal>
  );
};
