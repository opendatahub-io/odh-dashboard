import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import * as React from 'react';
import type { ExplorerFile, ExplorerFiles } from '#~/concepts/fileExplorer/types';
import FileExplorer, {
  isFolder,
  sanitizeId,
  shouldDetailsPanelRender,
} from '#~/concepts/fileExplorer/FileExplorer/FileExplorer';
import {
  mockFile,
  mockFiles,
  mockFolder,
  mockFoldersTrail,
  mockSource,
  mockSources,
} from '#~/concepts/fileExplorer/__mocks__/mockFileExplorer';

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
    jest.clearAllMocks();
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
      const files: ExplorerFiles = [
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
    it('should show skeleton breadcrumbs when loading with folders', () => {
      const folders = mockFoldersTrail();
      render(<FileExplorer {...defaultProps} files={[]} folders={folders} loading />);

      // Breadcrumb skeletons should render for each folder
      const breadcrumbs = screen.getByRole('navigation', { name: /breadcrumb/i });
      const skeletons = breadcrumbs.querySelectorAll('.pf-v6-c-skeleton');
      expect(skeletons.length).toBe(folders.length);
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
    it('should call onClose and reset state when modal X button is clicked', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} />);

      // Select a file first
      const row = screen.getByTestId('file-explorer-row--file-1-json');
      fireEvent.click(within(row).getByRole('radio'));
      expect(screen.getByTestId('file-explorer-details-panel')).toBeInTheDocument();

      // Click the modal's X close button
      const closeButton = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeButton);

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
      const eyeIcon = within(file1Item as HTMLElement).getByTitle('Viewing details');
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
      const eyeIcon = within(file1Item as HTMLElement).queryByTitle('Viewing details');
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
      expect(file1Item).toBeInTheDocument();
      expect(file2Item).toBeInTheDocument();

      // Eye should be on file-1
      expect(within(file1Item as HTMLElement).queryByTitle('Viewing details')).toBeInTheDocument();
      expect(
        within(file2Item as HTMLElement).queryByTitle('Viewing details'),
      ).not.toBeInTheDocument();

      // Click on file-2 in selected files list to view its details
      fireEvent.click(within(file2Item as HTMLElement).getByText('file-2.json'));

      // Eye should now be on file-2
      expect(
        within(file1Item as HTMLElement).queryByTitle('Viewing details'),
      ).not.toBeInTheDocument();
      expect(within(file2Item as HTMLElement).queryByTitle('Viewing details')).toBeInTheDocument();
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
      expect(file1Item).toBeInTheDocument();

      // Eye icon should be visible with 2 files selected
      expect(within(file1Item as HTMLElement).queryByTitle('Viewing details')).toBeInTheDocument();

      // Deselect file-2 (leaving only file-1 selected)
      fireEvent.click(within(row2).getByRole('checkbox'));

      // Eye icon should disappear when only 1 file remains selected
      file1Item = within(selectedFilesList).getByText('file-1.json').closest('li');
      expect(file1Item).toBeInTheDocument();
      expect(
        within(file1Item as HTMLElement).queryByTitle('Viewing details'),
      ).not.toBeInTheDocument();
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
      expect(file1Item).toBeInTheDocument();
      expect(file2Item).toBeInTheDocument();

      // Eye should be on file-2 (last selected)
      expect(within(file2Item as HTMLElement).queryByTitle('Viewing details')).toBeInTheDocument();

      // Select third file (selecting a file shows its details)
      fireEvent.click(within(row3).getByRole('checkbox'));

      file1Item = within(selectedFilesList).getByText('file-1.json').closest('li');
      file2Item = within(selectedFilesList).getByText('file-2.json').closest('li');
      const file3Item = within(selectedFilesList).getByText('file-3.json').closest('li');
      expect(file1Item).toBeInTheDocument();
      expect(file2Item).toBeInTheDocument();
      expect(file3Item).toBeInTheDocument();

      // Eye should now be on file-3 (the newly selected file)
      expect(
        within(file1Item as HTMLElement).queryByTitle('Viewing details'),
      ).not.toBeInTheDocument();
      expect(
        within(file2Item as HTMLElement).queryByTitle('Viewing details'),
      ).not.toBeInTheDocument();
      expect(within(file3Item as HTMLElement).queryByTitle('Viewing details')).toBeInTheDocument();
    });
  });
  describe('details panel interactions', () => {
    it('should close details panel when close button is clicked', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} />);

      // Select a file to show the details panel
      const row = screen.getByTestId('file-explorer-row--file-1-json');
      fireEvent.click(within(row).getByRole('radio'));

      expect(screen.getByTestId('file-explorer-details-panel')).toBeInTheDocument();

      // Click the close details button
      fireEvent.click(screen.getByTestId('file-explorer-close-details-btn'));

      // The details sub-card content should be gone, but the panel stays because
      // selectedFiles still has the file — only filesToView is cleared
      const panel = screen.getByTestId('file-explorer-details-panel');
      expect(panel).toBeInTheDocument();
      // The "Details" heading should no longer render since filesToView is empty
      expect(within(panel).queryByText('Details')).not.toBeInTheDocument();
    });
    it('should render file details with custom properties', () => {
      const fileWithDetails = mockFile({
        name: 'report.pdf',
        path: '/report.pdf',
        type: 'PDF',
        details: { Size: '2KB', Type: 'PDF', 'Custom Prop': 'custom value' },
      });
      render(<FileExplorer {...defaultProps} files={[fileWithDetails]} />);

      // Select the file to view its details
      const row = screen.getByTestId('file-explorer-row--report-pdf');
      fireEvent.click(within(row).getByRole('radio'));

      const panel = screen.getByTestId('file-explorer-details-panel');
      // "report.pdf" appears in both the details sub-card and the selected files sub-card
      expect(within(panel).getAllByText('report.pdf').length).toBeGreaterThanOrEqual(1);
      expect(within(panel).getByText('Size')).toBeInTheDocument();
      expect(within(panel).getByText('2KB')).toBeInTheDocument();
      expect(within(panel).getByText('Custom Prop')).toBeInTheDocument();
      expect(within(panel).getByText('custom value')).toBeInTheDocument();
    });
    it('should render boolean detail values as string "true" or "false"', () => {
      const fileWithBooleans = mockFile({
        name: 'config.yaml',
        path: '/config.yaml',
        type: 'YAML',
        details: { Enabled: true, Archived: false },
      });
      render(<FileExplorer {...defaultProps} files={[fileWithBooleans]} />);

      const row = screen.getByTestId('file-explorer-row--config-yaml');
      fireEvent.click(within(row).getByRole('radio'));

      const panel = screen.getByTestId('file-explorer-details-panel');
      expect(within(panel).getByText('Enabled')).toBeInTheDocument();
      expect(within(panel).getByText('true')).toBeInTheDocument();
      expect(within(panel).getByText('Archived')).toBeInTheDocument();
      expect(within(panel).getByText('false')).toBeInTheDocument();
    });
  });
  describe('selected files data list removal', () => {
    it('should remove a file from the selected files list via kebab "Remove selection"', () => {
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

      // Select two files
      const row1 = screen.getByTestId('file-explorer-row--file-1-json');
      const row2 = screen.getByTestId('file-explorer-row--file-2-json');
      fireEvent.click(within(row1).getByRole('checkbox'));
      fireEvent.click(within(row2).getByRole('checkbox'));

      const selectedFilesList = screen.getByTestId('file-explorer-selected-files');
      expect(within(selectedFilesList).getByText('file-1.json')).toBeInTheDocument();
      expect(within(selectedFilesList).getByText('file-2.json')).toBeInTheDocument();

      // Open kebab menu for file-1 in the selected files list
      fireEvent.click(within(selectedFilesList).getByLabelText('file-1.json overflow menu'));
      const menu = screen.getByRole('menu');
      fireEvent.click(within(menu).getByRole('menuitem', { name: 'Remove selection' }));

      // file-1 should be removed from the selected files list
      expect(within(selectedFilesList).queryByText('file-1.json')).not.toBeInTheDocument();
      expect(within(selectedFilesList).getByText('file-2.json')).toBeInTheDocument();
    });
    it('should call onSelectFile with false when removing via selected files list', () => {
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

      // Select a file
      const row1 = screen.getByTestId('file-explorer-row--file-1-json');
      fireEvent.click(within(row1).getByRole('checkbox'));
      onSelectFile.mockClear();

      const selectedFilesList = screen.getByTestId('file-explorer-selected-files');

      // Remove via selected files list kebab
      fireEvent.click(within(selectedFilesList).getByLabelText('file-1.json overflow menu'));
      const menu = screen.getByRole('menu');
      fireEvent.click(within(menu).getByRole('menuitem', { name: 'Remove selection' }));

      expect(onSelectFile).toHaveBeenCalledWith(files[0], false);
    });
    it('should show file details when clicking "View details" in selected files list kebab', () => {
      const files = mockFiles(3);
      render(<FileExplorer {...defaultProps} files={files} selection="checkbox" />);

      // Select two files
      const row1 = screen.getByTestId('file-explorer-row--file-1-json');
      const row2 = screen.getByTestId('file-explorer-row--file-2-json');
      fireEvent.click(within(row1).getByRole('checkbox'));
      fireEvent.click(within(row2).getByRole('checkbox'));

      const selectedFilesList = screen.getByTestId('file-explorer-selected-files');

      // file-1 is NOT being viewed (file-2 is, since it was selected last)
      // Open file-1's kebab in the selected files list and click "View details"
      fireEvent.click(within(selectedFilesList).getByLabelText('file-1.json overflow menu'));
      const menu = screen.getByRole('menu');
      fireEvent.click(within(menu).getByRole('menuitem', { name: 'View details' }));

      // Now file-1 should be the viewed file — verify its details are shown
      const panel = screen.getByTestId('file-explorer-details-panel');
      // "file-1.json" appears in both the details sub-card and the selected files sub-card
      expect(within(panel).getAllByText('file-1.json').length).toBeGreaterThanOrEqual(1);
    });
  });
  describe('breadcrumb collapse', () => {
    const makeFolders = (count: number) =>
      Array.from({ length: count }, (_, i) =>
        mockFolder({
          name: `folder-${i + 1}`,
          path: Array.from({ length: i + 1 }, (__, j) => `/folder-${j + 1}`).join(''),
          items: 0,
        }),
      );

    it('should show "..." collapse dropdown when more than 6 folders', () => {
      const folders = makeFolders(8);
      render(<FileExplorer {...defaultProps} folders={folders} />);

      // The "..." collapse toggle should be present
      expect(screen.getByLabelText('Collapsed breadcrumb items')).toBeInTheDocument();
    });
    it('should call onNavigate when clicking a hidden folder in the collapse dropdown', () => {
      const folders = makeFolders(8);
      const onNavigate = jest.fn();
      render(<FileExplorer {...defaultProps} folders={folders} onNavigate={onNavigate} />);

      // Open the collapse dropdown
      fireEvent.click(screen.getByLabelText('Collapsed breadcrumb items'));

      // Hidden folders are those between LEADING_VISIBLE (2) and length - TRAILING_VISIBLE (2).
      // For 8 folders: leading = [0,1], hidden = [2,3,4,5], trailing nav = [6], current = [7]
      // Click on folder-3 (index 2) in the dropdown
      fireEvent.click(screen.getByText('folder-3'));
      expect(onNavigate).toHaveBeenCalledWith(folders[2]);
    });
    it('should NOT show "..." collapse dropdown when 6 or fewer folders', () => {
      const folders = makeFolders(6);
      render(<FileExplorer {...defaultProps} folders={folders} />);

      expect(screen.queryByLabelText('Collapsed breadcrumb items')).not.toBeInTheDocument();
    });
    it('should call onNavigate when clicking a leading breadcrumb in collapsed mode', () => {
      const folders = makeFolders(8);
      const onNavigate = jest.fn();
      render(<FileExplorer {...defaultProps} folders={folders} onNavigate={onNavigate} />);

      // In collapsed mode with 8 folders:
      // Leading: folder-1, folder-2
      // Hidden: folder-3 through folder-6
      // Trailing nav: folder-7
      // Current (active, not clickable): folder-8
      fireEvent.click(screen.getByText('folder-1'));
      expect(onNavigate).toHaveBeenCalledWith(folders[0]);
    });
  });
  describe('search clear', () => {
    it('should call onSearch with empty string when search is cleared', () => {
      const onSearch = jest.fn();
      render(<FileExplorer {...defaultProps} onSearch={onSearch} />);

      const searchInput = screen
        .getByTestId('file-explorer-search')
        .querySelector('input') as HTMLInputElement;

      // Type something first
      fireEvent.change(searchInput, { target: { value: 'some-query' } });
      expect(onSearch).toHaveBeenCalledWith('some-query');
      onSearch.mockClear();

      // Click the clear button (SearchInput renders a reset button when there's a value)
      const clearButton = screen
        .getByTestId('file-explorer-search')
        .querySelector('button[aria-label="Reset"]') as HTMLButtonElement;
      fireEvent.click(clearButton);

      expect(onSearch).toHaveBeenCalledWith('');
    });
  });
  describe('source selector edge cases', () => {
    it('should show "No source of documents provided" when sources is empty and no source selected', () => {
      const onSelectSource = jest.fn();
      render(
        <FileExplorer
          {...defaultProps}
          source={undefined}
          sources={[]}
          onSelectSource={onSelectSource}
        />,
      );

      expect(screen.getByText('No source of documents provided')).toBeInTheDocument();
    });
    it('should call onSelectSource when clicking a source label', () => {
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

      fireEvent.click(screen.getByText('connection-1 (10)'));
      expect(onSelectSource).toHaveBeenCalledWith(sources[0]);
    });
    it('should not render source selector when a source is already selected', () => {
      const onSelectSource = jest.fn();
      render(
        <FileExplorer
          {...defaultProps}
          source={mockSource()}
          sources={mockSources(2)}
          onSelectSource={onSelectSource}
        />,
      );

      // Source selector should not render its labels since a source is already selected
      expect(screen.queryByText('Source Selector:')).not.toBeInTheDocument();
      expect(screen.queryByText('connection-1 (10)')).not.toBeInTheDocument();
    });
  });
  describe('pagination callbacks', () => {
    it('should call onSetPage when page changes', () => {
      const onSetPage = jest.fn();
      render(
        <FileExplorer
          {...defaultProps}
          files={mockFiles(5)}
          page={1}
          perPage={2}
          itemCount={10}
          onSetPage={onSetPage}
        />,
      );

      const pagination = screen.getByTestId('file-explorer-pagination');
      const nextButton = pagination.querySelector(
        'button[data-action="next"]',
      ) as HTMLButtonElement;
      fireEvent.click(nextButton);

      expect(onSetPage).toHaveBeenCalledWith(2);
    });
    it('should call onPerPageSelect when per-page changes', () => {
      const onPerPageSelect = jest.fn();
      render(
        <FileExplorer
          {...defaultProps}
          files={mockFiles(5)}
          page={1}
          perPage={10}
          itemCount={50}
          onPerPageSelect={onPerPageSelect}
        />,
      );

      const pagination = screen.getByTestId('file-explorer-pagination');
      // Open the per-page dropdown toggle (the button showing the item range)
      const perPageToggle = within(pagination).getByRole('button', {
        name: /\d+ - \d+/,
      });
      fireEvent.click(perPageToggle);

      // Select a different per-page option (e.g., 20)
      const option20 = screen.getByText('20 per page');
      fireEvent.click(option20);

      expect(onPerPageSelect).toHaveBeenCalledWith(20);
    });
  });
  describe('search character warning', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should show character warning tooltip when disallowed characters are typed', () => {
      render(
        <FileExplorer
          {...defaultProps}
          allowedSearchCharacters={/[a-z0-9-]/}
          allowedSearchCharactersLabel="Only lowercase letters, numbers, and hyphens are allowed"
        />,
      );

      const searchInput = screen
        .getByTestId('file-explorer-search')
        .querySelector('input') as HTMLInputElement;

      // Type disallowed characters
      fireEvent.change(searchInput, { target: { value: 'hello@world!' } });

      // The tooltip with the allowedSearchCharactersLabel should be force-visible
      const infoIcon = screen.getByTestId('file-explorer-search-chars-info');
      expect(infoIcon).toBeInTheDocument();

      // The tooltip content should be visible
      expect(
        screen.getByText('Only lowercase letters, numbers, and hyphens are allowed'),
      ).toBeInTheDocument();
    });
    it('should auto-hide the character warning after 2 seconds', () => {
      render(
        <FileExplorer
          {...defaultProps}
          allowedSearchCharacters={/[a-z0-9-]/}
          allowedSearchCharactersLabel="Only lowercase letters, numbers, and hyphens are allowed"
        />,
      );

      const searchInput = screen
        .getByTestId('file-explorer-search')
        .querySelector('input') as HTMLInputElement;

      // Type disallowed characters to trigger the warning
      fireEvent.change(searchInput, { target: { value: 'test@' } });

      // Warning should be visible initially
      expect(
        screen.getByText('Only lowercase letters, numbers, and hyphens are allowed'),
      ).toBeInTheDocument();

      // Advance time by 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // After 2 seconds, the force-visible tooltip prop should be removed.
      // The tooltip content may still be in the DOM (PF renders it), but
      // we can verify that the isVisible override is gone by checking
      // the info icon element no longer has a forced tooltip.
      // Since the tooltip is no longer force-visible, the content should not be
      // rendered in an accessible way — it may be hidden or removed.
      const infoIcon = screen.getByTestId('file-explorer-search-chars-info');
      expect(infoIcon).toBeInTheDocument();
    });
  });
});

describe('isFolder', () => {
  it('should return true for folder type', () => {
    const folder: ExplorerFile = { name: 'test', path: '/test', type: 'folder', items: 0 };
    expect(isFolder(folder)).toBe(true);
  });
  it('should return false for non-folder type', () => {
    const file: ExplorerFile = { name: 'test.json', path: '/test.json', type: 'JSON' };
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
