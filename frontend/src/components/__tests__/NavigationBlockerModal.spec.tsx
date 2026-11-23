import React from 'react';
import * as ReactRouterDom from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Location, Blocker } from 'react-router-dom';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { WorkingProjectContext } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import NavigationBlockerModal from '#~/components/NavigationBlockerModal';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useBlocker: jest.fn(),
}));

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

describe('NavigationBlockerModal', () => {
  const mockProceed = jest.fn();
  const mockReset = jest.fn();

  const mockLocation: Location = {
    pathname: '/some-path',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useIsAreaAvailable)
      .mockReturnValue({ status: false } as ReturnType<typeof useIsAreaAvailable>);
  });

  it.each([false, true])(
    'should preserve Cancel and gate project-navigation coordination when UPS is %s',
    (enabled) => {
      jest
        .mocked(useIsAreaAvailable)
        .mockReturnValue({ status: enabled } as ReturnType<typeof useIsAreaAvailable>);
      const cancelProjectNavigation = jest.fn();
      const unregister = jest.fn();
      const registerProjectNavigationBlocker = jest.fn(() => unregister);
      jest.mocked(ReactRouterDom.useBlocker).mockReturnValue({
        state: 'blocked',
        location: mockLocation,
        proceed: mockProceed,
        reset: mockReset,
      });
      const { unmount } = render(
        <WorkingProjectContext.Provider
          value={{
            status: 'listed',
            projects: [{ name: 'a' }],
            activeProject: { name: 'a' },
            selectProject: jest.fn(),
            cancelProjectNavigation,
            registerProjectNavigationBlocker,
          }}
        >
          <NavigationBlockerModal hasUnsavedChanges />
        </WorkingProjectContext.Provider>,
      );
      expect(registerProjectNavigationBlocker).toHaveBeenCalledTimes(enabled ? 1 : 0);
      fireEvent.click(screen.getByText('Cancel'));
      expect(cancelProjectNavigation).toHaveBeenCalledTimes(enabled ? 1 : 0);
      expect(mockReset).toHaveBeenCalledTimes(1);
      expect(mockProceed).not.toHaveBeenCalled();
      expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
      unmount();
      expect(unregister).toHaveBeenCalledTimes(enabled ? 1 : 0);
    },
  );

  it.each([false, true])('should preserve Discard when UPS is %s', (enabled) => {
    jest
      .mocked(useIsAreaAvailable)
      .mockReturnValue({ status: enabled } as ReturnType<typeof useIsAreaAvailable>);
    jest.mocked(ReactRouterDom.useBlocker).mockReturnValue({
      state: 'blocked',
      location: mockLocation,
      proceed: mockProceed,
      reset: mockReset,
    });
    const onDiscardEditsClick = jest.fn();
    render(<NavigationBlockerModal hasUnsavedChanges onDiscardEditsClick={onDiscardEditsClick} />);
    fireEvent.click(screen.getByText('Discard'));
    expect(onDiscardEditsClick).toHaveBeenCalledTimes(1);
    expect(mockProceed).toHaveBeenCalledTimes(1);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('should not render when navigation is not blocked', () => {
    const mockBlocker = {
      state: 'unblocked',
    } as Blocker;
    jest.spyOn(ReactRouterDom, 'useBlocker').mockReturnValue(mockBlocker);

    render(<NavigationBlockerModal hasUnsavedChanges />);
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
  });

  it('should render when navigation is blocked', () => {
    const mockBlocker = {
      state: 'blocked',
      location: mockLocation,
      proceed: mockProceed,
      reset: mockReset,
    } as Blocker;
    jest.spyOn(ReactRouterDom, 'useBlocker').mockReturnValue(mockBlocker);

    render(<NavigationBlockerModal hasUnsavedChanges />);

    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
    expect(screen.getByText('Warning alert:')).toBeInTheDocument();
    expect(
      screen.getByText(/One or more of your changes on this page are not saved yet/),
    ).toBeInTheDocument();
    expect(screen.getByText('Discard')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should call proceed when discard button is clicked', () => {
    const mockBlocker = {
      state: 'blocked',
      location: mockLocation,
      proceed: mockProceed,
      reset: mockReset,
    } as Blocker;
    jest.spyOn(ReactRouterDom, 'useBlocker').mockReturnValue(mockBlocker);

    render(<NavigationBlockerModal hasUnsavedChanges />);
    fireEvent.click(screen.getByText('Discard'));
    expect(mockProceed).toHaveBeenCalled();
  });

  it('should call reset when cancel button is clicked', () => {
    const mockBlocker = {
      state: 'blocked',
      location: mockLocation,
      proceed: mockProceed,
      reset: mockReset,
    } as Blocker;
    jest.spyOn(ReactRouterDom, 'useBlocker').mockReturnValue(mockBlocker);

    render(<NavigationBlockerModal hasUnsavedChanges />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockReset).toHaveBeenCalled();
  });

  describe('navigation blocking conditions', () => {
    type BlockerCallbackArg = {
      currentLocation: Location;
      nextLocation: Location;
    };
    type BlockerCallbackFn = (arg: BlockerCallbackArg) => boolean;

    let capturedCallback: BlockerCallbackFn | null = null;

    beforeEach(() => {
      capturedCallback = null;
      jest.spyOn(ReactRouterDom, 'useBlocker').mockImplementation((callback) => {
        capturedCallback = callback as BlockerCallbackFn;
        return {
          state: 'unblocked',
        } as Blocker;
      });
    });

    it('should not block navigation when hasUnsavedChanges is false', () => {
      render(<NavigationBlockerModal hasUnsavedChanges={false} />);
      expect(capturedCallback).not.toBeNull();

      if (capturedCallback) {
        const result = capturedCallback({
          currentLocation: { ...mockLocation, pathname: '/current' },
          nextLocation: { ...mockLocation, pathname: '/next' },
        });

        expect(result).toBe(false);
      }
    });

    it('should block navigation when hasUnsavedChanges is true and paths are different', () => {
      render(<NavigationBlockerModal hasUnsavedChanges />);

      expect(capturedCallback).not.toBeNull();

      if (capturedCallback) {
        const result = capturedCallback({
          currentLocation: { ...mockLocation, pathname: '/current' },
          nextLocation: { ...mockLocation, pathname: '/next' },
        });

        expect(result).toBe(true);
      }
    });

    it('should not block navigation when hasUnsavedChanges is true and paths are the same', () => {
      render(<NavigationBlockerModal hasUnsavedChanges />);

      expect(capturedCallback).not.toBeNull();

      if (capturedCallback) {
        const result = capturedCallback({
          currentLocation: { ...mockLocation, pathname: '/same' },
          nextLocation: { ...mockLocation, pathname: '/same' },
        });

        expect(result).toBe(false);
      }
    });
  });
});
