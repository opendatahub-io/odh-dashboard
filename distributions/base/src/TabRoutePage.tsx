import React from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Content, PageSection, Spinner, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import type { LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import {
  isTabRouteTabExtension,
  type TabRoutePageExtension,
  type TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import NotFound from './NotFound';
import { ErrorBoundary } from './ErrorBoundary';

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

type MultiTabContentProps = {
  pageTitle: React.ReactNode;
  tabExtensions: LoadedExtension<TabRouteTabExtension>[];
  extension: LoadedExtension<TabRoutePageExtension>;
  defaultTab: string;
  tabContentFallback: React.ReactNode;
};

const MultiTabContent: React.FC<MultiTabContentProps> = ({
  pageTitle,
  tabExtensions,
  extension,
  defaultTab,
  tabContentFallback,
}) => {
  const { tabId = '' } = useParams<{ tabId: string }>();
  const navigate = useNavigate();

  const activeTab = tabExtensions.find((t) => t.properties.id === tabId);

  if (!activeTab) {
    return <Navigate to={`../${defaultTab}`} replace />;
  }

  return (
    <>
      {pageTitle}
      <PageSection type="tabs">
        <Tabs
          activeKey={tabId}
          onSelect={(_event, tabKey) => {
            navigate(`${extension.properties.href}/${String(tabKey)}`);
          }}
        >
          {tabExtensions.map((t) => (
            <Tab
              key={t.properties.id}
              eventKey={t.properties.id}
              title={<TabTitleText>{t.properties.title}</TabTitleText>}
              tabContentId={`tab-content-${t.properties.id}`}
              data-testid={`tab-${t.properties.id}`}
            />
          ))}
        </Tabs>
      </PageSection>
      {tabExtensions.map((t) => (
        <div
          key={t.properties.id}
          id={`tab-content-${t.properties.id}`}
          role="tabpanel"
          hidden={t.properties.id !== activeTab.properties.id || undefined}
        >
          {t.properties.id === activeTab.properties.id && (
            <ErrorBoundary>
              <LazyCodeRefComponent
                component={t.properties.component}
                fallback={tabContentFallback}
              />
            </ErrorBoundary>
          )}
        </div>
      ))}
    </>
  );
};

const TabRoutePage: React.FC<TabRoutePageProps> = ({ extension }) => {
  const pageId = extension.properties.id;
  const allTabExtensions = useExtensions<TabRouteTabExtension>(isTabRouteTabExtension);
  const location = useLocation();

  const tabExtensions = React.useMemo(
    () =>
      allTabExtensions
        .filter((tab) => tab.properties.pageId === pageId)
        .toSorted(tabSortComparator),
    [allTabExtensions, pageId],
  );

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
      <Content component="h1" data-testid="app-tab-page-title">
        {extension.properties.title}
      </Content>
    </PageSection>
  );

  const tabContentFallback = (
    <PageSection>
      <Spinner />
    </PageSection>
  );

  const defaultTab = getDefaultTab(pageId, tabExtensions);

  if (tabExtensions.length === 1 && !extension.properties.alwaysShowTabBar) {
    const singleTab = tabExtensions[0];
    return (
      <Routes>
        <Route
          path={`${singleTab.properties.id}/*`}
          element={
            <>
              {pageTitle}
              <ErrorBoundary>
                <LazyCodeRefComponent
                  component={singleTab.properties.component}
                  fallback={tabContentFallback}
                />
              </ErrorBoundary>
            </>
          }
        />
        <Route
          path="*"
          element={
            <Navigate to={`${extension.properties.href}/${singleTab.properties.id}`} replace />
          }
        />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        path=":tabId/*"
        element={
          <MultiTabContent
            pageTitle={pageTitle}
            tabExtensions={tabExtensions}
            extension={extension}
            defaultTab={defaultTab}
            tabContentFallback={tabContentFallback}
          />
        }
      />
      <Route
        path="*"
        element={<Navigate to={`${extension.properties.href}/${defaultTab}`} replace />}
      />
    </Routes>
  );
};

export default TabRoutePage;
