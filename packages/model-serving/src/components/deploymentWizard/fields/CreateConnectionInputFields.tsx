import React from 'react';
import { Checkbox, Popover, Flex, FlexItem, Form, Alert } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { z } from 'zod';
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { K8sNameDescriptionFieldData } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/types';
import { isGeneratedSecretName } from '@odh-dashboard/internal/api/k8s/secrets';
import { translateDisplayNameForK8s } from '@odh-dashboard/internal/concepts/k8s/utils';
import { ModelLocationData, ModelLocationType } from '../types';

export type CreateConnectionData = {
  saveConnection?: boolean;
  nameDesc?: K8sNameDescriptionFieldData;
};
export type CreateConnectionDataField = {
  data: CreateConnectionData;
  setData: (data: CreateConnectionData) => void;
  projectName?: string;
};

export const useCreateConnectionData = (
  projectName?: string,
  existingData?: CreateConnectionData,
  modelLocationData?: ModelLocationData,
): CreateConnectionDataField => {
  const [createConnectionData, setCreateConnectionData] = React.useState<CreateConnectionData>(
    existingData ?? { saveConnection: true },
  );

  const connectionData = React.useMemo(() => {
    if (
      modelLocationData?.type === ModelLocationType.EXISTING ||
      modelLocationData?.type === ModelLocationType.PVC
    ) {
      return {
        ...createConnectionData,
        saveConnection: false,
      };
    }
    return {
      ...createConnectionData,
      saveConnection: createConnectionData.saveConnection,
    };
  }, [modelLocationData?.type, createConnectionData]);

  return {
    data: connectionData,
    setData: setCreateConnectionData,
    projectName,
  };
};

export const isValidCreateConnectionData = (data: CreateConnectionData): boolean => {
  // If not saving the connection, then it is valid
  if (!data.saveConnection) return true;
  // If saving the connection, then the name is required (don't count placeholder generated secret names)
  return (
    data.nameDesc?.name !== undefined &&
    !isGeneratedSecretName(data.nameDesc.name) &&
    data.nameDesc.name !== ''
  );
};

export const createConnectionDataSchema = z.custom<CreateConnectionData>((val) => {
  if (!val) return false;
  return isValidCreateConnectionData(val);
});

type CreateConnectionInputFieldsProps = {
  createConnectionData: CreateConnectionData;
  setCreateConnectionData: (data: CreateConnectionData) => void;
  projectName?: string;
  modelLocationData: ModelLocationData | undefined;
};

export const CreateConnectionInputFields: React.FC<CreateConnectionInputFieldsProps> = ({
  createConnectionData,
  setCreateConnectionData,
  projectName,
  modelLocationData,
}) => {
  const internalNameDesc = React.useMemo(() => {
    const isGeneratedSecret = isGeneratedSecretName(createConnectionData.nameDesc?.name || '');
    return {
      name: isGeneratedSecret ? '' : createConnectionData.nameDesc?.name || '',
      description: createConnectionData.nameDesc?.description || '',
      k8sName: isGeneratedSecret ? '' : createConnectionData.nameDesc?.k8sName.value || '',
    };
  }, [createConnectionData.nameDesc]);

  const { data: kServeNameDesc, onDataChange: setKserveNameDesc } = useK8sNameDescriptionFieldData({
    initialData: internalNameDesc,
    editableK8sName: false,
  });

  const showK8sNameDescriptionField = React.useMemo(() => {
    if (
      !modelLocationData?.type ||
      modelLocationData.type === ModelLocationType.EXISTING ||
      modelLocationData.type === ModelLocationType.PVC
    ) {
      return false;
    }
    return true;
  }, [modelLocationData?.type]);

  const resetNameDesc = React.useCallback(
    (checked: boolean) => {
      setCreateConnectionData({
        nameDesc: undefined,
        saveConnection: checked,
      });
      setKserveNameDesc('name', '');
      setKserveNameDesc('description', '');
      setKserveNameDesc('k8sName', '');
    },
    [createConnectionData, setCreateConnectionData, setKserveNameDesc],
  );
  return (
    <>
      {showK8sNameDescriptionField && (
        <Form maxWidth="450px">
          <Flex>
            <FlexItem>
              <Checkbox
                id="save-connection-checkbox"
                data-testid="save-connection-checkbox"
                label="Create a connection to this location"
                isChecked={createConnectionData.saveConnection}
                onChange={(_ev, checked) => {
                  setCreateConnectionData({
                    ...createConnectionData,
                    nameDesc: undefined,
                    saveConnection: checked,
                  });
                  resetNameDesc(checked);
                }}
              />
            </FlexItem>
            <FlexItem>
              <Popover
                aria-label="Save connection popover"
                bodyContent={
                  <>
                    Connections securely store the configuration parameters and credentials of
                    external data sources and services as environment variables so they can be
                    easily reused in the future.
                    <br />
                    <br />
                    If you choose to create a connection to this model location, it will be created
                    in the <strong>{projectName}</strong> project.
                  </>
                }
              >
                <DashboardPopupIconButton
                  icon={<OutlinedQuestionCircleIcon />}
                  aria-label="Save connection popover"
                />
              </Popover>
            </FlexItem>
          </Flex>
          {createConnectionData.saveConnection && (
            <K8sNameDescriptionField
              dataTestId="save-connection-name-desc"
              data={kServeNameDesc}
              onDataChange={(key, value) => {
                if (key === 'name') {
                  // Translate the name to a k8s name
                  const k8sValue = translateDisplayNameForK8s(value);
                  const nextNameDesc = {
                    name: value,
                    description: kServeNameDesc.description,
                    k8sName: {
                      value: k8sValue,
                      state: {
                        ...kServeNameDesc.k8sName.state,
                        touched: false,
                      },
                    },
                  };
                  setKserveNameDesc('name', value);
                  setKserveNameDesc('k8sName', k8sValue);
                  setCreateConnectionData({
                    ...createConnectionData,
                    nameDesc: nextNameDesc,
                  });
                } else if (key === 'description') {
                  const nextNameDesc = {
                    ...kServeNameDesc,
                    description: value,
                  };
                  setKserveNameDesc('description', value);
                  setCreateConnectionData({
                    ...createConnectionData,
                    nameDesc: nextNameDesc,
                  });
                }
              }}
            />
          )}
          {!createConnectionData.saveConnection && (
            <Alert title="Location information will not be saved" variant="warning">
              You have elected not to create a connection to this location. Creating a connection
              makes deploying to this location in the future easier by securely storing its
              configuration parameters and credentials.
            </Alert>
          )}
        </Form>
      )}
    </>
  );
};
