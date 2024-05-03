import {
  FormSection,
  Title,
  FormGroup,
  Text,
  TextInput,
  InputGroup,
  Tooltip,
  InputGroupItem,
} from '@patternfly/react-core';
import React from 'react';
import { DataConnection } from '~/pages/projects/types';
import { PIPELINE_AWS_FIELDS } from '~/pages/projects/dataConnections/const';
import { FieldListField } from '~/components/FieldList';
import { PipelineServerConfigType } from './types';
import './ConfigurePipelinesServerModal.scss';
import { PipelineDropdown } from './PipelineDropdown';

export type FieldOptions = {
  key: string;
  label: string;
  placeholder?: string;
  isRequired?: boolean;
  isPassword?: boolean;
};
type ObjectStorageSectionProps = {
  loaded: boolean;
  setConfig: (config: PipelineServerConfigType) => void;
  config: PipelineServerConfigType;
  dataConnections: DataConnection[];
};

export const ObjectStorageSection = ({
  setConfig,
  config,
  loaded,
  dataConnections,
}: ObjectStorageSectionProps): React.JSX.Element => {
  const onChange = (key: FieldOptions['key'], value: string) => {
    setConfig({
      ...config,
      objectStorage: {
        newValue: config.objectStorage.newValue.map((d) => (d.key === key ? { key, value } : d)),
      },
    });
  };

  return (
    <FormSection
      title={
        <>
          <Title headingLevel="h2">Object storage connection</Title>
          <Text component="p" className="form-subtitle-text">
            To store pipeline artifacts. Must be S3 compatible
          </Text>
        </>
      }
    >
      {PIPELINE_AWS_FIELDS.map((field) =>
        field.key === 'AWS_ACCESS_KEY_ID' ? (
          <FormGroup key={field.key} isRequired={field.isRequired} label={field.label}>
            <InputGroup>
              <InputGroupItem isFill>
                <TextInput
                  aria-label={`Field list ${field.key}`}
                  data-testid={`field ${field.key}`}
                  isRequired={field.isRequired}
                  value={
                    config.objectStorage.newValue.find((data) => data.key === field.key)?.value ||
                    ''
                  }
                  placeholder={field.placeholder}
                  onChange={(_, value) => onChange(field.key, value)}
                />
              </InputGroupItem>
              {loaded && !!dataConnections.length && (
                <Tooltip content="Populate the form with credentials from your selected data connection">
                  <PipelineDropdown
                    config={config}
                    setConfig={setConfig}
                    dataConnections={dataConnections}
                  />
                </Tooltip>
              )}
            </InputGroup>
          </FormGroup>
        ) : (
          <FieldListField
            key={field.key}
            value={
              config.objectStorage.newValue.find((data) => data.key === field.key)?.value || ''
            }
            options={field}
            onChange={onChange}
          />
        ),
      )}
    </FormSection>
  );
};
