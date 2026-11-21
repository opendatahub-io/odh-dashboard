import {
  Button,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MultipleFileUpload,
  MultipleFileUploadMain,
  Split,
  SplitItem,
  Spinner,
  StackItem,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  Truncate,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { EllipsisVIcon, TimesIcon, UploadIcon } from '@patternfly/react-icons';
import type { FileRejection } from 'react-dropzone';
import React from 'react';
import type { ExplorerFile } from '@odh-dashboard/internal/concepts/fileExplorer/types';
import {
  AUTOML_TRAINING_UPLOAD_MAX_BYTES,
  AUTOML_TRAINING_UPLOAD_MAX_FILES,
  AUTOML_TRAINING_UPLOAD_MAX_SIZE_MIB,
  TRAINING_DATA_FILE_ACCEPT,
  TRAINING_DATA_UPLOAD_NATIVE_ACCEPT,
} from '~/app/utilities/automlTrainingDataFile';

export type DatasetFileSourceMode = 'select' | 'upload';

type DatasetFilePickerProps = {
  dataset: 'training' | 'test';
  testIdPrefix: string;
  selectDescription: string;
  fileKey: string;
  selectedFile?: ExplorerFile;
  sourceMode: DatasetFileSourceMode;
  onSourceModeChange: (mode: DatasetFileSourceMode) => void;
  onBrowse: () => void;
  onRemoveSelection: () => void;
  canSelectFiles: boolean;
  formIsSubmitting: boolean;
  isUploading: boolean;
  isUploadDropdownOpen: boolean;
  onUploadDropdownOpenChange: (open: boolean) => void;
  nativeInputRef: React.Ref<HTMLInputElement>;
  onNativeFileChange: (file: File) => void;
  onDrop: (acceptedFiles: File[], fileRejections: FileRejection[]) => void;
  onClearUpload: () => void;
  onReplaceUpload: () => void;
};

function DatasetFilePicker({
  dataset,
  testIdPrefix,
  selectDescription,
  fileKey,
  selectedFile,
  sourceMode,
  onSourceModeChange,
  onBrowse,
  onRemoveSelection,
  canSelectFiles,
  formIsSubmitting,
  isUploading,
  isUploadDropdownOpen,
  onUploadDropdownOpenChange,
  nativeInputRef,
  onNativeFileChange,
  onDrop,
  onClearUpload,
  onReplaceUpload,
}: DatasetFilePickerProps): React.JSX.Element {
  const showUploadDropzone = !isUploading && !fileKey.trim();
  const selectedTableLabel = `Selected ${dataset} data file`;
  const uploadTableLabel =
    dataset === 'test' ? 'Test data file upload' : 'Training data file upload';

  return (
    <>
      <StackItem className="pf-v6-u-mt-sm">
        <ToggleGroup
          aria-label={`Choose how to add ${dataset} data`}
          className="automl-configure__toggle-group-full-width pf-v6-u-mb-md"
        >
          <ToggleGroupItem
            text="Select file from bucket"
            buttonId={`${testIdPrefix}-input-select`}
            data-testid={`${testIdPrefix}-source-select-toggle`}
            isSelected={sourceMode === 'select'}
            isDisabled={formIsSubmitting}
            onChange={() => onSourceModeChange('select')}
          />
          <ToggleGroupItem
            text="Upload new file"
            buttonId={`${testIdPrefix}-input-upload`}
            data-testid={`${testIdPrefix}-source-upload-toggle`}
            isSelected={sourceMode === 'upload'}
            isDisabled={formIsSubmitting}
            onChange={() => onSourceModeChange('upload')}
          />
        </ToggleGroup>
      </StackItem>

      {sourceMode === 'select' && (
        <>
          <StackItem>
            <Content component="h4">Select file from bucket</Content>
          </StackItem>
          <StackItem>
            <Content component="small">{selectDescription}</Content>
          </StackItem>
          <StackItem>
            <Button
              key={`browse-bucket-${testIdPrefix}`}
              variant="secondary"
              data-testid={
                testIdPrefix === 'training-data'
                  ? 'browse-bucket-button'
                  : `${testIdPrefix}-browse-bucket-button`
              }
              onClick={onBrowse}
              isDisabled={!canSelectFiles || formIsSubmitting}
            >
              Browse bucket
            </Button>
          </StackItem>
          {selectedFile && (
            <StackItem>
              <Table
                aria-label={selectedTableLabel}
                variant="compact"
                className="automl-configure__dataset-file-table"
              >
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Type</Th>
                    <Th />
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td dataLabel="Name">
                      <span title={selectedFile.path}>
                        <Truncate content={selectedFile.name} />
                      </span>
                    </Td>
                    <Td dataLabel="Type">{selectedFile.type}</Td>
                    <Td isActionCell>
                      <Tooltip content="Remove selection">
                        <Button
                          size="sm"
                          variant="plain"
                          aria-label="Remove selection"
                          icon={<TimesIcon />}
                          isDisabled={formIsSubmitting}
                          onClick={onRemoveSelection}
                        />
                      </Tooltip>
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </StackItem>
          )}
        </>
      )}

      {sourceMode === 'upload' && (
        <>
          <StackItem>
            <Content component="h4">Upload file</Content>
          </StackItem>
          <StackItem>
            <Content component="small" id={`${testIdPrefix}-upload-description`}>
              Drop a file here or browse to select a file.
            </Content>
          </StackItem>
          <StackItem>
            <input
              ref={nativeInputRef}
              type="file"
              hidden
              data-testid={`${
                testIdPrefix === 'training-data'
                  ? 'automl-upload-file-input'
                  : `${testIdPrefix}-upload-file-input`
              }`}
              accept={TRAINING_DATA_UPLOAD_NATIVE_ACCEPT}
              aria-hidden
              tabIndex={-1}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                input.value = '';
                if (!file) {
                  return;
                }
                onNativeFileChange(file);
              }}
            />
            {showUploadDropzone && (
              <MultipleFileUpload
                aria-describedby={`${testIdPrefix}-upload-description`}
                data-testid={`${testIdPrefix}-upload-zone`}
                dropzoneProps={{
                  accept: TRAINING_DATA_FILE_ACCEPT,
                  disabled: formIsSubmitting || isUploading,
                  maxFiles: AUTOML_TRAINING_UPLOAD_MAX_FILES,
                  maxSize: AUTOML_TRAINING_UPLOAD_MAX_BYTES,
                  multiple: false,
                  onDrop,
                }}
              >
                <MultipleFileUploadMain
                  titleIcon={<UploadIcon />}
                  titleText="Drag and drop files here"
                  titleTextSeparator="or"
                  infoText={`Accepted file types: CSV. Maximum file size: ${AUTOML_TRAINING_UPLOAD_MAX_SIZE_MIB} MiB`}
                  browseButtonText="Upload"
                />
              </MultipleFileUpload>
            )}
            {!showUploadDropzone && (
              <Table
                aria-label={uploadTableLabel}
                borders
                variant="compact"
                className="pf-v6-u-w-100"
              >
                <Thead>
                  <Tr>
                    <Th>File</Th>
                    <Th aria-label="Actions" />
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td
                      dataLabel="File"
                      data-testid={`${
                        testIdPrefix === 'training-data'
                          ? 'uploaded-file-cell'
                          : `${testIdPrefix}-uploaded-file-cell`
                      }`}
                    >
                      <Split hasGutter>
                        {isUploading && (
                          <SplitItem>
                            <Spinner
                              size="md"
                              aria-label="Uploading file"
                              data-testid={`${testIdPrefix}-upload-spinner`}
                            />
                          </SplitItem>
                        )}
                        <SplitItem isFilled>
                          {isUploading ? 'Uploading…' : <Truncate content={fileKey} />}
                        </SplitItem>
                      </Split>
                    </Td>
                    <Td isActionCell modifier="fitContent">
                      <Dropdown
                        isOpen={isUploadDropdownOpen}
                        onOpenChange={onUploadDropdownOpenChange}
                        shouldFocusToggleOnSelect
                        toggle={(toggleRef) => (
                          <MenuToggle
                            ref={toggleRef}
                            variant="plain"
                            aria-label="Uploaded file actions"
                            icon={<EllipsisVIcon />}
                            onClick={() => onUploadDropdownOpenChange(!isUploadDropdownOpen)}
                            isExpanded={isUploadDropdownOpen}
                            isDisabled={formIsSubmitting || isUploading}
                          />
                        )}
                        popperProps={{ position: 'end', preventOverflow: true }}
                      >
                        <DropdownList>
                          <DropdownItem
                            key="remove"
                            data-testid={`${testIdPrefix}-upload-remove`}
                            isDisabled={formIsSubmitting}
                            onClick={onClearUpload}
                          >
                            Remove
                          </DropdownItem>
                          <DropdownItem
                            key="replace"
                            data-testid={`${testIdPrefix}-upload-replace`}
                            isDisabled={formIsSubmitting}
                            onClick={onReplaceUpload}
                          >
                            Replace
                          </DropdownItem>
                        </DropdownList>
                      </Dropdown>
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            )}
          </StackItem>
        </>
      )}
    </>
  );
}

export default DatasetFilePicker;
