import React from 'react';
import { Modal } from '@patternfly/react-core';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import ConnectionTypePreview from '~/concepts/connectionTypes/ConnectionTypePreview';
import {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTypeFieldType,
  ConnectionTypeValueType,
  isConnectionTypeDataField,
} from '~/concepts/connectionTypes/types';
import { translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import { ProjectKind, SecretKind } from '~/k8sTypes';
import { useK8sNameDescriptionFieldData } from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { K8sNameDescriptionFieldData } from '~/concepts/k8s/K8sNameDescriptionField/types';
import { getDefaultValues } from '~/concepts/connectionTypes/utils';

type Props = {
  connection?: Connection;
  connectionTypes?: ConnectionTypeConfigMapObj[];
  project?: ProjectKind;
  onClose: (refresh?: boolean) => void;
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
      connectionTypes?.filter((t) => t.metadata.annotations?.['opendatahub.io/enabled'] === 'true'),
    [connectionTypes],
  );

  const [selectedConnectionType, setSelectedConnectionType] = React.useState<
    ConnectionTypeConfigMapObj | undefined
  >(enabledConnectionTypes?.length === 1 ? enabledConnectionTypes[0] : undefined);
  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData();
  const [connectionValues, setConnectionValues] = React.useState<{
    [key: string]: ConnectionTypeValueType;
  }>(() => {
    if (connection?.data) {
      return connection.data;
    }
    if (enabledConnectionTypes?.length === 1) {
      return getDefaultValues(enabledConnectionTypes[0]);
    }
    return {};
  });

  // if user changes connection types, don't discard previous entries in case of accident
  const [previousEntries, setPreviousEntries] = React.useState<{
    [connectionTypeName: string]: {
      nameDesc: K8sNameDescriptionFieldData;
      values: {
        [key: string]: ConnectionTypeValueType;
      };
    };
  }>({});
  const changeSelectionType = React.useCallback(
    (type?: ConnectionTypeConfigMapObj) => {
      // save previous connection values
      if (selectedConnectionType) {
        setPreviousEntries({
          ...previousEntries,
          [selectedConnectionType.metadata.name]: {
            nameDesc: nameDescData,
            values: connectionValues,
          },
        });
        // clear previous values
        setNameDescData('name', '');
        setNameDescData('description', '');
        setConnectionValues({});
      }
      // load saved values?
      if (type?.metadata.name && type.metadata.name in previousEntries) {
        setNameDescData('name', previousEntries[type.metadata.name].nameDesc.name);
        setNameDescData('description', previousEntries[type.metadata.name].nameDesc.description);
        setConnectionValues(previousEntries[type.metadata.name].values);
      } else {
        // first time load, so add default values
        setConnectionValues(getDefaultValues(type));
      }

      setSelectedConnectionType(type);
    },
    [selectedConnectionType, previousEntries, nameDescData, connectionValues, setNameDescData],
  );

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
      ),
    [selectedConnectionType, nameDescData, connectionValues],
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
            const connectionValuesAsStrings = Object.fromEntries(
              Object.entries(connectionValues).map(([key, value]) => [key, String(value)]),
            );
            const update: Connection = {
              apiVersion: 'v1',
              kind: 'Secret',
              metadata: {
                name: nameDescData.k8sName.value || translateDisplayNameForK8s(nameDescData.name),
                namespace: project?.metadata.name ?? '',
                labels: {
                  'opendatahub.io/dashboard': 'true',
                  'opendatahub.io/managed': 'true',
                },
                annotations: {
                  'opendatahub.io/connection-type': selectedConnectionType?.metadata.name ?? '',
                  'openshift.io/display-name': nameDescData.name,
                  'openshift.io/description': nameDescData.description,
                },
              },
              stringData: connectionValuesAsStrings,
            };

            setIsSaving(true);
            setError(undefined);

            onSubmit(update)
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
      <ConnectionTypePreview
        connectionTypes={enabledConnectionTypes}
        obj={selectedConnectionType}
        setObj={changeSelectionType}
        connectionNameDesc={nameDescData}
        setConnectionNameDesc={setNameDescData}
        connectionValues={connectionValues}
        setConnectionValues={setConnectionValues}
      />
    </Modal>
  );
};
