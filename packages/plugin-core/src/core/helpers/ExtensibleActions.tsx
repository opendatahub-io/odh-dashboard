import * as React from 'react';
import { DropdownItem } from '@patternfly/react-core';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import { LazyCodeRefComponent } from './LazyCodeRefComponent';
import type { ActionProperties } from '../../extension-points/actions';
import { sortExtensionsByGroup } from '../../extension-points/utils';

type ExtensibleActionsProps<TExtension extends Extension<string, ActionProperties>> = {
  /** Loaded action extensions (from `useExtensions`). */
  actions: LoadedExtension<TExtension>[];
  /** Extra props passed to each lazy-loaded action component. */
  componentProps?: Record<string, unknown>;
};

/**
 * Renders DropdownItems from action extensions, sorted by group.
 *
 * @example
 * ```tsx
 * <DropdownList>
 *   <ExtensibleActions actions={actionExtensions} componentProps={{ resourceId }} />
 * </DropdownList>
 * ```
 */
export const ExtensibleActions = <TExtension extends Extension<string, ActionProperties>>({
  actions,
  componentProps,
}: ExtensibleActionsProps<TExtension>): React.ReactElement => {
  const sorted = React.useMemo(() => sortExtensionsByGroup(actions), [actions]);

  return (
    <>
      {sorted.map((action) => (
        <DropdownItem key={action.properties.id} data-testid={`action-${action.properties.id}`}>
          <LazyCodeRefComponent component={action.properties.component} props={componentProps} />
        </DropdownItem>
      ))}
    </>
  );
};
