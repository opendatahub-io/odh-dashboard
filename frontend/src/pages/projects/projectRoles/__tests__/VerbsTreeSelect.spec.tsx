import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerbsTreeSelect from '#~/pages/projects/projectRoles/VerbsTreeSelect';

describe('VerbsTreeSelect', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the tree with all categories expanded', () => {
    render(<VerbsTreeSelect selectedVerbs={[]} onSelectedVerbsChange={mockOnChange} />);

    expect(screen.getByTestId('verbs-tree-select')).toBeInTheDocument();
    expect(screen.getByText('All operations')).toBeInTheDocument();
    expect(screen.getByText('Create operations:')).toBeInTheDocument();
    expect(screen.getByText('Read operations:')).toBeInTheDocument();
    expect(screen.getByText('Update operations:')).toBeInTheDocument();
    expect(screen.getByText('Delete operations:')).toBeInTheDocument();
  });

  it('should render individual verb labels', () => {
    render(<VerbsTreeSelect selectedVerbs={[]} onSelectedVerbsChange={mockOnChange} />);

    expect(screen.getByText('Create:')).toBeInTheDocument();
    expect(screen.getByText('Get:')).toBeInTheDocument();
    expect(screen.getByText('List:')).toBeInTheDocument();
    expect(screen.getByText('Watch:')).toBeInTheDocument();
    expect(screen.getByText('Update:')).toBeInTheDocument();
    expect(screen.getByText('Patch:')).toBeInTheDocument();
    expect(screen.getByText('Delete:')).toBeInTheDocument();
    expect(screen.getByText('Delete collection:')).toBeInTheDocument();
  });

  it('should render helper text about wildcard verbs', () => {
    render(<VerbsTreeSelect selectedVerbs={[]} onSelectedVerbsChange={mockOnChange} />);

    expect(screen.getByText(/Selecting "All operations" grants the wildcard/)).toBeInTheDocument();
  });

  describe('individual verb selection', () => {
    it('should call onSelectedVerbsChange with the verb when an unchecked verb is clicked', async () => {
      const user = userEvent.setup();
      render(<VerbsTreeSelect selectedVerbs={[]} onSelectedVerbsChange={mockOnChange} />);

      const treeView = screen.getByRole('tree');
      const getCheckbox = within(treeView).getAllByRole('checkbox');
      const createCheckbox = getCheckbox.find((cb) => {
        const treeItem = cb.closest('[role="treeitem"]');
        return treeItem?.id === 'create';
      });

      if (createCheckbox) {
        await user.click(createCheckbox);
        expect(mockOnChange).toHaveBeenCalledWith(['create']);
      }
    });

    it('should remove a verb when a checked verb is clicked', async () => {
      const user = userEvent.setup();
      render(
        <VerbsTreeSelect selectedVerbs={['get', 'list']} onSelectedVerbsChange={mockOnChange} />,
      );

      const treeView = screen.getByRole('tree');
      const getCheckbox = within(treeView)
        .getAllByRole('checkbox')
        .find((cb) => cb.closest('[role="treeitem"]')?.id === 'get');

      if (getCheckbox) {
        await user.click(getCheckbox);
        expect(mockOnChange).toHaveBeenCalledWith(['list']);
      }
    });
  });

  describe('category selection', () => {
    it('should select all verbs in a category when category checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<VerbsTreeSelect selectedVerbs={[]} onSelectedVerbsChange={mockOnChange} />);

      const treeView = screen.getByRole('tree');
      const readCategoryCheckbox = within(treeView)
        .getAllByRole('checkbox')
        .find((cb) => cb.closest('[role="treeitem"]')?.id === 'cat-read');

      if (readCategoryCheckbox) {
        await user.click(readCategoryCheckbox);
        expect(mockOnChange).toHaveBeenCalledWith(expect.arrayContaining(['get', 'list', 'watch']));
      }
    });

    it('should deselect all verbs in a category when all are already selected', async () => {
      const user = userEvent.setup();
      render(
        <VerbsTreeSelect
          selectedVerbs={['get', 'list', 'watch', 'create']}
          onSelectedVerbsChange={mockOnChange}
        />,
      );

      const treeView = screen.getByRole('tree');
      const readCategoryCheckbox = within(treeView)
        .getAllByRole('checkbox')
        .find((cb) => cb.closest('[role="treeitem"]')?.id === 'cat-read');

      if (readCategoryCheckbox) {
        await user.click(readCategoryCheckbox);
        expect(mockOnChange).toHaveBeenCalledWith(['create']);
      }
    });
  });

  describe('all operations selection', () => {
    it('should set wildcard when All operations is checked', async () => {
      const user = userEvent.setup();
      render(<VerbsTreeSelect selectedVerbs={[]} onSelectedVerbsChange={mockOnChange} />);

      const treeView = screen.getByRole('tree');
      const allCheckbox = within(treeView)
        .getAllByRole('checkbox')
        .find((cb) => cb.closest('[role="treeitem"]')?.id === 'all');

      if (allCheckbox) {
        await user.click(allCheckbox);
        expect(mockOnChange).toHaveBeenCalledWith(['*']);
      }
    });

    it('should clear all when All operations is unchecked', async () => {
      const user = userEvent.setup();
      render(<VerbsTreeSelect selectedVerbs={['*']} onSelectedVerbsChange={mockOnChange} />);

      const treeView = screen.getByRole('tree');
      const allCheckbox = within(treeView)
        .getAllByRole('checkbox')
        .find((cb) => cb.closest('[role="treeitem"]')?.id === 'all');

      if (allCheckbox) {
        await user.click(allCheckbox);
        expect(mockOnChange).toHaveBeenCalledWith([]);
      }
    });

    it('should ignore individual clicks when wildcard is active', async () => {
      const user = userEvent.setup();
      render(<VerbsTreeSelect selectedVerbs={['*']} onSelectedVerbsChange={mockOnChange} />);

      const treeView = screen.getByRole('tree');
      const createCheckbox = within(treeView)
        .getAllByRole('checkbox')
        .find((cb) => cb.closest('[role="treeitem"]')?.id === 'create');

      if (createCheckbox) {
        await user.click(createCheckbox);
        expect(mockOnChange).not.toHaveBeenCalled();
      }
    });
  });

  describe('checkbox states', () => {
    it('should show all checkboxes unchecked when no verbs are selected', () => {
      render(<VerbsTreeSelect selectedVerbs={[]} onSelectedVerbsChange={mockOnChange} />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((cb) => {
        expect(cb).not.toBeChecked();
      });
    });

    it('should show all checkboxes checked when wildcard is selected', () => {
      render(<VerbsTreeSelect selectedVerbs={['*']} onSelectedVerbsChange={mockOnChange} />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((cb) => {
        expect(cb).toBeChecked();
      });
    });

    it('should show individual verb checked when selected', () => {
      render(<VerbsTreeSelect selectedVerbs={['get']} onSelectedVerbsChange={mockOnChange} />);

      const treeView = screen.getByRole('tree');
      const getCheckbox = within(treeView)
        .getAllByRole('checkbox')
        .find((cb) => cb.closest('[role="treeitem"]')?.id === 'get');

      expect(getCheckbox).toBeChecked();
    });
  });
});
