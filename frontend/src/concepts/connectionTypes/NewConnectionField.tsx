import React from 'react';
import usePersistentData from '~/pages/projects/screens/detail/connections/usePersistentData';
import { useK8sNameDescriptionFieldData } from '~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '~/concepts/k8s/K8sNameDescriptionField/utils';
import { getResourceNameFromK8sResource } from '~/concepts/k8s/utils';
import { UseK8sNameDescriptionFieldData } from '~/concepts/k8s/K8sNameDescriptionField/types';
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
  setSelectedConnectionType: React.Dispatch<
    React.SetStateAction<ConnectionTypeConfigMapObj | undefined>
  >;
  nameDescData: UseK8sNameDescriptionFieldData['data'];
  setNameDescData: UseK8sNameDescriptionFieldData['onDataChange'];
  connectionValues: { [key: string]: ConnectionTypeValueType };
  setConnectionValues: React.Dispatch<
    React.SetStateAction<{ [key: string]: ConnectionTypeValueType }>
  >;
  connectionErrors: { [key: string]: string | boolean };
  setConnectionErrors: React.Dispatch<
    React.SetStateAction<{
      [key: string]: string | boolean;
    }>
  >;
  isFormValid: boolean;
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
  initialConnectionType?: ConnectionTypeConfigMapObj,
  extraValidation?: (
    field: ConnectionTypeDataField,
    error: boolean | string,
    value?: ConnectionTypeValueType,
  ) => string | boolean | null,
): UseNewConnectionFieldData => {
  const enabledConnectionTypes = React.useMemo(
    () => filterEnabledConnectionTypes(connectionTypes),
    [connectionTypes],
  );

  const [selectedConnectionType, setSelectedConnectionType] = React.useState<
    ConnectionTypeConfigMapObj | undefined
  >(enabledConnectionTypes.length === 1 ? enabledConnectionTypes[0] : initialConnectionType);
  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData();
  const [connectionValues, setConnectionValues] = React.useState<{
    [key: string]: ConnectionTypeValueType;
  }>(enabledConnectionTypes.length === 1 ? getDefaultValues(enabledConnectionTypes[0]) : {});

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

  // React.useEffect(() => {
  //   let newConnection;
  //   if (selectedConnectionType) {
  //     newConnection = assembleConnectionSecret(
  //       projectName,
  //       getResourceNameFromK8sResource(selectedConnectionType),
  //       nameDescData,
  //       connectionValues,
  //     );
  //     setNewConnection(newConnection);
  //   }
  //   setIsConnectionValid(
  //     isFormValid && !!newConnection,
  //     // &&
  //     // isModelPathValid(newConnection, data.storage.path, modelUri),
  //   );
  // }, [
  //   projectName,
  //   connectionValues,
  //   // data.project,
  //   connectionErrors,
  //   // data.storage.path,
  //   // modelUri,
  //   isFormValid,
  //   nameDescData,
  //   selectedConnectionType,
  //   setIsConnectionValid,
  //   setNewConnection,
  // ]);

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

type NewConnectionFieldProps = {
  newConnectionData: UseNewConnectionFieldData;
  setNewConnection: (connection: Connection) => void;
  setIsConnectionValid: (isValid: boolean) => void;
};

export const NewConnectionField: React.FC<NewConnectionFieldProps> = ({
  newConnectionData,
  setNewConnection,
  setIsConnectionValid,
}) => {
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
    isFormValid,
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
      setConnectionType={(type) => {
        const obj = connectionTypeOptions.find((ct) => getResourceNameFromK8sResource(ct) === type);
        setSelectedConnectionType(obj);
        changeSelectionType(obj);
      }}
      connectionNameDesc={nameDescData}
      setConnectionNameDesc={setNameDescData}
      connectionValues={connectionValues}
      onChange={(field, value) =>
        setConnectionValues((prev) => ({ ...prev, [field.envVar]: value }))
      }
      onValidate={(field, error, value) => {
        const newError = extraValidation?.(field, error, value) ?? error;
        // if (field.envVar === 'ACCESS_TYPE' && Array.isArray(value)) {
        //   if (value.includes('Push') && !value.includes('Pull')) {
        //     newError = 'Access type must include pull';
        //   }
        // }
        setConnectionErrors((prev) => ({ ...prev, [field.envVar]: newError }));
      }}
      connectionErrors={connectionErrors}
    />
  );
};
