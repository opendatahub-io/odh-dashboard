import * as React from 'react';
import { Checkbox, FormGroup, Radio, Stack, StackItem } from '@patternfly/react-core';
import {
  DataConnectionData,
  EnvironmentVariableType,
  SecretCategory,
} from '~/pages/projects/types';
import AWSField from '~/pages/projects/dataConnections/AWSField';
import { EMPTY_AWS_SECRET_DATA } from '~/pages/projects/dataConnections/const';
import ExistingDataConnectionField from './ExistingDataConnectionField';

type DataConnectionFieldProps = {
  dataConnection: DataConnectionData;
  setDataConnection: (dataConnection: DataConnectionData) => void;
};
const DataConnectionField: React.FC<DataConnectionFieldProps> = ({
  dataConnection,
  setDataConnection,
}) => (
  <FormGroup fieldId="cluster-storage" role="radiogroup">
    <Stack hasGutter>
      <StackItem>
        <Checkbox
          className="checkbox-radio-fix-body-width"
          name="enable-data-connection-checkbox"
          id="enable-data-connection-checkbox"
          label="Use a data connection"
          isChecked={dataConnection.enabled}
          onChange={() =>
            setDataConnection({ ...dataConnection, enabled: !dataConnection.enabled })
          }
        />
      </StackItem>
      {dataConnection.enabled && (
        <>
          <StackItem>
            <Radio
              className="checkbox-radio-fix-body-width"
              name="new-data-connection-radio"
              id="new-data-connection-radio"
              label="Create new data connection"
              isChecked={dataConnection.type === 'creating'}
              onChange={() => setDataConnection({ ...dataConnection, type: 'creating' })}
              body={
                dataConnection.type === 'creating' && (
                  <AWSField
                    values={dataConnection.creating?.values?.data ?? EMPTY_AWS_SECRET_DATA}
                    onUpdate={(newEnvData) => {
                      setDataConnection({
                        ...dataConnection,
                        creating: {
                          type: EnvironmentVariableType.SECRET,
                          values: { category: SecretCategory.AWS, data: newEnvData },
                        },
                      });
                    }}
                  />
                )
              }
            />
          </StackItem>
          <StackItem>
            <Radio
              className="checkbox-radio-fix-body-width"
              name="existing-data-connection-type-radio"
              id="existing-data-connection-type-radio"
              label="Use existing data connection"
              isChecked={dataConnection.type === 'existing'}
              onChange={() => setDataConnection({ ...dataConnection, type: 'existing' })}
              body={
                dataConnection.type === 'existing' && (
                  <ExistingDataConnectionField
                    fieldId="select-existing-data-connection"
                    selectedDataConnection={dataConnection?.existing?.secretRef.name}
                    setDataConnection={(name) =>
                      setDataConnection({
                        ...dataConnection,
                        existing: { secretRef: { name: name ?? '' } },
                      })
                    }
                  />
                )
              }
            />
          </StackItem>
        </>
      )}
    </Stack>
  </FormGroup>
);

export default DataConnectionField;
