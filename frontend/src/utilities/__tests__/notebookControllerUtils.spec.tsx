import * as React from 'react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import type { PodContainerStatus } from '@odh-dashboard/k8s-core';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';
import { NotebookControllerContextProps } from '#~/pages/notebookController/notebookControllerContextTypes';
import { EventStatus } from '#~/types';
import { KueueWorkloadStatus } from '#~/concepts/kueue/types';
import { EventKind, NotebookKind } from '#~/k8sTypes';
import {
  buildInitialProgressSteps,
  getNotebookControllerUserState,
  getNotebookEventStatus,
  useNotebookRedirectLink,
  useNotebookProgress,
  usernameTranslate,
} from '#~/utilities/notebookControllerUtils';

const makeContainer = (name: string) => ({
  name,
  image: `quay.io/example/${name}:latest`,
  env: [],
  envFrom: [],
  resources: { limits: {}, requests: {} },
  volumeMounts: [],
});

const makeNotebook = (containerNames: string[]): NotebookKind =>
  ({
    apiVersion: 'kubeflow.org/v1',
    kind: 'Notebook',
    metadata: {
      name: containerNames[0] ?? 'test-wb',
      namespace: 'test-ns',
      creationTimestamp: '2025-01-13T14:19:10Z',
      annotations: {},
      labels: {},
    },
    spec: {
      template: {
        spec: {
          containers: containerNames.map(makeContainer),
          volumes: [],
        },
      },
    },
    status: {},
  } as unknown as NotebookKind);

const makeEvent = (
  reason: string,
  message: string,
  type: 'Normal' | 'Warning' = 'Normal',
  lastTimestamp?: string,
): EventKind => ({
  apiVersion: 'v1',
  kind: 'Event',
  metadata: { name: `evt-${reason}`, namespace: 'test-ns' },
  involvedObject: { name: 'pod-0' },
  reason,
  message,
  type,
  eventTime: '2025-01-22T10:00:00Z',
  // lastTimestamp takes precedence over eventTime in getEventTimestamp; set it when provided
  // so same-timestamp severity tests can override the default time.
  ...(lastTimestamp && { lastTimestamp }),
});

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
              currentUserNotebook: mockNotebookK8sResource({}),
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
    const notebook = mockNotebookK8sResource({ user: 'test-user' });
    const result = getNotebookControllerUserState(notebook, 'test-user');
    expect(result).not.toBeNull();
    expect(result?.user).toBe('test-user');
  });

  it('should fall back to opendatahub.io/user annotation when username annotation is missing', () => {
    const notebook = mockNotebookK8sResource({ user: 'test-user' });
    delete (notebook.metadata.annotations as Record<string, string>)['opendatahub.io/username'];
    // Set the translated username as it would appear in a real cluster
    (notebook.metadata.annotations as Record<string, string>)['opendatahub.io/user'] =
      usernameTranslate('test-user');
    const result = getNotebookControllerUserState(notebook, 'test-user');
    expect(result).not.toBeNull();
    expect(result?.user).toBe('test-user');
  });

  it('should fall back to opendatahub.io/user label for older workbenches', () => {
    const notebook = mockNotebookK8sResource({ user: 'test-user' });
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
    const notebook = mockNotebookK8sResource({ user: 'test-user' });
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
    const notebook = mockNotebookK8sResource({ user: 'test-user' });
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
    const notebook = mockNotebookK8sResource({ user: longUsername });
    const result = getNotebookControllerUserState(notebook, longUsername);
    expect(result).not.toBeNull();
    expect(result?.user).toBe(longUsername);
    expect(longUsername.length).toBeGreaterThan(63);
  });
});

describe('buildInitialProgressSteps', () => {
  it('produces minimal steps when notebook is null (no containers)', () => {
    const steps = buildInitialProgressSteps(null, false, false, null);
    const kinds = steps.map((s) => s.stepKind);
    expect(kinds).toContain('workbench_requested');
    expect(kinds).toContain('pod_created');
    expect(kinds).toContain('pod_assigned');
    expect(kinds).toContain('interface_added');
    expect(kinds).toContain('workbench_started');
    expect(steps.filter((s) => s.containerName)).toHaveLength(0);
  });

  it('sets workbench_requested to PENDING when stopping or stopped', () => {
    const stopping = buildInitialProgressSteps(null, false, true, null);
    expect(stopping.find((s) => s.stepKind === 'workbench_requested')?.status).toBe(
      EventStatus.PENDING,
    );
    const stopped = buildInitialProgressSteps(null, true, false, null);
    expect(stopped.find((s) => s.stepKind === 'workbench_requested')?.status).toBe(
      EventStatus.PENDING,
    );
  });

  it('sets workbench_requested to SUCCESS when running (not stopping/stopped)', () => {
    const steps = buildInitialProgressSteps(null, false, false, null);
    const requested = steps.find((s) => s.stepKind === 'workbench_requested');
    expect(requested?.status).toBe(EventStatus.SUCCESS);
  });

  it('generates top-level started step (+ optional container_problem) per container, with pulling/pulled/created as sub-steps', () => {
    const nb = makeNotebook(['my-wb', 'oauth-proxy']);
    const steps = buildInitialProgressSteps(nb, false, false, null);
    const wbSteps = steps.filter((s) => s.containerName === 'my-wb');
    const proxySteps = steps.filter((s) => s.containerName === 'oauth-proxy');
    expect(wbSteps).toHaveLength(2); // container_problem + started
    expect(proxySteps).toHaveLength(2);
    const wbStarted = wbSteps.find((s) => s.stepKind === 'started');
    expect(wbStarted?.subSteps?.map((s) => s.stepKind)).toEqual(['pulling', 'pulled', 'created']);
  });

  it('labels primary container as Workbench and auth proxy container as Auth proxy', () => {
    const nb = makeNotebook(['my-wb', 'kube-rbac-proxy']);
    const steps = buildInitialProgressSteps(nb, false, false, null);
    const wbStarted = steps.find((s) => s.stepKind === 'started' && s.containerName === 'my-wb');
    expect(wbStarted?.subSteps?.find((s) => s.stepKind === 'pulling')?.label).toBe(
      'Pulling Workbench image',
    );
    const proxyStarted = steps.find(
      (s) => s.stepKind === 'started' && s.containerName === 'kube-rbac-proxy',
    );
    expect(proxyStarted?.subSteps?.find((s) => s.stepKind === 'pulling')?.label).toBe(
      'Pulling Auth proxy image',
    );
  });

  it('does NOT include kueue step when kueueStatus is null', () => {
    const nb = makeNotebook(['my-wb']);
    const steps = buildInitialProgressSteps(nb, false, false, null);
    const allSteps = steps.flatMap((s) => [s, ...(s.subSteps ?? [])]);
    expect(allSteps.find((s) => s.stepKind === 'kueue')).toBeUndefined();
  });

  it('includes kueue sub-step with PENDING status when Queued', () => {
    const nb = makeNotebook(['my-wb']);
    const steps = buildInitialProgressSteps(nb, false, false, {
      status: KueueWorkloadStatus.Queued,
      message: undefined,
      queueName: 'default',
    });
    const podAssigned = steps.find((s) => s.stepKind === 'pod_assigned');
    const kueue = podAssigned?.subSteps?.find((s) => s.stepKind === 'kueue');
    expect(kueue).toBeDefined();
    expect(kueue?.status).toBe(EventStatus.PENDING);
  });

  it('includes kueue sub-step with SUCCESS status when Admitted', () => {
    const nb = makeNotebook(['my-wb']);
    const steps = buildInitialProgressSteps(nb, false, false, {
      status: KueueWorkloadStatus.Admitted,
      queueName: 'test-queue',
    });
    const podAssigned = steps.find((s) => s.stepKind === 'pod_assigned');
    const kueue = podAssigned?.subSteps?.find((s) => s.stepKind === 'kueue');
    expect(kueue?.status).toBe(EventStatus.SUCCESS);
  });

  it('includes kueue sub-step with WARNING status when Inadmissible', () => {
    const nb = makeNotebook(['my-wb']);
    const steps = buildInitialProgressSteps(nb, false, false, {
      status: KueueWorkloadStatus.Inadmissible,
      message: 'queue does not exist',
      queueName: 'my-queue',
    });
    const podAssigned = steps.find((s) => s.stepKind === 'pod_assigned');
    const kueue = podAssigned?.subSteps?.find((s) => s.stepKind === 'kueue');
    expect(kueue?.status).toBe(EventStatus.WARNING);
    expect(kueue?.label).toBe('Queue my-queue does not exist');
  });

  it('produces correct total count for no-containers case (EC8)', () => {
    const steps = buildInitialProgressSteps(null, false, false, null);
    expect(steps.map((s) => s.stepKind)).toEqual([
      'workbench_requested',
      'pod_problem',
      'pod_created',
      'pod_assigned',
      'pvc_attached',
      'interface_added',
      'workbench_started',
    ]);
  });

  it('uses restart labels for started/pulling and keeps other sub-step labels unchanged when isRecovery is true', () => {
    const nb = makeNotebook(['my-wb']);
    const steps = buildInitialProgressSteps(nb, false, false, null, true);
    const wbStarted = steps.find((s) => s.stepKind === 'started' && s.containerName === 'my-wb');
    expect(wbStarted?.label).toBe('Restarting Workbench container');
    const subs = wbStarted?.subSteps;
    expect(subs?.find((s) => s.stepKind === 'pulling')?.label).toBe(
      'Pulling Workbench image (restart)',
    );
    expect(subs?.find((s) => s.stepKind === 'pulled')?.label).toBe('Workbench image pulled');
    expect(subs?.find((s) => s.stepKind === 'created')?.label).toBe('Workbench container created');
  });

  it('includes kueue sub-step with IN_PROGRESS status and Running admission check label when AdmissionCheck', () => {
    const nb = makeNotebook(['my-wb']);
    const steps = buildInitialProgressSteps(nb, false, false, {
      status: KueueWorkloadStatus.AdmissionCheck,
      message: 'gpu-provisioner',
      queueName: 'test-queue',
    });
    const podAssigned = steps.find((s) => s.stepKind === 'pod_assigned');
    const kueue = podAssigned?.subSteps?.find((s) => s.stepKind === 'kueue');
    expect(kueue).toBeDefined();
    expect(kueue?.label).toBe('Waiting for admission check: gpu-provisioner');
    expect(kueue?.status).toBe(EventStatus.IN_PROGRESS);
  });

  it('includes kueue sub-step with IN_PROGRESS status and preemption gates label when BlockedOnPreemptionGates', () => {
    const nb = makeNotebook(['my-wb']);
    const steps = buildInitialProgressSteps(nb, false, false, {
      status: KueueWorkloadStatus.BlockedOnPreemptionGates,
      queueName: 'test-queue',
    });
    const podAssigned = steps.find((s) => s.stepKind === 'pod_assigned');
    const kueue = podAssigned?.subSteps?.find((s) => s.stepKind === 'kueue');
    expect(kueue).toBeDefined();
    expect(kueue?.label).toBe('Admitted but waiting for preemption gates to clear');
    expect(kueue?.status).toBe(EventStatus.IN_PROGRESS);
  });

  it('kueue sub-step label for Requeued includes the attempt count', () => {
    const nb = makeNotebook(['my-wb']);
    const steps = buildInitialProgressSteps(nb, false, false, {
      status: KueueWorkloadStatus.Requeued,
      queueName: 'my-queue',
      requeueInfo: { count: 3 },
    });
    const kueue = steps
      .find((s) => s.stepKind === 'pod_assigned')
      ?.subSteps?.find((s) => s.stepKind === 'kueue');
    expect(kueue?.label).toContain('attempt 3');
    expect(kueue?.label).toContain('my-queue');
  });

  it('does NOT include kueue step when kueueStatus has no queueName (auto-created workload for non-Kueue notebook)', () => {
    const nb = makeNotebook(['my-wb']);
    const steps = buildInitialProgressSteps(nb, false, false, {
      status: KueueWorkloadStatus.Admitted,
      // intentionally no queueName — simulates Kueue auto-creating a workload for a non-Kueue notebook
    });
    const podAssigned = steps.find((s) => s.stepKind === 'pod_assigned');
    const kueue = podAssigned?.subSteps?.find((s) => s.stepKind === 'kueue');
    expect(kueue).toBeUndefined();
  });
});

describe('getNotebookEventStatus', () => {
  const containerNames = ['kube-rbac-proxy', 'my-workbench'];

  it('returns pod_created for SuccessfulCreate', () => {
    const result = getNotebookEventStatus(
      makeEvent('SuccessfulCreate', 'Created pod'),
      containerNames,
    );
    expect(result?.stepKind).toBe('pod_created');
    expect(result?.status).toBe(EventStatus.SUCCESS);
  });

  it('returns pod_assigned for Scheduled', () => {
    const result = getNotebookEventStatus(
      makeEvent('Scheduled', 'Successfully assigned pod'),
      containerNames,
    );
    expect(result?.stepKind).toBe('pod_assigned');
    expect(result?.status).toBe(EventStatus.SUCCESS);
  });

  it('returns pvc_attached for SuccessfulAttachVolume', () => {
    const result = getNotebookEventStatus(
      makeEvent('SuccessfulAttachVolume', 'Volume attached'),
      containerNames,
    );
    expect(result?.stepKind).toBe('pvc_attached');
  });

  it('returns interface_added for AddedInterface', () => {
    const result = getNotebookEventStatus(makeEvent('AddedInterface', 'Add eth0'), containerNames);
    expect(result?.stepKind).toBe('interface_added');
  });

  it('matches container by name in Created message', () => {
    const result = getNotebookEventStatus(
      makeEvent('Created', 'Created container my-workbench'),
      containerNames,
    );
    expect(result?.stepKind).toBe('created');
    expect(result?.containerName).toBe('my-workbench');
  });

  it.each([
    {
      reason: 'Started',
      message: 'Started container kube-rbac-proxy',
      containerName: 'kube-rbac-proxy',
      status: EventStatus.SUCCESS,
      labelWord: 'started',
    },
    {
      reason: 'Killing',
      message: 'Stopping container my-workbench',
      containerName: 'my-workbench',
      status: EventStatus.WARNING,
      labelWord: 'stopped',
    },
  ])(
    '$reason — returns started stepKind, $status, label contains "$labelWord"',
    ({ reason, message, containerName, status, labelWord }) => {
      const result = getNotebookEventStatus(makeEvent(reason, message), containerNames);
      expect(result?.stepKind).toBe('started');
      expect(result?.containerName).toBe(containerName);
      expect(result?.status).toBe(status);
      expect(result?.label).toContain(labelWord);
    },
  );

  it('matches auth proxy container by name in Pulling image URL (EC1)', () => {
    const result = getNotebookEventStatus(
      makeEvent('Pulling', 'Pulling image "quay.io/openshift/kube-rbac-proxy:latest"'),
      containerNames,
    );
    expect(result?.stepKind).toBe('pulling');
    expect(result?.containerName).toBe('kube-rbac-proxy');
  });

  it('EC1: prefers longest matching container name to avoid substring collision', () => {
    const names = ['my-workbench', 'my-workbench-extra'];
    const result = getNotebookEventStatus(
      makeEvent('Created', 'Created container my-workbench-extra'),
      names,
    );
    expect(result?.containerName).toBe('my-workbench-extra');
  });

  it('EC1b: primary container is first non-auth container in pod-spec order, not the longest name', () => {
    const names = ['wb', 'metrics-sidecar'];
    const backoff = getNotebookEventStatus(
      makeEvent('BackOff', 'Back-off pulling image "quay.io/example/wb:latest"', 'Warning'),
      names,
    );
    expect(backoff?.containerName).toBe('wb');

    const warning = getNotebookEventStatus(
      makeEvent('FailedMount', 'Unable to mount volumes', 'Warning'),
      names,
    );
    expect(warning?.containerName).toBe('wb');
  });

  it('EC2: returns null when no container matches (unrecognised container event)', () => {
    const result = getNotebookEventStatus(
      makeEvent('Created', 'Created container unknown-sidecar'),
      containerNames,
    );
    expect(result).toBeNull();
  });

  it('returns pod_problem for NotTriggerScaleUp', () => {
    const result = getNotebookEventStatus(
      makeEvent('NotTriggerScaleUp', 'pod did not trigger scale-up'),
      containerNames,
    );
    expect(result?.stepKind).toBe('pod_problem');
    expect(result?.status).toBe(EventStatus.ERROR);
    expect(result?.description).toContain('Failed to scale-up');
  });

  it('returns pod_problem for FailedScheduling outside grace period', () => {
    const result = getNotebookEventStatus(
      makeEvent('FailedScheduling', '0/10 nodes available', 'Warning'),
      containerNames,
      false,
    );
    expect(result?.stepKind).toBe('pod_problem');
    expect(result?.status).toBe(EventStatus.ERROR);
  });

  it('returns a WARNING container_problem for FailedScheduling inside grace period', () => {
    // filterEvents drops Warning events in practice; in isolation the function returns container_problem.
    const result = getNotebookEventStatus(
      makeEvent('FailedScheduling', '0/10 nodes available', 'Warning'),
      containerNames,
      true,
    );
    expect(result?.stepKind).toBe('container_problem');
    expect(result?.containerName).toBe('my-workbench');
    expect(result?.status).toBe(EventStatus.WARNING);
  });

  it('generic Warning event — returns container_problem attributed to primary container', () => {
    const result = getNotebookEventStatus(
      makeEvent('FailedMount', 'Unable to attach or mount volumes', 'Warning'),
      containerNames,
    );
    expect(result?.stepKind).toBe('container_problem');
    expect(result?.containerName).toBe('my-workbench');
    expect(result?.status).toBe(EventStatus.WARNING);
    expect(result?.description).toBe('Issue creating workbench container');
  });

  it('returns null for unrecognised Normal events', () => {
    const result = getNotebookEventStatus(
      makeEvent('SomeRandomReason', 'something happened'),
      containerNames,
    );
    expect(result).toBeNull();
  });

  it('BackOff (image pull) — returns container_problem with ImagePullBackOff description', () => {
    const result = getNotebookEventStatus(
      makeEvent(
        'BackOff',
        'Back-off pulling image "quay.io/example/my-workbench:latest"',
        'Warning',
      ),
      containerNames,
    );
    expect(result?.stepKind).toBe('container_problem');
    expect(result?.containerName).toBe('my-workbench');
    expect(result?.status).toBe(EventStatus.ERROR);
    expect(result?.description).toBe('ImagePullBackOff');
  });

  it('BackOff (crash loop) — returns container_problem with CrashLoopBackOff description', () => {
    const result = getNotebookEventStatus(
      makeEvent(
        'BackOff',
        'Back-off restarting failed container my-workbench in pod test-notebook-0',
        'Warning',
      ),
      containerNames,
    );
    expect(result?.stepKind).toBe('container_problem');
    expect(result?.containerName).toBe('my-workbench');
    expect(result?.status).toBe(EventStatus.ERROR);
    expect(result?.description).toBe('CrashLoopBackOff');
  });

  it('BackOff — falls through to generic Warning handler inside grace period', () => {
    // filterEvents drops Warning events before they reach this function in practice;
    // in isolation with gracePeriod=true the ERROR branch is suppressed and it returns WARNING.
    const result = getNotebookEventStatus(
      makeEvent(
        'BackOff',
        'Back-off pulling image "quay.io/example/my-workbench:latest"',
        'Warning',
      ),
      containerNames,
      true, // gracePeriod
    );
    expect(result?.stepKind).toBe('container_problem');
    expect(result?.containerName).toBe('my-workbench');
    expect(result?.status).toBe(EventStatus.WARNING);
  });
});

describe('useNotebookProgress', () => {
  it('returns 5 steps with workbench_requested SUCCESS for no-notebook case', () => {
    const { result } = renderHook(() => useNotebookProgress(null, false, false, false, [], null));
    // 5 = workbench_requested + pod_created + pod_assigned + interface_added + workbench_started
    expect(result.current).toHaveLength(5);
    expect(result.current.find((s) => s.stepKind === 'workbench_requested')?.status).toBe(
      EventStatus.SUCCESS,
    );
  });

  it('returns 7 steps for a two-container notebook with no events', () => {
    const nb = makeNotebook(['my-wb', 'kube-rbac-proxy']);
    const { result } = renderHook(() => useNotebookProgress(nb, false, false, false, [], null));
    // 7 = bookend + pod steps + started×2; optional problem/pvc steps filtered when PENDING
    expect(result.current).toHaveLength(7);
    const wbStarted = result.current.find(
      (s) => s.stepKind === 'started' && s.containerName === 'my-wb',
    );
    expect(wbStarted?.subSteps).toHaveLength(3);
  });

  it('EC3: marks workbench_started SUCCESS and catches up all steps when all containers started and isRunning', () => {
    const nb = makeNotebook(['my-wb']);
    const events: EventKind[] = [makeEvent('Started', 'Started container my-wb')];
    const { result } = renderHook(() => useNotebookProgress(nb, true, false, false, events, null));
    const allSuccess = result.current.every((s) => s.status === EventStatus.SUCCESS);
    expect(allSuccess).toBe(true);
    const workbenchStarted = result.current.find((s) => s.stepKind === 'workbench_started');
    expect(workbenchStarted?.status).toBe(EventStatus.SUCCESS);
    const wbStarted = result.current.find(
      (s) => s.stepKind === 'started' && s.containerName === 'my-wb',
    );
    const allSubSuccess = wbStarted?.subSteps?.every((s) => s.status === EventStatus.SUCCESS);
    expect(allSubSuccess).toBe(true);
  });

  it('marks workbench_started SUCCESS when containerStatuses matched by name', () => {
    const nb = makeNotebook(['my-wb']);
    const containerStatuses: PodContainerStatus[] = [
      { name: 'my-wb', ready: true, state: { running: true } },
    ];
    const { result } = renderHook(() =>
      useNotebookProgress(nb, true, false, false, [], null, containerStatuses),
    );
    const workbenchStarted = result.current.find((s) => s.stepKind === 'workbench_started');
    expect(workbenchStarted?.status).toBe(EventStatus.SUCCESS);
  });

  it('EC3c: does NOT mark workbench_started SUCCESS when containerStatus name does not match any spec container', () => {
    const nb = makeNotebook(['my-wb']);
    const containerStatuses: PodContainerStatus[] = [
      { name: 'wrong-container', ready: true, state: { running: true } },
    ];
    const { result } = renderHook(() =>
      useNotebookProgress(nb, true, false, false, [], null, containerStatuses),
    );
    const workbenchStarted = result.current.find((s) => s.stepKind === 'workbench_started');
    expect(workbenchStarted?.status).toBe(EventStatus.PENDING);
  });

  it('EC8: empty containers list — workbench_started immediately SUCCESS when isRunning', () => {
    const nb = makeNotebook([]);
    const { result } = renderHook(() => useNotebookProgress(nb, true, false, false, [], null));
    const workbenchStarted = result.current.find((s) => s.stepKind === 'workbench_started');
    expect(workbenchStarted?.status).toBe(EventStatus.SUCCESS);
  });

  it('no-auth-proxy notebook shows only workbench container steps', () => {
    const nb = makeNotebook(['my-wb']); // no auth proxy sidecar
    const { result } = renderHook(() => useNotebookProgress(nb, false, false, false, [], null));
    const containerSteps = result.current.filter((s) => s.containerName !== undefined);
    expect(containerSteps.every((s) => s.containerName === 'my-wb')).toBe(true);
    expect(containerSteps).toHaveLength(1);
    expect(containerSteps[0].stepKind).toBe('started');
    expect(containerSteps[0].subSteps).toHaveLength(3);
  });

  it('shows pvc_attached step only when SuccessfulAttachVolume event fires', () => {
    const nb = makeNotebook(['my-wb']);
    const withoutEvent = renderHook(() => useNotebookProgress(nb, false, false, false, [], null))
      .result.current;
    expect(withoutEvent.find((s) => s.stepKind === 'pvc_attached')).toBeUndefined();

    const events: EventKind[] = [makeEvent('SuccessfulAttachVolume', 'Volume attached')];
    const withEvent = renderHook(() => useNotebookProgress(nb, false, false, false, events, null))
      .result.current;
    expect(withEvent.find((s) => s.stepKind === 'pvc_attached')).toBeDefined();
  });

  it('bubbles Kueue IN_PROGRESS up to pod_assigned parent when workload is Requeued', () => {
    const nb = makeNotebook(['my-wb']);
    const events: EventKind[] = [makeEvent('Scheduled', 'Successfully assigned pod to node')];
    const { result } = renderHook(() =>
      useNotebookProgress(nb, false, false, false, events, {
        status: KueueWorkloadStatus.Requeued,
        queueName: 'default',
        requeueInfo: { count: 3 },
      }),
    );
    const podAssigned = result.current.find((s) => s.stepKind === 'pod_assigned');
    expect(podAssigned?.status).toBe(EventStatus.IN_PROGRESS);
    const kueueSub = podAssigned?.subSteps?.find((s) => s.stepKind === 'kueue');
    expect(kueueSub?.status).toBe(EventStatus.IN_PROGRESS);
  });

  it('does NOT override pod_assigned to WARNING when Kueue sub-step is SUCCESS (Admitted)', () => {
    const nb = makeNotebook(['my-wb']);
    const events: EventKind[] = [makeEvent('Scheduled', 'Successfully assigned pod to node')];
    const { result } = renderHook(() =>
      useNotebookProgress(nb, false, false, false, events, {
        status: KueueWorkloadStatus.Admitted,
        queueName: 'default',
      }),
    );
    const podAssigned = result.current.find((s) => s.stepKind === 'pod_assigned');
    expect(podAssigned?.status).toBe(EventStatus.SUCCESS);
  });

  it.each([
    {
      label: 'ImagePullBackOff',
      message: 'Back-off pulling image "quay.io/example/my-wb:latest"',
      expectedDescription: 'ImagePullBackOff',
    },
    {
      label: 'CrashLoopBackOff',
      message: 'Back-off restarting failed container my-wb in pod test-notebook-0',
      expectedDescription: 'CrashLoopBackOff',
    },
  ])(
    'BackOff ($label) event surfaces container_problem with correct description (regression guard)',
    ({ message, expectedDescription }) => {
      const nb = makeNotebook(['my-wb']);
      const events: EventKind[] = [makeEvent('BackOff', message, 'Warning')];
      const { result } = renderHook(() =>
        useNotebookProgress(nb, false, false, false, events, null),
      );
      const containerProblem = result.current.find(
        (s) => s.stepKind === 'container_problem' && s.containerName === 'my-wb',
      );
      expect(containerProblem).toBeDefined();
      expect(containerProblem?.status).toBe(EventStatus.ERROR);
      expect(containerProblem?.description).toBe(expectedDescription);
    },
  );

  it('shows kueue sub-step inside pod_assigned when kueueStatus is provided', () => {
    const nb = makeNotebook(['my-wb']);
    const { result } = renderHook(() =>
      useNotebookProgress(nb, false, false, false, [], {
        status: KueueWorkloadStatus.Queued,
        queueName: 'default',
      }),
    );
    const podAssigned = result.current.find((s) => s.stepKind === 'pod_assigned');
    const kueue = podAssigned?.subSteps?.find((s) => s.stepKind === 'kueue');
    expect(kueue).toBeDefined();
    expect(kueue?.status).toBe(EventStatus.PENDING);
  });

  it('severity-wins: same-timestamp BackOff (ERROR) is not downgraded by companion Warning Failed event (WARNING)', () => {
    // Kubernetes fires both events at the same instant when ImagePullBackOff kicks in.
    // The BackOff event → ERROR; the companion Warning Failed event → WARNING.
    // The merge loop must keep ERROR even though the Warning event appears later.
    const ts = '2025-01-22T10:05:00Z';
    const nb = makeNotebook(['my-wb']);
    const events: EventKind[] = [
      makeEvent('BackOff', 'Back-off pulling image "quay.io/example/my-wb:latest"', 'Normal', ts),
      makeEvent('Failed', 'Error: ImagePullBackOff', 'Warning', ts),
    ];
    const { result } = renderHook(() => useNotebookProgress(nb, false, false, false, events, null));
    const containerProblem = result.current.find(
      (s) => s.stepKind === 'container_problem' && s.containerName === 'my-wb',
    );
    expect(containerProblem).toBeDefined();
    expect(containerProblem?.status).toBe(EventStatus.ERROR);
    expect(containerProblem?.description).toBe('ImagePullBackOff');
  });

  it('allows a later SUCCESS to clear a WARNING from an earlier restart event', () => {
    // When a workbench restarts, "Killing" (WARNING) arrives first, then "Started" (SUCCESS)
    // a moment later — both land on the same "started" step. The restart wins; step ends SUCCESS.
    const nb = makeNotebook(['my-wb']);
    const events: EventKind[] = [
      makeEvent('Killing', 'Stopping container my-wb', 'Normal', '2025-01-22T10:04:00Z'),
      makeEvent('Started', 'Started container my-wb', 'Normal', '2025-01-22T10:05:00Z'),
    ];
    const { result } = renderHook(() => useNotebookProgress(nb, false, false, false, events, null));
    const startedStep = result.current.find(
      (s) => s.stepKind === 'started' && s.containerName === 'my-wb',
    );
    expect(startedStep).toBeDefined();
    expect(startedStep?.status).toBe(EventStatus.SUCCESS);
  });
});
