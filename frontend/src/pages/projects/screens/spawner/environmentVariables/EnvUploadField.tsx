import * as React from 'react';
import { FileUpload, FormGroup } from '@patternfly/react-core';
import { parse } from 'yaml';
import { EnvironmentVariableType, EnvVariableDataEntry } from '~/pages/projects/types';
import { isConfigMapKind, isSecretKind, isStringKeyValuePairObject } from './utils';

type EnvUploadFieldProps = {
  onUpdate: (data: EnvVariableDataEntry[]) => void;
  envVarType: EnvironmentVariableType;
};

const EnvUploadField: React.FC<EnvUploadFieldProps> = ({ onUpdate, envVarType }) => {
  const [fileValue, setFileValue] = React.useState('');
  const [filename, setFilename] = React.useState('');
  const [isLoading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  return (
    <FormGroup
      fieldId="configmap-upload"
      helperText={`Upload a ${envVarType} yaml file`}
      helperTextInvalid={error}
      validated={error ? 'error' : 'default'}
    >
      <FileUpload
        id="envvar-upload"
        type="text"
        value={fileValue}
        filename={filename}
        onFileInputChange={(_e, file) => setFilename(file.name)}
        filenamePlaceholder="Drag and drop a file or upload one"
        allowEditingUploadedText={false}
        onReadStarted={() => setLoading(true)}
        onReadFinished={() => setLoading(false)}
        onClearClick={() => {
          setFilename('');
          setFileValue('');
          setError('');
          onUpdate([]);
        }}
        dropzoneProps={{
          accept: '.yaml',
        }}
        onDataChange={(data) => {
          setFileValue(data);
          try {
            const parsedData = parse(data);
            if (
              envVarType === EnvironmentVariableType.CONFIG_MAP
                ? !isConfigMapKind(parsedData)
                : !isSecretKind(parsedData)
            ) {
              setError(
                `This file is not ${envVarType} kind, please upload a ${envVarType} kind file.`,
              );
            } else {
              const envData = parsedData.data;
              if (!envData) {
                setError('Data field cannot be empty, please check your file.');
              } else if (!isStringKeyValuePairObject(envData)) {
                setError('Data need to be string key value pairs, please check your file.');
              } else {
                setError('');
                onUpdate(Object.entries(envData).map(([key, value]) => ({ key, value })));
              }
            }
          } catch (e) {
            setError(
              `Cannot parse this file, please make sure this is a valid YAML file with only one ${envVarType} defined.`,
            );
          }
        }}
        validated={error ? 'error' : 'default'}
        isLoading={isLoading}
        isReadOnly
        browseButtonText="Upload"
      />
    </FormGroup>
  );
};

export default EnvUploadField;
