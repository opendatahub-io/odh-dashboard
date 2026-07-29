import {
  buildAgentDetailsNavigationState,
  countActiveAgentFilters,
  getAgentFilterDisplayValue,
  getToggledFilterValue,
  isAgentCatalogDetailsNavigationState,
} from '~/app/pages/agentsCatalog/tracking';

describe('agentsCatalog tracking helpers', () => {
  describe('countActiveAgentFilters', () => {
    it('counts selected values across filter groups', () => {
      expect(countActiveAgentFilters({})).toBe(0);
      expect(countActiveAgentFilters({ framework: ['langgraph', 'crewai'] })).toBe(2);
      expect(countActiveAgentFilters({ framework: [] })).toBe(0);
    });
  });

  describe('getAgentFilterDisplayValue', () => {
    it('maps known framework values to display labels', () => {
      expect(getAgentFilterDisplayValue('framework', 'langgraph')).toBe('LangGraph');
      expect(getAgentFilterDisplayValue('framework', 'unknown-framework')).toBe(
        'unknown-framework',
      );
    });
  });

  describe('getToggledFilterValue', () => {
    it('returns the added value when checking a filter', () => {
      expect(getToggledFilterValue(['langgraph'], ['langgraph', 'crewai'])).toBe('crewai');
    });

    it('returns the removed value when unchecking a filter', () => {
      expect(getToggledFilterValue(['langgraph', 'crewai'], ['langgraph'])).toBe('crewai');
    });

    it('returns undefined when nothing changed', () => {
      expect(getToggledFilterValue(['langgraph'], ['langgraph'])).toBeUndefined();
    });
  });

  describe('buildAgentDetailsNavigationState', () => {
    it('builds catalog_card navigation state for details tracking', () => {
      expect(buildAgentDetailsNavigationState(2, { framework: ['langgraph'] }, 'rag', 12)).toEqual({
        entrySource: 'catalog_card',
        positionIndex: 2,
        hasActiveFilters: true,
        countActiveFilters: 1,
        hasSearchQuery: true,
        resultCount: 12,
      });
    });
  });

  describe('isAgentCatalogDetailsNavigationState', () => {
    it('validates known entry sources', () => {
      expect(isAgentCatalogDetailsNavigationState({ entrySource: 'catalog_card' })).toBe(true);
      expect(isAgentCatalogDetailsNavigationState({ entrySource: 'direct_url' })).toBe(true);
      expect(isAgentCatalogDetailsNavigationState({ entrySource: 'other' })).toBe(false);
      expect(isAgentCatalogDetailsNavigationState(null)).toBe(false);
    });
  });
});
