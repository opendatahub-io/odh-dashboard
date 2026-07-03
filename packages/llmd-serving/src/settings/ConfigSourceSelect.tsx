import * as React from 'react';
import { FileUpload, FormGroup, Stack, StackItem } from '@patternfly/react-core';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';

type ConfigSourceValue = 'sample' | 'upload' | 'blank';

type ConfigSourceSelectProps = {
  value: ConfigSourceValue | undefined;
  onChange: (value: ConfigSourceValue, fileContent?: string) => void;
};

const ConfigSourceSelect: React.FC<ConfigSourceSelectProps> = ({ value, onChange }) => {
  const [filename, setFilename] = React.useState('');
  const [isFileLoading, setIsFileLoading] = React.useState(false);

  return (
    <FormGroup
      label="Configuration source"
      isRequired
      fieldId="config-source"
      data-testid="config-source-select"
    >
      <Stack hasGutter>
        <StackItem>
          <SimpleSelect
            options={[
              {
                key: 'sample',
                label: 'Start from a sample configuration file',
                dataTestId: 'config-source-sample',
              },
              {
                key: 'upload',
                label: 'Upload an existing configuration file',
                dataTestId: 'config-source-upload',
              },
              {
                key: 'blank',
                label: 'Start with a blank YAML file',
                dataTestId: 'config-source-blank',
              },
            ]}
            value={value}
            onChange={(key) => {
              if (key === 'sample' || key === 'upload' || key === 'blank') {
                onChange(key);
              }
            }}
            placeholder="Select a configuration source"
            isFullWidth
            dataTestId="config-source-dropdown"
            autoSelectOnlyOption={false}
          />
        </StackItem>
        {value === 'upload' && (
          <StackItem>
            <FileUpload
              id="config-file-upload"
              data-testid="config-file-upload"
              type="text"
              filename={filename}
              isLoading={isFileLoading}
              onFileInputChange={(_e, file) => {
                setFilename(file.name);
                setIsFileLoading(true);
                file
                  .text()
                  .then((content) => {
                    onChange('upload', content);
                  })
                  .catch(() => {
                    onChange('upload', '');
                    setFilename('');
                  })
                  .finally(() => {
                    setIsFileLoading(false);
                  });
              }}
              onClearClick={() => {
                setFilename('');
                onChange('upload', '');
              }}
              browseButtonText="Upload"
              filenamePlaceholder="Drag and drop a YAML file or upload one"
              dropzoneProps={{
                accept: { 'application/x-yaml': ['.yaml', '.yml'] },
              }}
            />
          </StackItem>
        )}
      </Stack>
    </FormGroup>
  );
};

export default ConfigSourceSelect;
