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
    const calls: string[] = [];
    const deletePrimaryDeployment = jest.fn().mockImplementation(async () => {
      calls.push('primary');
    });
    const deletePVCResource = jest.fn().mockImplementation(async () => {
      calls.push('pvc');
      return { status: 'Success', message: '' };
    });

    await deleteLegacyNIMDeployment({
      deletePrimaryDeployment,
      namespace,
      pvcName,
      deletePVC: true,
      deletePVCResource,
    });

    expect(calls).toEqual(['primary', 'pvc', 'primary', 'pvc']);
    expect(deletePVCResource).toHaveBeenNthCalledWith(1, 'nim-cache', 'project', {
      dryRun: true,
    });
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
