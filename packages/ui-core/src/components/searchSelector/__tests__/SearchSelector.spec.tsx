import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MenuItem } from '@patternfly/react-core';
import SearchSelector from '../SearchSelector';
import { MODAL_OVERFLOW_UNLOCK_COUNT_ATTR } from '../../../utilities/useModalOverflowUnlock';

const defaultProps = {
  dataTestId: 'project-search',
  searchValue: '',
  onSearchChange: jest.fn(),
  onSearchClear: jest.fn(),
  toggleContent: 'Select project',
  toggleAriaLabel: 'Project',
};

describe('SearchSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should portal the menu to document.body outside a modal dialog', async () => {
    const pageRef = React.createRef<HTMLDivElement>();

    render(
      <div ref={pageRef} data-testid="page-shell">
        <SearchSelector {...defaultProps}>
          <MenuItem itemId="proj-a">Project A</MenuItem>
        </SearchSelector>
      </div>,
    );

    const toggle = screen.getByTestId('project-search-toggle');

    await act(async () => {
      fireEvent.click(toggle);
    });

    const menu = screen.getByTestId('project-search-menu');
    expect(document.body.contains(menu)).toBe(true);
    expect(pageRef.current?.contains(menu)).toBe(false);
  });

  it('should portal the menu into the modal dialog and unlock overflow', async () => {
    const dialogRef = React.createRef<HTMLDivElement>();

    render(
      <div ref={dialogRef} role="dialog" style={{ overflow: 'auto' }} data-testid="dialog">
        <SearchSelector {...defaultProps}>
          <MenuItem itemId="proj-a">Project A</MenuItem>
        </SearchSelector>
      </div>,
    );

    const dialog = dialogRef.current as HTMLDivElement;
    const toggle = screen.getByTestId('project-search-toggle');

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(dialog.style.overflow).toBe('visible');
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBe('1');

    const menu = within(dialog).getByTestId('project-search-menu');
    expect(dialog.contains(menu)).toBe(true);
    expect(screen.getByRole('menuitem', { name: 'Project A' })).toBeInTheDocument();
  });

  it('should restore modal overflow when the menu closes', async () => {
    const dialogRef = React.createRef<HTMLDivElement>();

    render(
      <div ref={dialogRef} role="dialog" style={{ overflow: 'auto' }}>
        <SearchSelector {...defaultProps}>
          <MenuItem itemId="proj-a">Project A</MenuItem>
        </SearchSelector>
      </div>,
    );

    const dialog = dialogRef.current as HTMLDivElement;
    const toggle = screen.getByTestId('project-search-toggle');

    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(dialog.style.overflow).toBe('visible');

    await act(async () => {
      fireEvent.keyDown(toggle, { key: 'Escape' });
    });

    expect(dialog.style.overflow).toBe('auto');
    expect(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR)).toBeNull();
  });

  it('should return focus to the toggle after Escape from a portaled menu item', async () => {
    render(
      <div role="dialog">
        <SearchSelector {...defaultProps}>
          <MenuItem itemId="proj-a">Project A</MenuItem>
        </SearchSelector>
      </div>,
    );

    const toggle = screen.getByTestId('project-search-toggle');

    await act(async () => {
      fireEvent.click(toggle);
    });

    const menuItem = screen.getByRole('menuitem', { name: 'Project A' });
    menuItem.focus();

    await act(async () => {
      fireEvent.keyDown(menuItem, { key: 'Escape' });
      await Promise.resolve();
    });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(toggle);
  });

  it('should respect an explicit appendTo inline override', async () => {
    const pageRef = React.createRef<HTMLDivElement>();

    render(
      <div ref={pageRef} data-testid="page-shell">
        <SearchSelector {...defaultProps} appendTo="inline">
          <MenuItem itemId="proj-a">Project A</MenuItem>
        </SearchSelector>
      </div>,
    );

    const toggle = screen.getByTestId('project-search-toggle');

    await act(async () => {
      fireEvent.click(toggle);
    });

    const menu = screen.getByTestId('project-search-menu');
    expect(pageRef.current?.contains(menu)).toBe(true);
    expect(document.body.contains(menu)).toBe(true);
  });
});
