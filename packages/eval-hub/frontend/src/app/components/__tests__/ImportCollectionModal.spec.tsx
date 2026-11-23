import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ImportCollectionModal from '~/app/components/ImportCollectionModal';
import { mockCollection } from '~/__mocks__/mockCollection';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { IMPORT_COLLECTION_TEMPLATE, readFileAsUTF8Text } from '~/app/utils/collectionImport';

const mockReadFile = jest.mocked(readFileAsUTF8Text);

jest.mock('~/app/utils/collectionImport', () => ({
  ...jest.requireActual('~/app/utils/collectionImport'),
  readFileAsUTF8Text: jest.fn(),
}));

const mockMutate = jest.fn();
const mockNavigate = jest.fn();
const mockOnClose = jest.fn();
let mockImportPending = false;

const mockTrackEvalHubEvent = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('~/app/tracking/useEvalHubTracking', () => ({
  useEvalHubTracking: () => ({
    trackEvalHubEvent: mockTrackEvalHubEvent,
    trackEvalHubEventOnce: jest.fn(),
    createEvalHubTrackingScope: jest.fn(),
  }),
}));

jest.mock('~/app/hooks/useDarkMode', () => ({
  __esModule: true,
  default: () => false,
}));

// Monaco cannot run in jsdom; stub the editor wrapper as a controlled
// textarea that surfaces the diagnostics it is asked to mark.
jest.mock('monaco-editor', () => ({ __esModule: true, editor: {} }), { virtual: true });
jest.mock('@monaco-editor/react', () => ({ loader: { config: jest.fn() } }));
jest.mock('@patternfly/react-code-editor', () => ({
  ...jest.requireActual('@patternfly/react-code-editor'),
  CodeEditor: () => null,
  // The real control reads the editor context for the code argument; the
  // stubbed editor does not provide it.
  CodeEditorControl: ({
    icon,
    'aria-label': ariaLabel,
    isDisabled,
    onClick,
  }: {
    icon: React.ReactNode;
    'aria-label': string;
    isDisabled?: boolean;
    onClick: () => void;
  }) => (
    <button type="button" aria-label={ariaLabel} disabled={isDisabled} onClick={() => onClick()}>
      {icon}
    </button>
  ),
}));
jest.mock('~/app/components/EvalHubCodeEditor', () => ({
  __esModule: true,
  default: ({
    code,
    onChange,
    diagnostics,
    customControls,
    language,
    isReadOnly,
  }: {
    code: string;
    onChange: (value: string) => void;
    diagnostics?: { message: string; severity: string; line: number }[];
    customControls?: React.ReactNode;
    language?: string;
    isReadOnly?: boolean;
  }) => (
    <div>
      {customControls}
      <textarea
        data-testid="import-collection-editor-textarea"
        data-diagnostics={JSON.stringify(diagnostics ?? [])}
        data-language={language}
        data-readonly={isReadOnly ? 'true' : 'false'}
        readOnly={isReadOnly}
        value={code}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  ),
}));

jest.mock('~/app/hooks/collections', () => ({
  useCollectionsQuery: () => ({
    data: { items: [mockCollection({ name: 'Existing Collection' })] },
  }),
  useImportCollectionMutation: () => ({
    isPending: mockImportPending,
    reset: jest.fn(),
    mutate: (...args: unknown[]) => mockMutate(...args),
  }),
}));

const modalTree = (isOpen = true) => (
  <MemoryRouter>
    <ImportCollectionModal
      isOpen={isOpen}
      onClose={mockOnClose}
      namespace="test-ns"
      surface="collection_gallery"
    />
  </MemoryRouter>
);

const renderModal = (isOpen = true) => render(modalTree(isOpen));

const validContent =
  'name: importable\ncategory: safety\nbenchmarks:\n  - id: a\n    provider_id: b\n';

const findEditor = (): HTMLTextAreaElement =>
  screen.getByTestId('import-collection-editor-textarea') as HTMLTextAreaElement;

const findNameInput = (): HTMLInputElement =>
  screen.getByTestId('import-collection-name') as HTMLInputElement;

const getDiagnostics = (): { message: string; severity: string; line: number }[] =>
  JSON.parse(findEditor().dataset.diagnostics ?? '[]');

const typeContent = async (content: string) => {
  // Clear the template, then type the new content.
  const editor = findEditor();
  await userEvent.clear(editor);
  await userEvent.type(editor, content);
};

const setInputFiles = (file: File) => {
  const input = screen.getByTestId('import-collection-file-input') as HTMLInputElement;
  Object.defineProperty(input, 'files', {
    value: { 0: file, length: 1, item: () => file },
    configurable: true,
  });
  fireEvent.change(input);
};

const renameViaField = async (name: string) => {
  const input = findNameInput();
  await userEvent.clear(input);
  await userEvent.type(input, `${name}{Enter}`);
};

describe('ImportCollectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImportPending = false;
  });

  it('should render the design copy and required field labels', () => {
    renderModal();
    expect(screen.getByText('Import collection from file')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Upload a YAML or JSON file, or edit the sample template. Nothing is created until you select Import.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Collection definition/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Collection name/ })).toBeInTheDocument();
    expect(
      screen.getByText('Replace the example values below, or upload your own YAML or JSON file.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'One .yaml, .yml, or .json file, up to 1 MiB. Files are read locally as UTF-8.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Syntax and advisory checks appear here. The service validates references when you import.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('The collection name stays in sync with the definition above.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Reset to sample template')).toBeInTheDocument();
  });

  it('should prepopulate the editor with the default template and mirror its name', () => {
    renderModal();
    expect(findEditor().value).toBe(IMPORT_COLLECTION_TEMPLATE);
    expect(findEditor().dataset.language).toBe('yaml');
    expect(findNameInput().value).toBe('my-collection');
  });

  it('should label the editor language from the content', async () => {
    renderModal();
    fireEvent.change(findEditor(), {
      target: { value: '{"name": "json-collection", "description": "json doc"}' },
    });
    expect(findEditor().dataset.language).toBe('json');
    // Brace-leading content recovered through the YAML fallback is YAML.
    fireEvent.change(findEditor(), {
      target: { value: '{name: flow-suite, domains: [software]}' },
    });
    expect(findEditor().dataset.language).toBe('yaml');
    await typeContent(validContent);
    expect(findEditor().dataset.language).toBe('yaml');
  });

  it('should track the opened event when opened', () => {
    renderModal();
    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(EVAL_HUB_EVENTS.COLLECTION_IMPORT_OPENED, {
      surface: 'collection_gallery',
    });
  });

  it('should mark the invalid YAML line as an error diagnostic and disable submit and the name field', async () => {
    renderModal();
    await typeContent('name: broken\n  bad_indent: true\n');
    expect(getDiagnostics()).toContainEqual({
      message: expect.stringContaining('line 2'),
      severity: 'error',
      line: 2,
    });
    expect(screen.getByTestId('import-collection-submit')).toBeDisabled();
    expect(findNameInput()).toBeDisabled();
  });

  it('should mark missing description and unrecognized fields as warning diagnostics', async () => {
    renderModal();
    await typeContent(
      'name: warn-me\ncategory: safety\nmystery: 1\nbenchmarks:\n  - id: quality\n    provider_id: garak\n',
    );
    const messages = getDiagnostics()
      .filter((diagnostic) => diagnostic.severity === 'warning')
      .map((diagnostic) => diagnostic.message);
    expect(messages).toContainEqual(expect.stringContaining('No description provided'));
    expect(messages).toContainEqual(expect.stringContaining('Unrecognized field "mystery"'));
    // The unrecognized field points at its own line.
    expect(getDiagnostics()).toContainEqual({
      message: expect.stringContaining('Unrecognized field "mystery"'),
      severity: 'warning',
      line: 3,
    });
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

  it('should update the name field when the editor content changes', async () => {
    renderModal();
    await typeContent(validContent);
    expect(findNameInput().value).toBe('importable');
  });

  it('should mirror the name into the editor after the debounce', async () => {
    renderModal();
    await typeContent(validContent);
    const input = findNameInput();
    await userEvent.clear(input);
    await userEvent.type(input, 'live-name');
    await waitFor(() => expect(findEditor().value).toContain('name: live-name'));
    expect(findNameInput().value).toBe('live-name');
  });

  it('should flush a pending name change on blur without waiting for the debounce', async () => {
    renderModal();
    await typeContent(validContent);
    const input = findNameInput();
    fireEvent.change(input, { target: { value: 'flushed-on-blur' } });
    fireEvent.blur(input);
    expect(findEditor().value).toContain('name: flushed-on-blur');
  });

  it('should rewrite only the top-level name when the name field is committed', async () => {
    renderModal();
    await typeContent(validContent);
    await renameViaField('renamed');
    expect(findEditor().value).toContain('name: renamed');
    expect(findEditor().value).not.toContain('name: importable');
    expect(findNameInput().value).toBe('renamed');
  });

  it('should rewrite the YAML when the name field loses focus', async () => {
    renderModal();
    await typeContent(validContent);
    const input = findNameInput();
    await userEvent.clear(input);
    await userEvent.type(input, 'renamed-on-blur');
    fireEvent.blur(input);
    expect(findEditor().value).toContain('name: renamed-on-blur');
    expect(findNameInput().value).toBe('renamed-on-blur');
  });

  it('should insert a top-level name after leading comments when the definition has none', async () => {
    renderModal();
    await typeContent('# Example collection format\n\ndescription: no name yet\n');
    expect(findNameInput().value).toBe('');
    await renameViaField('inserted');
    const lines = findEditor().value.split('\n');
    expect(lines[0]).toBe('# Example collection format');
    expect(lines.slice(0, 4)).toEqual([
      '# Example collection format',
      '',
      'name: inserted',
      'description: no name yet',
    ]);
    expect(findNameInput().value).toBe('inserted');
  });

  it('should show a required error and disable submit when the name is emptied', async () => {
    renderModal();
    await typeContent(validContent);
    const input = findNameInput();
    await userEvent.clear(input);
    fireEvent.blur(input);
    expect(screen.getByText('Collection name is required.')).toBeInTheDocument();
    expect(
      screen.queryByText('The collection name stays in sync with the definition above.'),
    ).toBeNull();
    expect(screen.getByTestId('import-collection-submit')).toBeDisabled();
  });

  it('should detect a name collision and apply the suggested name to the editor and field', () => {
    // Freeze the clock so the expected date suffix cannot drift across UTC
    // midnight while the alert is on screen.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-15T12:00:00Z'));
    try {
      renderModal();
      fireEvent.change(findEditor(), {
        target: {
          value:
            'name: Existing Collection\ncategory: safety\nbenchmarks:\n  - id: a\n    provider_id: b\n',
        },
      });
      const collisionAlert = screen.getByTestId('import-collection-collision');
      expect(collisionAlert.textContent).toContain('Existing Collection');
      expect(collisionAlert.textContent).toContain('Existing Collection-2026-01-15');
      // Submission is blocked until the collision is resolved.
      expect(screen.getByTestId('import-collection-submit')).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: /Use suggested name/ }));
      expect(findEditor().value).toContain('name: Existing Collection-2026-01-15');
      expect(findNameInput().value).toBe('Existing Collection-2026-01-15');
      expect(screen.getByTestId('import-collection-submit')).toBeEnabled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('should keep Import disabled while a replacement file is read and ignore a stale read that resolves late', async () => {
    mockReadFile.mockReset();
    renderModal();
    await typeContent(validContent);
    expect(screen.getByTestId('import-collection-submit')).toBeEnabled();

    const contentA = 'name: file-a\ncategory: safety\nbenchmarks:\n  - id: a\n    provider_id: b\n';
    const contentB = 'name: file-b\ncategory: safety\nbenchmarks:\n  - id: a\n    provider_id: b\n';
    let resolveFirst!: (content: string) => void;
    let resolveSecond!: (content: string) => void;
    mockReadFile
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const fileA = new File([contentA], 'a.yaml', { type: 'text/yaml' });
    const fileB = new File([contentB], 'b.yaml', { type: 'text/yaml' });

    setInputFiles(fileA);
    expect(screen.getByTestId('import-collection-filename').textContent).toContain('a.yaml');
    // The previous definition cannot be submitted under the new filename
    // while the read is pending.
    expect(screen.getByTestId('import-collection-submit')).toBeDisabled();

    setInputFiles(fileB);
    expect(screen.getByTestId('import-collection-filename').textContent).toContain('b.yaml');
    expect(screen.getByTestId('import-collection-submit')).toBeDisabled();

    // The newer read lands...
    resolveSecond(contentB);
    await waitFor(() => expect(findEditor().value).toContain('name: file-b'));
    await waitFor(() => expect(screen.getByTestId('import-collection-submit')).toBeEnabled());

    // ...and the older read resolving late must not overwrite it.
    resolveFirst(contentA);
    await waitFor(() => expect(mockReadFile).toHaveBeenCalledTimes(2));
    expect(findEditor().value).toContain('name: file-b');
    expect(findEditor().value).not.toContain('name: file-a');
    expect(screen.getByTestId('import-collection-filename').textContent).toContain('b.yaml');
  });

  it('should cancel a pending read when the next selection fails validation', async () => {
    mockReadFile.mockReset();
    renderModal();
    await typeContent(validContent);
    expect(screen.getByTestId('import-collection-submit')).toBeEnabled();

    const contentA = 'name: file-a\ncategory: safety\nbenchmarks:\n  - id: a\n    provider_id: b\n';
    let resolveFirst!: (content: string) => void;
    mockReadFile.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    setInputFiles(new File([contentA], 'a.yaml', { type: 'text/yaml' }));
    expect(screen.getByTestId('import-collection-filename').textContent).toContain('a.yaml');
    expect(screen.getByTestId('import-collection-submit')).toBeDisabled();

    // A rejected follow-up selection invalidates the in-flight read...
    setInputFiles(new File([contentA], 'b.txt', { type: 'text/plain' }));
    expect(screen.getByTestId('import-collection-file-error').textContent).toContain(
      'Unsupported file type',
    );
    expect(screen.queryByTestId('import-collection-filename')).not.toBeInTheDocument();
    expect(screen.getByTestId('import-collection-submit')).toBeEnabled();

    // ...so the earlier read resolving late must not replace the edits.
    resolveFirst(contentA);
    await waitFor(() => expect(mockReadFile).toHaveBeenCalledTimes(1));
    expect(findEditor().value).toContain('name: importable');
    expect(findEditor().value).not.toContain('name: file-a');
  });

  it('should not let a pending file read overwrite edits made after the file was selected', async () => {
    mockReadFile.mockReset();
    renderModal();

    const fileContent =
      'name: from-file\ncategory: safety\nbenchmarks:\n  - id: a\n    provider_id: b\n';
    let resolveRead!: (content: string) => void;
    mockReadFile.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveRead = resolve;
        }),
    );
    const file = new File([fileContent], 'pending.yaml', { type: 'text/yaml' });
    const input = screen.getByTestId('import-collection-file-input') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: { 0: file, length: 1, item: () => file },
      configurable: true,
    });
    fireEvent.change(input);
    expect(screen.getByTestId('import-collection-filename').textContent).toContain('pending.yaml');
    expect(screen.getByTestId('import-collection-submit')).toBeDisabled();

    // Edit the definition while the read is still in flight.
    await typeContent(validContent);
    // The pending read is invalidated: the stale filename clears and the
    // edited definition becomes submittable again.
    expect(screen.queryByTestId('import-collection-filename')).not.toBeInTheDocument();
    expect(screen.getByTestId('import-collection-submit')).toBeEnabled();

    // The read resolving late must not overwrite the edits.
    resolveRead(fileContent);
    await waitFor(() => expect(mockReadFile).toHaveBeenCalledTimes(1));
    expect(findEditor().value).toContain('name: importable');
    expect(findEditor().value).not.toContain('name: from-file');
  });

  it('should disable the submit button while the definition matches the sample template without an alert', async () => {
    renderModal();
    expect(screen.queryByTestId('import-collection-template')).not.toBeInTheDocument();
    expect(screen.getByTestId('import-collection-submit')).toBeDisabled();
    await typeContent(validContent);
    expect(screen.getByTestId('import-collection-submit')).toBeEnabled();
  });

  it('should treat a name-only change as an edit of the sample template', async () => {
    renderModal();
    expect(screen.getByTestId('import-collection-submit')).toBeDisabled();
    await renameViaField('renamed-template');
    expect(screen.getByTestId('import-collection-submit')).toBeEnabled();
  });

  it('should restore the sample template from the reset link', async () => {
    renderModal();
    await typeContent(validContent);
    fireEvent.click(screen.getByTestId('import-collection-reset'));
    expect(findEditor().value).toBe(IMPORT_COLLECTION_TEMPLATE);
    expect(findNameInput().value).toBe('my-collection');
    expect(screen.getByTestId('import-collection-submit')).toBeDisabled();
  });

  it('should empty the editor from the clear control', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Clear the collection definition' }));
    expect(findEditor().value).toBe('');
    expect(findNameInput()).toBeDisabled();
  });

  it('should submit a pending name draft when Import is clicked before blur', async () => {
    renderModal();
    await typeContent(validContent);
    const input = findNameInput();
    await userEvent.clear(input);
    await userEvent.type(input, 'renamed');
    fireEvent.click(screen.getByTestId('import-collection-submit'));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.stringContaining('name: renamed'),
      expect.anything(),
    );
    expect(findEditor().value).toContain('name: renamed');
  });

  it('should close, track, and navigate to the collections page on success', async () => {
    mockMutate.mockImplementation((_content: string, options: { onSuccess: () => void }) =>
      options.onSuccess(),
    );
    renderModal();
    await typeContent(validContent);
    fireEvent.click(screen.getByTestId('import-collection-submit'));
    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.COLLECTION_IMPORT_SUCCEEDED,
      { surface: 'collection_gallery' },
    );
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/evaluation/test-ns/collections');
    expect(screen.queryByTestId('import-collection-success')).not.toBeInTheDocument();
    expect(mockMutate).toHaveBeenCalledWith(validContent, expect.anything());
  });

  it('should lock the definition, actions, and close controls while the import is pending', async () => {
    const view = renderModal();
    await typeContent(validContent);

    mockImportPending = true;
    view.rerender(modalTree());

    expect(findNameInput()).toBeDisabled();
    expect(findEditor()).toHaveAttribute('readonly');
    expect(screen.getByTestId('import-collection-reset')).toBeDisabled();
    expect(screen.getByTestId('import-collection-cancel')).toBeDisabled();
    expect(screen.getByTestId('import-collection-submit')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Upload a collection definition file' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear the collection definition' })).toBeDisabled();

    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should keep the dialog open with the error when submission fails', async () => {
    mockMutate.mockImplementation((_content: string, options: { onError: (e: Error) => void }) =>
      options.onError(
        new Error('a referenced provider or benchmark is not found or not accessible'),
      ),
    );
    renderModal();
    await typeContent(validContent);
    fireEvent.click(screen.getByTestId('import-collection-submit'));
    const error = await screen.findByTestId('import-collection-submit-error');
    expect(error.textContent).toContain('not found or not accessible');
    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(EVAL_HUB_EVENTS.COLLECTION_IMPORT_FAILED, {
      surface: 'collection_gallery',
    });
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    // The editor stays available for corrections.
    expect(screen.getByTestId('import-collection-editor')).toBeInTheDocument();
  });
});
