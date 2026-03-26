import {
  FileUpload,
  FileUploadHelperText,
  FileUploadProps,
  Progress,
  ProgressMeasureLocation,
} from '@patternfly/react-core';
import { TypeaheadSelect } from 'mod-arch-shared';
import { TypeaheadSelectProps } from 'mod-arch-shared/dist/components/TypeaheadSelect';
import React, { useState } from 'react';

interface FileSelectorProps<Files extends Array<string>> {
  id: string;
  files: Files;
  selected?: Files[number];
  onSelect: (selected: string) => void;
  onUpload: (
    file: File,
    setProgress: (progress: number) => void,
    setStatus: (status: 'success' | 'danger') => void,
  ) => void;
  typeaheadProps?: Omit<TypeaheadSelectProps, 'selectOptions'>;
  fileUploadProps?: FileUploadProps;
}

function FileSelector<Files extends Array<string>>(
  props: FileSelectorProps<Files>,
): React.JSX.Element {
  const [selected, setSelected] = useState<Files[number]>('');

  const [uploadedFile, setUploadedFile] = useState<File>();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'success' | 'danger'>();

  const hideUpload = !!(props.selected ?? selected);

  const handleFileChange = async (event: unknown, file: File) => {
    setUploadedFile(file);
    setUploadProgress(0);
    setUploadStatus(undefined);
    props.onUpload(file, setUploadProgress, setUploadStatus);
  };

  return (
    <div className="pf-v6-c-multiple-file-upload pf-v6-u-display-block">
      <div style={{ position: 'relative', zIndex: '1' }}>
        <TypeaheadSelect
          selectOptions={props.files.map((file) => ({ content: file, value: file }))}
          selected={props.selected ?? selected}
          onSelect={(_event, _selection) => {
            const selection = String(_selection);
            props.onSelect(selection);
            setSelected(selection);
          }}
          allowClear
          onClearSelection={() => {
            props.onSelect('');
            setSelected('');
          }}
          {...props.typeaheadProps}
        />
      </div>
      <FileUpload
        id={props.id}
        style={{
          maxHeight: hideUpload ? '0' : '6rem',
          padding: hideUpload ? '0' : undefined,
          marginTop: hideUpload ? '0' : 'var(--pf-t--global--spacer--sm)',
          border: hideUpload ? '0' : undefined,

          translate: hideUpload ? '0 -2rem' : '0 0',
          opacity: hideUpload ? '0' : '1',
          visibility: hideUpload ? 'hidden' : 'visible',

          transition: 'max-height, padding, marginTop, border, translate, opacity, visibility',
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
        browseButtonText="Upload"
        filenamePlaceholder="Drag and drop a file or upload"
        hidden={hideUpload}
        isDisabled={!!uploadedFile && !uploadStatus}
        filename={uploadedFile?.name}
        onFileInputChange={handleFileChange}
        onClearClick={() => setUploadedFile(undefined)}
        {...props.fileUploadProps}
      >
        {!!uploadedFile && (
          <FileUploadHelperText>
            <Progress
              value={uploadProgress}
              variant={uploadStatus}
              measureLocation={ProgressMeasureLocation.outside}
              aria-label="File upload progress"
            />
          </FileUploadHelperText>
        )}
      </FileUpload>
    </div>
  );
}

export default FileSelector;
