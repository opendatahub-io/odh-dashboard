import '@testing-library/jest-dom';
import * as React from 'react';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  AgentsCatalogContextProvider,
  AgentsCatalogContext,
} from '~/app/context/agentsCatalog/AgentsCatalogContext';

jest.mock('mod-arch-core', () => ({
  useQueryParamNamespaces: jest.fn(() => ({})),
  asEnumMember: jest.fn((val: unknown) => val),
  DeploymentMode: {},
}));

jest.mock('~/app/utilities/const', () => ({
  BFF_API_VERSION: 'v1',
  URL_PREFIX: '/model-registry',
}));

jest.mock('~/app/hooks/modelCatalog/useModelCatalogAPIState', () => ({
  __esModule: true,
  default: jest.fn(() => [
    {
      apiAvailable: false,
      api: {
        getAgentList: jest.fn(),
        getAgentFilterOptionList: jest.fn(),
      },
    },
  ]),
}));

jest.mock('~/app/hooks/modelCatalog/useCatalogSources', () => ({
  useCatalogSources: jest.fn(() => [
    { items: [], size: 0, pageSize: 0, nextPageToken: '' },
    true,
    undefined,
    jest.fn(),
  ]),
}));

jest.mock('~/app/hooks/modelCatalog/useCatalogLabels', () => ({
  useCatalogLabels: jest.fn(() => [null, true, undefined]),
}));

jest.mock('~/app/hooks/agentsCatalog/useAgentFilterOptionList', () => ({
  useAgentFilterOptionListWithAPI: jest.fn(() => [null, true, undefined]),
}));

describe('AgentsCatalogContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <AgentsCatalogContextProvider>{children}</AgentsCatalogContextProvider>
    </MemoryRouter>
  );

  it('provides default filter state', () => {
    const { result } = renderHook(() => React.useContext(AgentsCatalogContext), { wrapper });
    expect(result.current.filters).toEqual({});
    expect(result.current.searchQuery).toBe('');
    expect(result.current.namedQuery).toBeNull();
    expect(result.current.selectedSourceLabel).toBeUndefined();
    expect(result.current.pagination).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 0,
    });
  });

  it('updates searchQuery via setSearchQuery', () => {
    const { result } = renderHook(() => React.useContext(AgentsCatalogContext), { wrapper });
    act(() => {
      result.current.setSearchQuery('langgraph');
    });
    expect(result.current.searchQuery).toBe('langgraph');
  });

  it('updates namedQuery via setNamedQuery', () => {
    const { result } = renderHook(() => React.useContext(AgentsCatalogContext), { wrapper });
    act(() => {
      result.current.setNamedQuery('named');
    });
    expect(result.current.namedQuery).toBe('named');
    act(() => {
      result.current.setNamedQuery(null);
    });
    expect(result.current.namedQuery).toBeNull();
  });

  it('updates filters via setFilters', () => {
    const { result } = renderHook(() => React.useContext(AgentsCatalogContext), { wrapper });
    act(() => {
      result.current.setFilters({ framework: ['LangGraph'] });
    });
    expect(result.current.filters).toEqual({ framework: ['LangGraph'] });
    act(() => {
      result.current.setFilters((prev) => ({ ...prev, labels: ['research'] }));
    });
    expect(result.current.filters).toEqual({ framework: ['LangGraph'], labels: ['research'] });
  });

  it('updates pagination via setPage, setPageSize, setTotalItems', () => {
    const { result } = renderHook(() => React.useContext(AgentsCatalogContext), { wrapper });
    act(() => {
      result.current.setPage(2);
    });
    expect(result.current.pagination.page).toBe(2);
    act(() => {
      result.current.setPageSize(20);
    });
    expect(result.current.pagination.pageSize).toBe(20);
    expect(result.current.pagination.page).toBe(1);
    act(() => {
      result.current.setTotalItems(50);
    });
    expect(result.current.pagination.totalItems).toBe(50);
  });

  it('updates selectedSourceLabel via setSelectedSourceLabel', () => {
    const { result } = renderHook(() => React.useContext(AgentsCatalogContext), { wrapper });
    act(() => {
      result.current.setSelectedSourceLabel('sample');
    });
    expect(result.current.selectedSourceLabel).toBe('sample');
    act(() => {
      result.current.setSelectedSourceLabel(undefined);
    });
    expect(result.current.selectedSourceLabel).toBeUndefined();
  });

  it('clearAllFilters resets searchQuery, filters, and namedQuery but not selectedSourceLabel', () => {
    const { result } = renderHook(() => React.useContext(AgentsCatalogContext), { wrapper });
    act(() => {
      result.current.setSearchQuery('q');
      result.current.setFilters({ framework: ['CrewAI'] });
      result.current.setSelectedSourceLabel('sample');
      result.current.setNamedQuery('named');
    });
    expect(result.current.searchQuery).toBe('q');
    expect(result.current.filters).toEqual({ framework: ['CrewAI'] });
    expect(result.current.selectedSourceLabel).toBe('sample');
    expect(result.current.namedQuery).toBe('named');
    act(() => {
      result.current.clearAllFilters();
    });
    expect(result.current.searchQuery).toBe('');
    expect(result.current.filters).toEqual({});
    expect(result.current.selectedSourceLabel).toBe('sample');
    expect(result.current.namedQuery).toBeNull();
  });
});
