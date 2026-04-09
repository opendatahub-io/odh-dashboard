import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import CodeSnippetModal from '~/app/components/common/CodeSnippetModal';

describe('CodeSnippetModal', () => {
  const mockOnClose = jest.fn();
  const defaultProps = {
    id: 'test-snippet',
    title: 'Test Code Snippet',
    code: 'const hello = "world";',
    downloadFileName: 'test.json',
    onClose: mockOnClose,
  };

  // Store original implementations
  const originalCreateElement = document.createElement;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original implementations
    document.createElement = originalCreateElement;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  it('should render modal with title and code', () => {
    render(<CodeSnippetModal {...defaultProps} />);

    expect(screen.getByText('Test Code Snippet')).toBeInTheDocument();
    expect(screen.getByText('const hello = "world";')).toBeInTheDocument();
  });

  it('should render with description when provided', () => {
    render(<CodeSnippetModal {...defaultProps} description="This is a test description" />);

    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('should render without description when not provided', () => {
    render(<CodeSnippetModal {...defaultProps} />);

    // Modal renders to portal, so query in document
    expect(document.querySelector('.pf-v6-c-modal-box__description')).not.toBeInTheDocument();
  });

  it('should use custom variant when provided', () => {
    render(<CodeSnippetModal {...defaultProps} variant="large" />);

    // Modal renders to portal, so query in document
    const modal = document.querySelector('.pf-v6-c-modal-box');
    expect(modal).toHaveClass('pf-m-lg');
  });

  it('should use custom download text when provided', () => {
    render(<CodeSnippetModal {...defaultProps} downloadText="Get File" />);

    expect(screen.getByTestId('test-snippet-download-button')).toHaveTextContent('Get File');
  });

  it('should use default download text when not provided', () => {
    render(<CodeSnippetModal {...defaultProps} />);

    expect(screen.getByTestId('test-snippet-download-button')).toHaveTextContent('Download');
  });

  it('should call onClose when close button is clicked', () => {
    render(<CodeSnippetModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('test-snippet-close-button'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should download file when download button is clicked', () => {
    render(<CodeSnippetModal {...defaultProps} />);

    // Mock URL APIs for download functionality
    const createObjectURLMock = jest.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = jest.fn();

    Object.defineProperty(global.URL, 'createObjectURL', {
      value: createObjectURLMock,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global.URL, 'revokeObjectURL', {
      value: revokeObjectURLMock,
      writable: true,
      configurable: true,
    });

    // Spy on HTMLAnchorElement click
    const clickSpy = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = jest.fn((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        element.click = clickSpy;
      }
      return element;
    }) as typeof document.createElement;

    fireEvent.click(screen.getByTestId('test-snippet-download-button'));

    // Verify Blob and URL creation
    expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob));

    // Verify link click
    expect(clickSpy).toHaveBeenCalledTimes(1);

    // Verify URL cleanup
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should copy code to clipboard when copy button is clicked', async () => {
    render(<CodeSnippetModal {...defaultProps} />);

    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });

    const copyButton = screen.getByLabelText('Copy to clipboard');

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('const hello = "world";');
    });

    // The "Copied!" text appears in the tooltip, not the button
    await waitFor(() => {
      expect(screen.queryByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should show copied state after successful copy', async () => {
    render(<CodeSnippetModal {...defaultProps} />);

    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });

    const copyButton = screen.getByLabelText('Copy to clipboard');

    // Click to copy
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('const hello = "world";');
    });

    // Verify "Copied!" text appears in tooltip
    await waitFor(() => {
      expect(screen.queryByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should handle copy failure gracefully', async () => {
    render(<CodeSnippetModal {...defaultProps} />);

    const mockWriteText = jest.fn().mockRejectedValue(new Error('Copy failed'));
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });

    const copyButton = screen.getByLabelText('Copy to clipboard');

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('const hello = "world";');
    });

    // Should not show "Copied!" on failure
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });

  it('should handle missing clipboard API gracefully', async () => {
    render(<CodeSnippetModal {...defaultProps} />);

    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const copyButton = screen.getByLabelText('Copy to clipboard');

    // Should not crash when clicking
    expect(() => fireEvent.click(copyButton)).not.toThrow();

    // Should not show "Copied!" when clipboard API is unavailable
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<CodeSnippetModal {...defaultProps} />);

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-labelledby', 'test-snippet-modal-title');
    expect(modal).toHaveAttribute('aria-describedby', 'test-snippet-modal-description');

    expect(screen.getByLabelText('Copy to clipboard')).toBeInTheDocument();
  });

  it('should display code with correct id', () => {
    render(<CodeSnippetModal {...defaultProps} />);

    // Modal renders to portal, so query in document
    const codeElement = document.querySelector('#test-snippet-code-content');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement).toHaveTextContent('const hello = "world";');
  });
});
