import { SchedulingType } from '@odh-dashboard/k8s-core';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import { mockLocalQueueK8sResource } from '#~/__mocks__/mockLocalQueueK8sResource';
import {
  computeLocalQueueNamesResult,
  filterProfilesByKueue,
  KueueFilteringState,
} from '#~/concepts/hardwareProfiles/kueueUtils';

const kueueProfile = mockHardwareProfile({
  name: 'kueue-profile',
  schedulingType: SchedulingType.QUEUE,
  localQueueName: 'queue-a',
});

const kueueProfileB = mockHardwareProfile({
  name: 'kueue-profile-b',
  schedulingType: SchedulingType.QUEUE,
  localQueueName: 'queue-b',
});

const nodeProfile = mockHardwareProfile({
  name: 'node-profile',
  schedulingType: SchedulingType.NODE,
});

const allProfiles = [kueueProfile, kueueProfileB, nodeProfile];

describe('filterProfilesByKueue', () => {
  describe('NO_PROFILES state', () => {
    it('should return an empty array regardless of input profiles', () => {
      expect(filterProfilesByKueue(allProfiles, KueueFilteringState.NO_PROFILES)).toEqual([]);
    });

    it('should return an empty array for empty input', () => {
      expect(filterProfilesByKueue([], KueueFilteringState.NO_PROFILES)).toEqual([]);
    });
  });

  describe('ONLY_NON_KUEUE_PROFILES state', () => {
    it('should return only non-Kueue profiles', () => {
      const result = filterProfilesByKueue(
        allProfiles,
        KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
      );
      expect(result).toEqual([nodeProfile]);
    });

    it('should return empty array when all profiles are Kueue type', () => {
      const result = filterProfilesByKueue(
        [kueueProfile, kueueProfileB],
        KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
      );
      expect(result).toEqual([]);
    });

    it('should ignore availableLocalQueueNames — it has no effect outside ONLY_KUEUE_PROFILES', () => {
      const result = filterProfilesByKueue(
        allProfiles,
        KueueFilteringState.ONLY_NON_KUEUE_PROFILES,
        new Set(['queue-a']),
      );
      expect(result).toEqual([nodeProfile]);
    });
  });

  describe('ONLY_KUEUE_PROFILES state — without availableLocalQueueNames', () => {
    it('should return all Kueue profiles when availableLocalQueueNames is undefined', () => {
      const result = filterProfilesByKueue(allProfiles, KueueFilteringState.ONLY_KUEUE_PROFILES);
      expect(result).toEqual([kueueProfile, kueueProfileB]);
    });

    it('should return empty array when all profiles are non-Kueue type', () => {
      const result = filterProfilesByKueue([nodeProfile], KueueFilteringState.ONLY_KUEUE_PROFILES);
      expect(result).toEqual([]);
    });
  });

  describe('ONLY_KUEUE_PROFILES state — with availableLocalQueueNames', () => {
    it('should show only Kueue profiles whose localQueueName is in the available set', () => {
      const result = filterProfilesByKueue(
        allProfiles,
        KueueFilteringState.ONLY_KUEUE_PROFILES,
        new Set(['queue-a']),
      );
      expect(result).toEqual([kueueProfile]);
    });

    it('should hide all Kueue profiles when none of their queues are in the available set', () => {
      const result = filterProfilesByKueue(
        allProfiles,
        KueueFilteringState.ONLY_KUEUE_PROFILES,
        new Set(['queue-does-not-exist']),
      );
      expect(result).toEqual([]);
    });

    it('should show all Kueue profiles when all their queues are in the available set', () => {
      const result = filterProfilesByKueue(
        allProfiles,
        KueueFilteringState.ONLY_KUEUE_PROFILES,
        new Set(['queue-a', 'queue-b']),
      );
      expect(result).toEqual([kueueProfile, kueueProfileB]);
    });

    it('should show Kueue profiles without a localQueueName regardless of the available set', () => {
      const kueueProfileNoQueue = mockHardwareProfile({
        name: 'kueue-no-queue',
        schedulingType: SchedulingType.QUEUE,
      });
      // Remove the localQueueName that the mock sets by default
      if (kueueProfileNoQueue.spec.scheduling?.kueue) {
        kueueProfileNoQueue.spec.scheduling.kueue.localQueueName = '';
      }

      const result = filterProfilesByKueue(
        [kueueProfileNoQueue],
        KueueFilteringState.ONLY_KUEUE_PROFILES,
        new Set(['queue-a']),
      );
      expect(result).toEqual([kueueProfileNoQueue]);
    });
  });
});

describe('computeLocalQueueNamesResult', () => {
  it('returns loading while queues are still fetching', () => {
    expect(computeLocalQueueNamesResult({ data: [], loaded: false, error: undefined })).toEqual({
      status: 'loading',
    });
  });

  // error takes priority over loaded — both states should return 'error'
  it.each([
    ['loaded=false', false],
    ['loaded=true', true],
  ])('returns error when fetch failed (%s)', (_, loaded) => {
    const error = new Error('fetch failed');
    expect(computeLocalQueueNamesResult({ data: [], loaded, error })).toEqual({
      status: 'error',
      error,
    });
  });

  it('returns ready with empty set when no queues exist', () => {
    expect(computeLocalQueueNamesResult({ data: [], loaded: true, error: undefined })).toEqual({
      status: 'ready',
      names: new Set(),
    });
  });

  it('returns ready with queue names extracted from metadata', () => {
    expect(
      computeLocalQueueNamesResult({
        data: [
          mockLocalQueueK8sResource({ name: 'queue-a' }),
          mockLocalQueueK8sResource({ name: 'queue-b' }),
        ],
        loaded: true,
        error: undefined,
      }),
    ).toEqual({ status: 'ready', names: new Set(['queue-a', 'queue-b']) });
  });

  it('filters out entries with missing metadata name', () => {
    expect(
      computeLocalQueueNamesResult({
        data: [{ metadata: {} }, { metadata: { name: 'queue-a' } }],
        loaded: true,
        error: undefined,
      }),
    ).toEqual({ status: 'ready', names: new Set(['queue-a']) });
  });
});
