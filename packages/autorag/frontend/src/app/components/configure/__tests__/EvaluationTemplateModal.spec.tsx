import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import EvaluationTemplateModal from '~/app/components/configure/EvaluationTemplateModal';

describe('EvaluationTemplateModal', () => {
  const mockOnClose = jest.fn();

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

  it('should render modal with correct title', () => {
    render(<EvaluationTemplateModal onClose={mockOnClose} />);

    expect(screen.getByText('Evaluation data template')).toBeInTheDocument();
  });

  it('should render with correct description', () => {
    render(<EvaluationTemplateModal onClose={mockOnClose} />);

    expect(
      screen.getByText(
        'Use this JSON template to create an evaluation dataset. Each entry should include a question, the correct answers, and names of the documents that were used to determine the answers.',
      ),
    ).toBeInTheDocument();
  });

  it('should display evaluation template code', () => {
    render(<EvaluationTemplateModal onClose={mockOnClose} />);

    // Check for key parts of the template
    expect(screen.getByText(/"question": "<question 1>"/)).toBeInTheDocument();
    expect(screen.getByText(/"correct_answers":/)).toBeInTheDocument();
    expect(screen.getByText(/"correct_answer_document_ids":/)).toBeInTheDocument();
  });

  it('should have download button with correct text', () => {
    render(<EvaluationTemplateModal onClose={mockOnClose} />);

    const downloadButton = screen.getByTestId('evaluation-template-download-button');
    expect(downloadButton).toHaveTextContent('Download template');
  });

  it('should use correct filename for download', () => {
    render(<EvaluationTemplateModal onClose={mockOnClose} />);

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

    // Spy on HTMLAnchorElement to verify download attribute
    let downloadAttribute = '';
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = jest.fn((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        element.click = jest.fn();
        Object.defineProperty(element, 'download', {
          set: (value: string) => {
            downloadAttribute = value;
          },
          get: () => downloadAttribute,
        });
      }
      return element;
    }) as typeof document.createElement;

    fireEvent.click(screen.getByTestId('evaluation-template-download-button'));

    // Verify the download filename
    expect(downloadAttribute).toBe('evaluation-template.json');
  });

  it('should download correct template content as JSON', () => {
    render(<EvaluationTemplateModal onClose={mockOnClose} />);

    // Mock URL APIs
    let blobContent: Blob | undefined;
    const createObjectURLMock = jest.fn((blob: Blob) => {
      blobContent = blob;
      return 'blob:mock-url';
    });
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

    // Mock createElement to prevent actual download
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = jest.fn((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        element.click = jest.fn();
      }
      return element;
    }) as typeof document.createElement;

    fireEvent.click(screen.getByTestId('evaluation-template-download-button'));

    // Verify blob was created with correct type
    expect(blobContent).toBeInstanceOf(Blob);
    expect(blobContent?.type).toBe('application/json');
  });

  it('should call onClose when close button is clicked', () => {
    render(<EvaluationTemplateModal onClose={mockOnClose} />);

    fireEvent.click(screen.getByTestId('evaluation-template-close-button'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should copy template to clipboard when copy button is clicked', async () => {
    render(<EvaluationTemplateModal onClose={mockOnClose} />);

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
      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });

    // Verify the correct template was copied
    const copiedContent = mockWriteText.mock.calls[0][0];
    expect(copiedContent).toContain('"question": "<question 1>"');
    expect(copiedContent).toContain('"correct_answers"');
    expect(copiedContent).toContain('"correct_answer_document_ids"');
  });

  it('should show copied state after successful copy', async () => {
    render(<EvaluationTemplateModal onClose={mockOnClose} />);

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
      expect(screen.queryByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should render with small variant', () => {
    render(<EvaluationTemplateModal onClose={mockOnClose} />);

    // Modal renders to portal, so query in document
    const modal = document.querySelector('.pf-v6-c-modal-box');
    expect(modal).toHaveClass('pf-m-sm');
  });

  it('should have proper accessibility attributes', () => {
    render(<EvaluationTemplateModal onClose={mockOnClose} />);

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-labelledby', 'evaluation-template-modal-title');
    expect(modal).toHaveAttribute('aria-describedby', 'evaluation-template-modal-description');

    expect(screen.getByLabelText('Copy to clipboard')).toBeInTheDocument();
  });

  it('should display valid JSON template', () => {
    render(<EvaluationTemplateModal onClose={mockOnClose} />);

    // Modal renders to portal, so query in document
    const codeElement = document.querySelector('#evaluation-template-code-content');
    expect(codeElement).toBeInTheDocument();

    const codeContent = codeElement?.textContent || '';

    // Verify it's valid JSON (the template uses placeholders, so we check structure)
    expect(codeContent).toContain('[');
    expect(codeContent).toContain('{');
    expect(codeContent).toContain('"question"');
    expect(codeContent).toContain('"correct_answers"');
    expect(codeContent).toContain('"correct_answer_document_ids"');
    expect(codeContent).toContain(']');
  });

  it('should include multiple question examples in template', () => {
    render(<EvaluationTemplateModal onClose={mockOnClose} />);

    // Check for both question 1 and question 2
    expect(screen.getByText(/"question": "<question 1>"/)).toBeInTheDocument();
    expect(screen.getByText(/"question": "<question 2>"/)).toBeInTheDocument();
  });

  it('should include array placeholders in template', () => {
    render(<EvaluationTemplateModal onClose={mockOnClose} />);

    // Check for array placeholders (...)
    const ellipsisElements = screen.getAllByText(/"\.\.\."/);
    expect(ellipsisElements.length).toBeGreaterThan(0);
  });
});
