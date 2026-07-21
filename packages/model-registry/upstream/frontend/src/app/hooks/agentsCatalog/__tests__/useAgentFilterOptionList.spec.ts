import { mapBackendFilterOptions } from '~/app/hooks/agentsCatalog/useAgentFilterOptionList';
import type { CatalogFilterOptionsList } from '~/app/modelCatalogTypes';

describe('mapBackendFilterOptions', () => {
  it('passes through valid agent filter keys unchanged', () => {
    const raw = {
      filters: {
        framework: { type: 'string', values: ['langgraph', 'crewai'] },
      },
    } as unknown as CatalogFilterOptionsList;

    const result = mapBackendFilterOptions(raw);
    expect(result.filters).toEqual({
      framework: { type: 'string', values: ['langgraph', 'crewai'] },
    });
  });

  it('drops unknown keys that are not valid agent filter categories', () => {
    const raw = {
      filters: {
        framework: { type: 'string', values: ['langgraph'] },
        unknownKey: { type: 'string', values: ['val'] },
        anotherBad: { type: 'string', values: [] },
      },
    } as unknown as CatalogFilterOptionsList;

    const result = mapBackendFilterOptions(raw);
    expect(result.filters).toEqual({
      framework: { type: 'string', values: ['langgraph'] },
    });
    expect(result.filters).not.toHaveProperty('unknownKey');
    expect(result.filters).not.toHaveProperty('anotherBad');
  });

  it('drops filter options whose type is not "string"', () => {
    const raw = {
      filters: {
        framework: { type: 'number', values: [1, 2] },
      },
    } as unknown as CatalogFilterOptionsList;

    const result = mapBackendFilterOptions(raw);
    expect(result.filters).toEqual({});
  });

  it('returns { filters: undefined } when input filters is nullish', () => {
    expect(mapBackendFilterOptions({ filters: undefined })).toEqual({ filters: undefined });
    expect(mapBackendFilterOptions({} as CatalogFilterOptionsList)).toEqual({
      filters: undefined,
    });
  });
});
