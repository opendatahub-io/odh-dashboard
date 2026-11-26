import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PluginStoreProvider } from '@openshift/dynamic-plugin-sdk';
import { PluginStore } from '@odh-dashboard/plugin-core';
import { HostApiCoreContext, type HostApiCoreServices } from '@odh-dashboard/plugin-core/host-api';
import type { Deployment, ModelServingDeleteModal } from '../../../../extension-points';
import DeleteModelServingModal from '../DeleteModelServingModal';

describe('DeleteModelServingModal', () => {
  it('should reject confirmation before invoking the platform delete action when access is denied', async () => {
    const deleteDeployment = jest.fn<Promise<void>, [Deployment]>().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const extension: ModelServingDeleteModal = {
      type: 'model-serving.platform/delete-deployment',
      properties: {
        platform: 'llmd-serving',
        title: 'Delete model deployment?',
        submitButtonLabel: 'Delete model deployment',
        onDelete: async () => deleteDeployment,
      },
    };
    const store = new PluginStore({ llmd: [extension] });
    const checkAccess = jest.fn<Promise<boolean>, Parameters<HostApiCoreServices['checkAccess']>>(
      async () => false,
    );
    const Host: React.FC<React.PropsWithChildren> = ({ children }) => {
      const core = React.useContext(HostApiCoreContext);
      const value = React.useMemo(
        () => ({
          ...core,
          checkAccess,
          deploymentApi: {
            group: 'serving.kserve.io',
            resource: 'llminferenceservices',
            resources: { llminferenceservices: ['delete'] },
          },
        }),
        [core],
      );
      return <HostApiCoreContext.Provider value={value}>{children}</HostApiCoreContext.Provider>;
    };

    render(
      <PluginStoreProvider store={store}>
        <Host>
          <DeleteModelServingModal
            onClose={onClose}
            deployment={{
              modelServingPlatformId: 'llmd-serving',
              model: {
                apiVersion: 'serving.kserve.io/v1alpha2',
                kind: 'LLMInferenceService',
                metadata: { namespace: 'test-project', name: 'test-model' },
              },
            }}
          />
        </Host>
      </PluginStoreProvider>,
    );

    fireEvent.change(await screen.findByRole('textbox', { name: 'Delete modal input' }), {
      target: { value: 'test-model' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete model deployment' }));

    expect(await screen.findByText(/Access denied to delete.*test-project/)).toBeVisible();
    expect(deleteDeployment).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
