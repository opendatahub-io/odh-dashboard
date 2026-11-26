import * as React from 'react';
import { act, render, screen } from '@testing-library/react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import type {
  Deployment,
  ModelServingPlatformWatchDeploymentsExtension,
} from '../../../extension-points';
import { ModelDeploymentsContext, ModelDeploymentsProvider } from '../ModelDeploymentsContext';
import { useDeploymentAccess } from '../useDeploymentAccess';

const projects = ['readable', 'restricted'].map((name) =>
  mockProjectK8sResource({ k8sName: name }),
);
const deploymentApi = {
  group: 'serving.kserve.io',
  resource: 'llminferenceservices',
  resources: { llminferenceservices: ['list', 'watch', 'create', 'delete'] },
};
const Summary: React.FC = () => {
  const { loaded, errors } = React.useContext(ModelDeploymentsContext);
  const create = useDeploymentAccess('create', 'readable');
  const remove = useDeploymentAccess('delete', 'readable', 'test-model');
  return (
    <>
      {loaded && <p>Readable project loaded</p>}
      {errors?.map((e) => (
        <p key={e.message}>{e.message}</p>
      ))}
      <p>{create.reason}</p>
      {remove.allowed && <p>Delete allowed</p>}
    </>
  );
};

describe('deployment watches on a host with a discovered resource', () => {
  it('should wait for both read verbs per project and review mutations independently', async () => {
    let grantWatch!: (value: boolean) => void;
    const checkAccess = jest.fn<
      ReturnType<HostApiCoreServices['checkAccess']>,
      Parameters<HostApiCoreServices['checkAccess']>
    >(async ({ namespace, verb, name }) => {
      if (verb === 'watch' && namespace === 'readable') {
        return new Promise<boolean>((resolve) => {
          grantWatch = resolve;
        });
      }
      if (verb === 'watch') {
        throw new Error('review unavailable');
      }
      return verb === 'list' || (verb === 'delete' && name === 'test-model');
    });
    const watchResult: [Deployment[], boolean, undefined] = [[], true, undefined];
    const watch = jest.fn(() => watchResult);
    const store = new PluginStore({
      llmd: [
        {
          type: 'model-serving.platform/watch-deployments',
          properties: { platform: 'llmd-serving', watch: async () => watch },
        } satisfies ModelServingPlatformWatchDeploymentsExtension,
      ],
    });
    const Host: React.FC = () => {
      const core = React.useContext(HostApiCoreContext);
      const value = React.useMemo(() => ({ ...core, checkAccess, deploymentApi }), [core]);
      return (
        <PluginStoreProvider store={store}>
          <HostApiCoreContext.Provider value={value}>
            <ModelDeploymentsProvider projects={projects}>
              <Summary />
            </ModelDeploymentsProvider>
          </HostApiCoreContext.Provider>
        </PluginStoreProvider>
      );
    };
    const view = render(<Host />);
    expect(
      await screen.findByText(/Could not check access to watch.*restricted.*review unavailable/),
    ).toBeVisible();
    expect(watch).not.toHaveBeenCalled();
    expect(screen.getByText('Delete allowed')).toBeVisible();
    expect(screen.getByText(/Access denied to create.*readable/)).toBeVisible();
    await act(async () => grantWatch(true));
    expect(await screen.findByText('Readable project loaded')).toBeVisible();
    expect(watch).toHaveBeenCalledWith(projects[0], undefined, undefined);
    expect(watch).not.toHaveBeenCalledWith(projects[1], undefined, undefined);
    const reviews = checkAccess.mock.calls.length;
    view.rerender(<Host />);
    expect(checkAccess).toHaveBeenCalledTimes(reviews);
  });
});
