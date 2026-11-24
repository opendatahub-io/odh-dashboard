import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { K8sResourceCommon, K8sWatchResult } from '@odh-dashboard/k8s-core';
import type { WatchK8sResource } from '@openshift/dynamic-plugin-sdk-utils';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { checkAccess } from '@odh-dashboard/k8s-core/api/accessReview';
import { K8sStatusError } from '@odh-dashboard/k8s-core';
import type { Deployment, ModelServingEventsDiscovery } from '../../../../../extension-points';
import DeploymentEventsTabContainer from '../DeploymentEventsTabContainer';

jest.mock('@odh-dashboard/ui-core/hooks/useK8sWatchResourceList');
jest.mock('@odh-dashboard/k8s-core/api/accessReview');
const mockReview = jest.mocked(checkAccess);
const mockWatch = jest.mocked(useK8sWatchResourceList);
const results = new Map<string, K8sWatchResult<K8sResourceCommon[]>>();
const empty: K8sWatchResult<K8sResourceCommon[]> = [[], true, undefined];
const started = jest.fn();
const stopped = jest.fn();

function useFakeWatch(resource: WatchK8sResource | null): K8sWatchResult<K8sResourceCommon[]> {
  const key =
    resource?.fieldSelector ??
    (resource && 'groupVersionKind' in resource ? resource.groupVersionKind?.kind : undefined);
  React.useEffect(() => {
    started(key);
    return () => {
      stopped(key);
    };
  }, [key]);
  return (key && results.get(key)) || empty;
}

const discovery: ModelServingEventsDiscovery['properties'] = {
  platform: 'llmd-serving',
  modelLabelSelector: (name) => ({
    'app.kubernetes.io/name': name,
    'app.kubernetes.io/part-of': 'llminferenceservice',
  }),
  resources: [
    {
      apiGroup: 'apps',
      apiVersion: 'v1',
      kind: 'Deployment',
      plural: 'deployments',
      scope: 'model',
    },
    {
      apiGroup: 'apps',
      apiVersion: 'v1',
      kind: 'ReplicaSet',
      plural: 'replicasets',
      scope: 'model',
    },
    {
      apiGroup: 'apps',
      apiVersion: 'v1',
      kind: 'StatefulSet',
      plural: 'statefulsets',
      scope: 'namespace',
    },
  ],
};
const deployment: Deployment = {
  modelServingPlatformId: 'llmd-serving',
  model: {
    apiVersion: 'serving.kserve.io/v1alpha2',
    kind: 'LLMInferenceService',
    metadata: { uid: 'root', namespace: 'test-project', name: 'test-model' },
  },
  podDiscovery: { pods: [], loaded: true },
};
const watchKey = (uid: string) => `involvedObject.uid=${uid}`;
const owned = (uid: string, owner: string): K8sResourceCommon => ({
  apiVersion: 'apps/v1',
  kind: 'ReplicaSet',
  metadata: {
    uid,
    ownerReferences: [{ uid: owner, name: owner, kind: 'Deployment', apiVersion: 'apps/v1' }],
  },
});
const event = (uid: string, source: string, message: string) => ({
  apiVersion: 'v1',
  kind: 'Event',
  metadata: { uid },
  involvedObject: { uid: source, name: source, kind: 'ReplicaSet' },
  type: 'Warning',
  reason: 'FailedCreate',
  message,
});

const scope = (visible = true, current = deployment) => (
  <DeploymentEventsTabContainer
    key={current.model.metadata.uid}
    discovery={discovery}
    deployment={current}
    visible={visible}
    panelId="events-panel"
    tabId="events-tab"
  />
);

beforeEach(() => {
  jest.clearAllMocks();
  results.clear();
  mockReview.mockReset().mockResolvedValue(true);
  mockWatch.mockImplementation(useFakeWatch);
});

it('should wait for both permission checks before starting any diagnostics watches', async () => {
  let allowWatch!: (allowed: boolean) => void;
  mockReview.mockResolvedValueOnce(true).mockReturnValueOnce(
    new Promise((resolve) => {
      allowWatch = resolve;
    }),
  );
  render(scope(false));
  expect(started).not.toHaveBeenCalled();
  allowWatch(true);
  await waitFor(() => expect(started).toHaveBeenCalledWith(watchKey('root')));
  expect(mockWatch.mock.calls.map(([resource]) => resource)).toContainEqual(
    expect.objectContaining({
      namespace: 'test-project',
      selector: { matchLabels: discovery.modelLabelSelector('test-model') },
    }),
  );
  expect(mockWatch.mock.calls.map(([resource]) => resource)).toContainEqual(
    expect.objectContaining({
      groupVersionKind: { group: 'apps', version: 'v1', kind: 'StatefulSet' },
      selector: undefined,
    }),
  );
  expect(started).not.toHaveBeenCalledWith('Pod');
});

it.each(['denied', 'error'] as const)(
  'should report a %s permission check without starting discovery',
  async (state) => {
    if (state === 'denied') mockReview.mockResolvedValue(false);
    else mockReview.mockRejectedValue(new Error('Review failed'));
    render(scope());
    expect(
      await screen.findByLabelText(
        state === 'denied'
          ? 'Insufficient permissions to view Events'
          : 'Unable to check Event permissions',
      ),
    ).toBeVisible();
    expect(started).not.toHaveBeenCalled();
  },
);

it('should reconcile a zero-Pod ReplicaSet without restarting unchanged watches', async () => {
  results.set('Deployment', [[owned('deployment', 'root')], true, undefined]);
  const { rerender, unmount } = render(scope(false));
  await waitFor(() => expect(started).toHaveBeenCalledWith(watchKey('deployment')));
  const originalStarts = started.mock.calls.length;
  results.set('ReplicaSet', [[owned('rs', 'deployment')], true, undefined]);
  results.set(watchKey('rs'), [[event('quota', 'rs', 'Quota exceeded')], true, undefined]);
  rerender(scope());
  expect(await screen.findByText('Quota exceeded')).toBeVisible();
  expect(started.mock.calls.slice(originalStarts)).toEqual([[watchKey('rs')]]);
  expect(stopped).not.toHaveBeenCalled();

  const search = screen.getByRole('textbox', { name: 'Search Events' });
  fireEvent.change(search, { target: { value: 'quota' } });
  rerender(scope(false));
  results.set(watchKey('rs'), [[event('quota', 'rs', 'Updated quota warning')], true, undefined]);
  rerender(scope());
  expect(screen.getByRole('textbox', { name: 'Search Events' })).toHaveValue('quota');
  expect(screen.getAllByTestId('deployment-event-quota')).toHaveLength(1);
  expect(screen.getByText('Updated quota warning')).toBeVisible();
  expect(stopped).not.toHaveBeenCalled();

  results.delete('ReplicaSet');
  rerender(scope());
  expect(screen.queryByText('Updated quota warning')).not.toBeInTheDocument();
  expect(stopped.mock.calls).toEqual([[watchKey('rs')]]);
  unmount();
  expect(stopped.mock.calls.map(([key]) => key)).toEqual(
    expect.arrayContaining([watchKey('root'), watchKey('deployment'), 'StatefulSet']),
  );
});

it('should preserve root Events on discovery and child Event failures and drop them on model replacement', async () => {
  results.set('Deployment', [[owned('deployment', 'root')], true, undefined]);
  results.set('StatefulSet', [[], false, new Error('StatefulSet error')]);
  results.set(watchKey('root'), [
    [event('root-event', 'root', 'Root warning'), event('wrong', 'unrelated', 'Foreign warning')],
    true,
    undefined,
  ]);
  results.set(watchKey('deployment'), [[], false, new Error('Child failure')]);
  const current = {
    ...deployment,
    podDiscovery: { pods: [], loaded: false, error: new Error('Pod error') },
  };
  const { rerender } = render(scope(true, current));
  expect(await screen.findByText('Root warning')).toBeVisible();
  expect(screen.queryByText('Foreign warning')).not.toBeInTheDocument();
  expect(screen.getByText(/Pod, StatefulSet/)).toBeVisible();
  expect(await screen.findByText(/Some Event sources could not be read/)).toBeVisible();
  rerender(
    scope(true, {
      ...current,
      model: { ...current.model, metadata: { ...current.model.metadata, uid: 'replacement' } },
    }),
  );
  await waitFor(() => expect(started).toHaveBeenCalledWith(watchKey('replacement')));
  expect(screen.queryByText('Root warning')).not.toBeInTheDocument();
  expect(stopped).toHaveBeenCalledWith(watchKey('root'));
});

it('should freeze Events and stop only Event watches until auto-refresh resumes', async () => {
  const firstKey = watchKey('first-rs');
  const nextKey = watchKey('next-rs');
  results.set('ReplicaSet', [[owned('first-rs', 'root')], true, undefined]);
  results.set(firstKey, [[event('initial', 'first-rs', 'Initial quota warning')], true, undefined]);
  const { rerender } = render(scope());
  expect(await screen.findByText('Initial quota warning')).toBeVisible();

  const toggle = screen.getByRole('switch', { name: 'Auto-refresh' });
  expect(toggle).toBeChecked();
  fireEvent.click(toggle);
  expect(toggle).not.toBeChecked();
  expect(stopped.mock.calls.map(([key]) => key)).toEqual(
    expect.arrayContaining([watchKey('root'), firstKey]),
  );
  expect(stopped).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Initial quota warning')).toBeVisible();

  results.set('ReplicaSet', [[owned('next-rs', 'root')], true, undefined]);
  results.set(nextKey, [[], false, undefined]);
  rerender(scope(false));
  rerender(scope());
  expect(toggle).not.toBeChecked();
  expect(started).not.toHaveBeenCalledWith(nextKey);
  expect(screen.getByText('Initial quota warning')).toBeVisible();
  expect(screen.queryByLabelText('Loading Events')).not.toBeInTheDocument();

  fireEvent.change(screen.getByRole('textbox', { name: 'Search Events' }), {
    target: { value: 'quota' },
  });
  fireEvent.click(toggle);
  expect(toggle).toBeChecked();
  expect(started).toHaveBeenCalledWith(nextKey);
  expect(started.mock.calls.filter(([key]) => key === firstKey)).toHaveLength(1);
  expect(screen.getByText('Initial quota warning')).toBeVisible();
  expect(screen.getByRole('textbox', { name: 'Search Events' })).toHaveValue('quota');
  results.set(nextKey, [[event('next', 'next-rs', 'Next quota warning')], true, undefined]);
  rerender(scope());
  expect(await screen.findByText('Next quota warning')).toBeVisible();
  expect(screen.queryByText('Initial quota warning')).not.toBeInTheDocument();
});

it('should not start diagnostics without a deployment UID', () => {
  render(
    scope(true, {
      ...deployment,
      model: { ...deployment.model, metadata: { ...deployment.model.metadata, uid: undefined } },
    }),
  );
  expect(mockReview).not.toHaveBeenCalled();
  expect(started).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Unable to load Events')).toBeVisible();
});

it('should distinguish a failed Event watch from an empty list', async () => {
  results.set(watchKey('root'), [[], false, new Error('Event watch failed')]);
  render(scope());
  expect(await screen.findByLabelText('Unable to load Events')).toBeVisible();
  expect(screen.queryByText(/^No Events found yet\./)).not.toBeInTheDocument();
});

it('should show an access problem when the Event request is denied after an allowed review', async () => {
  results.set(watchKey('root'), [
    [],
    false,
    new K8sStatusError({
      apiVersion: 'v1',
      kind: 'Status',
      code: 403,
      message: 'Forbidden',
      reason: 'Forbidden',
      status: 'Failure',
    }),
  ]);
  render(scope());
  expect(await screen.findByLabelText('Insufficient permissions to view Events')).toBeVisible();
  expect(screen.queryByText(/^No Events found yet\./)).not.toBeInTheDocument();
});
