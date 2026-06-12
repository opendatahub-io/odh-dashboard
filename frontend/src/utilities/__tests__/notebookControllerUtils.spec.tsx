import * as React from 'react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';
import { NotebookControllerContextProps } from '#~/pages/notebookController/notebookControllerContextTypes';
import { EventStatus, Notebook, ProgressionStep } from '#~/types';
import {
  getNotebookControllerUserState,
  getNotebookEventStatus,
  useNotebookRedirectLink,
  useNotebookStatus,
  usernameTranslate,
} from '#~/utilities/notebookControllerUtils';
import { EventKind } from '#~/k8sTypes';
import { useWatchNotebookEvents } from '#~/api';

const validUnameRegex = new RegExp('^[a-z]{1}[a-z0-9-]{1,62}$');

describe('usernameTranslate', () => {
  it('escaped chars by encodeURIComponent', () => {
    const uname = usernameTranslate('test: ;,/?:@&=+$');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`test-3a-20-3b-2c-2f-3f-3a-40-26-3d-2b-24`);
  });

  it('non-escaped chars by encodeURIComponent', () => {
    const uname = usernameTranslate("test: -_.!~*'()");
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`test-3a-20-2d-5f-2e-21-7f-2a-27-28-29`);
  });

  it('no spec chars', () => {
    const uname = usernameTranslate(
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    );
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz0123456789');
  });

  it('realistic uname 1', () => {
    const uname = usernameTranslate('test.user@odh.io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`test-2euser-40odh-2eio`);
  });

  it('realistic uname 2', () => {
    const uname = usernameTranslate('xlogintest');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`xlogintest`);
  });

  it('realistic uname 3', () => {
    const uname = usernameTranslate('kube:admin');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`kube-3aadmin`);
  });

  it('realistic uname 4', () => {
    const uname = usernameTranslate('random-user');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`random-2duser`);
  });

  it('realistic uname 5', () => {
    const uname = usernameTranslate('random_user');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`random-5fuser`);
  });

  it('hashtags', () => {
    const uname = usernameTranslate('test#user##@odh.io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('test-23user-23-23-40odh-2eio');
  });

  it('parentheses', () => {
    const uname = usernameTranslate('test(us()er)test');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('test-28us-28-29er-29test');
  });

  it('exclamation mark', () => {
    const uname = usernameTranslate('Cr!t!cal@test.io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('cr-21t-21cal-40test-2eio');
  });

  it('question mark', () => {
    const uname = usernameTranslate('test?user?@odh.io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe(`test-3fuser-3f-40odh-2eio`);
  });

  it('commas', () => {
    const uname = usernameTranslate('test,user,odh,io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('test-2cuser-2codh-2cio');
  });

  it('apostrophes', () => {
    const uname = usernameTranslate('te`"st\'user\'odh"io`');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('te-60-22st-27user-27odh-22io-60');
  });

  it('currency signs', () => {
    const uname = usernameTranslate('test¥u$€r');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('test-c2-a5u-24-e2-82-acr');
  });

  it('hyphen underscore tilde', () => {
    const uname = usernameTranslate('test-user_odh~io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('test-2duser-5fodh-7fio');
  });

  it('percentage', () => {
    const uname = usernameTranslate('test%user%odh%io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('test-25user-25odh-25io');
  });

  it('stars, colons and dots', () => {
    const uname = usernameTranslate('te:st.*us:er*odh.io');
    expect(uname).toMatch(validUnameRegex);
    expect(uname).toBe('te-3ast-2e-2aus-3aer-2aodh-2eio');
  });
});

jest.mock('#~/api', () => ({
  useWatchNotebookEvents: jest.fn(),
}));

const useWatchNotebookEventsMock = jest.mocked(useWatchNotebookEvents);

jest.mock('#~/pages/notebookController/useNamespaces', () => () => ({
  workbenchNamespace: 'test-project',
  dashboardNamespace: 'opendatahub',
}));

jest.mock('#~/utilities/useGetNotebookRoute', () => ({
  useGetNotebookRoute: jest.fn(),
}));

const useGetNotebookRouteMock = jest.mocked(
  require('#~/utilities/useGetNotebookRoute').useGetNotebookRoute,
);

describe('useNotebookRedirectLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful with current notebook link', async () => {
    const renderResult = renderHook(() => useNotebookRedirectLink(), {
      wrapper: ({ children }) => (
        <NotebookControllerContext.Provider
          value={
            {
              currentUserNotebook: mockNotebookK8sResource({}) as Notebook,
              currentUserNotebookLink: 'test-link',
            } as NotebookControllerContextProps
          }
        >
          {children}
        </NotebookControllerContext.Provider>
      ),
    });

    expect(await renderResult.result.current()).toBe('test-link');
  });

  it('should return successful without notebook link but with notebook', async () => {
    const mockNotebook = mockNotebookK8sResource({});
    const expectedPath = `/notebook/${mockNotebook.metadata.namespace}/${mockNotebook.metadata.name}`;

    useGetNotebookRouteMock.mockReturnValue(expectedPath);

    const renderResult = renderHook(() => useNotebookRedirectLink(), {
      wrapper: ({ children }) => (
        <NotebookControllerContext.Provider
          value={
            {
              currentUserNotebook: mockNotebook,
              currentUserNotebookLink: '',
            } as NotebookControllerContextProps
          }
        >
          {children}
        </NotebookControllerContext.Provider>
      ),
    });

    expect(await renderResult.result.current()).toBe(
      `/notebook/${mockNotebook.metadata.namespace}/${mockNotebook.metadata.name}`,
    );
  });
});

describe('getNotebookControllerUserState', () => {
  it('should return null for a null notebook', () => {
    expect(getNotebookControllerUserState(null, 'test-user')).toBeNull();
  });

  it('should resolve user from opendatahub.io/username annotation', () => {
    const notebook = mockNotebookK8sResource({ user: 'test-user' }) as Notebook;
    const result = getNotebookControllerUserState(notebook, 'test-user');
    expect(result).not.toBeNull();
    expect(result?.user).toBe('test-user');
  });

  it('should fall back to opendatahub.io/user annotation when username annotation is missing', () => {
    const notebook = mockNotebookK8sResource({ user: 'test-user' }) as Notebook;
    delete (notebook.metadata.annotations as Record<string, string>)['opendatahub.io/username'];
    // Set the translated username as it would appear in a real cluster
    (notebook.metadata.annotations as Record<string, string>)['opendatahub.io/user'] =
      usernameTranslate('test-user');
    const result = getNotebookControllerUserState(notebook, 'test-user');
    expect(result).not.toBeNull();
    expect(result?.user).toBe('test-user');
  });

  it('should fall back to opendatahub.io/user label for older workbenches', () => {
    const notebook = mockNotebookK8sResource({ user: 'test-user' }) as Notebook;
    // Remove both user annotations to simulate an older workbench with only the label
    delete (notebook.metadata.annotations as Record<string, string>)['opendatahub.io/username'];
    delete (notebook.metadata.annotations as Record<string, string>)['opendatahub.io/user'];
    // Ensure the label is set (simulating pre-migration workbench)
    notebook.metadata.labels = {
      ...notebook.metadata.labels,
      'opendatahub.io/user': usernameTranslate('test-user'),
    };
    const result = getNotebookControllerUserState(notebook, 'test-user');
    expect(result).not.toBeNull();
    expect(result?.user).toBe('test-user');
  });

  it('should handle workbenches with no annotations at all (label-only fallback)', () => {
    const notebook = mockNotebookK8sResource({ user: 'test-user' }) as Notebook;
    notebook.metadata.annotations = undefined;
    notebook.metadata.labels = {
      ...notebook.metadata.labels,
      'opendatahub.io/user': usernameTranslate('test-user'),
    };
    const result = getNotebookControllerUserState(notebook, 'test-user');
    expect(result).not.toBeNull();
    expect(result?.user).toBe('test-user');
  });

  it('should return null when user cannot be resolved from any source', () => {
    const notebook = mockNotebookK8sResource({ user: 'test-user' }) as Notebook;
    notebook.metadata.annotations = {};
    notebook.metadata.labels = {};
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const result = getNotebookControllerUserState(notebook, 'test-user');
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('should handle long OIDC usernames (>63 chars) in annotation', () => {
    const longUsername =
      'https://keycloak-keycloak.apps.rosa.1234567890.c8l6.p3.openshiftapps.com/realms/master#someuser';
    const notebook = mockNotebookK8sResource({ user: longUsername }) as Notebook;
    const result = getNotebookControllerUserState(notebook, longUsername);
    expect(result).not.toBeNull();
    expect(result?.user).toBe(longUsername);
    expect(longUsername.length).toBeGreaterThan(63);
  });
});

const createMockEvent = (overrides: Partial<EventKind>): EventKind => ({
  apiVersion: 'v1',
  kind: 'Event',
  metadata: { uid: 'test-uid' },
  involvedObject: { name: 'test-notebook' },
  eventTime: '2024-01-01T00:00:00Z',
  type: 'Normal',
  reason: '',
  message: '',
  ...overrides,
});

describe('getNotebookEventStatus', () => {
  it('should return ERROR for BackOff event outside grace period', () => {
    const event = createMockEvent({
      reason: 'BackOff',
      type: 'Warning',
      message: 'Back-off pulling image',
    });
    const result = getNotebookEventStatus(event, false);
    expect(result.status).toBe(EventStatus.ERROR);
    expect(result.step).toBe(ProgressionStep.NOTEBOOK_CONTAINER_PROBLEM);
    expect(result.description).toBe('ImagePullBackOff');
  });

  it('should return WARNING for BackOff event during grace period', () => {
    const event = createMockEvent({
      reason: 'BackOff',
      type: 'Warning',
      message: 'Back-off pulling image',
    });
    const result = getNotebookEventStatus(event, true);
    expect(result.status).toBe(EventStatus.WARNING);
  });

  it('should return SUCCESS for Started event', () => {
    const event = createMockEvent({
      reason: 'Started',
      message: 'Started container notebook',
    });
    const result = getNotebookEventStatus(event);
    expect(result.status).toBe(EventStatus.SUCCESS);
    expect(result.step).toBe(ProgressionStep.NOTEBOOK_CONTAINER_STARTED);
  });

  it('should return ERROR for FailedScheduling event outside grace period', () => {
    const event = createMockEvent({
      reason: 'FailedScheduling',
      type: 'Warning',
      message: 'Insufficient memory',
    });
    const result = getNotebookEventStatus(event, false);
    expect(result.status).toBe(EventStatus.ERROR);
    expect(result.step).toBe(ProgressionStep.POD_PROBLEM);
  });

  it('should return ERROR for FailedCreate event', () => {
    const event = createMockEvent({
      reason: 'FailedCreate',
      type: 'Warning',
      message: 'Failed to create pod',
    });
    const result = getNotebookEventStatus(event);
    expect(result.status).toBe(EventStatus.ERROR);
    expect(result.step).toBe(ProgressionStep.POD_PROBLEM);
  });
});

describe('useNotebookStatus', () => {
  const lastActivity = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const createNotebook = () =>
    mockNotebookK8sResource({}) as Notebook & {
      metadata: { annotations: Record<string, string> };
    };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should resolve ERROR to SUCCESS when isNotebookRunning is true', () => {
    const backOffEvent = createMockEvent({
      reason: 'BackOff',
      type: 'Warning',
      message: 'Back-off pulling image',
      eventTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    });
    useWatchNotebookEventsMock.mockReturnValue([[backOffEvent], true, undefined] as ReturnType<
      typeof useWatchNotebookEvents
    >);

    const notebook = createNotebook();
    notebook.metadata.annotations['notebooks.kubeflow.org/last-activity'] = lastActivity;

    const renderResult = renderHook(() => useNotebookStatus(false, notebook, true, 'pod-uid'));

    const [status] = renderResult.result.current;
    expect(status?.currentStatus).toBe(EventStatus.SUCCESS);
  });

  it('should keep ERROR when isNotebookRunning is false', () => {
    const backOffEvent = createMockEvent({
      reason: 'BackOff',
      type: 'Warning',
      message: 'Back-off pulling image',
      eventTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    });
    useWatchNotebookEventsMock.mockReturnValue([[backOffEvent], true, undefined] as ReturnType<
      typeof useWatchNotebookEvents
    >);

    const notebook = createNotebook();
    notebook.metadata.annotations['notebooks.kubeflow.org/last-activity'] = lastActivity;

    const renderResult = renderHook(() => useNotebookStatus(true, notebook, false, 'pod-uid'));

    const [status] = renderResult.result.current;
    expect(status?.currentStatus).toBe(EventStatus.ERROR);
  });

  it('should keep WARNING unchanged when isNotebookRunning is true', () => {
    const warningEvent = createMockEvent({
      reason: 'UnexpectedWarning',
      type: 'Warning',
      message: 'Something unexpected',
      eventTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    });
    useWatchNotebookEventsMock.mockReturnValue([[warningEvent], true, undefined] as ReturnType<
      typeof useWatchNotebookEvents
    >);

    const notebook = createNotebook();
    notebook.metadata.annotations['notebooks.kubeflow.org/last-activity'] = lastActivity;

    const renderResult = renderHook(() => useNotebookStatus(false, notebook, true, 'pod-uid'));

    const [status] = renderResult.result.current;
    expect(status?.currentStatus).toBe(EventStatus.WARNING);
  });
});
