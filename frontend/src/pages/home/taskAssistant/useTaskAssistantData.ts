import React from 'react';
import {
  isTaskGroupExtension,
  isTaskItemExtension,
  isTabRoutePageExtension,
  isTabRouteTabExtension,
  TaskGroupExtension,
  TaskItemExtension,
  TabRoutePageExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { useExtensions, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { ResolvedTaskGroupExtension, ResolvedTaskItemExtension } from './types';

const useTaskAssistantData = (): {
  groups: ResolvedTaskGroupExtension[];
  groupedTasks: { [groupId: string]: ResolvedTaskItemExtension[] | undefined };
  resolved: boolean;
} => {
  const [groupExtensions, groupsResolved] =
    useResolvedExtensions<TaskGroupExtension>(isTaskGroupExtension);
  const [itemExtensions, itemsResolved] =
    useResolvedExtensions<TaskItemExtension>(isTaskItemExtension);
  const tabRoutePages = useExtensions<TabRoutePageExtension>(isTabRoutePageExtension);
  const tabRouteTabs = useExtensions<TabRouteTabExtension>(isTabRouteTabExtension);

  const pageIdsWithTabs = React.useMemo(
    () => new Set(tabRouteTabs.map((t) => t.properties.pageId)),
    [tabRouteTabs],
  );

  const pageHrefById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const page of tabRoutePages) {
      m.set(page.properties.id, page.properties.href);
    }
    return m;
  }, [tabRoutePages]);

  const { groups, groupedTasks } = React.useMemo(() => {
    if (!groupsResolved || !itemsResolved) {
      const emptyTasks: Record<string, ResolvedTaskItemExtension[]> = {};
      return { groups: [], groupedTasks: emptyTasks };
    }

    const visibleItems = itemExtensions.flatMap((item) => {
      const { destination } = item.properties;
      const href = destination.tabRoutePageId
        ? pageIdsWithTabs.has(destination.tabRoutePageId)
          ? pageHrefById.get(destination.tabRoutePageId)
          : undefined
        : destination.href;
      if (!href) {
        return [];
      }
      return { ...item, properties: { ...item.properties, href } };
    });

    const tasksByGroup: { [groupId: string]: ResolvedTaskItemExtension[] | undefined } = {};
    for (const item of visibleItems) {
      const groupId = item.properties.group;
      if (!tasksByGroup[groupId]) {
        tasksByGroup[groupId] = [];
      }
      tasksByGroup[groupId].push(item);
    }

    for (const groupId of Object.keys(tasksByGroup)) {
      const tasks = tasksByGroup[groupId];
      if (tasks) {
        tasksByGroup[groupId] = tasks.toSorted((a, b) =>
          a.properties.order.localeCompare(b.properties.order),
        );
      }
    }

    const visibleGroups = groupExtensions
      .filter((g) => (tasksByGroup[g.properties.id]?.length ?? 0) > 0)
      .toSorted((a, b) => a.properties.order.localeCompare(b.properties.order));

    return { groups: visibleGroups, groupedTasks: tasksByGroup };
  }, [
    groupExtensions,
    groupsResolved,
    itemExtensions,
    itemsResolved,
    pageIdsWithTabs,
    pageHrefById,
  ]);

  return { groups, groupedTasks, resolved: groupsResolved && itemsResolved };
};

export default useTaskAssistantData;
