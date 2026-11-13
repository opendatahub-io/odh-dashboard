import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ImportCollectionModal from '~/app/components/ImportCollectionModal';
import { mockCollection } from '~/__mocks__/mockCollection';
import { trackEvalHubEvent } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { IMPORT_COLLECTION_TEMPLATE } from '~/app/utils/collectionImport';

const mockMutate = jest.fn();

jest.mock('~/app/tracking/evalhubTracking', () => ({
  trackEvalHubEvent: jest.fn(),
}));

jest.mock('~/app/hooks/useDarkMode', () => ({
  __esModule: true,
  default: () => false,
}));

// Monaco cannot run in jsdom; stub the editor wrapper as a controlled
// textarea that surfaces the error line it is asked to highlight.
jest.mock('monaco-editor', () => ({ __esModule: true, editor: {} }), { virtual: true });
jest.mock('@monaco-editor/react', () => ({ loader: { config: jest.fn() } }));
jest.mock('@patternfly/react-code-editor', () => ({
  ...jest.requireActual('@patternfly/react-code-editor'),
  CodeEditor: () => null,
}));
jest.mock('~/app/components/EvalHubCodeEditor', () => ({
  __esModule: true,
  default: ({
    code,
    onChange,
    errorLine,
  }: {
    code: string;
    onChange: (value: string) => void;
    errorLine?: number;
  }) => (
    <textarea
      data-testid="import-collection-editor-textarea"
      data-error-line={errorLine}
      value={code}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

jest.mock('~/app/hooks/collections', () => ({
  useCollectionsQuery: () => ({
    data: { items: [mockCollection({ name: 'Existing Collection' })] },
  }),
  useImportCollectionMutation: () => ({
    isPending: false,
    reset: jest.fn(),
    mutate: (...args: unknown[]) => mockMutate(...args),
  }),
}));

const mockTrackEvalHubEvent = jest.mocked(trackEvalHubEvent);

const renderModal = (isOpen = true) =>
  render(
    <MemoryRouter>
      <ImportCollectionModal
        isOpen={isOpen}
        onClose={jest.fn()}
        namespace="test-ns"
        surface="collection_gallery"
      />
    </MemoryRouter>,
  );

const findEditor = (): HTMLTextAreaElement =>
  screen.getByTestId('import-collection-editor-textarea') as HTMLTextAreaElement;

const typeContent = async (content: string) => {
  // Clear the template, then type the new content.
  const editor = findEditor();
  await userEvent.clear(editor);
  await userEvent.type(editor, content);
};

describe('ImportCollectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prepopulate the editor with the default template', () => {
    renderModal();
    expect(findEditor().value).toBe(IMPORT_COLLECTION_TEMPLATE);
  });

  it('should track the opened event when opened', () => {
    renderModal();
    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(EVAL_HUB_EVENTS.COLLECTION_IMPORT_OPENED, {
      surface: 'collection_gallery',
    });
  });

  it('should show a parse error with the line number for invalid YAML and disable submit', async () => {
    renderModal();
    await typeContent('name: broken\n  bad_indent: true\n');
    expect(screen.getByTestId('import-collection-parse-error').textContent).toContain('line 2');
    // The offending line is passed to the editor for highlighting.
    expect(findEditor()).toHaveAttribute('data-error-line', '2');
    expect(screen.getByTestId('import-collection-submit')).toBeDisabled();
  });

  it('should show pre-submission warnings for missing description and unrecognized fields', async () => {
    renderModal();
    await typeContent(
      'name: warn-me\ncategory: safety\nmystery: 1\nbenchmarks:\n  - id: quality\n    provider_id: garak\n',
    );
    const warnings = screen.getByTestId('import-collection-warnings');
    expect(warnings.textContent).toContain('No description provided');
    expect(warnings.textContent).toContain('Unrecognized field "mystery"');
    expect(screen.getByTestId('import-collection-submit')).toBeEnabled();
  });

  it('should inform that only the first document of a multi-document file is imported', async () => {
    renderModal();
    const content = 'name: first\ncategory: safety\nbenchmarks:\n  - id: a\n    provider_id: b\n';
    await typeContent(`${content}---\n${content}`);
    expect(screen.getByTestId('import-collection-multi-doc').textContent).toContain(
      '2 collection definitions',
    );
  });

  it('should detect a name collision and apply the suggested name', async () => {
    renderModal();
    await typeContent(
      'name: Existing Collection\ncategory: safety\nbenchmarks:\n  - id: a\n    provider_id: b\n',
    );
    const collisionAlert = screen.getByTestId('import-collection-collision');
    expect(collisionAlert.textContent).toContain('Existing Collection');
    const today = new Date().toISOString().slice(0, 10);
    expect(collisionAlert.textContent).toContain(`Existing Collection-${today}`);
    // Submission is blocked until the collision is resolved.
    expect(screen.getByTestId('import-collection-submit')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Use suggested name/ }));
    expect(findEditor().value).toContain(`name: Existing Collection-${today}`);
    expect(screen.getByTestId('import-collection-submit')).toBeEnabled();
  });

  it('should disable the submit button while the import is pending', () => {
    renderModal();
    expect(screen.getByTestId('import-collection-submit')).toBeEnabled();
  });

  it('should submit the editor content and show the success result with warnings', async () => {
    const createdCollection = mockCollection({ name: 'imported' });
    mockMutate.mockImplementation(
      (_content: string, options: { onSuccess: (r: unknown) => void }) =>
        options.onSuccess({ collection: createdCollection, warnings: ['ignored "id"'] }),
    );
    renderModal();
    fireEvent.click(screen.getByTestId('import-collection-submit'));
    const success = await screen.findByTestId('import-collection-success');
    expect(success.textContent).toContain('imported');
    expect(success.textContent).toContain('ignored "id"');
    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.COLLECTION_IMPORT_SUCCEEDED,
      { surface: 'collection_gallery' },
    );
    expect(mockMutate).toHaveBeenCalledWith(IMPORT_COLLECTION_TEMPLATE, expect.anything());
  });

  it('should keep the dialog open with the error when submission fails', async () => {
    mockMutate.mockImplementation((_content: string, options: { onError: (e: Error) => void }) =>
      options.onError(
        new Error('a referenced provider or benchmark is not found or not accessible'),
      ),
    );
    renderModal();
    fireEvent.click(screen.getByTestId('import-collection-submit'));
    const error = await screen.findByTestId('import-collection-submit-error');
    expect(error.textContent).toContain('not found or not accessible');
    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(EVAL_HUB_EVENTS.COLLECTION_IMPORT_FAILED, {
      surface: 'collection_gallery',
    });
    // The editor stays available for corrections.
    expect(screen.getByTestId('import-collection-editor')).toBeInTheDocument();
  });
});
