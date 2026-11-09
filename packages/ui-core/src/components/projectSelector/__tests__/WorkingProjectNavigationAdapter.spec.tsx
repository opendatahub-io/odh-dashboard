import * as React from 'react';
import { act, render } from '@testing-library/react';
import { useLocation, useNavigate, useResolvedPath } from 'react-router-dom';
import {
  useWorkingProject,
  type WorkingProjectNavigation,
} from '../../../context/WorkingProjectContext';
import WorkingProjectNavigationAdapter from '../WorkingProjectNavigationAdapter';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
  useNavigate: jest.fn(),
  useResolvedPath: jest.fn(),
}));
jest.mock('../../../context/WorkingProjectContext', () => ({ useWorkingProject: jest.fn() }));

describe('WorkingProjectNavigationAdapter', () => {
  let onNavigate: WorkingProjectNavigation;
  const navigate = jest.fn();
  const unregister = jest.fn();
  const register = jest.fn((handler: WorkingProjectNavigation) => {
    onNavigate = handler;
    return unregister;
  });
  const getRedirectPath = jest.fn((name: string) => `/models/${name}`);
  const transaction = () => ({ commit: jest.fn(), cancel: jest.fn() });
  const at = (pathname: string, search = '', hash = '') =>
    jest
      .mocked(useLocation)
      .mockReturnValue({ pathname, search, hash, state: null, key: `${pathname}${search}${hash}` });

  beforeEach(() => {
    jest.clearAllMocks();
    navigate.mockReset();
    getRedirectPath.mockReset().mockImplementation((name) => `/models/${name}`);
    at('/models/a');
    jest.mocked(useNavigate).mockReturnValue(navigate);
    jest.mocked(useResolvedPath).mockReturnValue({ pathname: '/models/a', search: '', hash: '' });
    jest.mocked(useWorkingProject).mockReturnValue({
      status: 'listed',
      projects: [{ name: 'a' }, { name: 'b' }],
      activeProject: { name: 'a' },
      selectProject: jest.fn(),
      registerProjectNavigation: register,
    });
  });

  it.each(['builder', 'navigation', 'rejection', 'destination'] as const)(
    'should cancel after %s failure, never commit late, and recover on the next switch',
    async (failure) => {
      const { rerender } = render(
        <WorkingProjectNavigationAdapter getRedirectPath={getRedirectPath} />,
      );
      const failed = transaction();
      if (failure === 'builder') {
        getRedirectPath.mockImplementationOnce(() => {
          throw new Error('invalid route');
        });
      } else if (failure === 'navigation') {
        navigate.mockImplementationOnce(() => {
          throw new Error('navigation failed');
        });
      } else if (failure === 'rejection') {
        navigate.mockRejectedValueOnce(new Error('navigation rejected'));
      }
      await act(async () => onNavigate({ name: 'b' }, failed));
      if (failure === 'destination') {
        at('/unexpected');
        rerender(<WorkingProjectNavigationAdapter getRedirectPath={getRedirectPath} />);
      }
      expect(failed.cancel).toHaveBeenCalledTimes(1);
      expect(failed.commit).not.toHaveBeenCalled();
      at('/models/b');
      rerender(<WorkingProjectNavigationAdapter getRedirectPath={getRedirectPath} />);
      expect(failed.commit).not.toHaveBeenCalled();
      const recovered = transaction();
      act(() => onNavigate({ name: 'a' }, recovered));
      expect(navigate).toHaveBeenLastCalledWith('/models/a', { replace: true });
      at('/models/a');
      rerender(<WorkingProjectNavigationAdapter getRedirectPath={getRedirectPath} />);
      expect(recovered.commit).toHaveBeenCalledTimes(1);
      expect(recovered.cancel).not.toHaveBeenCalled();
    },
  );

  it('should not cancel a newer switch when an obsolete navigation rejects', async () => {
    let reject: (reason: Error) => void = () => undefined;
    navigate.mockReturnValueOnce(
      new Promise<void>((_resolve, fail) => {
        reject = fail;
      }),
    );
    const { rerender } = render(
      <WorkingProjectNavigationAdapter getRedirectPath={getRedirectPath} />,
    );
    const obsolete = transaction();
    const latest = transaction();
    act(() => onNavigate({ name: 'b' }, obsolete));
    act(() => onNavigate({ name: 'b' }, latest));
    await act(async () => reject(new Error('obsolete failure')));
    at('/models/b');
    rerender(<WorkingProjectNavigationAdapter getRedirectPath={getRedirectPath} />);
    expect(obsolete.cancel).toHaveBeenCalledTimes(1);
    expect(obsolete.commit).not.toHaveBeenCalled();
    expect(latest.commit).toHaveBeenCalledTimes(1);
    expect(latest.cancel).not.toHaveBeenCalled();
  });

  it('should cancel pending navigation and unregister on unmount', () => {
    const { unmount } = render(
      <WorkingProjectNavigationAdapter getRedirectPath={getRedirectPath} />,
    );
    const pending = transaction();
    act(() => onNavigate({ name: 'b' }, pending));
    unmount();
    expect(pending.cancel).toHaveBeenCalledTimes(1);
    expect(pending.commit).not.toHaveBeenCalled();
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it('should commit an already displayed project without navigating when nothing is pending', () => {
    render(<WorkingProjectNavigationAdapter getRedirectPath={getRedirectPath} />);
    const current = transaction();
    act(() => onNavigate({ name: 'a' }, current));
    expect(navigate).not.toHaveBeenCalled();
    expect(current.commit).toHaveBeenCalledTimes(1);
    expect(current.cancel).not.toHaveBeenCalled();
  });

  it.each([
    { from: '/models/a', search: '', hash: '', to: 'b', destination: '/models/a/b' },
    { from: '/models/a/details', search: '', hash: '', to: 'b', destination: '/models/a/b' },
    {
      from: '/models/a/details/more',
      search: '',
      hash: '',
      to: '../b/details',
      routeBase: '/models/a/details',
      destination: '/models/a/b/details',
    },
    {
      from: '/models/a',
      search: '?old=1',
      hash: '#results',
      to: '?tab=details',
      destination: '/models/a?tab=details',
    },
  ])(
    'should commit a resolved destination for $to',
    ({ from, search, hash, to, routeBase, destination }) => {
      at(from, search, hash);
      if (routeBase) {
        jest.mocked(useResolvedPath).mockReturnValue({ pathname: routeBase, search: '', hash: '' });
      }
      getRedirectPath.mockReturnValueOnce(to);
      const { rerender } = render(
        <WorkingProjectNavigationAdapter getRedirectPath={getRedirectPath} />,
      );
      const request = transaction();
      act(() => onNavigate({ name: 'b' }, request));
      expect(navigate).toHaveBeenCalledWith(destination, { replace: true });
      expect(request.commit).not.toHaveBeenCalled();
      const { pathname, search: destinationSearch } = new URL(destination, 'http://localhost');
      at(pathname, destinationSearch);
      rerender(<WorkingProjectNavigationAdapter getRedirectPath={getRedirectPath} />);
      expect(request.commit).toHaveBeenCalledTimes(1);
      expect(request.cancel).not.toHaveBeenCalled();
    },
  );

  it('should replace the displayed URL before committing when superseding pending navigation', () => {
    const { rerender } = render(
      <WorkingProjectNavigationAdapter getRedirectPath={getRedirectPath} />,
    );
    const obsolete = transaction();
    const current = transaction();
    act(() => onNavigate({ name: 'b' }, obsolete));
    act(() => onNavigate({ name: 'a' }, current));
    expect(obsolete.cancel).toHaveBeenCalledTimes(1);
    expect(obsolete.commit).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenLastCalledWith('/models/a', { replace: true });
    expect(current.commit).not.toHaveBeenCalled();
    at('/models/a');
    rerender(<WorkingProjectNavigationAdapter getRedirectPath={getRedirectPath} />);
    expect(current.commit).toHaveBeenCalledTimes(1);
    expect(current.cancel).not.toHaveBeenCalled();
  });
});
