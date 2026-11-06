import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import type { ProjectIdentity } from '../../context/WorkingProjectContext';
import { PREFERRED_NAMESPACE_STORAGE_KEY as key } from '../../context/getStoredPreferredProject';
import { persistWorkingProject } from '../../context/workingProjectStorage';
import {
  useWorkingProjectSynchronization,
  type WorkingProjectSynchronizationOptions,
} from '../useWorkingProjectSynchronization';

const first = { name: 'first' };
const second = { name: 'second', displayName: 'Second' };
const deferred = () => {
  let resolve: (value: ProjectIdentity | null) => void = () => undefined;
  const promise = new Promise<ProjectIdentity | null>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

let select: (name: string) => void;
const Harness: React.FC<WorkingProjectSynchronizationOptions> = (options) => {
  select = useWorkingProjectSynchronization(options);
  return null;
};

const storageEvent = (raw: string | null, current = raw, storageArea = localStorage) => {
  if (current === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, current);
  }
  act(() => window.dispatchEvent(new StorageEvent('storage', { key, newValue: raw, storageArea })));
};

describe('useWorkingProjectSynchronization', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => jest.restoreAllMocks());

  const options = (
    overrides: Partial<WorkingProjectSynchronizationOptions> = {},
  ): WorkingProjectSynchronizationOptions => ({
    projects: [first],
    activeProject: first,
    status: 'listing-unavailable',
    onProjectChange: jest.fn(),
    onProjectValidated: jest.fn(),
    validateCandidate: jest.fn().mockResolvedValue(second),
    ...overrides,
  });

  it.each(['route', 'stored'] as const)(
    'should validate a %s candidate and wait for provider-known promotion before activation',
    async (source) => {
      localStorage.setItem(key, JSON.stringify(second.name));
      const lookup = deferred();
      const input = options({
        activeProject: source === 'stored' ? null : first,
        route: source === 'route' ? { kind: 'project', name: second.name } : null,
        validateCandidate: jest.fn(() => lookup.promise),
      });
      const { rerender } = render(<Harness {...input} />);
      await waitFor(() => expect(input.validateCandidate).toHaveBeenCalledTimes(1));
      expect(input.onProjectChange).not.toHaveBeenCalled();
      await act(async () => lookup.resolve(second));
      expect(input.onProjectValidated).toHaveBeenCalledWith(second);
      expect(input.onProjectChange).not.toHaveBeenCalled();
      rerender(<Harness {...input} projects={[first, second]} />);
      expect(input.onProjectChange).toHaveBeenCalledWith(second, { source, replace: false });
    },
  );

  it('should wait for the validated identity despite replacement arrays containing stale data', async () => {
    const remembered = { ...second, displayName: 'Old name' };
    const input = options({ projects: [first, remembered] });
    const { rerender } = render(<Harness {...input} />);
    act(() => select(second.name));
    await waitFor(() => expect(input.onProjectValidated).toHaveBeenCalledWith(second));
    rerender(<Harness {...input} projects={[first, remembered, { name: 'unrelated' }]} />);
    expect(input.onProjectChange).not.toHaveBeenCalled();
    rerender(<Harness {...input} projects={[first, second]} />);
    expect(input.onProjectChange).toHaveBeenCalledWith(second, {
      source: 'selection',
      replace: false,
    });
  });

  it('should activate a published identity with matching values but a different reference', async () => {
    const input = options();
    const { rerender } = render(<Harness {...input} />);
    act(() => select(second.name));
    await waitFor(() => expect(input.onProjectValidated).toHaveBeenCalledWith(second));

    const published = { ...second };
    expect(published).not.toBe(second);
    rerender(<Harness {...input} projects={[first, published]} />);

    expect(input.onProjectChange).toHaveBeenCalledWith(published, {
      source: 'selection',
      replace: false,
    });
    expect(input.onProjectChange).toHaveBeenCalledTimes(1);
    expect(jest.mocked(input.onProjectChange).mock.calls[0][0]).toBe(published);
  });

  it.each(['validation', 'publication'] as const)(
    'should reject initial stored restoration superseded during %s without an event',
    async (phase) => {
      localStorage.setItem(key, JSON.stringify(second.name));
      const lookup = deferred();
      const input = options({
        activeProject: null,
        validateCandidate: jest.fn(() => lookup.promise),
      });
      const { rerender } = render(<Harness {...input} />);
      await waitFor(() => expect(input.validateCandidate).toHaveBeenCalledTimes(1));
      if (phase === 'validation') {
        localStorage.setItem(key, JSON.stringify(first.name));
      }
      await act(async () => lookup.resolve(second));
      if (phase === 'publication') {
        expect(input.onProjectValidated).toHaveBeenCalledWith(second);
        localStorage.setItem(key, JSON.stringify(first.name));
      } else {
        expect(input.onProjectValidated).not.toHaveBeenCalled();
      }
      rerender(<Harness {...input} projects={[first, second]} />);
      expect(input.onProjectChange).not.toHaveBeenCalled();
      expect(localStorage.getItem(key)).toBe(JSON.stringify(first.name));
    },
  );

  it.each(['route', 'stored', 'selection', 'storage'] as const)(
    'should activate a %s candidate with inline callbacks without restarting validation',
    async (source) => {
      localStorage.setItem(key, JSON.stringify(second.name));
      const lookup = deferred();
      const validate = jest.fn(() => lookup.promise);
      const input = options({
        activeProject: source === 'stored' ? null : first,
        route: source === 'route' ? { kind: 'project', name: second.name } : null,
      });
      const InlineHarness: React.FC<{ published?: boolean }> = ({ published }) => {
        select = useWorkingProjectSynchronization({
          ...input,
          projects: published ? [first, second] : [first],
          validateCandidate: (name, signal) => {
            expect(name).toBe(second.name);
            expect(signal.aborted).toBe(false);
            return validate();
          },
          onProjectValidated: (identity) => input.onProjectValidated?.(identity),
        });
        return null;
      };
      const { rerender } = render(<InlineHarness />);
      if (source === 'selection') {
        act(() => select(second.name));
      } else if (source === 'storage') {
        storageEvent(JSON.stringify(second.name));
      }
      await waitFor(() => expect(validate).toHaveBeenCalledTimes(1));
      rerender(<InlineHarness />);
      await act(async () => lookup.resolve(second));
      rerender(<InlineHarness published />);
      expect(validate).toHaveBeenCalledTimes(1);
      expect(input.onProjectChange).toHaveBeenCalledTimes(1);
      expect(input.onProjectChange).toHaveBeenCalledWith(second, {
        source,
        replace: source === 'storage',
      });
    },
  );

  it.each(['route', 'selection'] as const)(
    'should allow validated %s selection when storage is unavailable',
    async (source) => {
      const input = options({
        route: source === 'route' ? { kind: 'project', name: second.name } : null,
      });
      jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
        throw new Error('storage unavailable');
      });
      const { rerender } = render(<Harness {...input} />);
      if (source === 'selection') {
        act(() => select(second.name));
      }
      await waitFor(() => expect(input.onProjectValidated).toHaveBeenCalledWith(second));
      rerender(<Harness {...input} projects={[first, second]} />);
      expect(input.onProjectChange).toHaveBeenCalledWith(second, { source, replace: false });
    },
  );

  it.each([null, '"BAD NAME"'])(
    'should supersede pending validation when storage becomes %s',
    async (raw) => {
      const lookup = deferred();
      const input = options({ validateCandidate: jest.fn(() => lookup.promise) });
      render(<Harness {...input} />);
      storageEvent(JSON.stringify(second.name));
      await waitFor(() => expect(input.validateCandidate).toHaveBeenCalledTimes(1));
      storageEvent(raw);
      await act(async () => lookup.resolve(second));
      expect(input.onProjectValidated).not.toHaveBeenCalled();
      expect(input.onProjectChange).not.toHaveBeenCalled();
    },
  );

  it.each(['denied', 'rejected', 'wrong-identity'])(
    'should retain current selection and persistence after %s validation',
    async (failure) => {
      localStorage.setItem(key, 'first');
      const validateCandidate = jest.fn(() =>
        failure === 'rejected'
          ? Promise.reject(new Error('forbidden'))
          : Promise.resolve(failure === 'denied' ? null : { name: 'different' }),
      );
      const input = options({
        route: { kind: 'project', name: second.name },
        validateCandidate,
      });
      render(<Harness {...input} />);
      await act(async () => undefined);
      expect(validateCandidate).toHaveBeenCalledTimes(1);
      expect(input.onProjectValidated).not.toHaveBeenCalled();
      expect(input.onProjectChange).not.toHaveBeenCalled();
      expect(localStorage.getItem(key)).toBe('first');
    },
  );

  it.each(['candidate', 'selection', 'route', 'loading', 'unmount'])(
    'should ignore pending validation after a newer %s',
    async (change) => {
      const lookup = deferred();
      const input = options({ validateCandidate: jest.fn(() => lookup.promise) });
      const { rerender, unmount } = render(<Harness {...input} />);
      act(() => select(second.name));
      await waitFor(() => expect(input.validateCandidate).toHaveBeenCalledTimes(1));
      if (change === 'candidate') {
        act(() => select('newer'));
      } else if (change === 'selection') {
        act(() => select(first.name));
      } else if (change === 'route') {
        rerender(<Harness {...input} route={{ kind: 'invalid' }} />);
      } else if (change === 'loading') {
        rerender(<Harness {...input} status="loading" />);
      } else {
        unmount();
      }
      await act(async () => lookup.resolve(second));
      expect(input.onProjectValidated).not.toHaveBeenCalledWith(second);
      expect(input.onProjectChange).not.toHaveBeenCalled();
    },
  );

  it('should synchronize canonical known identities without storage feedback', () => {
    const onProjectChange = jest.fn((identity: ProjectIdentity) => {
      persistWorkingProject(localStorage, identity, [first, second]);
    });
    render(
      <Harness {...options({ projects: [first, second], status: 'listed', onProjectChange })} />,
    );
    localStorage.setItem(key, '"second"');
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    act(() =>
      window.dispatchEvent(
        new StorageEvent('storage', { key, newValue: '"second"', storageArea: localStorage }),
      ),
    );
    expect(onProjectChange).toHaveBeenCalledWith(second, { source: 'storage', replace: true });
    expect(setItem).not.toHaveBeenCalled();
  });

  it('should reconcile an external update even when its project is already active', () => {
    const input = options({ status: 'listed' });
    render(<Harness {...input} />);
    storageEvent('"first"');
    expect(input.onProjectChange).toHaveBeenCalledWith(first, { source: 'storage', replace: true });
  });

  it.each(['selection', 'route', 'stored', 'storage'] as const)(
    'should revalidate a previously known manual identity on %s',
    async (source) => {
      const refreshed = { ...second, displayName: 'Revalidated' };
      const input = options({
        projects: [first, second],
        activeProject: source === 'stored' ? null : first,
        route: source === 'route' ? { kind: 'project', name: second.name } : null,
        validateCandidate: jest.fn().mockResolvedValue(refreshed),
      });
      if (source === 'stored') {
        localStorage.setItem(key, '"second"');
      }
      const { rerender } = render(<Harness {...input} />);
      if (source === 'selection') {
        act(() => select(second.name));
      } else if (source === 'storage') {
        storageEvent('"second"');
      }
      await waitFor(() => expect(input.onProjectValidated).toHaveBeenCalledWith(refreshed));
      expect(input.validateCandidate).toHaveBeenCalledTimes(1);
      expect(input.onProjectChange).not.toHaveBeenCalled();
      rerender(<Harness {...input} projects={[first, refreshed]} />);
      expect(input.onProjectChange).toHaveBeenCalledWith(refreshed, {
        source,
        replace: source === 'storage',
      });
    },
  );

  it('should not reactivate a known manual identity after access is revoked', async () => {
    const input = options({
      projects: [first, second],
      validateCandidate: jest.fn().mockResolvedValue(null),
    });
    render(<Harness {...input} />);
    act(() => select(second.name));
    await act(async () => undefined);
    expect(input.validateCandidate).toHaveBeenCalledTimes(1);
    expect(input.onProjectChange).not.toHaveBeenCalled();
    expect(input.onProjectValidated).not.toHaveBeenCalled();
  });

  it.each([null, '', '[]', '{"name":"second"}', '"BAD NAME"', '"missing"'])(
    'should ignore deleted, malformed, or inaccessible storage value %s',
    (raw) => {
      const input = options({ status: 'listed' });
      render(<Harness {...input} />);
      storageEvent(raw);
      expect(input.onProjectChange).not.toHaveBeenCalled();
      expect(input.validateCandidate).not.toHaveBeenCalled();
    },
  );

  it('should ignore stale queued events, session storage, and unrelated keys', () => {
    const input = options({ projects: [first, second], status: 'listed' });
    render(<Harness {...input} />);
    storageEvent('"second"', '"first"');
    storageEvent('"second"', '"second"', sessionStorage);
    act(() =>
      window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated', newValue: '"second"' })),
    );
    expect(input.onProjectChange).not.toHaveBeenCalled();
  });

  it('should validate incoming unknown identities without inventing a fallback', async () => {
    const input = options();
    const { rerender } = render(<Harness {...input} />);
    storageEvent('"second"');
    await waitFor(() => expect(input.onProjectValidated).toHaveBeenCalledWith(second));
    expect(input.onProjectChange).not.toHaveBeenCalled();
    rerender(<Harness {...input} projects={[first, second]} />);
    expect(input.onProjectChange).toHaveBeenCalledWith(second, {
      source: 'storage',
      replace: true,
    });
  });

  it('should ignore stale validation after storage changes without an event', async () => {
    const lookup = deferred();
    const input = options({ validateCandidate: jest.fn(() => lookup.promise) });
    render(<Harness {...input} />);
    storageEvent('"second"');
    await waitFor(() => expect(input.validateCandidate).toHaveBeenCalled());
    localStorage.setItem(key, '"first"');
    await act(async () => lookup.resolve(second));
    expect(input.onProjectValidated).not.toHaveBeenCalled();
    expect(input.onProjectChange).not.toHaveBeenCalled();
  });

  it('should tolerate storage getter failures and remove listeners on unmount', () => {
    const input = options({ projects: [first, second], status: 'listed' });
    const { unmount } = render(<Harness {...input} />);
    const event = new StorageEvent('storage', {
      key,
      newValue: '"second"',
      storageArea: localStorage,
    });
    const getter = jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => act(() => window.dispatchEvent(event))).not.toThrow();
    getter.mockRestore();
    unmount();
    storageEvent('"second"');
    expect(input.onProjectChange).not.toHaveBeenCalled();
  });

  it('should let the navigation adapter replace history for external changes', () => {
    let pathname = '';
    let back: () => void = () => undefined;
    const NavigationAdapter: React.FC = () => {
      const navigate = useNavigate();
      pathname = useLocation().pathname;
      back = () => navigate(-1);
      useWorkingProjectSynchronization({
        projects: [first, second],
        activeProject: first,
        status: 'listed',
        onProjectChange: (identity, change) =>
          navigate(`/projects/${identity.name}`, { replace: change.replace }),
      });
      return null;
    };
    render(
      <MemoryRouter initialEntries={['/global', '/projects/first']}>
        <NavigationAdapter />
      </MemoryRouter>,
    );
    storageEvent('"second"');
    expect(pathname).toBe('/projects/second');
    act(() => back());
    expect(pathname).toBe('/global');
  });
});
