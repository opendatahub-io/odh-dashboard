import * as React from 'react';
import { FileUpload } from '@patternfly/react-core';

type PipelineFileUploadProps = {
  fileContents: string;
  onUpload: (fileContents: string) => void;
};

const PipelineFileUpload: React.FC<PipelineFileUploadProps> = ({ fileContents, onUpload }) => {
  const [filename, setFilename] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  return (
    <FileUpload
      id="text-file-simple"
      type="text"
      isReadOnly
      value={fileContents}
      filename={filename}
      filenamePlaceholder="Drag and drop a file or upload one"
      onDataChange={(e, content) => onUpload(content)}
      onFileInputChange={(e, file) => setFilename(file.name)}
      onReadStarted={() => setIsLoading(true)}
      onReadFinished={() => {
        setIsLoading(false);
      }}
      onClearClick={() => {
        setFilename('');
        onUpload('');
      }}
      dropzoneProps={{
        accept: { 'application/x-yaml': ['.yml', '.yaml'] },
      }}
      isLoading={isLoading}
      isRequired
      allowEditingUploadedText={false}
      browseButtonText="Upload"
    />
  );
};

export default PipelineFileUpload;
