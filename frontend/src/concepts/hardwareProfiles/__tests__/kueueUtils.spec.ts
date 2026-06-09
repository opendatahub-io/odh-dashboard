import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { SchedulingType } from '#~/types';
import { filterProfilesByKueue, KueueFilteringState } from '../kueueUtils';

const kueueProfileA = mockHardwareProfile({
  name: 'kueue-a',
  displayName: 'Kueue A',
  schedulingType: SchedulingType.QUEUE,
  localQueueName: 'queue-a',
});

const kueueProfileB = mockHardwareProfile({
  name: 'kueue-b',
  displayName: 'Kueue B',
  schedulingType: SchedulingType.QUEUE,
  localQueueName: 'queue-b',
});

const nodeProfile = mockHardwareProfile({
  name: 'node-profile',
  displayName: 'Node Profile',
  schedulingType: SchedulingType.NODE,
});

const allProfiles = [kueueProfileA, kueueProfileB, nodeProfile];

describe('filterProfilesByKueue', () => {
  it('should return empty array when state is NO_PROFILES', () => {
    expect(filterProfilesByKueue(allProfiles, KueueFilteringState.NO_PROFILES)).toEqual([]);
  });

  it('should return only Kueue profiles when state is ONLY_KUEUE_PROFILES', () => {
    const result = filterProfilesByKueue(allProfiles, KueueFilteringState.ONLY_KUEUE_PROFILES);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.metadata.name)).toEqual(['kueue-a', 'kueue-b']);
  });

  it('should return only non-Kueue profiles when state is ONLY_NON_KUEUE_PROFILES', () => {
    const result = filterProfilesByKueue(
      allProfiles,
      KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
    );
    expect(result).toHaveLength(1);
    expect(result[0].metadata.name).toBe('node-profile');
  });

  describe('with availableLocalQueueNames', () => {
    it('should filter out Kueue profiles whose localQueueName is not available in the project', () => {
      const available = new Set(['queue-a']);
      const result = filterProfilesByKueue(
        allProfiles,
        KueueFilteringState.ONLY_KUEUE_PROFILES,
        available,
      );
      expect(result).toHaveLength(1);
      expect(result[0].metadata.name).toBe('kueue-a');
    });

    it('should include all Kueue profiles when all localQueues are available', () => {
      const available = new Set(['queue-a', 'queue-b']);
      const result = filterProfilesByKueue(
        allProfiles,
        KueueFilteringState.ONLY_KUEUE_PROFILES,
        available,
      );
      expect(result).toHaveLength(2);
    });

    it('should return no Kueue profiles when no localQueues are available', () => {
      const available = new Set<string>();
      const result = filterProfilesByKueue(
        allProfiles,
        KueueFilteringState.ONLY_KUEUE_PROFILES,
        available,
      );
      expect(result).toHaveLength(0);
    });

    it('should not affect non-Kueue profile filtering', () => {
      const available = new Set<string>();
      const result = filterProfilesByKueue(
        allProfiles,
        KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
        available,
      );
      expect(result).toHaveLength(1);
      expect(result[0].metadata.name).toBe('node-profile');
    });

    it('should not filter Kueue profiles when availableLocalQueueNames is not provided', () => {
      const result = filterProfilesByKueue(
        allProfiles,
        KueueFilteringState.ONLY_KUEUE_PROFILES,
      );
      expect(result).toHaveLength(2);
    });
  });
});
