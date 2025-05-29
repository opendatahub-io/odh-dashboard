import React from 'react';
import {
  K8sNameDescriptionFieldData,
  K8sNameDescriptionFieldUpdateFunction,
} from '#~/concepts/k8s/K8sNameDescriptionField/types';
import {
  ConnectionTypeConfigMapObj,
  ConnectionTypeDataField,
  ConnectionTypeFieldType,
  ConnectionTypeValueType,
} from '#~/concepts/connectionTypes/types';
import { useK8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { getDefaultValues, isConnectionTypeDataField } from '#~/concepts/connectionTypes/utils';
import { isK8sNameDescriptionDataValid } from '#~/concepts/k8s/K8sNameDescriptionField/utils';

type FineTunedModelNewConnectionContextType = {
  isValid: boolean;
  nameDescData: K8sNameDescriptionFieldData;
  setNameDescData: K8sNameDescriptionFieldUpdateFunction;
  onValidate: (field: ConnectionTypeDataField, error: boolean | string) => void;
  connectionValues: { [key: string]: ConnectionTypeValueType };
  setConnectionValues: React.Dispatch<
    React.SetStateAction<{
      [key: string]: ConnectionTypeValueType;
    }>
  >;
};

export const FineTunedModelNewConnectionContext =
  React.createContext<FineTunedModelNewConnectionContextType>({
    isValid: false,
    nameDescData: {
      name: '',
      description: '',
      k8sName: {
        value: '',
        state: {
          immutable: false,
          invalidCharacters: false,
          invalidLength: false,
          maxLength: 0,
          touched: false,
        },
      },
    },
    setNameDescData: () => undefined,
    onValidate: () => undefined,
    connectionValues: {},
    setConnectionValues: () => undefined,
  });

type FineTunedModelNewConnectionContextProviderProps = {
  children: React.ReactNode;
  /** Prometheus query strings computed and ready to use */
  connectionType?: ConnectionTypeConfigMapObj;
};

export const FineTunedModelNewConnectionContextProvider: React.FC<
  FineTunedModelNewConnectionContextProviderProps
> = ({ connectionType, children }) => {
  const { data: nameDescData, onDataChange: setNameDescData } = useK8sNameDescriptionFieldData();
  const [connectionErrors, setConnectionErrors] = React.useState<{
    [key: string]: boolean | string;
  }>({});
  const [connectionValues, setConnectionValues] = React.useState<{
    [key: string]: ConnectionTypeValueType;
  }>(connectionType ? getDefaultValues(connectionType) : {});

  const isValid = React.useMemo(
    () =>
      isK8sNameDescriptionDataValid(nameDescData) &&
      !connectionType?.data?.fields?.find(
        (field) =>
          isConnectionTypeDataField(field) &&
          field.required &&
          !connectionValues[field.envVar] &&
          field.type !== ConnectionTypeFieldType.Boolean,
      ) &&
      !Object.values(connectionErrors).find((e) => !!e),
    [nameDescData, connectionType?.data?.fields, connectionErrors, connectionValues],
  );

  const onValidate = React.useCallback(
    (field: ConnectionTypeDataField, error: boolean | string) =>
      setConnectionErrors((prev) => ({ ...prev, [field.envVar]: error })),
    [],
  );

  const contextValue = React.useMemo(
    () => ({
      isValid,
      onValidate,
      setConnectionValues,
      connectionValues,
      nameDescData,
      setNameDescData,
    }),
    [connectionValues, isValid, nameDescData, onValidate, setNameDescData],
  );

  return (
    <FineTunedModelNewConnectionContext.Provider value={contextValue}>
      {children}
    </FineTunedModelNewConnectionContext.Provider>
  );
};
