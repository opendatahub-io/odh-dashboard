import * as React from 'react';
import {
  Alert,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Radio,
  Split,
  SplitItem,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { useAppContext } from '#~/app/AppContext';
import { PipelineUploadOption } from './utils';
import PipelineFileUpload from './PipelineFileUpload';
import SamplePipelineSelector from './SamplePipelineSelector';

type PipelineFileUploadProps = {
  fileContents: string;
  setFileContents: (fileContents: string) => void;
  pipelineUrl: string;
  setPipelineUrl: (url: string) => void;
  uploadOption: PipelineUploadOption;
  setUploadOption: (option: PipelineUploadOption) => void;
};

const PipelineUploadRadio: React.FC<PipelineFileUploadProps> = ({
  fileContents,
  setFileContents,
  pipelineUrl,
  setPipelineUrl,
  uploadOption,
  setUploadOption,
}) => {
  const { dashboardConfig } = useAppContext();
  const showSamplePipelines = dashboardConfig.spec.dashboardConfig.defaultSamplePipelines;

  const renderUploadContent = () => {
    switch (uploadOption) {
      case PipelineUploadOption.FILE_UPLOAD:
        return <PipelineFileUpload fileContents={fileContents} onUpload={setFileContents} />;
      case PipelineUploadOption.URL_IMPORT:
        return (
          <FormGroup fieldId="pipeline-url">
            <TextInput
              type="url"
              id="pipeline-url"
              name="pipeline-url"
              data-testid="pipeline-url-input"
              value={pipelineUrl}
              onChange={(_e, value) => setPipelineUrl(value)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>URL must be publicly accessible</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        );
      case PipelineUploadOption.SAMPLE_PIPELINE:
        return <SamplePipelineSelector onFinish={setFileContents} />;
      default:
        return null;
    }
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <Split hasGutter>
          <SplitItem>
            <Radio
              isChecked={uploadOption === PipelineUploadOption.FILE_UPLOAD}
              name="upload-file"
              onChange={() => {
                setUploadOption(PipelineUploadOption.FILE_UPLOAD);
                setPipelineUrl('');
              }}
              label="Upload a file"
              id="upload-file"
              data-testid="upload-file-radio"
            />
          </SplitItem>
          <SplitItem>
            <Radio
              isChecked={uploadOption === PipelineUploadOption.URL_IMPORT}
              name="import-url"
              onChange={() => {
                setUploadOption(PipelineUploadOption.URL_IMPORT);
                setFileContents('');
              }}
              label="Import by url"
              id="import-url"
              data-testid="import-url-radio"
            />
          </SplitItem>
          {showSamplePipelines && (
            <SplitItem>
              <Radio
                isChecked={uploadOption === PipelineUploadOption.SAMPLE_PIPELINE}
                name="use-sample"
                onChange={() => {
                  setUploadOption(PipelineUploadOption.SAMPLE_PIPELINE);
                  setFileContents('');
                  setPipelineUrl('');
                }}
                label="Use sample"
                id="use-sample"
                data-testid="use-sample-radio"
              />
            </SplitItem>
          )}
        </Split>
      </StackItem>
      <StackItem>
        <Alert
          variant="info"
          title="For expected file format, refer to Compile Pipeline Documentation."
          isInline
        />
      </StackItem>
      <StackItem>{renderUploadContent()}</StackItem>
    </Stack>
  );
};

export default PipelineUploadRadio;
