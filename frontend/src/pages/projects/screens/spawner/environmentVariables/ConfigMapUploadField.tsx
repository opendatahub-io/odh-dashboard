import * as React from 'react';
import { FileUpload, FormGroup } from '@patternfly/react-core';
import { parse } from 'yaml';
import { isConfigMapKind, isStringKeyValuePairObject } from './utils';
import { EnvVariableDataEntry } from '../../../types';

type ConfigMapUploadFieldProps = {
  onUpdate: (data: EnvVariableDataEntry[]) => void;
};

const ConfigMapUploadField: React.FC<ConfigMapUploadFieldProps> = ({ onUpdate }) => {
  const [fileValue, setFileValue] = React.useState('');
  const [filename, setFilename] = React.useState('');
  const [isLoading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  return (
    <FormGroup
      fieldId="configmap-upload"
      helperText="Upload a Config Map yaml file"
      helperTextInvalid={error}
      validated={error ? 'error' : 'default'}
    >
      <FileUpload
        id="configmap-upload"
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
            if (!isConfigMapKind(parsedData)) {
              setError('This file is not Config Map kind, please upload a Config Map kind file.');
            } else {
              const configMapData = parsedData.data;
              if (!configMapData) {
                setError('Data field cannot be empty, please check your file.');
              } else if (!isStringKeyValuePairObject(configMapData)) {
                setError('Data need to be string key value pairs, please check your file.');
              } else {
                setError('');
                onUpdate(Object.entries(configMapData).map(([key, value]) => ({ key, value })));
              }
            }
          } catch (e) {
            setError(
              'Cannot parse this file, please make sure this is a valid YAML file with only one Config Map defined.',
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

export default ConfigMapUploadField;
