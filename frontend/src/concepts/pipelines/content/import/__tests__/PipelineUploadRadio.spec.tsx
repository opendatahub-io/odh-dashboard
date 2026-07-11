import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PipelineUploadRadio from '#~/concepts/pipelines/content/import/PipelineUploadRadio';
import { PipelineUploadOption } from '#~/concepts/pipelines/content/import/utils';

describe('PipelineUploadRadio', () => {
  const defaultProps = {
    fileContents: '',
    setFileContents: jest.fn(),
    pipelineUrl: '',
    setPipelineUrl: jest.fn(),
    uploadOption: PipelineUploadOption.URL_IMPORT,
    setUploadOption: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the URL input when URL_IMPORT is selected', () => {
    render(<PipelineUploadRadio {...defaultProps} />);
    expect(screen.getByTestId('pipeline-url-input')).toBeInTheDocument();
  });

  it('should show default helper text when there is no error', () => {
    render(<PipelineUploadRadio {...defaultProps} />);
    expect(screen.getByText('URL must be publicly accessible')).toBeInTheDocument();
  });

  it('should show error message when pipelineUrlError is provided', () => {
    render(
      <PipelineUploadRadio
        {...defaultProps}
        pipelineUrlError="Enter a valid URL starting with http:// or https://"
      />,
    );
    expect(
      screen.getByText('Enter a valid URL starting with http:// or https://'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-url-error')).toBeInTheDocument();
    expect(screen.queryByText('URL must be publicly accessible')).not.toBeInTheDocument();
  });

  it('should call onPipelineUrlBlur when the input loses focus', () => {
    const onBlur = jest.fn();
    render(<PipelineUploadRadio {...defaultProps} onPipelineUrlBlur={onBlur} />);
    fireEvent.blur(screen.getByTestId('pipeline-url-input'));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('should call setPipelineUrl when the input value changes', () => {
    render(<PipelineUploadRadio {...defaultProps} />);
    fireEvent.change(screen.getByTestId('pipeline-url-input'), {
      target: { value: 'https://example.com/pipeline.yaml' },
    });
    expect(defaultProps.setPipelineUrl).toHaveBeenCalled();
  });

  it('should switch to file upload when the file upload radio is clicked', () => {
    render(<PipelineUploadRadio {...defaultProps} />);
    fireEvent.click(screen.getByTestId('upload-file-radio'));
    expect(defaultProps.setUploadOption).toHaveBeenCalledWith(PipelineUploadOption.FILE_UPLOAD);
  });
});
