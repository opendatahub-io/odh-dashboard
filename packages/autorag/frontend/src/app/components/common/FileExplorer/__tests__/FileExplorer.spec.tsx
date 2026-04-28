import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import * as React from 'react';
import {
  mockFile,
  mockFiles,
  mockFolder,
  mockFoldersTrail,
  mockSource,
  mockSources,
} from '~/__mocks__/mockFileExplorer';
import type { File, Files } from '~/app/components/common/FileExplorer/FileExplorer';
import FileExplorer, {
  isFolder,
  sanitizeId,
  shouldDetailsPanelRender,
} from '~/app/components/common/FileExplorer/FileExplorer';

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
    it('should hide "View details" in selected files list when file is already being viewed', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      // Select file-1, then file-2 — filesToView will be [file-2] (last selected)
      const row1 = screen.getByTestId('file-explorer-row--file-1-json');
      const row2 = screen.getByTestId('file-explorer-row--file-2-json');
      fireEvent.click(within(row1).getByRole('checkbox'));
      fireEvent.click(within(row2).getByRole('checkbox'));

      const selectedFilesList = screen.getByTestId('file-explorer-selected-files');

      // file-2 is currently being viewed — its kebab should NOT have "View details"
      fireEvent.click(within(selectedFilesList).getByLabelText('file-2.json overflow menu'));
      const file2Menu = screen.getByRole('menu');
      expect(
        within(file2Menu).queryByRole('menuitem', { name: 'View details' }),
      ).not.toBeInTheDocument();
      expect(
        within(file2Menu).getByRole('menuitem', { name: 'Remove selection' }),
      ).toBeInTheDocument();

      // Close the dropdown by clicking the toggle again
      fireEvent.click(within(selectedFilesList).getByLabelText('file-2.json overflow menu'));

      // file-1 is NOT being viewed — its kebab SHOULD have "View details"
      fireEvent.click(within(selectedFilesList).getByLabelText('file-1.json overflow menu'));
      const file1Menu = screen.getByRole('menu');
      expect(within(file1Menu).getByRole('menuitem', { name: 'View details' })).toBeInTheDocument();
      expect(
        within(file1Menu).getByRole('menuitem', { name: 'Remove selection' }),
      ).toBeInTheDocument();
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
  describe('row click behavior', () => {
    it('should select file when clicking directly on the row', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      fireEvent.click(row);

      expect(screen.getByTestId('file-explorer-details-panel')).toBeInTheDocument();
    });
    it('should NOT select file when clicking on kebab menu toggle', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const kebabToggle = within(row).getByRole('button', { name: /actions/i });
      fireEvent.click(kebabToggle);

      // File should not be selected
      const checkbox = within(row).getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });
    it('should NOT select file when clicking on folder link', () => {
      const folder = mockFolder({ name: 'my-folder', path: '/my-folder' });
      const onFolderClick = jest.fn();
      render(
        <FileExplorer
          {...defaultProps}
          files={[folder]}
          onFolderClick={onFolderClick}
          selection="checkbox"
        />,
      );

      const row = screen.getByTestId('file-explorer-row--my-folder');
      const folderLink = within(row).getByText('my-folder');
      fireEvent.click(folderLink);

      // Folder link callback should fire
      expect(onFolderClick).toHaveBeenCalledWith(folder);

      // Folder should not be selected via row click
      const checkbox = within(row).getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });
    it('should NOT select file when clicking on checkbox in checkbox mode', () => {
      const files = mockFiles(3);
      const onSelectFile = jest.fn();
      render(
        <FileExplorer
          {...defaultProps}
          files={files}
          selection="checkbox"
          onSelectFile={onSelectFile}
        />,
      );

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const checkbox = within(row).getByRole('checkbox');
      fireEvent.click(checkbox);

      // Checkbox should handle selection
      expect(checkbox).toBeChecked();

      // onSelectFile callback should be called only once (not twice from row click)
      expect(onSelectFile).toHaveBeenCalledTimes(1);
    });
    it('should keep rows clickable in checkbox mode after selection', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const checkbox = within(row).getByRole('checkbox');
      fireEvent.click(checkbox);

      // Row should remain clickable in checkbox mode to allow deselection
      expect(row).toHaveClass('pf-m-clickable');
      expect(row).toHaveClass('pf-m-selected');
    });
    it('should toggle selection when clicking a selected row in checkbox mode', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const checkbox = within(row).getByRole('checkbox');

      // Select by clicking row
      fireEvent.click(row);
      expect(checkbox).toBeChecked();

      // Deselect by clicking row again
      fireEvent.click(row);
      expect(checkbox).not.toBeChecked();
    });
    it('should replace selection when clicking different row in radio mode', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="radio" />);

      const row1 = screen.getByTestId('file-explorer-row--file-1-json');
      const row2 = screen.getByTestId('file-explorer-row--file-2-json');

      // Select first row by clicking
      fireEvent.click(row1);
      expect(within(row1).getByRole('radio')).toBeChecked();

      // Click second row - should replace selection
      fireEvent.click(row2);
      expect(within(row1).getByRole('radio')).not.toBeChecked();
      expect(within(row2).getByRole('radio')).toBeChecked();

      // Second row should now be selected
      expect(row2).toHaveClass('pf-m-selected');
    });
    it('should have file-specific aria-label on kebab menu toggle', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      const row1 = screen.getByTestId('file-explorer-row--file-1-json');
      const kebab1 = within(row1).getByRole('button', { name: /file-1\.json actions/i });
      expect(kebab1).toBeInTheDocument();

      const row2 = screen.getByTestId('file-explorer-row--file-2-json');
      const kebab2 = within(row2).getByRole('button', { name: /file-2\.json actions/i });
      expect(kebab2).toBeInTheDocument();
    });
  });
  describe('keyboard input interactions', () => {
    it('should select radio when pressing Space on the radio input directly', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="radio" />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const radio = within(row).getByRole('radio');

      // Simulate Space key press on radio input itself
      fireEvent.keyDown(radio, { key: ' ', code: 'Space' });

      expect(radio).toBeChecked();
      expect(screen.getByTestId('file-explorer-details-panel')).toBeInTheDocument();
    });
    it('should toggle checkbox when pressing Space on the checkbox input directly', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const checkbox = within(row).getByRole('checkbox');

      // First Space - select
      fireEvent.keyDown(checkbox, { key: ' ', code: 'Space' });
      expect(checkbox).toBeChecked();

      // Second Space - deselect
      fireEvent.keyDown(checkbox, { key: ' ', code: 'Space' });
      expect(checkbox).not.toBeChecked();
    });
    it('should call onSelectFile when selecting checkbox via Space key on input', () => {
      const files = mockFiles(3);
      const onSelectFile = jest.fn();
      render(
        <FileExplorer
          {...defaultProps}
          files={files}
          selection="checkbox"
          onSelectFile={onSelectFile}
        />,
      );

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const checkbox = within(row).getByRole('checkbox');

      fireEvent.keyDown(checkbox, { key: ' ', code: 'Space' });

      expect(checkbox).toBeChecked();
      expect(onSelectFile).toHaveBeenCalledWith(files[0], true);
    });
    it('should call onSelectFile when selecting radio via Space key on input', () => {
      const files = mockFiles(3);
      const onSelectFile = jest.fn();
      render(
        <FileExplorer
          {...defaultProps}
          files={files}
          selection="radio"
          onSelectFile={onSelectFile}
        />,
      );

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const radio = within(row).getByRole('radio');

      fireEvent.keyDown(radio, { key: ' ', code: 'Space' });

      expect(radio).toBeChecked();
      expect(onSelectFile).toHaveBeenCalledWith(files[0], true);
    });
    it('should not allow keyboard interaction on disabled checkbox', () => {
      const files = [mockFile({ name: 'disabled.json', path: '/d.json', selectable: false })];
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      const row = screen.getByTestId('file-explorer-row--d-json');
      const checkbox = within(row).getByRole('checkbox');

      expect(checkbox).toBeDisabled();

      // Attempt to toggle with Space
      fireEvent.keyDown(checkbox, { key: ' ', code: 'Space' });

      // Should remain unchecked
      expect(checkbox).not.toBeChecked();
    });
  });
  describe('keyboard row interactions', () => {
    it('should select file when pressing Enter on row in radio mode', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="radio" />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const radio = within(row).getByRole('radio');

      // Simulate Enter key press
      fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });

      expect(radio).toBeChecked();
      expect(screen.getByTestId('file-explorer-details-panel')).toBeInTheDocument();
    });
    it('should select file when pressing Space on row in radio mode', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="radio" />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const radio = within(row).getByRole('radio');

      // Simulate Space key press
      fireEvent.keyDown(row, { key: ' ', code: 'Space' });

      expect(radio).toBeChecked();
      expect(screen.getByTestId('file-explorer-details-panel')).toBeInTheDocument();
    });
    it('should toggle selection when pressing Enter on row in checkbox mode', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const checkbox = within(row).getByRole('checkbox');

      // First Enter - select
      fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });
      expect(checkbox).toBeChecked();

      // Second Enter - deselect
      fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });
      expect(checkbox).not.toBeChecked();
    });
    it('should toggle selection when pressing Space on row in checkbox mode', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const checkbox = within(row).getByRole('checkbox');

      // First Space - select
      fireEvent.keyDown(row, { key: ' ', code: 'Space' });
      expect(checkbox).toBeChecked();

      // Second Space - deselect
      fireEvent.keyDown(row, { key: ' ', code: 'Space' });
      expect(checkbox).not.toBeChecked();
    });
    it('should call onSelectFile callback when keyboard selecting in radio mode', () => {
      const files = mockFiles(3);
      const onSelectFile = jest.fn();
      render(
        <FileExplorer
          {...defaultProps}
          files={files}
          selection="radio"
          onSelectFile={onSelectFile}
        />,
      );

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });

      expect(onSelectFile).toHaveBeenCalledWith(files[0], true);
      expect(onSelectFile).toHaveBeenCalledTimes(1);
    });
    it('should call onSelectFile callback when keyboard toggling in checkbox mode', () => {
      const files = mockFiles(3);
      const onSelectFile = jest.fn();
      render(
        <FileExplorer
          {...defaultProps}
          files={files}
          selection="checkbox"
          onSelectFile={onSelectFile}
        />,
      );

      const row = screen.getByTestId('file-explorer-row--file-1-json');

      // Select via keyboard
      fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });
      expect(onSelectFile).toHaveBeenCalledWith(files[0], true);

      // Deselect via keyboard
      fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });
      expect(onSelectFile).toHaveBeenCalledWith(files[0], false);

      expect(onSelectFile).toHaveBeenCalledTimes(2);
    });
    it('should not select unselectable rows via keyboard', () => {
      const files = [mockFile({ name: 'unselectable.json', path: '/u.json', selectable: false })];
      const onSelectFile = jest.fn();
      render(
        <FileExplorer
          {...defaultProps}
          files={files}
          selection="checkbox"
          onSelectFile={onSelectFile}
        />,
      );

      const row = screen.getByTestId('file-explorer-row--u-json');
      const checkbox = within(row).getByRole('checkbox');

      fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' });

      expect(checkbox).not.toBeChecked();
      expect(onSelectFile).not.toHaveBeenCalled();
    });
    it('should not interfere with keyboard navigation on interactive elements', () => {
      const folder = mockFolder({ name: 'my-folder', path: '/my-folder' });
      const onFolderClick = jest.fn();
      render(
        <FileExplorer
          {...defaultProps}
          files={[folder]}
          onFolderClick={onFolderClick}
          selection="checkbox"
        />,
      );

      const row = screen.getByTestId('file-explorer-row--my-folder');
      const folderLink = within(row).getByText('my-folder');

      // Enter should not trigger row-selection side effects
      fireEvent.keyDown(folderLink, { key: 'Enter', code: 'Enter' });
      expect(onFolderClick).toHaveBeenCalledTimes(0);

      // Direct activation still works
      fireEvent.click(folderLink);
      expect(onFolderClick).toHaveBeenCalledWith(folder);
      expect(onFolderClick).toHaveBeenCalledTimes(1);

      // Checkbox should not be selected
      const checkbox = within(row).getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
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
  describe('table row kebab actions', () => {
    it('should show "View details" for an unselected, non-viewed file', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const kebab = within(row).getByRole('button', { name: /file-1\.json actions/i });
      fireEvent.click(kebab);

      const menu = screen.getByRole('menu');
      expect(within(menu).getByRole('menuitem', { name: 'View details' })).toBeInTheDocument();
    });
    it('should hide "View details" in table kebab when file is currently being viewed', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const radio = within(row).getByRole('radio');
      fireEvent.click(radio);

      const kebab = within(row).getByRole('button', { name: /file-1\.json actions/i });
      fireEvent.click(kebab);

      const menu = screen.getByRole('menu');
      expect(
        within(menu).queryByRole('menuitem', { name: 'View details' }),
      ).not.toBeInTheDocument();
    });
    it('should show "Select file" action for an unselected file', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const kebab = within(row).getByRole('button', { name: /file-1\.json actions/i });
      fireEvent.click(kebab);

      const menu = screen.getByRole('menu');
      expect(within(menu).getByRole('menuitem', { name: 'Select file' })).toBeInTheDocument();
      expect(
        within(menu).queryByRole('menuitem', { name: 'Remove selection' }),
      ).not.toBeInTheDocument();
    });
    it('should show "Select folder" action for an unselected folder', () => {
      const folder = mockFolder({ name: 'my-folder', path: '/my-folder' });
      render(<FileExplorer {...defaultProps} files={[folder]} />);

      const row = screen.getByTestId('file-explorer-row--my-folder');
      const kebab = within(row).getByRole('button', { name: /my-folder actions/i });
      fireEvent.click(kebab);

      const menu = screen.getByRole('menu');
      expect(within(menu).getByRole('menuitem', { name: 'Select folder' })).toBeInTheDocument();
    });
    it('should select file via "Select file" kebab action', () => {
      const files = mockFiles(3);
      const onSelectFile = jest.fn();
      render(<FileExplorer {...defaultProps} files={files} onSelectFile={onSelectFile} />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      const kebab = within(row).getByRole('button', { name: /file-1\.json actions/i });
      fireEvent.click(kebab);

      const menu = screen.getByRole('menu');
      fireEvent.click(within(menu).getByRole('menuitem', { name: 'Select file' }));

      const radio = within(row).getByRole('radio');
      expect(radio).toBeChecked();
      expect(onSelectFile).toHaveBeenCalledWith(files[0], true);
    });
    it('should show "Remove selection" instead of "Select file" for a selected file', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      fireEvent.click(within(row).getByRole('radio'));

      const kebab = within(row).getByRole('button', { name: /file-1\.json actions/i });
      fireEvent.click(kebab);

      const menu = screen.getByRole('menu');
      expect(within(menu).getByRole('menuitem', { name: 'Remove selection' })).toBeInTheDocument();
      expect(within(menu).queryByRole('menuitem', { name: 'Select file' })).not.toBeInTheDocument();
    });
    it('should remove selection and clear details via table kebab "Remove selection"', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} />);

      const row = screen.getByTestId('file-explorer-row--file-1-json');
      fireEvent.click(within(row).getByRole('radio'));

      expect(screen.getByTestId('file-explorer-details-panel')).toBeInTheDocument();

      const kebab = within(row).getByRole('button', { name: /file-1\.json actions/i });
      fireEvent.click(kebab);
      const menu = screen.getByRole('menu');
      fireEvent.click(within(menu).getByRole('menuitem', { name: 'Remove selection' }));

      expect(within(row).getByRole('radio')).not.toBeChecked();
      expect(screen.queryByTestId('file-explorer-details-panel')).not.toBeInTheDocument();
    });
  });
  describe('eye icon indicator in selected files list', () => {
    it('should show eye icon next to file being viewed when multiple files are selected', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      const row1 = screen.getByTestId('file-explorer-row--file-1-json');
      const row2 = screen.getByTestId('file-explorer-row--file-2-json');

      // Select two files
      fireEvent.click(within(row1).getByRole('checkbox'));
      fireEvent.click(within(row2).getByRole('checkbox'));

      // Click "View details" on first file
      const kebab1 = within(row1).getByRole('button', { name: /file-1\.json actions/i });
      fireEvent.click(kebab1);
      const viewDetailsAction = screen.getByText('View details');
      fireEvent.click(viewDetailsAction);

      // Eye icon should appear next to file-1 in selected files list
      const selectedFilesList = screen.getByTestId('file-explorer-selected-files');
      const file1Item = within(selectedFilesList).getByText('file-1.json').closest('li');
      expect(file1Item).toBeInTheDocument();

      // Eye icon should be present for file-1
      const eyeIcon = within(file1Item!).getByTitle('Viewing details');
      expect(eyeIcon).toBeInTheDocument();
    });
    it('should NOT show eye icon when only one file is selected', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      const row1 = screen.getByTestId('file-explorer-row--file-1-json');

      // Select only one file
      fireEvent.click(within(row1).getByRole('checkbox'));

      // Selected files list should exist
      const selectedFilesList = screen.getByTestId('file-explorer-selected-files');
      const file1Item = within(selectedFilesList).getByText('file-1.json').closest('li');
      expect(file1Item).toBeInTheDocument();

      // Eye icon should NOT be present when only one file selected
      const eyeIcon = within(file1Item!).queryByTitle('Viewing details');
      expect(eyeIcon).not.toBeInTheDocument();
    });
    it('should move eye icon when viewing different file in multi-selection', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      const row1 = screen.getByTestId('file-explorer-row--file-1-json');
      const row2 = screen.getByTestId('file-explorer-row--file-2-json');

      // Select two files
      fireEvent.click(within(row1).getByRole('checkbox'));
      fireEvent.click(within(row2).getByRole('checkbox'));

      // View details of first file
      const kebab1 = within(row1).getByRole('button', { name: /file-1\.json actions/i });
      fireEvent.click(kebab1);
      fireEvent.click(screen.getByText('View details'));

      const selectedFilesList = screen.getByTestId('file-explorer-selected-files');
      const file1Item = within(selectedFilesList).getByText('file-1.json').closest('li');
      const file2Item = within(selectedFilesList).getByText('file-2.json').closest('li');

      // Eye should be on file-1
      expect(within(file1Item!).queryByTitle('Viewing details')).toBeInTheDocument();
      expect(within(file2Item!).queryByTitle('Viewing details')).not.toBeInTheDocument();

      // Click on file-2 in selected files list to view its details
      fireEvent.click(within(file2Item!).getByText('file-2.json'));

      // Eye should now be on file-2
      expect(within(file1Item!).queryByTitle('Viewing details')).not.toBeInTheDocument();
      expect(within(file2Item!).queryByTitle('Viewing details')).toBeInTheDocument();
    });
    it('should remove eye icon when deselecting down to one file', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      const row1 = screen.getByTestId('file-explorer-row--file-1-json');
      const row2 = screen.getByTestId('file-explorer-row--file-2-json');

      // Select two files
      fireEvent.click(within(row1).getByRole('checkbox'));
      fireEvent.click(within(row2).getByRole('checkbox'));

      // View details of first file
      const kebab1 = within(row1).getByRole('button', { name: /file-1\.json actions/i });
      fireEvent.click(kebab1);
      fireEvent.click(screen.getByText('View details'));

      const selectedFilesList = screen.getByTestId('file-explorer-selected-files');
      let file1Item = within(selectedFilesList).getByText('file-1.json').closest('li');

      // Eye icon should be visible with 2 files selected
      expect(within(file1Item!).queryByTitle('Viewing details')).toBeInTheDocument();

      // Deselect file-2 (leaving only file-1 selected)
      fireEvent.click(within(row2).getByRole('checkbox'));

      // Eye icon should disappear when only 1 file remains selected
      file1Item = within(selectedFilesList).getByText('file-1.json').closest('li');
      expect(within(file1Item!).queryByTitle('Viewing details')).not.toBeInTheDocument();
    });
    it('should move eye icon to newly selected file', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      const row1 = screen.getByTestId('file-explorer-row--file-1-json');
      const row2 = screen.getByTestId('file-explorer-row--file-2-json');
      const row3 = screen.getByTestId('file-explorer-row--file-3-json');

      // Select two files — selecting auto-views the last selected file
      fireEvent.click(within(row1).getByRole('checkbox'));
      fireEvent.click(within(row2).getByRole('checkbox'));

      const selectedFilesList = screen.getByTestId('file-explorer-selected-files');
      let file1Item = within(selectedFilesList).getByText('file-1.json').closest('li');
      let file2Item = within(selectedFilesList).getByText('file-2.json').closest('li');

      // Eye should be on file-2 (last selected)
      expect(within(file2Item!).queryByTitle('Viewing details')).toBeInTheDocument();

      // Select third file (selecting a file shows its details)
      fireEvent.click(within(row3).getByRole('checkbox'));

      file1Item = within(selectedFilesList).getByText('file-1.json').closest('li');
      file2Item = within(selectedFilesList).getByText('file-2.json').closest('li');
      const file3Item = within(selectedFilesList).getByText('file-3.json').closest('li');

      // Eye should now be on file-3 (the newly selected file)
      expect(within(file1Item!).queryByTitle('Viewing details')).not.toBeInTheDocument();
      expect(within(file2Item!).queryByTitle('Viewing details')).not.toBeInTheDocument();
      expect(within(file3Item!).queryByTitle('Viewing details')).toBeInTheDocument();
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
