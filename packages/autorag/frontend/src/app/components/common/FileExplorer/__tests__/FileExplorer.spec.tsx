import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileExplorer, {
  isFolder,
  sanitizeId,
  shouldDetailsPanelRender,
} from '~/app/components/common/FileExplorer/FileExplorer';
import type { File, Files } from '~/app/components/common/FileExplorer/FileExplorer';
import {
  mockFile,
  mockFiles,
  mockFolder,
  mockFoldersTrail,
  mockSource,
  mockSources,
} from '~/__mocks__/mockFileExplorer';

describe('FileExplorer', () => {
  const mockOnClose = jest.fn();
  const mockOnPrimary = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onPrimary: mockOnPrimary,
    files: mockFiles(),
    source: mockSource(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('modal rendering', () => {
    it('should render the modal when isOpen is true', () => {
      render(<FileExplorer {...defaultProps} />);

      expect(screen.getByText('Select file or folder')).toBeInTheDocument();
      expect(screen.getByTestId('file-explorer-table')).toBeInTheDocument();
      expect(screen.getByTestId('file-explorer-select-btn')).toBeInTheDocument();
      expect(screen.getByTestId('file-explorer-cancel-btn')).toBeInTheDocument();
    });
    it('should not render the modal when isOpen is false', () => {
      render(<FileExplorer {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Select file or folder')).not.toBeInTheDocument();
    });
    it('should show radio selection description by default', () => {
      render(<FileExplorer {...defaultProps} />);

      expect(
        screen.getByText(
          'Select 1 file or folder from this bucket to use for your data collection and evaluation sources',
        ),
      ).toBeInTheDocument();
    });
    it('should show checkbox selection description when selection is checkbox', () => {
      render(<FileExplorer {...defaultProps} selection="checkbox" />);

      expect(screen.getByText('Select which files or folders to use')).toBeInTheDocument();
    });
  });
  describe('file table', () => {
    it('should render file rows', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} />);

      expect(screen.getByText('file-1.json')).toBeInTheDocument();
      expect(screen.getByText('file-2.json')).toBeInTheDocument();
      expect(screen.getByText('file-3.json')).toBeInTheDocument();
    });
    it('should render folder rows with clickable links', () => {
      const folder = mockFolder({ name: 'my-folder' });
      const onFolderClick = jest.fn();
      render(<FileExplorer {...defaultProps} files={[folder]} onFolderClick={onFolderClick} />);

      const folderLink = screen.getByText('my-folder');
      expect(folderLink).toBeInTheDocument();
      expect(screen.getByText('Folder')).toBeInTheDocument();

      fireEvent.click(folderLink);
      expect(onFolderClick).toHaveBeenCalledWith(folder);
    });
    it('should not render hidden files', () => {
      const files: Files = [
        mockFile({ name: 'visible.json', path: '/visible.json' }),
        mockFile({ name: 'hidden.json', path: '/hidden.json', hidden: true }),
      ];
      render(<FileExplorer {...defaultProps} files={files} />);

      expect(screen.getByText('visible.json')).toBeInTheDocument();
      expect(screen.queryByText('hidden.json')).not.toBeInTheDocument();
    });
    it('should show empty state when no files are provided', () => {
      render(<FileExplorer {...defaultProps} files={[]} />);

      expect(screen.getByText('No files found')).toBeInTheDocument();
      expect(screen.getByText('No files are available in the current folder.')).toBeInTheDocument();
    });
    it('should show custom empty state props', () => {
      render(
        <FileExplorer
          {...defaultProps}
          files={[]}
          emptyStateProps={{
            titleText: 'Custom empty title',
            body: 'Custom body message',
          }}
        />,
      );

      expect(screen.getByText('Custom empty title')).toBeInTheDocument();
      expect(screen.getByText('Custom body message')).toBeInTheDocument();
    });
    it('should show skeleton rows when loading', () => {
      render(<FileExplorer {...defaultProps} files={[]} loading />);

      const table = screen.getByTestId('file-explorer-table');
      const skeletons = table.querySelectorAll('.pf-v6-c-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
  describe('selection', () => {
    it('should select a file and show details panel when radio selected', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} />);

      const firstRow = screen.getByTestId('file-explorer-row--file-1-json');
      const radio = within(firstRow).getByRole('radio');
      fireEvent.click(radio);

      expect(screen.getByTestId('file-explorer-details-panel')).toBeInTheDocument();
    });
    it('should allow multiple selections in checkbox mode', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      const row1 = screen.getByTestId('file-explorer-row--file-1-json');
      const row2 = screen.getByTestId('file-explorer-row--file-2-json');
      fireEvent.click(within(row1).getByRole('checkbox'));
      fireEvent.click(within(row2).getByRole('checkbox'));

      const selectedFilesList = screen.getByTestId('file-explorer-selected-files');
      expect(within(selectedFilesList).getByText('file-1.json')).toBeInTheDocument();
      expect(within(selectedFilesList).getByText('file-2.json')).toBeInTheDocument();
    });
    it('should replace selection in radio mode', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} />);

      const row1 = screen.getByTestId('file-explorer-row--file-1-json');
      const row2 = screen.getByTestId('file-explorer-row--file-2-json');
      fireEvent.click(within(row1).getByRole('radio'));
      fireEvent.click(within(row2).getByRole('radio'));

      const selectedFilesList = screen.getByTestId('file-explorer-selected-files');
      expect(within(selectedFilesList).queryByText('file-1.json')).not.toBeInTheDocument();
      expect(within(selectedFilesList).getByText('file-2.json')).toBeInTheDocument();
    });
    it('should disable select button when loading', () => {
      render(<FileExplorer {...defaultProps} loading />);

      expect(screen.getByTestId('file-explorer-select-btn')).toBeDisabled();
    });
    it('should disable select button when empty', () => {
      render(<FileExplorer {...defaultProps} isEmpty />);

      expect(screen.getByTestId('file-explorer-select-btn')).toBeDisabled();
    });
    it('should disable select button when no files are selected', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} />);

      // Button should be disabled when nothing is selected
      expect(screen.getByTestId('file-explorer-select-btn')).toBeDisabled();
    });
    it('should enable select button after file selection in radio mode', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} />);

      // Initially disabled
      expect(screen.getByTestId('file-explorer-select-btn')).toBeDisabled();

      // Select a file
      const row = screen.getByTestId('file-explorer-row--file-1-json');
      fireEvent.click(within(row).getByRole('radio'));

      // Button should now be enabled
      expect(screen.getByTestId('file-explorer-select-btn')).toBeEnabled();
    });
    it('should enable select button when files are selected in checkbox mode', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      // Initially disabled
      expect(screen.getByTestId('file-explorer-select-btn')).toBeDisabled();

      // Select first file
      const row1 = screen.getByTestId('file-explorer-row--file-1-json');
      fireEvent.click(within(row1).getByRole('checkbox'));

      // Button should be enabled after first selection
      expect(screen.getByTestId('file-explorer-select-btn')).toBeEnabled();

      // Select second file
      const row2 = screen.getByTestId('file-explorer-row--file-2-json');
      fireEvent.click(within(row2).getByRole('checkbox'));

      // Button should still be enabled
      expect(screen.getByTestId('file-explorer-select-btn')).toBeEnabled();

      // Deselect both files
      fireEvent.click(within(row1).getByRole('checkbox'));
      fireEvent.click(within(row2).getByRole('checkbox'));

      // Button should be disabled again
      expect(screen.getByTestId('file-explorer-select-btn')).toBeDisabled();
    });
    it('should call onPrimary with selected files and close modal', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} />);

      const row1 = screen.getByTestId('file-explorer-row--file-1-json');
      fireEvent.click(within(row1).getByRole('radio'));
      fireEvent.click(screen.getByTestId('file-explorer-select-btn'));

      expect(mockOnPrimary).toHaveBeenCalledWith([files[0]]);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
  describe('source selector', () => {
    it('should render source labels when sources are provided and no source selected', () => {
      const onSelectSource = jest.fn();
      const sources = mockSources(2);
      render(
        <FileExplorer
          {...defaultProps}
          source={undefined}
          sources={sources}
          onSelectSource={onSelectSource}
        />,
      );

      expect(screen.getByText('connection-1 (10)')).toBeInTheDocument();
      expect(screen.getByText('connection-2 (20)')).toBeInTheDocument();
    });
    it('should show "Viewing files from" when a source is selected', () => {
      render(<FileExplorer {...defaultProps} source={mockSource({ name: 'my-conn' })} />);

      expect(screen.getByText('my-conn')).toBeInTheDocument();
    });
  });
  describe('breadcrumbs', () => {
    it('should show root breadcrumb with source name', () => {
      render(
        <FileExplorer {...defaultProps} source={mockSource({ name: 'my-bucket' })} folders={[]} />,
      );

      expect(screen.getByTestId('file-explorer-breadcrumb-root')).toHaveTextContent(
        'my-bucket (root)',
      );
    });
    it('should show breadcrumb trail for nested folders', () => {
      const folders = mockFoldersTrail();
      render(<FileExplorer {...defaultProps} folders={folders} />);

      expect(screen.getByText('level-1')).toBeInTheDocument();
      expect(screen.getByText('level-2')).toBeInTheDocument();
      expect(screen.getByTestId('file-explorer-breadcrumb-current')).toHaveTextContent('level-3');
    });
    it('should call onNavigate when a breadcrumb folder is clicked', () => {
      const folders = mockFoldersTrail();
      const onNavigate = jest.fn();
      render(<FileExplorer {...defaultProps} folders={folders} onNavigate={onNavigate} />);

      fireEvent.click(screen.getByText('level-1'));
      expect(onNavigate).toHaveBeenCalledWith(folders[0]);
    });
    it('should call onNavigateRoot when root breadcrumb is clicked', () => {
      const folders = mockFoldersTrail();
      const onNavigateRoot = jest.fn();
      render(<FileExplorer {...defaultProps} folders={folders} onNavigateRoot={onNavigateRoot} />);

      fireEvent.click(screen.getByTestId('file-explorer-breadcrumb-root'));
      expect(onNavigateRoot).toHaveBeenCalled();
    });
  });
  describe('search', () => {
    it('should render search input', () => {
      render(<FileExplorer {...defaultProps} />);

      expect(screen.getByTestId('file-explorer-search')).toBeInTheDocument();
    });
    it('should call onSearch when typing in search input', () => {
      const onSearch = jest.fn();
      render(<FileExplorer {...defaultProps} onSearch={onSearch} />);

      const searchInput = screen
        .getByTestId('file-explorer-search')
        .querySelector('input') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'test-query' } });

      expect(onSearch).toHaveBeenCalledWith('test-query');
    });
    it('should disable search when empty state is forced', () => {
      render(<FileExplorer {...defaultProps} isEmpty />);

      const searchInput = screen
        .getByTestId('file-explorer-search')
        .querySelector('input') as HTMLInputElement;
      expect(searchInput).toBeDisabled();
    });
    it('should strip disallowed characters and pass sanitized value to onSearch', () => {
      const onSearch = jest.fn();
      render(
        <FileExplorer
          {...defaultProps}
          onSearch={onSearch}
          allowedSearchCharacters={/[a-z0-9-]/}
        />,
      );

      const searchInput = screen
        .getByTestId('file-explorer-search')
        .querySelector('input') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'hello@world!' } });

      expect(onSearch).toHaveBeenCalledWith('helloworld');
    });
    it('should pass full value to onSearch when all characters are allowed', () => {
      const onSearch = jest.fn();
      render(
        <FileExplorer
          {...defaultProps}
          onSearch={onSearch}
          allowedSearchCharacters={/[a-z0-9-]/}
        />,
      );

      const searchInput = screen
        .getByTestId('file-explorer-search')
        .querySelector('input') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'valid-input' } });

      expect(onSearch).toHaveBeenCalledWith('valid-input');
    });
    it('should not filter characters when allowedSearchCharacters is not provided', () => {
      const onSearch = jest.fn();
      render(<FileExplorer {...defaultProps} onSearch={onSearch} />);

      const searchInput = screen
        .getByTestId('file-explorer-search')
        .querySelector('input') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'any@chars!here' } });

      expect(onSearch).toHaveBeenCalledWith('any@chars!here');
    });
    it('should render info icon when allowedSearchCharactersLabel is provided', () => {
      render(
        <FileExplorer
          {...defaultProps}
          allowedSearchCharacters={/[a-z]/}
          allowedSearchCharactersLabel="Only lowercase letters are allowed"
        />,
      );

      expect(screen.getByTestId('file-explorer-search-chars-info')).toBeInTheDocument();
    });
    it('should not render info icon when allowedSearchCharactersLabel is not provided', () => {
      render(<FileExplorer {...defaultProps} allowedSearchCharacters={/[a-z]/} />);

      expect(screen.queryByTestId('file-explorer-search-chars-info')).not.toBeInTheDocument();
    });
  });
  describe('pagination', () => {
    it('should render pagination controls', () => {
      render(<FileExplorer {...defaultProps} page={1} perPage={10} itemCount={50} />);

      expect(screen.getByTestId('file-explorer-pagination')).toBeInTheDocument();
    });
    it('should disable pagination when loading', () => {
      render(<FileExplorer {...defaultProps} loading page={1} perPage={10} itemCount={50} />);

      const pagination = screen.getByTestId('file-explorer-pagination');
      const buttons = pagination.querySelectorAll('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
    it('should enable next button in indeterminate mode when hasNextPage is true and fileCount < perPage', () => {
      // Regression: when fileCount (3) < perPage (10), the old syntheticItemCount
      // formula produced a value that fit on the current page, so PF disabled "next".
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} page={1} perPage={10} hasNextPage />);

      const pagination = screen.getByTestId('file-explorer-pagination');
      const nextButton = pagination.querySelector('button[data-action="next"]');
      expect(nextButton).not.toBeDisabled();
    });
    it('should disable next button in indeterminate mode when hasNextPage is false', () => {
      const files = mockFiles(3);
      render(
        <FileExplorer {...defaultProps} files={files} page={1} perPage={10} hasNextPage={false} />,
      );

      const pagination = screen.getByTestId('file-explorer-pagination');
      const nextButton = pagination.querySelector('button[data-action="next"]');
      expect(nextButton).toBeDisabled();
    });
  });
  describe('cancel and close', () => {
    it('should call onClose when cancel button is clicked', () => {
      render(<FileExplorer {...defaultProps} />);

      fireEvent.click(screen.getByTestId('file-explorer-cancel-btn'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

describe('isFolder', () => {
  it('should return true for folder type', () => {
    const folder: File = { name: 'test', path: '/test', type: 'folder', items: 0 };
    expect(isFolder(folder)).toBe(true);
  });
  it('should return false for non-folder type', () => {
    const file: File = { name: 'test.json', path: '/test.json', type: 'JSON' };
    expect(isFolder(file)).toBe(false);
  });
});

describe('sanitizeId', () => {
  it('should replace dots with hyphens', () => {
    expect(sanitizeId('file.json')).toBe('file-json');
  });
  it('should replace spaces with hyphens', () => {
    expect(sanitizeId('my file name')).toBe('my-file-name');
  });
  it('should replace special characters with hyphens', () => {
    expect(sanitizeId('file@name#1!.txt')).toBe('file-name-1--txt');
  });
  it('should preserve alphanumeric characters, hyphens, and underscores', () => {
    expect(sanitizeId('my-file_name-01')).toBe('my-file_name-01');
  });
  it('should handle empty string', () => {
    expect(sanitizeId('')).toBe('');
  });
  it('should handle path-like values', () => {
    expect(sanitizeId('/path/to/file.json')).toBe('-path-to-file-json');
  });
});

describe('shouldDetailsPanelRender', () => {
  it('should return all false when both arrays are undefined', () => {
    expect(shouldDetailsPanelRender({ filesToView: undefined, selectedFiles: undefined })).toEqual({
      details: false,
      selected: false,
      panel: false,
    });
  });
  it('should return all false when both arrays are empty', () => {
    expect(shouldDetailsPanelRender({ filesToView: [], selectedFiles: [] })).toEqual({
      details: false,
      selected: false,
      panel: false,
    });
  });
  it('should return details true when filesToView has items', () => {
    const file = mockFile();
    expect(shouldDetailsPanelRender({ filesToView: [file], selectedFiles: undefined })).toEqual({
      details: true,
      selected: false,
      panel: true,
    });
  });
  it('should return selected true when selectedFiles has items', () => {
    const file = mockFile();
    expect(shouldDetailsPanelRender({ filesToView: undefined, selectedFiles: [file] })).toEqual({
      details: false,
      selected: true,
      panel: true,
    });
  });
  it('should return all true when both arrays have items', () => {
    const file = mockFile();
    expect(shouldDetailsPanelRender({ filesToView: [file], selectedFiles: [file] })).toEqual({
      details: true,
      selected: true,
      panel: true,
    });
  });
});
