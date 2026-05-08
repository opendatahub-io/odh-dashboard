import { useExtensions, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import useTaskAssistantData from '#~/pages/home/taskAssistant/useTaskAssistantData';
import { makeGroupExtension, makeItemExtension } from './taskAssistantTestUtils';

jest.mock('@odh-dashboard/plugin-core', () => ({
  useResolvedExtensions: jest.fn(),
  useExtensions: jest.fn(),
}));

const mockUseResolvedExtensions = jest.mocked(useResolvedExtensions);
const mockUseExtensions = jest.mocked(useExtensions);

const makeTabRoutePage = (id: string, href: string) => ({
  type: 'app.tab-route/page',
  uid: `page-${id}`,
  pluginName: 'test',
  properties: { id, href, title: id, path: `${href}/*` },
});

const makeTabRouteTab = (pageId: string, id: string) => ({
  type: 'app.tab-route/tab',
  uid: `tab-${id}`,
  pluginName: 'test',
  properties: { pageId, id, title: id },
});

describe('useTaskAssistantData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExtensions.mockReturnValue([]);
  });

  it('should return resolved false when groups are not resolved', () => {
    mockUseResolvedExtensions
      .mockReturnValueOnce([[], false, []])
      .mockReturnValueOnce([[], true, []]);

    const renderResult = testHook(useTaskAssistantData)();

    expect(renderResult.result.current.resolved).toBe(false);
    expect(renderResult.result.current.groups).toHaveLength(0);
  });

  it('should return resolved false when items are not resolved', () => {
    mockUseResolvedExtensions
      .mockReturnValueOnce([[], true, []])
      .mockReturnValueOnce([[], false, []]);

    const renderResult = testHook(useTaskAssistantData)();

    expect(renderResult.result.current.resolved).toBe(false);
  });

  it('should return resolved true when both are resolved', () => {
    mockUseResolvedExtensions.mockReturnValue([[], true, []]);

    const renderResult = testHook(useTaskAssistantData)();

    expect(renderResult.result.current.resolved).toBe(true);
  });

  it('should filter out groups with no tasks', () => {
    mockUseResolvedExtensions
      .mockReturnValueOnce([
        [makeGroupExtension('g1', '1'), makeGroupExtension('g2', '2')],
        true,
        [],
      ])
      .mockReturnValueOnce([[makeItemExtension('t1', 'g1', '1')], true, []]);

    const renderResult = testHook(useTaskAssistantData)();

    expect(renderResult.result.current.groups).toHaveLength(1);
    expect(renderResult.result.current.groups[0].properties.id).toBe('g1');
  });

  it('should sort groups by order', () => {
    mockUseResolvedExtensions
      .mockReturnValueOnce([
        [makeGroupExtension('g1', '2_second'), makeGroupExtension('g2', '1_first')],
        true,
        [],
      ])
      .mockReturnValueOnce([
        [makeItemExtension('t1', 'g1', '1'), makeItemExtension('t2', 'g2', '1')],
        true,
        [],
      ]);

    const renderResult = testHook(useTaskAssistantData)();

    expect(renderResult.result.current.groups[0].properties.id).toBe('g2');
    expect(renderResult.result.current.groups[1].properties.id).toBe('g1');
  });

  it('should sort tasks within a group by order', () => {
    mockUseResolvedExtensions
      .mockReturnValueOnce([[makeGroupExtension('g1', '1')], true, []])
      .mockReturnValueOnce([
        [makeItemExtension('t2', 'g1', '2_second'), makeItemExtension('t1', 'g1', '1_first')],
        true,
        [],
      ]);

    const renderResult = testHook(useTaskAssistantData)();

    const tasks = renderResult.result.current.groupedTasks.g1 ?? [];
    expect(tasks[0]?.properties.id).toBe('t1');
    expect(tasks[1]?.properties.id).toBe('t2');
  });

  it('should group tasks by their group id', () => {
    mockUseResolvedExtensions
      .mockReturnValueOnce([
        [makeGroupExtension('g1', '1'), makeGroupExtension('g2', '2')],
        true,
        [],
      ])
      .mockReturnValueOnce([
        [
          makeItemExtension('t1', 'g1', '1'),
          makeItemExtension('t2', 'g2', '1'),
          makeItemExtension('t3', 'g1', '2'),
        ],
        true,
        [],
      ]);

    const renderResult = testHook(useTaskAssistantData)();

    expect(renderResult.result.current.groupedTasks.g1).toHaveLength(2);
    expect(renderResult.result.current.groupedTasks.g2).toHaveLength(1);
  });

  it('should return empty groups when no extensions exist', () => {
    mockUseResolvedExtensions.mockReturnValue([[], true, []]);

    const renderResult = testHook(useTaskAssistantData)();

    expect(renderResult.result.current.groups).toHaveLength(0);
    expect(renderResult.result.current.groupedTasks).toEqual({});
  });

  describe('tab route page validation', () => {
    it('should hide tasks with tabRoutePageId when the page has no tabs', () => {
      mockUseExtensions
        .mockReturnValueOnce([makeTabRoutePage('models-page', '/models')])
        .mockReturnValueOnce([]);

      mockUseResolvedExtensions
        .mockReturnValueOnce([[makeGroupExtension('g1', '1')], true, []])
        .mockReturnValueOnce([
          [makeItemExtension('t1', 'g1', '1', { tabRoutePageId: 'models-page' })],
          true,
          [],
        ]);

      const renderResult = testHook(useTaskAssistantData)();

      expect(renderResult.result.current.groups).toHaveLength(0);
    });

    it('should show tasks with tabRoutePageId when the page has tabs', () => {
      mockUseExtensions
        .mockReturnValueOnce([makeTabRoutePage('models-page', '/models')])
        .mockReturnValueOnce([makeTabRouteTab('models-page', 'catalog')]);

      mockUseResolvedExtensions
        .mockReturnValueOnce([[makeGroupExtension('g1', '1')], true, []])
        .mockReturnValueOnce([
          [makeItemExtension('t1', 'g1', '1', { tabRoutePageId: 'models-page' })],
          true,
          [],
        ]);

      const renderResult = testHook(useTaskAssistantData)();

      expect(renderResult.result.current.groups).toHaveLength(1);
      expect(renderResult.result.current.groupedTasks.g1?.[0].properties.href).toBe('/models');
    });

    it('should resolve href from tab-route page when task only has tabRoutePageId', () => {
      mockUseExtensions
        .mockReturnValueOnce([makeTabRoutePage('mcp-page', '/mcp-servers')])
        .mockReturnValueOnce([makeTabRouteTab('mcp-page', 'catalog')]);

      mockUseResolvedExtensions
        .mockReturnValueOnce([[makeGroupExtension('g1', '1')], true, []])
        .mockReturnValueOnce([
          [makeItemExtension('t1', 'g1', '1', { tabRoutePageId: 'mcp-page' })],
          true,
          [],
        ]);

      const renderResult = testHook(useTaskAssistantData)();

      expect(renderResult.result.current.groupedTasks.g1?.[0].properties.href).toBe('/mcp-servers');
    });

    it('should keep tasks with direct href regardless of tab routes', () => {
      mockUseExtensions.mockReturnValue([]);

      mockUseResolvedExtensions
        .mockReturnValueOnce([[makeGroupExtension('g1', '1')], true, []])
        .mockReturnValueOnce([
          [makeItemExtension('t1', 'g1', '1', { href: '/projects' })],
          true,
          [],
        ]);

      const renderResult = testHook(useTaskAssistantData)();

      expect(renderResult.result.current.groups).toHaveLength(1);
      expect(renderResult.result.current.groupedTasks.g1?.[0].properties.href).toBe('/projects');
    });
  });
});
