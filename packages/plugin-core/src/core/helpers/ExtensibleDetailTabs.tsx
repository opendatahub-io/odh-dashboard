import * as React from 'react';
import { Badge, Tab, Tabs, TabTitleText, PageSection } from '@patternfly/react-core';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import { LazyCodeRefComponent } from './LazyCodeRefComponent';
import type { DetailTabProperties } from '../../extension-points/detail-tabs';
import { isValidExtensionId, sortExtensionsByGroup } from '../../extension-points/utils';

const DEFAULT_GROUP = '5_default';

type StaticTab = {
  id: string;
  title: string;
  content: React.ReactNode;
};

type ExtensibleDetailTabsProps<TExtension extends Extension<string, DetailTabProperties>> = {
  /** The currently active tab key (typically from URL params). */
  activeKey: string;
  /** Callback fired when a tab is selected. Receives the new tab key. */
  onSelect: (tabKey: string) => void;
  /** Static (built-in) tabs rendered before extension tabs. */
  staticTabs?: StaticTab[];
  /** Loaded extension tabs (from `useExtensions`). */
  extensionTabs: LoadedExtension<TExtension>[];
  /** Extra props passed to each lazy-loaded extension component. */
  componentProps?: Record<string, unknown>;
  /** Accessible label for the Tabs component. */
  ariaLabel?: string;
  /** data-testid for the Tabs component. */
  testId?: string;
  /**
   * Optional callback to filter extensions (e.g. hide certain tabs in archive mode).
   * Return `true` to include the extension, `false` to exclude.
   */
  filterExtension?: (extension: LoadedExtension<TExtension>) => boolean;
};

/**
 * Renders PatternFly Tabs from a combination of static (built-in) tabs and
 * dynamic extension tabs.
 *
 * Features:
 * - Sorts extension tabs by `group` (lexicographic, defaulting to `'5_default'`)
 * - Supports `filterExtension` callback to hide tabs conditionally (e.g. archive mode)
 * - Single-tab mode: when only one tab exists (static + extension), renders its content
 *   directly without a tab bar
 * - Tab content for extensions is loaded lazily via `LazyCodeRefComponent`
 */
export const ExtensibleDetailTabs = <TExtension extends Extension<string, DetailTabProperties>>({
  activeKey,
  onSelect,
  staticTabs = [],
  extensionTabs,
  componentProps,
  ariaLabel = 'Detail tabs',
  testId,
  filterExtension,
}: ExtensibleDetailTabsProps<TExtension>): React.ReactElement | null => {
  const filteredExtensions = React.useMemo(
    () =>
      sortExtensionsByGroup(
        (filterExtension ? extensionTabs.filter(filterExtension) : extensionTabs).filter((ext) =>
          isValidExtensionId(ext.properties.id),
        ),
        DEFAULT_GROUP,
      ),
    [extensionTabs, filterExtension],
  );

  const allTabs = React.useMemo(
    () => [
      ...staticTabs.map((tab) => ({ type: 'static' as const, ...tab })),
      ...filteredExtensions.map((ext) => ({
        type: 'extension' as const,
        id: ext.properties.id,
        title: ext.properties.title,
        label: ext.properties.label,
        extension: ext,
      })),
    ],
    [staticTabs, filteredExtensions],
  );

  if (allTabs.length === 0) {
    return null;
  }

  if (allTabs.length === 1) {
    const singleTab = allTabs[0];
    if (singleTab.type === 'static') {
      return <>{singleTab.content}</>;
    }
    return (
      <LazyCodeRefComponent
        component={singleTab.extension.properties.component}
        props={componentProps}
      />
    );
  }

  return (
    <Tabs
      activeKey={activeKey}
      aria-label={ariaLabel}
      role="region"
      data-testid={testId}
      onSelect={(_event, eventKey) => onSelect(String(eventKey))}
    >
      {allTabs.map((tab) => {
        const titleNode = (
          <TabTitleText>
            {tab.title}
            {tab.type === 'extension' && tab.label != null && (
              <>
                {' '}
                <Badge isRead>{tab.label}</Badge>
              </>
            )}
          </TabTitleText>
        );
        const content =
          tab.type === 'static' ? (
            tab.content
          ) : (
            <LazyCodeRefComponent
              component={tab.extension.properties.component}
              props={componentProps}
            />
          );

        return (
          <Tab
            key={tab.id}
            eventKey={tab.id}
            title={titleNode}
            aria-label={`${tab.title} tab`}
            data-testid={`${tab.id}-tab`}
          >
            <PageSection hasBodyWrapper={false} isFilled data-testid={`${tab.id}-tab-content`}>
              {content}
            </PageSection>
          </Tab>
        );
      })}
    </Tabs>
  );
};
