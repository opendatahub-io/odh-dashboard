import * as React from 'react';
import { Checkbox, FormGroup, Radio, Stack, StackItem } from '@patternfly/react-core';
import {
  DataConnectionData,
  EnvironmentVariableType,
  SecretCategory,
  UpdateObjectAtPropAndValue,
} from '~/pages/projects/types';
import AWSField from '~/pages/projects/dataConnections/AWSField';
import { EMPTY_AWS_SECRET_DATA } from '~/pages/projects/dataConnections/const';
import ExistingDataConnectionField from './ExistingDataConnectionField';

type DataConnectionFieldProps = {
  dataConnectionData: DataConnectionData;
  setDataConnectionData: UpdateObjectAtPropAndValue<DataConnectionData>;
};
const DataConnectionField: React.FC<DataConnectionFieldProps> = ({
  dataConnectionData,
  setDataConnectionData,
}) => (
  <FormGroup fieldId="cluster-storage" role="radiogroup">
    <Checkbox
      name="enable-data-connection-checkbox"
      id="enable-data-connection-checkbox"
      data-testid="enable-data-connection-checkbox"
      label="Use a data connection"
      isChecked={dataConnectionData.enabled}
      onChange={() => setDataConnectionData('enabled', !dataConnectionData.enabled)}
      body={
        dataConnectionData.enabled && (
          <Stack hasGutter>
            <StackItem>
              <Radio
                name="new-data-connection-radio"
                data-testid="new-data-connection-radio"
                id="new-data-connection-radio"
                label="Create new data connection"
                isChecked={dataConnectionData.type === 'creating'}
                onChange={() => setDataConnectionData('type', 'creating')}
                body={
                  dataConnectionData.type === 'creating' && (
                    <AWSField
                      values={dataConnectionData.creating?.values?.data ?? EMPTY_AWS_SECRET_DATA}
                      onUpdate={(newEnvData) => {
                        setDataConnectionData('creating', {
                          type: EnvironmentVariableType.SECRET,
                          values: { category: SecretCategory.AWS, data: newEnvData },
                        });
                      }}
                    />
                  )
                }
              />
            </StackItem>
            <StackItem>
              <Radio
                name="existing-data-connection-type-radio"
                id="existing-data-connection-type-radio"
                data-testid="existing-data-connection-type-radio"
                label="Use existing data connection"
                isChecked={dataConnectionData.type === 'existing'}
                onChange={() => setDataConnectionData('type', 'existing')}
                body={
                  dataConnectionData.type === 'existing' && (
                    <ExistingDataConnectionField
                      fieldId="select-existing-data-connection"
                      selectedDataConnection={dataConnectionData.existing?.secretRef.name}
                      setDataConnection={(name) =>
                        setDataConnectionData('existing', { secretRef: { name: name ?? '' } })
                      }
                    />
                  )
                }
              />
            </StackItem>
          </Stack>
        )
      }
    />
  </FormGroup>
);

export default DataConnectionField;
