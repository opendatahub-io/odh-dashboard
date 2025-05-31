import * as React from 'react';
import { ErrorCode, FileError } from 'react-dropzone';
import {
  FileUpload,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, InfoCircleIcon } from '@patternfly/react-icons';
import { FileField } from '#~/concepts/connectionTypes/types';
import { FieldProps } from '#~/concepts/connectionTypes/fields/types';
import { EXTENSION_REGEX, isDuplicateExtension } from './fieldUtils';

const MAX_SIZE = 1024 * 1024; // 1 MB as bytes

const FileFormField: React.FC<FieldProps<FileField>> = ({
  id,
  field,
  mode,
  onChange,
  value,
  'data-testid': dataTestId,
}) => {
  const isPreview = mode === 'preview';
  const [isLoading, setIsLoading] = React.useState(false);
  const [filename, setFilename] = React.useState('');
  const [rejectedReason, setRejectedReason] = React.useState<string | undefined>();
  const readOnly = isPreview || (mode !== 'default' && field.properties.defaultReadOnly);
  const extensions =
    field.properties.extensions
      ?.filter(
        (ext, index) =>
          !isDuplicateExtension(index, field.properties.extensions || []) &&
          EXTENSION_REGEX.test(ext),
      )
      .map((ext) => ext.toLowerCase()) ?? [];

  React.useEffect(() => {
    setRejectedReason(undefined);
  }, [field.properties.extensions]);

  const formatString = extensions.length
    ? `File format must be ${extensions.slice(0, -1).join(', ')}${
        extensions.length > 1
          ? `${extensions.length > 2 ? ',' : ''} or ${extensions[extensions.length - 1]}`
          : extensions[0]
      }`
    : '';

  const getRejectionMessage = (error?: FileError): string => {
    switch (error?.code) {
      case ErrorCode.FileTooLarge:
        return 'File is larger than 1MB';
      case ErrorCode.FileInvalidType:
        return formatString;
      case ErrorCode.TooManyFiles:
        return 'Only a single file may be uploaded';
      default:
        return 'Unable to upload the file';
    }
  };

  return (
    <>
      <FileUpload
        id={id}
        name={id}
        data-testid={dataTestId}
        style={{ padding: 0 }}
        type="text"
        isLoading={isLoading}
        value={
          isPreview || field.properties.defaultReadOnly ? field.properties.defaultValue : value
        }
        filename={filename}
        allowEditingUploadedText
        isReadOnly={readOnly}
        isDisabled={readOnly}
        filenamePlaceholder={readOnly ? '' : 'Drag and drop a file or upload one'}
        browseButtonText="Upload"
        clearButtonText="Clear"
        onDataChange={isPreview || !onChange ? undefined : (e, content) => onChange(content)}
        onTextChange={isPreview || !onChange ? undefined : (e, content) => onChange(content)}
        onFileInputChange={(_e, file) => setFilename(file.name)}
        isClearButtonDisabled={rejectedReason ? false : undefined}
        onClearClick={() => {
          if (onChange) {
            onChange('');
          }
          setFilename('');
          setRejectedReason(undefined);
        }}
        onReadStarted={() => {
          setRejectedReason(undefined);
          setIsLoading(true);
        }}
        onReadFinished={() => {
          setIsLoading(false);
        }}
        dropzoneProps={{
          accept: extensions.length ? { '': extensions } : undefined,
          maxSize: MAX_SIZE,
          onDropRejected: (reason) => {
            setRejectedReason(getRejectionMessage(reason[0]?.errors?.[0]));
          },
        }}
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem
            icon={rejectedReason ? <ExclamationCircleIcon /> : undefined}
            variant={rejectedReason ? 'error' : 'default'}
            data-testid="file-form-field-helper-text"
          >
            {rejectedReason || formatString}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
      {field.properties.helperText && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem
              variant="success"
              icon={
                <Icon status="info">
                  <InfoCircleIcon />
                </Icon>
              }
            >
              {field.properties.helperText}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </>
  );
};

export default FileFormField;
