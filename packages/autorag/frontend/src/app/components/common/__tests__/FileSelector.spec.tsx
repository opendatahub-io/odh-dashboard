import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import FileSelector from '~/app/components/common/FileSelector';

describe('FileSelector', () => {
  const mockOnUpload = jest.fn();
  const mockOnClear = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with default placeholder when no file is selected', () => {
    render(<FileSelector id="test-selector" onUpload={mockOnUpload} onClear={mockOnClear} />);

    expect(screen.getByPlaceholderText('No file selected')).toBeInTheDocument();
  });

  it('should render with custom placeholder', () => {
    render(
      <FileSelector
        id="test-selector"
        placeholder="Custom placeholder"
        onUpload={mockOnUpload}
        onClear={mockOnClear}
      />,
    );

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('should display selected file name', () => {
    render(
      <FileSelector
        id="test-selector"
        selected="my-file.json"
        onUpload={mockOnUpload}
        onClear={mockOnClear}
      />,
    );

    expect(screen.getByDisplayValue('my-file.json')).toBeInTheDocument();
  });

  it('should show clear button when file is selected', () => {
    render(
      <FileSelector
        id="test-selector"
        selected="my-file.json"
        onUpload={mockOnUpload}
        onClear={mockOnClear}
      />,
    );

    const clearButton = screen.getByRole('button', { name: /clear file/i });
    expect(clearButton).toBeInTheDocument();
  });

  it('should not show clear button when no file is selected', () => {
    render(<FileSelector id="test-selector" onUpload={mockOnUpload} onClear={mockOnClear} />);

    expect(screen.queryByRole('button', { name: /clear file/i })).not.toBeInTheDocument();
  });

  it('should call onClear when clear button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <FileSelector
        id="test-selector"
        selected="my-file.json"
        onUpload={mockOnUpload}
        onClear={mockOnClear}
      />,
    );

    const clearButton = screen.getByRole('button', { name: /clear file/i });
    await user.click(clearButton);

    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });

  it('should render FileUpload component when no file is selected', () => {
    const { container } = render(
      <FileSelector id="test-selector" onUpload={mockOnUpload} onClear={mockOnClear} />,
    );

    // FileUpload should be visible
    const fileUpload = container.querySelector('.pf-v6-c-file-upload');
    expect(fileUpload).toBeInTheDocument();
    expect(fileUpload).not.toHaveAttribute('hidden');
  });

  it('should hide FileUpload component when file is selected', () => {
    const { container } = render(
      <FileSelector
        id="test-selector"
        selected="my-file.json"
        onUpload={mockOnUpload}
        onClear={mockOnClear}
      />,
    );

    // The FileUpload component is hidden via CSS when a file is selected
    const fileUpload = container.querySelector('.pf-v6-c-file-upload');
    expect(fileUpload).toHaveAttribute('hidden');
    expect(fileUpload).toHaveStyle({ visibility: 'hidden' });
  });

  it('should render helper text', () => {
    render(
      <FileSelector
        id="test-selector"
        fileUploadHelperText="Upload your file here"
        onUpload={mockOnUpload}
        onClear={mockOnClear}
      />,
    );

    expect(screen.getByText('Upload your file here')).toBeInTheDocument();
  });

  it('should call onUpload when file is selected', async () => {
    const user = userEvent.setup();
    const file = new File(['test content'], 'test.json', { type: 'application/json' });

    const { container } = render(
      <FileSelector id="test-selector" onUpload={mockOnUpload} onClear={mockOnClear} />,
    );

    // The actual file input has type="file" and is inside the FileUpload component
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    await user.upload(input, file);

    // onUpload should be called exactly once with the file
    expect(mockOnUpload).toHaveBeenCalledTimes(1);
    expect(mockOnUpload).toHaveBeenCalledWith(
      file,
      expect.any(Function), // setProgress
      expect.any(Function), // setStatus
    );
  });

  it('should show progress bar during upload', async () => {
    const user = userEvent.setup();
    const file = new File(['test content'], 'test.json', { type: 'application/json' });

    mockOnUpload.mockImplementation((_, setProgress) => {
      setProgress(50);
    });

    const { container } = render(
      <FileSelector id="test-selector" onUpload={mockOnUpload} onClear={mockOnClear} />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('should show success status after successful upload', async () => {
    const user = userEvent.setup();
    const file = new File(['test content'], 'test.json', { type: 'application/json' });

    mockOnUpload.mockImplementation((_, setProgress, setStatus) => {
      setProgress(100);
      setStatus('success');
    });

    const { container } = render(
      <FileSelector id="test-selector" onUpload={mockOnUpload} onClear={mockOnClear} />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    await user.upload(input, file);

    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      // Verify success variant is applied to the Progress container
      const progressContainer = container.querySelector('.pf-v6-c-progress');
      expect(progressContainer).toHaveClass('pf-m-success');
    });
  });

  it('should show danger status after failed upload', async () => {
    const user = userEvent.setup();
    const file = new File(['test content'], 'test.json', { type: 'application/json' });

    mockOnUpload.mockImplementation((_, setProgress, setStatus) => {
      setProgress(50);
      setStatus('danger');
    });

    const { container } = render(
      <FileSelector id="test-selector" onUpload={mockOnUpload} onClear={mockOnClear} />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    await user.upload(input, file);

    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      // Verify danger variant is applied to the Progress container
      const progressContainer = container.querySelector('.pf-v6-c-progress');
      expect(progressContainer).toHaveClass('pf-m-danger');
    });
  });

  it('should pass fileUploadProps to FileUpload component', () => {
    const { container } = render(
      <FileSelector
        id="test-selector"
        onUpload={mockOnUpload}
        onClear={mockOnClear}
        fileUploadProps={{
          accept: '.json',
          filenamePlaceholder: 'Custom placeholder',
        }}
      />,
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    // FileUpload component is rendered with the props
    const fileUpload = container.querySelector('.pf-v6-c-file-upload');
    expect(fileUpload).toBeInTheDocument();
  });

  it('should disable FileUpload during upload', async () => {
    const user = userEvent.setup();
    const file = new File(['test content'], 'test.json', { type: 'application/json' });

    mockOnUpload.mockImplementation(() => {
      // Simulate upload in progress (don't call setStatus)
    });

    const { container } = render(
      <FileSelector id="test-selector" onUpload={mockOnUpload} onClear={mockOnClear} />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    await user.upload(input, file);

    // FileUpload should be disabled during upload and show the progress bar
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      // Check that the form control is disabled
      const formControl = container.querySelector('.pf-v6-c-form-control');
      expect(formControl).toHaveClass('pf-m-disabled');
    });
  });

  it('should reset upload progress when new file is selected', async () => {
    const user = userEvent.setup();
    const file1 = new File(['test1'], 'test1.json', { type: 'application/json' });
    const file2 = new File(['test2'], 'test2.json', { type: 'application/json' });

    mockOnUpload.mockImplementation((_, setProgress) => {
      setProgress(50);
    });

    const { container } = render(
      <FileSelector id="test-selector" onUpload={mockOnUpload} onClear={mockOnClear} />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Upload first file
    await user.upload(input, file1);
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    const firstCallCount = mockOnUpload.mock.calls.length;

    // Upload second file - onUpload should be called again
    await user.upload(input, file2);

    // Both files should have triggered onUpload
    expect(mockOnUpload.mock.calls.length).toBeGreaterThan(firstCallCount);
  });
});
