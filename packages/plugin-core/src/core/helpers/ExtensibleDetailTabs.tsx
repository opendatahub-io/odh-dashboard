import * as React from 'react';
import {
  Flex,
  FlexItem,
  Label,
  Tab,
  Tabs,
  TabTitleText,
  PageSection,
} from '@patternfly/react-core';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import { LazyCodeRefComponent } from './LazyCodeRefComponent';
import type { DetailTabProperties } from '../../extension-points/detail-tabs';
import { isValidExtensionId, sortExtensionsByGroup } from '../../extension-points/utils';

const DEFAULT_GROUP = '5_default';
const EMPTY_COMPONENT_PROPS: Record<string, unknown> = {};

/**
 * Evaluates `shouldShow` predicates for extension tabs, supporting both sync
 * and async (Promise) return values. Tabs default to hidden until an async
 * predicate resolves to `true`.
 */
const useShouldShowResults = <TExtension extends Extension<string, DetailTabProperties>>(
  extensions: LoadedExtension<TExtension>[],
  componentProps: Record<string, unknown>,
): Record<string, boolean> => {
  const [results, setResults] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    let cancelled = false;

    setResults((prev) => {
      const activeUids = new Set(extensions.map((ext) => ext.uid));
      const uidsToRemove = Object.keys(prev).filter((uid) => !activeUids.has(uid));
      const uidsToReset = extensions
        .filter((ext) => ext.properties.shouldShow && ext.uid in prev)
        .map((ext) => ext.uid);
      if (uidsToRemove.length === 0 && uidsToReset.length === 0) {
        return prev;
      }
      const next = { ...prev };
      uidsToRemove.forEach((uid) => delete next[uid]);
      uidsToReset.forEach((uid) => delete next[uid]);
      return next;
    });

    extensions.forEach((ext) => {
      const { shouldShow } = ext.properties;
      if (!shouldShow) {
        return;
      }

      const result = shouldShow(componentProps);
      if (typeof result === 'boolean') {
        if (!cancelled) {
          setResults((prev) => (prev[ext.uid] === result ? prev : { ...prev, [ext.uid]: result }));
        }
      } else {
        result.then(
          (visible) => {
            if (!cancelled) {
              setResults((prev) =>
                prev[ext.uid] === visible ? prev : { ...prev, [ext.uid]: visible },
              );
            }
          },
          () => {
            if (!cancelled) {
              setResults((prev) =>
                prev[ext.uid] === false ? prev : { ...prev, [ext.uid]: false },
              );
            }
          },
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [extensions, componentProps]);

  return results;
};

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
  /**
   * When set, only extensions whose `group` property matches this value are rendered.
   * Used with generic extension points (e.g. `'core.detail/tab'`) to show only
   * the tabs targeting the current page.
   */
  group?: string;
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
  /** Use PatternFly subtab styling for nested tab bars. */
  isSubtab?: boolean;
  /** Mount tab content when the tab is first selected. */
  mountOnEnter?: boolean;
  /** Unmount tab content when the tab is deselected. */
  unmountOnExit?: boolean;
  /** When false, tab panels do not expand to fill the page (reduces vertical gap). */
  tabContentIsFilled?: boolean;
};

const renderTabTitle = (title: string, label?: string): React.ReactNode => {
  if (label == null) {
    return title;
  }
  return (
    <Flex spaceItems={{ default: 'spaceItemsSm' }}>
      <FlexItem>{title}</FlexItem>
      <FlexItem>
        <Label isCompact color="yellow" variant="outline">
          {label}
        </Label>
      </FlexItem>
    </Flex>
  );
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
  group,
  componentProps,
  ariaLabel = 'Detail tabs',
  testId,
  filterExtension,
  isSubtab = false,
  mountOnEnter = false,
  unmountOnExit = false,
  tabContentIsFilled = true,
}: ExtensibleDetailTabsProps<TExtension>): React.ReactElement | null => {
  const shouldShowResults = useShouldShowResults(
    extensionTabs,
    componentProps ?? EMPTY_COMPONENT_PROPS,
  );

  const filteredExtensions = React.useMemo(
    () =>
      sortExtensionsByGroup(
        (filterExtension ? extensionTabs.filter(filterExtension) : extensionTabs)
          .filter((ext) => (group ? ext.properties.group === group : true))
          .filter((ext) => isValidExtensionId(ext.properties.id))
          .filter((ext) => {
            if (!ext.properties.shouldShow) {
              return true;
            }
            if (!(ext.uid in shouldShowResults)) {
              return ext.properties.id === activeKey;
            }
            return shouldShowResults[ext.uid];
          }),
        DEFAULT_GROUP,
      ),
    [extensionTabs, filterExtension, group, shouldShowResults, activeKey],
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

  const effectiveActiveKey =
    allTabs.length > 0 && !allTabs.some((tab) => tab.id === activeKey) ? allTabs[0].id : activeKey;

  React.useEffect(() => {
    if (effectiveActiveKey !== activeKey) {
      onSelect(effectiveActiveKey);
    }
  }, [effectiveActiveKey, activeKey, onSelect]);

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
      activeKey={effectiveActiveKey}
      aria-label={ariaLabel}
      role="region"
      data-testid={testId}
      isSubtab={isSubtab}
      mountOnEnter={mountOnEnter}
      unmountOnExit={unmountOnExit}
      onSelect={(_event, eventKey) => onSelect(String(eventKey))}
    >
      {allTabs.map((tab) => {
        const titleNode = (
          <TabTitleText>
            {tab.type === 'extension'
              ? renderTabTitle(tab.title, tab.label)
              : renderTabTitle(tab.title)}
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
            <PageSection
              hasBodyWrapper={false}
              isFilled={tabContentIsFilled}
              style={
                tabContentIsFilled
                  ? undefined
                  : {
                      paddingTop: 'var(--pf-t--global--spacer--md)',
                      paddingBottom: 0,
                    }
              }
              data-testid={`${tab.id}-tab-content`}
            >
              {content}
            </PageSection>
          </Tab>
        );
      })}
    </Tabs>
  );
};
