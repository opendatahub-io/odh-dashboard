import { ModelOverviewItem } from '~/app/types/subscriptions';
import {
  initialOverviewFilterData,
  OverviewFilterOptions,
} from '~/app/pages/maas-governance/overview/const';
import { filterOverviewModels } from '~/app/pages/maas-governance/overview/utils';

describe('filterOverviewModels', () => {
  const modelRow = (id: string, displayName: string): ModelOverviewItem => ({
    id,
    namespace: 'maas-models',
    modelDetails: { displayName } as ModelOverviewItem['modelDetails'],
    subscriptions: [],
    authPolicies: [],
  });

  const modelRows = [modelRow('granite-3-8b-instruct', 'Granite 3 8B')];

  it('should match an exact model selection only against the resource id', () => {
    const filtered = filterOverviewModels(modelRows, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.modelName]: { label: 'Granite 3 8B', value: 'granite-3-8b-instruct' },
    });
    expect(filtered.map((r) => r.id)).toEqual(['granite-3-8b-instruct']);

    const byDisplayName = filterOverviewModels(modelRows, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.modelName]: { label: 'Granite 3 8B', value: 'Granite 3 8B' },
    });
    expect(byDisplayName).toEqual([]);
  });

  it('should match a model name fragment against the display name', () => {
    const filtered = filterOverviewModels(modelRows, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.modelName]: 'granite 3',
    });
    expect(filtered.map((r) => r.id)).toEqual(['granite-3-8b-instruct']);
  });

  it('should match a model name fragment against the description', () => {
    const rows: ModelOverviewItem[] = [
      {
        id: 'granite-3-8b-instruct',
        namespace: 'maas-models',
        modelDetails: {
          displayName: 'Granite 3 8B',
          description: 'A compact instruct model',
        } as ModelOverviewItem['modelDetails'],
        subscriptions: [],
        authPolicies: [],
      },
    ];

    const filtered = filterOverviewModels(rows, {
      ...initialOverviewFilterData,
      [OverviewFilterOptions.modelName]: 'compact instruct',
    });
    expect(filtered.map((r) => r.id)).toEqual(['granite-3-8b-instruct']);
  });
});
