import {
  DataScienceStackComponent,
  SupportedArea,
  type SupportedAreaType,
} from '@odh-dashboard/plugin-core/areas';
import {
  SupportedAreasStateMap,
  advancedAIMLFlags,
  devTemporaryFeatureFlags,
} from '#~/concepts/areas/const';

describe('Verify const stability', () => {
  const computeTestFunc = (map: Partial<typeof SupportedAreasStateMap>) => {
    const hasSuccessfulReliantAreaInternal = (
      key: SupportedAreaType,
      passedArea: SupportedAreaType[] = [],
    ): boolean => {
      const state = map[key];

      if (state?.reliantAreas) {
        const updatedPassedArea = [...passedArea, key];
        return state.reliantAreas.every((v) =>
          updatedPassedArea.includes(v)
            ? false
            : hasSuccessfulReliantAreaInternal(v, updatedPassedArea),
        );
      }

      return true;
    };
    return hasSuccessfulReliantAreaInternal;
  };
  const hasSuccessfulReliantArea = computeTestFunc(SupportedAreasStateMap);

  it('utility should fail on reliant areas', () => {
    const state: Partial<typeof SupportedAreasStateMap> = {
      [SupportedArea.DS_PROJECTS_VIEW]: {
        featureFlags: [],
        reliantAreas: [SupportedArea.DS_PROJECTS_PERMISSIONS],
      },
      [SupportedArea.DS_PROJECTS_PERMISSIONS]: {
        featureFlags: [],
        reliantAreas: [SupportedArea.DS_PROJECTS_VIEW],
      },
    };
    const hasSuccessfulReliantAreaForTest = computeTestFunc(state);

    expect(hasSuccessfulReliantAreaForTest(SupportedArea.DS_PROJECTS_PERMISSIONS)).toBe(false);
  });

  it('should not have circular reliant areas', () => {
    const list = Object.keys(SupportedAreasStateMap);
    list.forEach(
      (v) =>
        hasSuccessfulReliantArea(v as SupportedArea) ||
        expect(`SupportedArea => ${v} has a circle reference in reliantAreas`).toBe(
          'No issues in SupportedAreasStateMap',
        ),
    );
    expect(list.length > 0).toBe(true);
  });

  it('should keep the graduated disableKueue flag out of the dev-temporary list', () => {
    // Graduated to a production flag: Kueue is enabled unless an admin opts out.
    expect(devTemporaryFeatureFlags).not.toHaveProperty('disableKueue');
    expect(advancedAIMLFlags.disableKueue).toBe(false);
  });

  it('should still require the Kueue DSC component for the KUEUE area', () => {
    expect(SupportedAreasStateMap[SupportedArea.KUEUE]).toEqual({
      featureFlags: ['disableKueue'],
      requiredComponents: [DataScienceStackComponent.KUEUE],
    });
  });

  it('should define AutoML and AutoRAG area availability requirements', () => {
    expect(SupportedAreasStateMap[SupportedArea.PLUGIN_AUTOML]).toEqual({
      featureFlags: ['automl', 'disablePipelines'],
      requiredComponents: [DataScienceStackComponent.DS_PIPELINES],
    });
    expect(SupportedAreasStateMap[SupportedArea.PLUGIN_AUTORAG]).toEqual({
      featureFlags: ['autorag', 'disablePipelines'],
      requiredComponents: [DataScienceStackComponent.DS_PIPELINES],
      reliantAreas: [SupportedArea.PLUGIN_GEN_AI],
    });
  });
});
