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
import { isValidHttpUrl } from '#~/utilities/utils.ts';
import { PipelineUploadOption } from './utils';
import PipelineFileUpload from './PipelineFileUpload';

type PipelineFileUploadProps = {
  fileContents: string;
  setFileContents: (fileContents: string) => void;
  pipelineUrl: string;
  setPipelineUrl: (url: string) => void;
  uploadOption: PipelineUploadOption;
  setUploadOption: (option: PipelineUploadOption) => void;
  isUrlValid: boolean;
  setIsUrlValid: (isValid: boolean) => void;
};

const PipelineUploadRadio: React.FC<PipelineFileUploadProps> = ({
  fileContents,
  setFileContents,
  pipelineUrl,
  setPipelineUrl,
  uploadOption,
  setUploadOption,
  isUrlValid,
  setIsUrlValid,
}) => {
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
                setIsUrlValid(true);
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
        </Split>
      </StackItem>
      <StackItem>
        <Alert
          variant="info"
          title="For expected file format, refer to Compile Pipeline Documentation."
          isInline
        />
      </StackItem>
      <StackItem>
        {uploadOption === PipelineUploadOption.FILE_UPLOAD ? (
          <PipelineFileUpload fileContents={fileContents} onUpload={setFileContents} />
        ) : (
          <FormGroup fieldId="pipeline-url">
            <TextInput
              type="url"
              id="pipeline-url"
              name="pipeline-url"
              data-testid="pipeline-url-input"
              value={pipelineUrl}
              onChange={(_e, value) => {
                setPipelineUrl(value);
                if (!isUrlValid) {
                  setIsUrlValid(isValidHttpUrl(value));
                }
              }}
              onBlur={(e) => setIsUrlValid(isValidHttpUrl(e.currentTarget.value))}
              validated={pipelineUrl.length === 0 || isUrlValid ? 'default' : 'error'}
            />
            {!isUrlValid && pipelineUrl.length > 0 && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem data-testid="pipeline-url-error" variant="error">
                    Invalid URL
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
            <FormHelperText>
              <HelperText>
                <HelperTextItem>URL must be publicly accessible</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        )}
      </StackItem>
    </Stack>
  );
};

export default PipelineUploadRadio;
