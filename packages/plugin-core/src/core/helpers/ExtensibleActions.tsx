import * as React from 'react';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import { LazyCodeRefComponent } from './LazyCodeRefComponent';
import type { ActionProperties } from '../../extension-points/actions';
import { sortExtensionsByGroup } from '../../extension-points/utils';

type ExtensibleActionsProps<TExtension extends Extension<string, ActionProperties>> = {
  /** Loaded action extensions (from `useExtensions`). */
  actions: LoadedExtension<TExtension>[];
  /**
   * When set, only extensions whose `group` property matches this value are rendered.
   * Used with generic extension points (e.g. `'core.action'`) to show only
   * the actions targeting the current surface.
   */
  group?: string;
  /** Extra props passed to each lazy-loaded action component. */
  componentProps?: Record<string, unknown>;
};

/**
 * Renders action extension components, sorted by group.
 *
 * Each action component is fully self-contained: it decides its own
 * rendering style (button, dropdown item, etc.) and manages its own
 * state (e.g. modals). The host page controls layout by choosing where
 * to place `<ExtensibleActions />`.
 *
 * @example
 * ```tsx
 * <ExtensibleActions actions={actionExtensions} group="my-page.actions" componentProps={{ model }} />
 * ```
 */
export const ExtensibleActions = <TExtension extends Extension<string, ActionProperties>>({
  actions,
  group,
  componentProps,
}: ExtensibleActionsProps<TExtension>): React.ReactElement => {
  const sorted = React.useMemo(
    () =>
      sortExtensionsByGroup(group ? actions.filter((a) => a.properties.group === group) : actions),
    [actions, group],
  );

  return (
    <>
      {sorted.map((action) => (
        <LazyCodeRefComponent
          key={action.properties.id}
          component={action.properties.component}
          props={componentProps}
        />
      ))}
    </>
  );
};
