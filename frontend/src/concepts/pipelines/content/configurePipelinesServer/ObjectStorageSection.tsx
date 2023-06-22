import {
  FormSection,
  Title,
  Radio,
  FormGroup,
  Select,
  SelectOption,
  Text,
  TextInput,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import React from 'react';
import AWSField from '~/pages/projects/dataConnections/AWSField';
import { getDataConnectionDisplayName } from '~/pages/projects/screens/detail/data-connections/utils';
import { DataConnection } from '~/pages/projects/types';
import { EMPTY_AWS_SECRET_DATA } from '~/pages/projects/dataConnections/const';
import { PipelineServerConfigType } from './types';
import './ConfigurePipelinesServerModal.scss';

const DISABLED_FOLDER_PATH = (
  <FormGroup
    label="Folder path"
    helperText="/metadata and /artifacts folders are automatically created in the default root folder"
  >
    <TextInput isDisabled aria-label="disabled folder path field" value="/" />
  </FormGroup>
);

type ObjectStorageSectionProps = {
  setConfig: (config: PipelineServerConfigType) => void;
  config: PipelineServerConfigType;
  dataConnections: DataConnection[];
};

export const ObjectStorageSection = ({
  setConfig,
  config,
  dataConnections,
}: ObjectStorageSectionProps) => {
  const [existingDataConnectionOpen, setExistingDataConnectionOpen] = React.useState(false);
  return (
    <FormSection
      title={
        <>
          <Title headingLevel="h2">Object storage connection</Title>
          <Text component="p" className="form-subtitle-text">
            The selected S3-compatible data connection is where your pipeline artifacts are stored.
          </Text>
        </>
      }
    >
      <Radio
        className="checkbox-radio-fix-body-width"
        name="data-connection-type-radio"
        id="existing-data-connection-type-radio"
        label="Existing data connection"
        isChecked={config.objectStorage.useExisting}
        onChange={() =>
          setConfig({
            ...config,
            objectStorage: {
              existingName: '',
              existingValue: EMPTY_AWS_SECRET_DATA,
              useExisting: true,
            },
          })
        }
        body={
          config.objectStorage.useExisting && (
            <Stack hasGutter>
              <StackItem>
                <FormGroup label="Name" isRequired>
                  <Select
                    removeFindDomNode
                    id="pipelines-data-connection"
                    isOpen={existingDataConnectionOpen}
                    placeholderText={
                      dataConnections.length === 0
                        ? 'No data connections available to select'
                        : 'Select...'
                    }
                    isDisabled={dataConnections.length === 0}
                    onToggle={(open) => setExistingDataConnectionOpen(open)}
                    onSelect={(_, option) => {
                      if (typeof option === 'string') {
                        setConfig({
                          ...config,
                          objectStorage: {
                            useExisting: true,
                            existingName: option,
                            existingValue: EMPTY_AWS_SECRET_DATA,
                          },
                        });
                        setExistingDataConnectionOpen(false);
                      }
                    }}
                    selections={config.objectStorage.existingName}
                    menuAppendTo="parent"
                  >
                    {dataConnections.map((connection) => (
                      <SelectOption
                        key={connection.data.metadata.name}
                        value={connection.data.metadata.name}
                      >
                        {getDataConnectionDisplayName(connection)}
                      </SelectOption>
                    ))}
                  </Select>
                </FormGroup>
              </StackItem>
              <StackItem>{DISABLED_FOLDER_PATH}</StackItem>
            </Stack>
          )
        }
      />
      <Radio
        className="checkbox-radio-fix-body-width"
        name="data-connection-radio"
        id="new-data-connection-radio"
        label="Create new data connection"
        isChecked={!config.objectStorage.useExisting}
        onChange={() =>
          setConfig({
            ...config,
            objectStorage: {
              newValue: EMPTY_AWS_SECRET_DATA,
              useExisting: false,
            },
          })
        }
        body={
          !config.objectStorage.useExisting && (
            <Stack hasGutter>
              <StackItem>
                <AWSField
                  values={config.objectStorage.newValue}
                  onUpdate={(newEnvData) =>
                    setConfig({
                      ...config,
                      objectStorage: {
                        newValue: newEnvData,
                        useExisting: false,
                      },
                    })
                  }
                />
              </StackItem>
              <StackItem>{DISABLED_FOLDER_PATH}</StackItem>
            </Stack>
          )
        }
      />
    </FormSection>
  );
};
