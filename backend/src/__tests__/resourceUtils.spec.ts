import { isRHOAI } from '../utils/resourceUtils';
import * as resourceUtils from '../utils/resourceUtils';
import { OdhPlatformType, DataScienceClusterKindStatus } from '../types';

describe('resourceUtils', () => {
  describe('isRHOAI', () => {
    const mockFastify = { log: { error: jest.fn() } } as any;
    const mockStatus = (name: string): DataScienceClusterKindStatus => ({
      conditions: [
        {
          type: 'Ready',
          status: 'True',
        },
      ],
      installedComponents: {},
      phase: 'Running',
      release: {
        name,
      },
    });

    it('returns true for Self-managed RHOAI', () => {
      jest
        .spyOn(resourceUtils, 'getClusterStatus')
        .mockReturnValue(mockStatus(OdhPlatformType.SELF_MANAGED_RHOAI));
      expect(isRHOAI(mockFastify)).toBe(true);
    });

    it('returns true for Managed RHOAI', () => {
      jest
        .spyOn(resourceUtils, 'getClusterStatus')
        .mockReturnValue(mockStatus(OdhPlatformType.MANAGED_RHOAI));
      expect(isRHOAI(mockFastify)).toBe(true);
    });

    it('returns false for Opendatahub', () => {
      jest
        .spyOn(resourceUtils, 'getClusterStatus')
        .mockReturnValue(mockStatus(OdhPlatformType.OPEN_DATA_HUB));
      expect(isRHOAI(mockFastify)).toBe(false);
    });

    it('returns false when error', () => {
      const errorMessage = 'Tried to use DSC before ResourceWatcher could successfully fetch it';
      jest.spyOn(resourceUtils, 'getClusterStatus').mockImplementation((fastify) => {
        fastify.log.error(errorMessage);
        return undefined;
      });
      expect(isRHOAI(mockFastify)).toBe(false);
      expect(mockFastify.log.error).toHaveBeenCalledWith(errorMessage);
    });
  });
});
