import * as React from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Content, PageSection, Spinner, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import type { LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import {
  isTabRouteTabExtension,
  TabRoutePageExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
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

const isProjectObjectType = (value: string): value is ProjectObjectType =>
  Object.values<string>(ProjectObjectType).includes(value);

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
            <LazyCodeRefComponent
              component={t.properties.component}
              fallback={tabContentFallback}
            />
          )}
        </div>
      ))}
    </>
  );
};

const TabRoutePage: React.FC<TabRoutePageProps> = ({ extension }) => {
  const pageId = extension.properties.id;
  const { objectType: objectTypeStr } = extension.properties;
  const objectType =
    objectTypeStr && isProjectObjectType(objectTypeStr) ? objectTypeStr : undefined;
  const allTabExtensions = useExtensions<TabRouteTabExtension>(isTabRouteTabExtension);
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
      <Content component="h1" data-testid="app-tab-page-title">
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

  const defaultTab = getDefaultTab(pageId, tabExtensions);

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
              <LazyCodeRefComponent
                component={singleTab.properties.component}
                fallback={tabContentFallback}
              />
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

  // Multiple tabs: single parametric route with tab ID from URL
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
