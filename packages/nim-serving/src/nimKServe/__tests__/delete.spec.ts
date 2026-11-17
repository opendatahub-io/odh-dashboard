import { K8sStatusError } from '@odh-dashboard/k8s-core';
import {
  mock200Status,
  mock403Error,
  mock404Error,
} from '@odh-dashboard/k8s-core/__mocks__/mockK8sStatus';
import { deleteLegacyNIMDeployment } from '../delete';

describe('deleteLegacyNIMDeployment', () => {
  const pvcName = 'nim-cache';
  const namespace = 'project';

  it('should delete only the primary deployment when PVC deletion is not selected', async () => {
    const deletePrimaryDeployment = jest.fn().mockResolvedValue(undefined);
    const deletePVCResource = jest.fn();

    await deleteLegacyNIMDeployment({
      deletePrimaryDeployment,
      namespace,
      pvcName,
      deletePVC: false,
      deletePVCResource,
    });

    expect(deletePrimaryDeployment).toHaveBeenNthCalledWith(1, { dryRun: true });
    expect(deletePrimaryDeployment).toHaveBeenNthCalledWith(2);
    expect(deletePVCResource).not.toHaveBeenCalled();
  });

  it('should delete the PVC after the primary deployment succeeds', async () => {
    let resolveActualPrimary: (() => void) | undefined;
    const actualPrimaryDeletion = new Promise<void>((resolve) => {
      resolveActualPrimary = resolve;
    });
    const deletePrimaryDeployment = jest
      .fn()
      .mockImplementation(({ dryRun } = {}) =>
        dryRun ? Promise.resolve() : actualPrimaryDeletion,
      );
    const deletePVCResource = jest.fn().mockResolvedValue({ status: 'Success', message: '' });

    const deletion = deleteLegacyNIMDeployment({
      deletePrimaryDeployment,
      namespace,
      pvcName,
      deletePVC: true,
      deletePVCResource,
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(deletePVCResource).toHaveBeenCalledTimes(1);
    expect(deletePVCResource).toHaveBeenNthCalledWith(1, 'nim-cache', 'project', {
      dryRun: true,
    });

    expect(resolveActualPrimary).toBeDefined();
    resolveActualPrimary?.();
    await deletion;

    expect(deletePVCResource).toHaveBeenNthCalledWith(2, 'nim-cache', 'project', undefined);
  });

  it.each([undefined, {}, { status: { phase: 'Pending' } }])(
    'should treat a non-status PVC deletion response as success',
    async (status) => {
      const deletePVCResource = jest.fn().mockResolvedValue(status);

      await expect(
        deleteLegacyNIMDeployment({
          deletePrimaryDeployment: jest.fn().mockResolvedValue(undefined),
          namespace,
          pvcName,
          deletePVC: true,
          deletePVCResource,
        }),
      ).resolves.toBeUndefined();
    },
  );

  it('should not delete the PVC when the primary deployment fails', async () => {
    const deletePrimaryDeployment = jest.fn().mockRejectedValue(new Error('primary failed'));
    const deletePVCResource = jest.fn().mockResolvedValue(undefined);

    await expect(
      deleteLegacyNIMDeployment({
        deletePrimaryDeployment,
        namespace,
        pvcName,
        deletePVC: true,
        deletePVCResource,
      }),
    ).rejects.toThrow('primary failed');

    expect(deletePVCResource).toHaveBeenCalledWith('nim-cache', 'project', { dryRun: true });
    expect(deletePrimaryDeployment).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])(
    'should delete the deployment when the PVC is not found (dry run: %s)',
    async (dryRun) => {
      const deletePrimaryDeployment = jest.fn().mockResolvedValue(undefined);
      const deletePVCResource = jest.fn().mockRejectedValue(new K8sStatusError(mock404Error({})));
      if (!dryRun) {
        deletePVCResource.mockResolvedValueOnce(mock200Status({}));
      }

      await expect(
        deleteLegacyNIMDeployment({
          deletePrimaryDeployment,
          namespace,
          pvcName,
          deletePVC: true,
          deletePVCResource,
        }),
      ).resolves.toBeUndefined();

      expect(deletePrimaryDeployment).toHaveBeenNthCalledWith(1, { dryRun: true });
      expect(deletePrimaryDeployment).toHaveBeenNthCalledWith(2);
      expect(deletePVCResource).toHaveBeenCalledTimes(2);
      expect(deletePVCResource).toHaveBeenNthCalledWith(1, pvcName, namespace, { dryRun: true });
      expect(deletePVCResource).toHaveBeenNthCalledWith(2, pvcName, namespace, undefined);
    },
  );

  it('should treat a returned not-found PVC status as already deleted', async () => {
    const deletePrimaryDeployment = jest.fn().mockResolvedValue(undefined);
    const deletePVCResource = jest.fn().mockResolvedValue(mock404Error({}));

    await expect(
      deleteLegacyNIMDeployment({
        deletePrimaryDeployment,
        namespace,
        pvcName,
        deletePVC: true,
        deletePVCResource,
      }),
    ).resolves.toBeUndefined();

    expect(deletePrimaryDeployment).toHaveBeenCalledTimes(2);
    expect(deletePVCResource).toHaveBeenCalledTimes(2);
  });

  it.each([true, false])('should report a forbidden PVC deletion (dry run: %s)', async (dryRun) => {
    const deletePrimaryDeployment = jest.fn().mockResolvedValue(undefined);
    const deletePVCResource = jest
      .fn()
      .mockRejectedValue(new K8sStatusError(mock403Error({ message: 'forbidden' })));
    if (!dryRun) {
      deletePVCResource.mockResolvedValueOnce(mock200Status({}));
    }

    await expect(
      deleteLegacyNIMDeployment({
        deletePrimaryDeployment,
        namespace,
        pvcName,
        deletePVC: true,
        deletePVCResource,
      }),
    ).rejects.toThrow(
      dryRun
        ? 'Nothing was deleted. Dry run deletion failed: PVC nim-cache: forbidden'
        : 'Unable to delete PVC nim-cache: forbidden',
    );

    expect(deletePrimaryDeployment).toHaveBeenCalledTimes(dryRun ? 1 : 2);
    expect(deletePVCResource).toHaveBeenCalledTimes(dryRun ? 1 : 2);
  });

  it('should surface a failed PVC deletion status', async () => {
    const deletePVCResource = jest.fn().mockResolvedValue({
      status: 'Failure',
      message: 'forbidden',
    });

    await expect(
      deleteLegacyNIMDeployment({
        deletePrimaryDeployment: jest.fn().mockResolvedValue(undefined),
        namespace,
        pvcName,
        deletePVC: true,
        deletePVCResource,
      }),
    ).rejects.toThrow('forbidden');

    expect(deletePVCResource).toHaveBeenCalledWith('nim-cache', 'project', {
      dryRun: true,
    });
  });
});
