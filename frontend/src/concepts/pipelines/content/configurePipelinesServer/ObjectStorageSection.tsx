import React from 'react';
import {
  FormGroup,
  TextInput,
  InputGroup,
  Tooltip,
  InputGroupItem,
  Alert,
  Popover,
} from '@patternfly/react-core';
import { DataConnection } from '~/pages/projects/types';
import { AwsKeys, PIPELINE_AWS_FIELDS } from '~/pages/projects/dataConnections/const';
import { FieldListField } from '~/components/FieldList';
import FormSection from '~/components/pf-overrides/FormSection';
import { PipelineDropdown } from './PipelineDropdown';
import { PipelineServerConfigType } from './types';

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
      title="Object storage connection"
      description="To store pipeline artifacts. Must be S3 compatible"
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
          <React.Fragment key={field.key}>
            <FieldListField
              key={field.key}
              value={
                config.objectStorage.newValue.find((data) => data.key === field.key)?.value || ''
              }
              options={field}
              onChange={onChange}
            />

            {field.key === AwsKeys.AWS_S3_BUCKET && (
              <Popover
                aria-label="bucket tooltip"
                headerContent="Where is my data stored within the bucket?"
                position="right"
                hasAutoWidth
                bodyContent={
                  <div className="pf-v6-u-mt-md">
                    Uploaded pipelines will be stored in the <b>/pipelines</b> directory.
                    <br />
                    When running a pipeline, artifacts will be stored in dedicated folders at the{' '}
                    <b>/root</b> directory.
                  </div>
                }
              >
                <Alert
                  variant="info"
                  isInline
                  isPlain
                  title="Where is my data stored within the bucket?"
                  style={{ width: 'fit-content' }}
                />
              </Popover>
            )}
          </React.Fragment>
        ),
      )}
    </FormSection>
  );
};
