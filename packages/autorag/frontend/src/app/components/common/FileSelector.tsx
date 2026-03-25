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

// handle slide + fade in/out animations (implement later, not now)

interface FileSelectorProps<Files extends Array<string>> {
  id: string;
  files: Files;
  // controlled or uncontrolled
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
    <div className="pf-v6-c-multiple-file-upload">
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
      {!hideUpload && (
        <FileUpload
          id={props.id}
          browseButtonText="Upload"
          filenamePlaceholder="Drag and drop a file or upload"
          isDisabled={!!uploadedFile && !uploadStatus}
          filename={uploadedFile?.name}
          onFileInputChange={handleFileChange}
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
      )}
    </div>
  );
}

export default FileSelector;
