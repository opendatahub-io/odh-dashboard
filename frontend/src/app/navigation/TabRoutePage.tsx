import * as React from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Content, PageSection, Spinner, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import type { LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import {
  isTabRouteTabExtension,
  TabRoutePageExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import {
  LazyCodeRefComponent,
  TabRoutePageContext,
  useExtensions,
} from '@odh-dashboard/plugin-core';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import NotFound from '#~/pages/NotFound';

type TabRoutePageProps = {
  extension: LoadedExtension<TabRoutePageExtension>;
};

const tabSortComparator = (
  a: LoadedExtension<TabRouteTabExtension>,
  b: LoadedExtension<TabRouteTabExtension>,
): number => {
  const DEFAULT_GROUP = '5_default';
  return (a.properties.group || DEFAULT_GROUP).localeCompare(b.properties.group || DEFAULT_GROUP);
};

const SESSION_STORAGE_PREFIX = 'tab-route-last-tab:';

const getPersistedTab = (pageId: string): string | null => {
  try {
    return sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${pageId}`);
  } catch {
    return null;
  }
};

const persistTab = (pageId: string, tabId: string): void => {
  try {
    sessionStorage.setItem(`${SESSION_STORAGE_PREFIX}${pageId}`, tabId);
  } catch {
    // sessionStorage may be unavailable
  }
};

/**
 * Resolves the default tab for a page when no tab segment is in the URL.
 * Uses the persisted tab if it exists and is valid, otherwise falls back to the first tab.
 */
const getDefaultTab = (
  pageId: string,
  tabExtensions: LoadedExtension<TabRouteTabExtension>[],
): string => {
  const persisted = getPersistedTab(pageId);
  if (persisted && tabExtensions.some((t) => t.properties.id === persisted)) {
    return persisted;
  }
  return tabExtensions[0].properties.id;
};

const tabRoutePageContextValue: { isInsideTabPage: boolean } = { isInsideTabPage: true };

const isProjectObjectType = (value: string): value is ProjectObjectType =>
  Object.values<string>(ProjectObjectType).includes(value);

const TabRoutePage: React.FC<TabRoutePageProps> = ({ extension }) => {
  const pageId = extension.properties.id;
  const { objectType: objectTypeStr } = extension.properties;
  const objectType =
    objectTypeStr && isProjectObjectType(objectTypeStr) ? objectTypeStr : undefined;
  const allTabExtensions = useExtensions<TabRouteTabExtension>(isTabRouteTabExtension);
  const navigate = useNavigate();
  const location = useLocation();

  const tabExtensions = React.useMemo(
    () =>
      allTabExtensions
        .filter((tab) => tab.properties.pageId === pageId)
        .toSorted(tabSortComparator),
    [allTabExtensions, pageId],
  );

  // Persist the active tab whenever the URL changes
  React.useEffect(() => {
    const basePath = extension.properties.href;
    const relativePath = location.pathname.startsWith(basePath)
      ? location.pathname.slice(basePath.length).replace(/^\//, '')
      : '';
    const activeSegment = relativePath.split('/')[0];
    if (activeSegment && tabExtensions.some((t) => t.properties.id === activeSegment)) {
      persistTab(pageId, activeSegment);
    }
  }, [location.pathname, extension.properties.href, pageId, tabExtensions]);

  if (tabExtensions.length === 0) {
    return <NotFound />;
  }

  const pageTitle = (
    <PageSection hasBodyWrapper={false}>
      <Content component="h1" data-testid="app-page-title">
        {objectType ? (
          <TitleWithIcon title={extension.properties.title} objectType={objectType} />
        ) : (
          extension.properties.title
        )}
      </Content>
    </PageSection>
  );

  const tabContentFallback = (
    <PageSection>
      <Spinner />
    </PageSection>
  );

  // Single tab: render content directly without tab bar
  if (tabExtensions.length === 1) {
    const singleTab = tabExtensions[0];
    return (
      <Routes>
        <Route
          path={`${singleTab.properties.id}/*`}
          element={
            <>
              {pageTitle}
              <TabRoutePageContext.Provider value={tabRoutePageContextValue}>
                <LazyCodeRefComponent
                  component={singleTab.properties.component}
                  fallback={tabContentFallback}
                />
              </TabRoutePageContext.Provider>
            </>
          }
        />
        <Route path="*" element={<Navigate to={singleTab.properties.id} replace />} />
      </Routes>
    );
  }

  // Multiple tabs: render tab bar with URL-driven selection
  const defaultTab = getDefaultTab(pageId, tabExtensions);
  return (
    <Routes>
      {tabExtensions.map((tab) => (
        <Route
          key={tab.properties.id}
          path={`${tab.properties.id}/*`}
          element={
            <>
              {pageTitle}
              <PageSection type="tabs">
                <Tabs
                  activeKey={tab.properties.id}
                  onSelect={(_event, tabKey) => {
                    navigate(`${extension.properties.href}/${String(tabKey)}`);
                  }}
                >
                  {tabExtensions.map((t) => (
                    <Tab
                      key={t.properties.id}
                      eventKey={t.properties.id}
                      title={<TabTitleText>{t.properties.title}</TabTitleText>}
                    />
                  ))}
                </Tabs>
              </PageSection>
              <TabRoutePageContext.Provider value={tabRoutePageContextValue}>
                <LazyCodeRefComponent
                  component={tab.properties.component}
                  fallback={tabContentFallback}
                />
              </TabRoutePageContext.Provider>
            </>
          }
        />
      ))}
      <Route path="*" element={<Navigate to={defaultTab} replace />} />
    </Routes>
  );
};

export default TabRoutePage;
