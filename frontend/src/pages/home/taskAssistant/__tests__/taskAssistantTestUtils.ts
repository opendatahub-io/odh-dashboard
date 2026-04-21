import type { ComponentType } from 'react';
import type { LoadedExtension, ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import type {
  TaskGroupExtension,
  TaskItemExtension,
  TaskItemDestination,
} from '@odh-dashboard/plugin-core/extension-points';

export const makeGroupExtension = (
  id: string,
  order: string,
  overrides?: Partial<{
    type: string;
    icon: { default: ComponentType };
  }>,
): LoadedExtension<ResolvedExtension<TaskGroupExtension>> =>
  ({
    type: 'app.task/group',
    uid: `group-${id}`,
    pluginName: 'test',
    properties: {
      id,
      title: `${id} title`,
      description: `${id} description`,
      label: `${id} label`,
      icon: overrides?.icon ?? { default: () => null },
      type: overrides?.type ?? 'serving',
      order,
    },
  } as unknown as LoadedExtension<ResolvedExtension<TaskGroupExtension>>);

export const makeItemExtension = (
  id: string,
  group: string,
  order: string,
  destination: TaskItemDestination = { href: `/${id}` },
): LoadedExtension<ResolvedExtension<TaskItemExtension>> =>
  ({
    type: 'app.task/item',
    uid: `item-${id}`,
    pluginName: 'test',
    properties: {
      id,
      group,
      title: `${id} title`,
      destination,
      order,
    },
  } as unknown as LoadedExtension<ResolvedExtension<TaskItemExtension>>);
