import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import * as BrowserUnloadBlocker from '~/utilities/useBrowserUnloadBlocker';
import DashboardDescriptionListGroup from '~/components/DashboardDescriptionListGroup';
import '@testing-library/jest-dom';

jest.mock('~/components/NavigationBlockerModal', () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(({ hasUnsavedChanges }) =>
      hasUnsavedChanges ? (
        <div data-testid="navigation-blocker">Navigation Blocker Modal</div>
      ) : null,
    ),
}));

jest.mock('~/utilities/useBrowserUnloadBlocker', () => ({
  useBrowserUnloadBlocker: jest.fn(),
}));

describe('DashboardDescriptionListGroup', () => {
  const defaultProps = {
    title: 'Test Title',
    children: <div>Test Content</div>,
  };

  const editableProps = {
    ...defaultProps,
    isEditable: true,
    isEditing: false,
    contentWhenEditing: <div>Editing Content</div>,
    onEditClick: jest.fn(),
    onSaveEditsClick: jest.fn(),
    onDiscardEditsClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly with basic props', () => {
    render(<DashboardDescriptionListGroup {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render edit button when isEditable is true', () => {
    render(<DashboardDescriptionListGroup {...editableProps} />);

    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('should render save and cancel buttons when isEditing is true', () => {
    render(<DashboardDescriptionListGroup {...editableProps} isEditing />);

    expect(screen.getByLabelText(/Save edits to/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Discard edits to/)).toBeInTheDocument();
  });

  it('should not render NavigationBlockerModal when not editing', () => {
    render(<DashboardDescriptionListGroup {...editableProps} />);
    expect(screen.queryByTestId('navigation-blocker')).not.toBeInTheDocument();
  });

  it('should render NavigationBlockerModal when editing', () => {
    render(<DashboardDescriptionListGroup {...editableProps} isEditing />);
    expect(screen.getByTestId('navigation-blocker')).toBeInTheDocument();
  });

  it('should call useBrowserUnloadBlocker with true when editing', () => {
    const useBrowserUnloadBlockerSpy = jest.spyOn(BrowserUnloadBlocker, 'useBrowserUnloadBlocker');

    render(<DashboardDescriptionListGroup {...editableProps} isEditing />);
    expect(useBrowserUnloadBlockerSpy).toHaveBeenCalledWith(true);
  });

  it('should call useBrowserUnloadBlocker with false when not editing', () => {
    const useBrowserUnloadBlockerSpy = jest.spyOn(BrowserUnloadBlocker, 'useBrowserUnloadBlocker');

    render(<DashboardDescriptionListGroup {...editableProps} />);
    expect(useBrowserUnloadBlockerSpy).toHaveBeenCalledWith(false);
  });

  it('should call onEditClick when edit button is clicked', () => {
    render(<DashboardDescriptionListGroup {...editableProps} />);
    fireEvent.click(screen.getByText('Edit'));
    expect(editableProps.onEditClick).toHaveBeenCalled();
  });

  it('should call onSaveEditsClick when save button is clicked', () => {
    render(<DashboardDescriptionListGroup {...editableProps} isEditing />);
    fireEvent.click(screen.getByLabelText(/Save edits to/));
    expect(editableProps.onSaveEditsClick).toHaveBeenCalled();
  });

  it('should call onDiscardEditsClick when cancel button is clicked', () => {
    render(<DashboardDescriptionListGroup {...editableProps} isEditing />);
    fireEvent.click(screen.getByLabelText(/Discard edits to/));
    expect(editableProps.onDiscardEditsClick).toHaveBeenCalled();
  });
});
