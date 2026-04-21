import {
  Button,
  FileUpload,
  FileUploadHelperText,
  FileUploadProps,
  HelperText,
  Progress,
  ProgressMeasureLocation,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { FileIcon, TimesIcon } from '@patternfly/react-icons';
import React, { useState } from 'react';

interface FileSelectorProps {
  id: string;
  placeholder?: string;
  selected?: string;
  isDisabled?: boolean;
  onUpload: (
    file: File,
    setProgress: (progress: number) => void,
    setStatus: (status: 'success' | 'danger') => void,
  ) => void;
  onClear: () => void;
  fileUploadProps?: Omit<FileUploadProps, 'id'>;
  fileUploadHelperText?: string;
}

function FileSelector(props: FileSelectorProps): React.JSX.Element {
  const [uploadedFile, setUploadedFile] = useState<File>();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'success' | 'danger'>();

  const hideUpload = !!props.selected;

  return (
    <div className="pf-v6-c-multiple-file-upload pf-v6-u-display-block">
      <TextInputGroup>
        <TextInputGroupMain
          inputProps={{ readOnly: true }}
          icon={<FileIcon />}
          placeholder={props.placeholder ?? 'No file selected'}
          value={props.selected}
        />
        {!!props.selected && (
          <TextInputGroupUtilities>
            <Button
              aria-label="Clear file"
              variant="plain"
              icon={<TimesIcon />}
              isDisabled={props.isDisabled}
              onClick={props.onClear}
            />
          </TextInputGroupUtilities>
        )}
      </TextInputGroup>
      <FileUpload
        className="pf-v6-u-mt-sm"
        onClearClick={() => setUploadedFile(undefined)}
        {...props.fileUploadProps}
        id={props.id}
        style={{
          maxHeight: hideUpload ? '0' : '6rem',
          padding: hideUpload ? '0' : undefined,
          margin: hideUpload ? '0' : undefined,
          border: hideUpload ? '0' : undefined,

          translate: hideUpload ? '0 -2rem' : '0 0',
          opacity: hideUpload ? '0' : '1',
          visibility: hideUpload ? 'hidden' : 'visible',

          transitionProperty: 'max-height, padding, margin, border, translate, opacity, visibility',
          transitionDuration: hideUpload
            ? 'var(--pf-t--global--motion--duration--slide-out--default)'
            : 'var(--pf-t--global--motion--duration--slide-in--default)',
          transitionTimingFunction: 'cubic-bezier(.4, 0, .2, 1)',
        }}
        onTransitionEnd={(event) => {
          if (
            event.propertyName === 'visibility' &&
            event.currentTarget.style.visibility === 'hidden'
          ) {
            setUploadedFile(undefined);
          }
        }}
        hidden={hideUpload}
        isDisabled={props.isDisabled || (!!uploadedFile && !uploadStatus)}
        filename={uploadedFile?.name}
        dropzoneProps={{
          ...props.fileUploadProps?.dropzoneProps,
          onDropAccepted: (files) => {
            if (files.length === 0) {
              return;
            }

            const [file] = files;
            setUploadedFile(file);
            setUploadProgress(0);
            setUploadStatus(undefined);
            void props.onUpload(file, setUploadProgress, setUploadStatus);
          },
        }}
      >
        {uploadedFile ? (
          <FileUploadHelperText>
            <Progress
              value={uploadProgress}
              variant={uploadStatus}
              measureLocation={ProgressMeasureLocation.outside}
              aria-label="File upload progress"
            />
          </FileUploadHelperText>
        ) : (
          <FileUploadHelperText>
            <HelperText>{props.fileUploadHelperText}</HelperText>
          </FileUploadHelperText>
        )}
      </FileUpload>
    </div>
  );
}

export default FileSelector;
