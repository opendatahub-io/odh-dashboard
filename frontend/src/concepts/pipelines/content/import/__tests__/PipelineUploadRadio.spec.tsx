import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PipelineUploadRadio from '#~/concepts/pipelines/content/import/PipelineUploadRadio';
import { PipelineUploadOption } from '#~/concepts/pipelines/content/import/utils';

type HarnessProps = {
  initialUploadOption?: PipelineUploadOption;
  initialUrl?: string;
  initialIsUrlValid?: boolean;
  onValidChange?: (isValid: boolean) => void;
};

// Wraps the component the same way PipelineImportBase does: pipelineUrl and isUrlValid
// are controlled state owned by the parent, not local state in the child.
const Harness: React.FC<HarnessProps> = ({
  initialUploadOption = PipelineUploadOption.URL_IMPORT,
  initialUrl = '',
  initialIsUrlValid = true,
  onValidChange,
}) => {
  const [fileContents, setFileContents] = React.useState('');
  const [pipelineUrl, setPipelineUrl] = React.useState(initialUrl);
  const [uploadOption, setUploadOption] = React.useState(initialUploadOption);
  const [isUrlValid, setIsUrlValidState] = React.useState(initialIsUrlValid);

  const setIsUrlValid = (valid: boolean) => {
    setIsUrlValidState(valid);
    onValidChange?.(valid);
  };

  return (
    <>
      <PipelineUploadRadio
        fileContents={fileContents}
        setFileContents={setFileContents}
        pipelineUrl={pipelineUrl}
        setPipelineUrl={setPipelineUrl}
        uploadOption={uploadOption}
        setUploadOption={setUploadOption}
        isUrlValid={isUrlValid}
        setIsUrlValid={setIsUrlValid}
      />
      {/* Simulates the parent forcing validation at submit time, even if the field was never blurred */}
      <button type="button" onClick={() => setIsUrlValid(false)}>
        force-invalid
      </button>
    </>
  );
};

describe('PipelineUploadRadio', () => {
  it('should render the file upload UI by default and hide the URL input', () => {
    render(<Harness initialUploadOption={PipelineUploadOption.FILE_UPLOAD} />);
    expect(screen.getByTestId('pipeline-file-upload')).toBeInTheDocument();
    expect(screen.queryByTestId('pipeline-url-input')).not.toBeInTheDocument();
  });

  it('should show the URL input with no error when empty', () => {
    render(<Harness />);
    const input = screen.getByTestId('pipeline-url-input');
    expect(input).toBeInTheDocument();
    expect(screen.queryByTestId('pipeline-url-error')).not.toBeInTheDocument();
  });

  it('should not show an error while typing an invalid URL before blur', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByTestId('pipeline-url-input'), 'not-a-url');

    expect(screen.queryByTestId('pipeline-url-error')).not.toBeInTheDocument();
  });

  it('should show an error on blur when the URL is invalid', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByTestId('pipeline-url-input'), 'not-a-url');
    await user.tab();

    expect(screen.getByText('Invalid URL')).toBeInTheDocument();
  });

  it('should not show an error on blur when the URL is valid', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByTestId('pipeline-url-input'), 'https://example.com/pipeline.yaml');
    await user.tab();

    expect(screen.queryByTestId('pipeline-url-error')).not.toBeInTheDocument();
  });

  it('should clear the error as soon as the URL becomes valid again while typing', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByTestId('pipeline-url-input');
    await user.type(input, 'not-a-url');
    await user.tab();
    expect(screen.getByText('Invalid URL')).toBeInTheDocument();

    await user.click(input);
    await user.clear(input);
    await user.type(input, 'https://example.com/pipeline.yaml');

    expect(screen.queryByTestId('pipeline-url-error')).not.toBeInTheDocument();
  });

  it('should not flag an empty field as invalid even when isUrlValid is false', () => {
    render(<Harness initialIsUrlValid={false} initialUrl="" />);
    // Error text is only rendered when there is content in the field
    expect(screen.queryByTestId('pipeline-url-error')).not.toBeInTheDocument();
  });

  it('should reflect a validity flag forced by the parent (e.g. on submit) without requiring blur', async () => {
    const user = userEvent.setup();
    render(<Harness initialUrl="not-a-url" />);

    expect(screen.queryByTestId('pipeline-url-error')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'force-invalid' }));

    expect(screen.getByText('Invalid URL')).toBeInTheDocument();
  });

  it('should call setIsUrlValid with the freshly computed value, not a stale one', async () => {
    const user = userEvent.setup();
    const onValidChange = jest.fn();
    render(
      <Harness initialUrl="not-a-url" initialIsUrlValid={false} onValidChange={onValidChange} />,
    );

    const input = screen.getByTestId('pipeline-url-input');
    await user.click(input);
    await user.clear(input);
    await user.type(input, 'https://example.com');

    expect(onValidChange).toHaveBeenLastCalledWith(true);
  });
});
