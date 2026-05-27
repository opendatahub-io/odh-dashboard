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
import type { DropEvent, DropzoneOptions, FileRejection } from 'react-dropzone';
import React, { useCallback, useMemo, useState } from 'react';
import { resolveSingleFileDropOutcome } from '~/app/utilities/dropzoneFileUpload';

/** Dropzone config for FileSelector — use `onDropRejected` on FileSelector, not here. */
export type FileSelectorDropzoneProps = Omit<
  Partial<DropzoneOptions>,
  'onDrop' | 'onDropAccepted' | 'onDropRejected'
>;

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
  onDropRejected?: (fileRejections: FileRejection[], event: DropEvent) => void;
  fileUploadProps?: Omit<FileUploadProps, 'id' | 'dropzoneProps'> & {
    dropzoneProps?: FileSelectorDropzoneProps;
  };
  fileUploadHelperText?: string;
}

function FileSelector(props: FileSelectorProps): React.JSX.Element {
  const {
    fileUploadProps,
    onDropRejected,
    onUpload,
    onClear,
    isDisabled,
    selected,
    placeholder,
    fileUploadHelperText,
    id,
  } = props;

  const [uploadedFile, setUploadedFile] = useState<File>();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'success' | 'danger'>();

  const dropzoneConfig = fileUploadProps?.dropzoneProps;

  const startUpload = useCallback(
    (file: File) => {
      setUploadedFile(file);
      setUploadProgress(0);
      setUploadStatus(undefined);
      void onUpload(file, setUploadProgress, setUploadStatus);
    },
    [onUpload],
  );

  const dropzoneProps = useMemo(() => {
    const onSingleFileDrop: (
      acceptedFiles: File[],
      fileRejections: FileRejection[],
      event: DropEvent,
    ) => void = (acceptedFiles, fileRejections, event) => {
      const outcome = resolveSingleFileDropOutcome(acceptedFiles, fileRejections);
      if (outcome.kind === 'reject') {
        onDropRejected?.(outcome.fileRejections, event);
      } else if (outcome.kind === 'upload') {
        startUpload(outcome.file);
      }
    };

    return {
      ...dropzoneConfig,
      onDrop: onSingleFileDrop,
    };
  }, [dropzoneConfig, onDropRejected, startUpload]);

  const hideUpload = !!selected;

  return (
    <div className="pf-v6-c-multiple-file-upload pf-v6-u-display-block">
      <TextInputGroup>
        <TextInputGroupMain
          inputProps={{ readOnly: true }}
          icon={<FileIcon />}
          placeholder={placeholder ?? 'No file selected'}
          value={selected}
        />
        {!!selected && (
          <TextInputGroupUtilities>
            <Button
              aria-label="Clear file"
              variant="plain"
              icon={<TimesIcon />}
              isDisabled={isDisabled}
              onClick={onClear}
            />
          </TextInputGroupUtilities>
        )}
      </TextInputGroup>
      <FileUpload
        className="pf-v6-u-mt-sm"
        onClearClick={() => setUploadedFile(undefined)}
        {...fileUploadProps}
        id={id}
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
        isDisabled={isDisabled || (!!uploadedFile && !uploadStatus)}
        filename={uploadedFile?.name}
        dropzoneProps={dropzoneProps}
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
            <HelperText>{fileUploadHelperText}</HelperText>
          </FileUploadHelperText>
        )}
      </FileUpload>
    </div>
  );
}

export default FileSelector;
