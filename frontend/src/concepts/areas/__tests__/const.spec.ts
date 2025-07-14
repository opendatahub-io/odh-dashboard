import { SupportedAreasStateMap } from '#~/concepts/areas/const';
import { SupportedArea } from '#~/concepts/areas';
import { SupportedAreaType } from '#~/concepts/areas/types';

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
});
