import React from 'react';
import usePersistentData from '#~/pages/projects/screens/detail/connections/usePersistentData';
import { useK8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '#~/concepts/k8s/K8sNameDescriptionField/utils';
import { getResourceNameFromK8sResource } from '#~/concepts/k8s/utils';
import { UseK8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/types';
import {
  Connection,
  ConnectionTypeConfigMapObj,
  ConnectionTypeDataField,
  ConnectionTypeFieldType,
  ConnectionTypeValueType,
} from './types';
import {
  assembleConnectionSecret,
  filterEnabledConnectionTypes,
  getDefaultValues,
  isConnectionTypeDataField,
} from './utils';
import ConnectionTypeForm from './ConnectionTypeForm';

export type UseNewConnectionFieldData = {
  connectionTypeOptions: ConnectionTypeConfigMapObj[];
  selectedConnectionType?: ConnectionTypeConfigMapObj;
  setSelectedConnectionType: (ct?: ConnectionTypeConfigMapObj) => void;
  nameDescData: UseK8sNameDescriptionFieldData['data'];
  setNameDescData: UseK8sNameDescriptionFieldData['onDataChange'];
  connectionValues: { [key: string]: ConnectionTypeValueType };
  setConnectionValues: (values: { [key: string]: ConnectionTypeValueType }) => void;
  connectionErrors: { [key: string]: string | boolean };
  setConnectionErrors: (errors: { [key: string]: string | boolean }) => void;
  isFormValid: boolean;
  extraConnectionTypeModifiers?: (ct: ConnectionTypeConfigMapObj) => ConnectionTypeConfigMapObj;
  extraValidation?: (
    field: ConnectionTypeDataField,
    error: boolean | string,
    value?: ConnectionTypeValueType,
  ) => string | boolean | null;
  newConnection?: Connection;
};

export const useNewConnectionField = (
  projectName: string,
  connectionTypes: ConnectionTypeConfigMapObj[],
  initialConnectionName?: string,
  initialConnectionType?: ConnectionTypeConfigMapObj,
  initialConnectionValues?: {
    [key: string]: ConnectionTypeValueType;
  },
  extraConnectionTypeModifiers?: UseNewConnectionFieldData['extraConnectionTypeModifiers'],
  extraValidation?: UseNewConnectionFieldData['extraValidation'],
): UseNewConnectionFieldData => {
  const enabledConnectionTypes = React.useMemo(
    () =>
      filterEnabledConnectionTypes(connectionTypes).map(
        (ct) => extraConnectionTypeModifiers?.(ct) ?? ct,
      ),
    [connectionTypes, extraConnectionTypeModifiers],
  );

  const [tmpSelectedConnectionType, setSelectedConnectionType] =
    React.useState<ConnectionTypeConfigMapObj>();
  const selectedConnectionType = React.useMemo(() => {
    if (tmpSelectedConnectionType === undefined) {
      if (initialConnectionType) {
        return initialConnectionType;
      }
      if (enabledConnectionTypes.length === 1) {
        return enabledConnectionTypes[0];
      }
      return undefined;
    }
    return tmpSelectedConnectionType;
  }, [tmpSelectedConnectionType, initialConnectionType, enabledConnectionTypes]);

  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData({
    initialData: initialConnectionName
      ? {
          name: initialConnectionName,
          k8sName: '',
        }
      : undefined,
  });
  const [tmpConnectionValues, setConnectionValues] = React.useState<{
    [key: string]: ConnectionTypeValueType;
  }>();
  const connectionValues = React.useMemo(() => {
    if (tmpConnectionValues === undefined || Object.entries(tmpConnectionValues).length === 0) {
      if (initialConnectionValues) {
        return initialConnectionValues;
      }
      if (enabledConnectionTypes.length === 1) {
        return getDefaultValues(enabledConnectionTypes[0]);
      }
      return {};
    }
    return tmpConnectionValues;
  }, [tmpConnectionValues, initialConnectionValues, enabledConnectionTypes]);

  const [connectionErrors, setConnectionErrors] = React.useState<{
    [key: string]: boolean | string;
  }>({});
  const isFormValid = React.useMemo(
    () =>
      !!selectedConnectionType &&
      isK8sNameDescriptionDataValid(nameDescData) &&
      !selectedConnectionType.data?.fields?.find(
        (field) =>
          isConnectionTypeDataField(field) &&
          field.required &&
          !connectionValues[field.envVar] &&
          field.type !== ConnectionTypeFieldType.Boolean,
      ) &&
      !Object.values(connectionErrors).find((e) => !!e),
    [selectedConnectionType, nameDescData, connectionValues, connectionErrors],
  );

  const newConnection = React.useMemo(
    () =>
      selectedConnectionType
        ? assembleConnectionSecret(
            projectName,
            getResourceNameFromK8sResource(selectedConnectionType),
            nameDescData,
            connectionValues,
          )
        : undefined,
    [connectionValues, nameDescData, projectName, selectedConnectionType],
  );

  return {
    connectionTypeOptions: enabledConnectionTypes,
    selectedConnectionType,
    setSelectedConnectionType,
    nameDescData,
    setNameDescData,
    connectionValues,
    setConnectionValues,
    connectionErrors,
    setConnectionErrors,
    isFormValid,
    extraValidation,
    newConnection,
  };
};

export const NewConnectionField: React.FC<{
  newConnectionData: UseNewConnectionFieldData;
}> = ({ newConnectionData }) => {
  const {
    connectionTypeOptions,
    selectedConnectionType,
    setSelectedConnectionType,
    nameDescData,
    setNameDescData,
    connectionValues,
    setConnectionValues,
    connectionErrors,
    setConnectionErrors,
    extraValidation,
  } = newConnectionData;

  const { changeSelectionType } = usePersistentData({
    setConnectionValues,
    setConnectionErrors,
    setSelectedConnectionType,
    connectionValues,
    selectedConnectionType,
  });

  return (
    <ConnectionTypeForm
      options={connectionTypeOptions}
      connectionType={selectedConnectionType}
      setConnectionType={(name) => {
        const obj = connectionTypeOptions.find((ct) => getResourceNameFromK8sResource(ct) === name);
        setSelectedConnectionType(obj);
        changeSelectionType(obj);
      }}
      connectionNameDesc={nameDescData}
      setConnectionNameDesc={setNameDescData}
      connectionValues={connectionValues}
      onChange={(field, value) =>
        setConnectionValues({ ...connectionValues, [field.envVar]: value })
      }
      onValidate={(field, error, value) => {
        const newError = extraValidation?.(field, error, value) ?? error;
        setConnectionErrors({ ...connectionErrors, [field.envVar]: newError });
      }}
      connectionErrors={connectionErrors}
    />
  );
};
