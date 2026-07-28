import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import EvaluationFileCreator from '~/app/components/configure/EvaluationFileCreator';
import { useUploadToStorageMutation } from '~/app/hooks/mutations';

jest.mock('~/app/hooks/mutations', () => ({
  ...jest.requireActual('~/app/hooks/mutations'),
  useUploadToStorageMutation: jest.fn(),
}));

const mockNotificationError = jest.fn();
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(() => ({
    success: jest.fn(),
    error: mockNotificationError,
    info: jest.fn(),
    warning: jest.fn(),
    remove: jest.fn(),
  })),
}));

jest.mock('@odh-dashboard/internal/concepts/fileExplorer/S3FileExplorer/S3FileExplorer', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onClose,
    onSelectFiles,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSelectFiles: (files: Array<{ name: string; path: string }>) => void;
  }) =>
    isOpen ? (
      <div data-testid="s3-file-explorer-creator">
        <button data-testid="s3-creator-close" onClick={onClose}>
          Close
        </button>
        <button
          data-testid="s3-creator-select"
          onClick={() =>
            onSelectFiles([
              { name: 'doc1.pdf', path: '/doc1.pdf' },
              { name: 'doc2.txt', path: '/doc2.txt' },
            ])
          }
        >
          Select Files
        </button>
        <button
          data-testid="s3-creator-select-single"
          onClick={() => onSelectFiles([{ name: 'single.md', path: '/single.md' }])}
        >
          Select Single
        </button>
      </div>
    ) : null,
}));

const mockUseUploadToStorageMutation = jest.mocked(useUploadToStorageMutation);

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onCreated: jest.fn(),
  namespace: 'test-namespace',
  secretName: 'test-secret',
  experimentName: 'My Experiment',
  inputDataKey: 'data-folder/',
};

describe('EvaluationFileCreator', () => {
  const mockUploadMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUploadToStorageMutation.mockReturnValue({
      mutateAsync: mockUploadMutateAsync,
    } as unknown as ReturnType<typeof useUploadToStorageMutation>);
  });

  describe('rendering', () => {
    it('should render nothing when isOpen is false', () => {
      render(<EvaluationFileCreator {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('evaluation-creator-modal')).not.toBeInTheDocument();
    });

    it('should render the modal when isOpen is true', () => {
      render(<EvaluationFileCreator {...defaultProps} />);

      expect(screen.getByTestId('evaluation-creator-modal')).toBeInTheDocument();
      expect(screen.getByText('Create an evaluation source')).toBeInTheDocument();
    });

    it('should render the Q&A form fields', () => {
      render(<EvaluationFileCreator {...defaultProps} />);

      expect(screen.getByTestId('eval-question')).toBeInTheDocument();
      expect(screen.getByTestId('eval-answer')).toBeInTheDocument();
    });

    it('should render empty state in table when no rows exist', () => {
      render(<EvaluationFileCreator {...defaultProps} />);

      expect(screen.getByText('No questions or answers')).toBeInTheDocument();
    });
  });

  describe('add button state', () => {
    it('should disable Add button when form is empty', () => {
      render(<EvaluationFileCreator {...defaultProps} />);

      expect(screen.getByTestId('eval-add-row')).toBeDisabled();
    });

    it('should disable Add button when only question is filled', async () => {
      const user = userEvent.setup();
      render(<EvaluationFileCreator {...defaultProps} />);

      await user.type(screen.getByTestId('eval-question'), 'A question');

      expect(screen.getByTestId('eval-add-row')).toBeDisabled();
    });

    it('should disable Add button when question and answer are filled but no documents', async () => {
      const user = userEvent.setup();
      render(<EvaluationFileCreator {...defaultProps} />);

      await user.type(screen.getByTestId('eval-question'), 'A question');
      await user.type(screen.getByTestId('eval-answer'), 'An answer');

      expect(screen.getByTestId('eval-add-row')).toBeDisabled();
    });

    it('should enable Add button when all fields are filled', async () => {
      const user = userEvent.setup();
      render(<EvaluationFileCreator {...defaultProps} />);

      await user.type(screen.getByTestId('eval-question'), 'A question');
      await user.type(screen.getByTestId('eval-answer'), 'An answer');
      await user.click(screen.getByTestId('eval-select-documents'));
      await user.click(screen.getByTestId('s3-creator-select'));

      expect(screen.getByTestId('eval-add-row')).toBeEnabled();
    });
  });

  describe('adding rows', () => {
    it('should add a row to the table and clear the form', async () => {
      const user = userEvent.setup();
      render(<EvaluationFileCreator {...defaultProps} />);

      await user.type(screen.getByTestId('eval-question'), 'What is AI?');
      await user.type(screen.getByTestId('eval-answer'), 'Artificial Intelligence');
      await user.click(screen.getByTestId('eval-select-documents'));
      await user.click(screen.getByTestId('s3-creator-select-single'));
      await user.click(screen.getByTestId('eval-add-row'));

      expect(screen.queryByText('No questions or answers')).not.toBeInTheDocument();
      expect(screen.getByText('What is AI?')).toBeInTheDocument();
      expect(screen.getByText('Artificial Intelligence')).toBeInTheDocument();
      expect(screen.getByText('single.md')).toBeInTheDocument();

      expect(screen.getByTestId('eval-question')).toHaveValue('');
      expect(screen.getByTestId('eval-answer')).toHaveValue('');
    });

    it('should not add a row when form is invalid', async () => {
      const user = userEvent.setup();
      render(<EvaluationFileCreator {...defaultProps} />);

      await user.type(screen.getByTestId('eval-question'), 'A question');
      // No answer, no documents — Add button should be disabled
      expect(screen.getByTestId('eval-add-row')).toBeDisabled();

      expect(screen.getByText('No questions or answers')).toBeInTheDocument();
    });
  });

  describe('editing rows', () => {
    it('should populate form with row data and remove the row from table', async () => {
      const user = userEvent.setup();
      render(<EvaluationFileCreator {...defaultProps} />);

      // Add a row first
      await user.type(screen.getByTestId('eval-question'), 'Q1');
      await user.type(screen.getByTestId('eval-answer'), 'A1');
      await user.click(screen.getByTestId('eval-select-documents'));
      await user.click(screen.getByTestId('s3-creator-select-single'));
      await user.click(screen.getByTestId('eval-add-row'));

      expect(screen.getByText('Q1')).toBeInTheDocument();

      // Click the kebab menu and Edit
      const kebab = screen.getByRole('button', { name: /kebab toggle/i });
      await user.click(kebab);
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }));

      // Row removed from table, form populated
      expect(screen.getByText('No questions or answers')).toBeInTheDocument();
      expect(screen.getByTestId('eval-question')).toHaveValue('Q1');
      expect(screen.getByTestId('eval-answer')).toHaveValue('A1');
    });
  });

  describe('deleting rows', () => {
    it('should remove a row from the table', async () => {
      const user = userEvent.setup();
      render(<EvaluationFileCreator {...defaultProps} />);

      // Add a row
      await user.type(screen.getByTestId('eval-question'), 'Q1');
      await user.type(screen.getByTestId('eval-answer'), 'A1');
      await user.click(screen.getByTestId('eval-select-documents'));
      await user.click(screen.getByTestId('s3-creator-select-single'));
      await user.click(screen.getByTestId('eval-add-row'));

      expect(screen.getByText('Q1')).toBeInTheDocument();

      // Delete via kebab
      const kebab = screen.getByRole('button', { name: /kebab toggle/i });
      await user.click(kebab);
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

      expect(screen.getByText('No questions or answers')).toBeInTheDocument();
    });
  });

  describe('document management', () => {
    it('should show Select button when inputDataKey is a folder', () => {
      render(<EvaluationFileCreator {...defaultProps} inputDataKey="data-folder/" />);

      expect(screen.getByTestId('eval-select-documents')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Select the documents that contain the relevant information for the correct answer.',
        ),
      ).toBeInTheDocument();
    });

    it('should hide Select button and show file reference when inputDataKey is a file', () => {
      render(<EvaluationFileCreator {...defaultProps} inputDataKey="folder/data.json" />);

      expect(screen.queryByTestId('eval-select-documents')).not.toBeInTheDocument();
      expect(
        screen.getByText('The selected input data file will be used as the document reference.'),
      ).toBeInTheDocument();
      expect(screen.getByText('data.json')).toBeInTheDocument();
    });

    it('should open S3FileExplorer when Select is clicked', async () => {
      const user = userEvent.setup();
      render(<EvaluationFileCreator {...defaultProps} />);

      await user.click(screen.getByTestId('eval-select-documents'));

      expect(screen.getByTestId('s3-file-explorer-creator')).toBeInTheDocument();
    });

    it('should add selected documents and deduplicate', async () => {
      const user = userEvent.setup();
      render(<EvaluationFileCreator {...defaultProps} />);

      // Select documents twice
      await user.click(screen.getByTestId('eval-select-documents'));
      await user.click(screen.getByTestId('s3-creator-select'));

      expect(screen.getByText('doc1.pdf')).toBeInTheDocument();
      expect(screen.getByText('doc2.txt')).toBeInTheDocument();

      // Select again — should deduplicate
      await user.click(screen.getByTestId('eval-select-documents'));
      await user.click(screen.getByTestId('s3-creator-select'));

      expect(screen.getAllByText('doc1.pdf')).toHaveLength(1);
      expect(screen.getAllByText('doc2.txt')).toHaveLength(1);
    });

    it('should remove a document when remove button is clicked', async () => {
      const user = userEvent.setup();
      render(<EvaluationFileCreator {...defaultProps} />);

      await user.click(screen.getByTestId('eval-select-documents'));
      await user.click(screen.getByTestId('s3-creator-select'));

      expect(screen.getByText('doc1.pdf')).toBeInTheDocument();

      const removeButton = screen.getByRole('button', { name: 'Remove doc1.pdf' });
      await user.click(removeButton);

      expect(screen.queryByText('doc1.pdf')).not.toBeInTheDocument();
      expect(screen.getByText('doc2.txt')).toBeInTheDocument();
    });

    it('should not show remove buttons when inputDataKey is a file', () => {
      render(<EvaluationFileCreator {...defaultProps} inputDataKey="folder/data.json" />);

      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });
  });

  describe('submit button state', () => {
    it('should disable submit when no rows exist', () => {
      render(<EvaluationFileCreator {...defaultProps} />);

      expect(screen.getByTestId('eval-create-submit')).toBeDisabled();
    });

    it('should disable submit when form is dirty', async () => {
      const user = userEvent.setup();
      render(<EvaluationFileCreator {...defaultProps} inputDataKey="folder/data.json" />);

      // Add a row
      await user.type(screen.getByTestId('eval-question'), 'Q1');
      await user.type(screen.getByTestId('eval-answer'), 'A1');
      await user.click(screen.getByTestId('eval-add-row'));

      // Type something in question (dirty form)
      await user.type(screen.getByTestId('eval-question'), 'partial');

      expect(screen.getByTestId('eval-create-submit')).toBeDisabled();
    });

    it('should enable submit when rows exist and form is clean', async () => {
      const user = userEvent.setup();
      render(<EvaluationFileCreator {...defaultProps} inputDataKey="folder/data.json" />);

      await user.type(screen.getByTestId('eval-question'), 'Q1');
      await user.type(screen.getByTestId('eval-answer'), 'A1');
      await user.click(screen.getByTestId('eval-add-row'));

      expect(screen.getByTestId('eval-create-submit')).toBeEnabled();
    });
  });

  describe('submission', () => {
    it('should upload JSON file and call onCreated on success', async () => {
      const user = userEvent.setup();
      mockUploadMutateAsync.mockResolvedValue({ key: 'eval-file.json' });

      render(<EvaluationFileCreator {...defaultProps} inputDataKey="folder/data.json" />);

      await user.type(screen.getByTestId('eval-question'), 'What is ML?');
      await user.type(screen.getByTestId('eval-answer'), 'Machine Learning');
      await user.click(screen.getByTestId('eval-add-row'));
      await user.click(screen.getByTestId('eval-create-submit'));

      await waitFor(() => {
        expect(mockUploadMutateAsync).toHaveBeenCalledTimes(1);
      });

      const { file } = mockUploadMutateAsync.mock.calls[0][0] as { file: File };
      expect(file.type).toBe('application/json');
      expect(file.name).toMatch(/^My_Experiment_\d+T\d+Z\.json$/);

      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(file);
      });
      const content = JSON.parse(text);
      expect(content).toEqual([
        {
          question: 'What is ML?',
          correct_answers: ['Machine Learning'], // eslint-disable-line camelcase
          correct_answer_document_ids: ['data.json'], // eslint-disable-line camelcase
        },
      ]);

      expect(defaultProps.onCreated).toHaveBeenCalledWith('eval-file.json');
    });

    it('should reset all state after successful submission', async () => {
      const user = userEvent.setup();
      mockUploadMutateAsync.mockResolvedValue({ key: 'eval-file.json' });

      const { rerender } = render(
        <EvaluationFileCreator {...defaultProps} inputDataKey="folder/data.json" />,
      );

      // Add a row and submit
      await user.type(screen.getByTestId('eval-question'), 'What is ML?');
      await user.type(screen.getByTestId('eval-answer'), 'Machine Learning');
      await user.click(screen.getByTestId('eval-add-row'));
      await user.click(screen.getByTestId('eval-create-submit'));

      await waitFor(() => {
        expect(defaultProps.onCreated).toHaveBeenCalled();
      });

      // Simulate parent closing and reopening the modal
      rerender(
        <EvaluationFileCreator {...defaultProps} isOpen={false} inputDataKey="folder/data.json" />,
      );
      rerender(<EvaluationFileCreator {...defaultProps} isOpen inputDataKey="folder/data.json" />);

      // Table should be empty — the previous row should not persist
      expect(screen.getByText('No questions or answers')).toBeInTheDocument();
      expect(screen.queryByText('What is ML?')).not.toBeInTheDocument();
    });

    it('should show error notification on upload failure', async () => {
      const user = userEvent.setup();
      mockUploadMutateAsync.mockRejectedValue(new Error('Upload failed'));

      render(<EvaluationFileCreator {...defaultProps} inputDataKey="folder/data.json" />);

      await user.type(screen.getByTestId('eval-question'), 'Q1');
      await user.type(screen.getByTestId('eval-answer'), 'A1');
      await user.click(screen.getByTestId('eval-add-row'));
      await user.click(screen.getByTestId('eval-create-submit'));

      await waitFor(() => {
        expect(mockNotificationError).toHaveBeenCalledWith(
          'Failed to create evaluation file',
          'Upload failed',
        );
      });
    });

    it('should handle non-Error upload failures', async () => {
      const user = userEvent.setup();
      mockUploadMutateAsync.mockRejectedValue('String error');

      render(<EvaluationFileCreator {...defaultProps} inputDataKey="folder/data.json" />);

      await user.type(screen.getByTestId('eval-question'), 'Q1');
      await user.type(screen.getByTestId('eval-answer'), 'A1');
      await user.click(screen.getByTestId('eval-add-row'));
      await user.click(screen.getByTestId('eval-create-submit'));

      await waitFor(() => {
        expect(mockNotificationError).toHaveBeenCalledWith(
          'Failed to create evaluation file',
          'String error',
        );
      });
    });

    it('should sanitize experiment name in filename', async () => {
      const user = userEvent.setup();
      mockUploadMutateAsync.mockResolvedValue({ key: 'test.json' });

      render(
        <EvaluationFileCreator
          {...defaultProps}
          experimentName="My Experiment!@#$%"
          inputDataKey="folder/data.json"
        />,
      );

      await user.type(screen.getByTestId('eval-question'), 'Q1');
      await user.type(screen.getByTestId('eval-answer'), 'A1');
      await user.click(screen.getByTestId('eval-add-row'));
      await user.click(screen.getByTestId('eval-create-submit'));

      await waitFor(() => {
        expect(mockUploadMutateAsync).toHaveBeenCalledTimes(1);
      });

      const { file } = mockUploadMutateAsync.mock.calls[0][0] as { file: File };
      expect(file.name).toMatch(/^My_Experiment_____/);
    });
  });

  describe('cancel and close', () => {
    it('should reset all state when Cancel is clicked and modal is reopened', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <EvaluationFileCreator {...defaultProps} inputDataKey="folder/data.json" />,
      );

      // Add a row and partially fill the form
      await user.type(screen.getByTestId('eval-question'), 'What is ML?');
      await user.type(screen.getByTestId('eval-answer'), 'Machine Learning');
      await user.click(screen.getByTestId('eval-add-row'));
      await user.type(screen.getByTestId('eval-question'), 'partial');

      await user.click(screen.getByTestId('eval-create-cancel'));

      expect(defaultProps.onClose).toHaveBeenCalled();

      // Simulate parent closing and reopening
      rerender(
        <EvaluationFileCreator {...defaultProps} isOpen={false} inputDataKey="folder/data.json" />,
      );
      rerender(<EvaluationFileCreator {...defaultProps} isOpen inputDataKey="folder/data.json" />);

      // Table should be empty and form fields should be cleared
      expect(screen.getByText('No questions or answers')).toBeInTheDocument();
      expect(screen.queryByText('What is ML?')).not.toBeInTheDocument();
      expect(screen.getByTestId('eval-question')).toHaveValue('');
      expect(screen.getByTestId('eval-answer')).toHaveValue('');
    });
  });

  describe('inputDataIsFile logic', () => {
    it('should treat empty inputDataKey as not a file', () => {
      render(<EvaluationFileCreator {...defaultProps} inputDataKey="" />);

      expect(screen.getByTestId('eval-select-documents')).toBeInTheDocument();
    });

    it('should treat inputDataKey ending with / as not a file', () => {
      render(<EvaluationFileCreator {...defaultProps} inputDataKey="folder/" />);

      expect(screen.getByTestId('eval-select-documents')).toBeInTheDocument();
    });

    it('should treat inputDataKey without a dot as not a file', () => {
      render(<EvaluationFileCreator {...defaultProps} inputDataKey="folder/no-extension" />);

      expect(screen.getByTestId('eval-select-documents')).toBeInTheDocument();
    });

    it('should extract filename from nested path for inputDataIsFile', () => {
      render(<EvaluationFileCreator {...defaultProps} inputDataKey="deep/nested/path/file.csv" />);

      expect(screen.getByText('file.csv')).toBeInTheDocument();
    });
  });

  describe('multiple rows with documents dropdown', () => {
    it('should show dropdown for rows with multiple documents', async () => {
      const user = userEvent.setup();
      render(<EvaluationFileCreator {...defaultProps} />);

      // Add documents
      await user.click(screen.getByTestId('eval-select-documents'));
      await user.click(screen.getByTestId('s3-creator-select')); // adds doc1.pdf and doc2.txt

      await user.type(screen.getByTestId('eval-question'), 'Q1');
      await user.type(screen.getByTestId('eval-answer'), 'A1');
      await user.click(screen.getByTestId('eval-add-row'));

      // With 2 documents, should show the dropdown toggle
      const table = screen.getByTestId('eval-entries-table');
      expect(within(table).getByText('2 selected')).toBeInTheDocument();
    });
  });
});
