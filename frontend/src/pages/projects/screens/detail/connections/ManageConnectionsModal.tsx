import React from 'react';
import { Modal } from '@patternfly/react-core';
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
import { assembleConnectionSecret, getDefaultValues } from '~/concepts/connectionTypes/utils';

type Props = {
  connection?: Connection;
  connectionTypes: ConnectionTypeConfigMapObj[];
  project: ProjectKind;
  onClose: (submitted?: boolean) => void;
  onSubmit: (connection: Connection) => Promise<SecretKind>;
};

export const ManageConnectionModal: React.FC<Props> = ({
  connection,
  connectionTypes,
  project,
  onClose,
  onSubmit,
}) => {
  const [error, setError] = React.useState<Error>();
  const [isSaving, setIsSaving] = React.useState(false);

  const enabledConnectionTypes = React.useMemo(
    () =>
      connectionTypes.filter((t) => t.metadata.annotations?.['opendatahub.io/enabled'] === 'true'),
    [connectionTypes],
  );

  const [selectedConnectionType, setSelectedConnectionType] = React.useState<
    ConnectionTypeConfigMapObj | undefined
  >(enabledConnectionTypes.length === 1 ? enabledConnectionTypes[0] : undefined);
  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData();
  const [connectionValues, setConnectionValues] = React.useState<{
    [key: string]: ConnectionTypeValueType;
  }>(() => {
    if (connection?.data) {
      return connection.data;
    }
    if (enabledConnectionTypes.length === 1) {
      return getDefaultValues(enabledConnectionTypes[0]);
    }
    return {};
  });

  const [validations, setValidations] = React.useState<{
    [key: string]: boolean;
  }>({});
  const isValid = React.useMemo(
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
  const previousValidations = React.useRef<{
    [connectionTypeName: string]: {
      [key: string]: boolean;
    };
  }>({});
  const changeSelectionType = React.useCallback(
    (type?: ConnectionTypeConfigMapObj) => {
      // save previous connection values
      if (selectedConnectionType) {
        previousValues.current[selectedConnectionType.metadata.name] = connectionValues;
        previousValidations.current[selectedConnectionType.metadata.name] = validations;
        // clear previous values
        setConnectionValues({});
        setValidations({});
      }
      // load saved values?
      if (type?.metadata.name && type.metadata.name in previousValues.current) {
        setConnectionValues(previousValues.current[type.metadata.name]);
        setValidations(previousValidations.current[type.metadata.name]);
      } else if (type) {
        // first time load, so add default values
        setConnectionValues(getDefaultValues(type));
      }

      setSelectedConnectionType(type);
    },
    [selectedConnectionType, connectionValues, validations],
  );

  return (
    <Modal
      title="Add Connection"
      isOpen
      onClose={() => {
        onClose();
      }}
      variant="medium"
      footer={
        <DashboardModalFooter
          submitLabel="Create"
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
          isSubmitDisabled={!isValid}
          isSubmitLoading={isSaving}
          alertTitle=""
        />
      }
    >
      <ConnectionTypeForm
        connectionTypes={enabledConnectionTypes}
        connectionType={selectedConnectionType}
        setConnectionType={changeSelectionType}
        connectionNameDesc={nameDescData}
        setConnectionNameDesc={setNameDescData}
        connectionValues={connectionValues}
        setConnectionValues={setConnectionValues}
        validations={validations}
        setValidations={setValidations}
      />
    </Modal>
  );
};
