import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  FileUpload,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ErrorCode } from 'react-dropzone';
import { MAX_SIZE, MAX_SIZE_AS_MB } from '#~/concepts/pipelines/content/const';

type PipelineFileUploadProps = {
  fileContents: string;
  onUpload: (fileContents: string) => void;
};

const PipelineFileUpload: React.FC<PipelineFileUploadProps> = ({ fileContents, onUpload }) => {
  const [filename, setFilename] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [dropRejectedError, setDropRejectedError] = React.useState('');

  const resetSelection = () => {
    setFilename('');
    setDropRejectedError('');
    setIsLoading(false);
    onUpload('');
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <FileUpload
          id="text-file-simple"
          type="text"
          isReadOnly
          value={fileContents}
          filename={filename}
          filenamePlaceholder="Drag and drop a file or upload one"
          onDataChange={(e, content) => onUpload(content)}
          onFileInputChange={(e, file) => setFilename(file.name)}
          onReadStarted={() => {
            setDropRejectedError('');
            setIsLoading(true);
          }}
          onReadFinished={() => {
            setIsLoading(false);
          }}
          onClearClick={resetSelection}
          dropzoneProps={{
            accept: { 'application/x-yaml': ['.yml', '.yaml'] },
            // TODO: consider updating this value if we change the fastify server configs
            maxSize: MAX_SIZE,
            onDropRejected: (rejections) => {
              resetSelection();
              const error = rejections[0]?.errors?.[0] ?? {};

              let reason = error.message || 'Unknown reason';
              if (error.code === ErrorCode.FileTooLarge) {
                reason = `File size exceeds ${MAX_SIZE_AS_MB} MB`;
              }

              setDropRejectedError(reason);
            },
          }}
          isLoading={isLoading}
          isRequired
          allowEditingUploadedText={false}
          browseButtonText="Upload"
          data-testid="pipeline-file-upload"
        />
      </StackItem>
      {dropRejectedError && (
        <StackItem>
          <Alert
            data-testId="pipeline-file-upload-error"
            isInline
            title="Issue with file upload"
            variant="danger"
            actionClose={<AlertActionCloseButton onClose={() => setDropRejectedError('')} />}
          >
            {dropRejectedError}
          </Alert>
        </StackItem>
      )}
    </Stack>
  );
};

export default PipelineFileUpload;
