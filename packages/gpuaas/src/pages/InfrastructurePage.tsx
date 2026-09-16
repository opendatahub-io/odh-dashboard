import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard page shell wrapper
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import {
  Button,
  Card,
  CardBody,
  Content,
  Flex,
  FlexItem,
  PageGroup,
  PageSection,
  Stack,
  StackItem,
  Tab,
  TabContent,
  Tabs,
  TabTitleIcon,
  TabTitleText,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { ClusterIcon, MicrochipIcon, SyncAltIcon } from '@patternfly/react-icons';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import {
  INFRASTRUCTURE_PAGE_DESCRIPTION,
  INFRASTRUCTURE_SECTIONS,
  INFRASTRUCTURE_TABS,
  type InfrastructureTabId,
} from '../const';
import InfrastructureKueueHelpLink from '../components/InfrastructureKueueHelpLink';
import { GPUAAS_EVENTS, type PageViewedProperties } from '../tracking/gpuaasTrackingConstants';
import ClusterSummaryCards from '../components/ClusterSummaryCards';
import HardwareUsageSection from '../components/HardwareUsageSection';
import BorrowingLendingSection from '../components/BorrowingLendingSection';
import QuotaUsageSection from '../components/QuotaUsageSection';
import useInfrastructureMetrics from '../hooks/useInfrastructureMetrics';
import useQuotaHierarchy from '../hooks/useQuotaHierarchy';
import './InfrastructurePage.scss';

type SectionId = (typeof INFRASTRUCTURE_SECTIONS)[number]['id'];
type InfrastructureSection = (typeof INFRASTRUCTURE_SECTIONS)[number];

const TAB_ICONS: Record<InfrastructureTabId, React.ComponentType> = {
  utilization: MicrochipIcon,
  'quota-usage': ClusterIcon,
};

const getTabPanelId = (tabId: InfrastructureTabId): string => `infrastructure-tab-panel-${tabId}`;

type SectionRenderOptions = {
  headerAction?: React.ReactNode;
  descriptionAddon?: React.ReactNode;
};

const renderSectionHeader = (
  { id, title, description }: InfrastructureSection,
  { headerAction, descriptionAddon }: SectionRenderOptions = {},
): React.ReactNode => (
  <>
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
      flexWrap={{ default: 'wrap' }}
      gap={{ default: 'gapMd' }}
    >
      <FlexItem>
        <Title headingLevel="h2" data-testid={`infrastructure-${id}-title`}>
          {title}
        </Title>
      </FlexItem>
      {headerAction && <FlexItem>{headerAction}</FlexItem>}
    </Flex>
    <Content component="p" data-testid={`infrastructure-${id}-description`}>
      {description}
      {descriptionAddon && <> {descriptionAddon}</>}
    </Content>
  </>
);

const renderInfrastructureSection = (
  infrastructureSection: InfrastructureSection,
  section: React.ReactNode,
  options: SectionRenderOptions = {},
): React.ReactNode => (
  <StackItem key={infrastructureSection.id}>
    <Stack hasGutter>
      <StackItem>{renderSectionHeader(infrastructureSection, options)}</StackItem>
      <StackItem>
        <Card
          isPlain={infrastructureSection.isPlain}
          data-testid={`infrastructure-${infrastructureSection.id}-section`}
        >
          {infrastructureSection.isPlain ? section : <CardBody>{section}</CardBody>}
        </Card>
      </StackItem>
    </Stack>
  </StackItem>
);

const InfrastructurePage: React.FC = () => {
  const metrics = useInfrastructureMetrics();
  const quotaHierarchy = useQuotaHierarchy();
  const { refresh: refreshQuotaHierarchy } = quotaHierarchy;
  const quotaWorkloadRefreshRef = React.useRef<(() => Promise<unknown>) | undefined>(undefined);
  const detailRefreshRef = React.useRef<() => Promise<unknown[]>>(() => Promise.resolve([]));
  const isKueueAvailable = useIsAreaAvailable(SupportedArea.KUEUE).status;
  const hasTrackedPageView = React.useRef(false);
  const [activeTabKey, setActiveTabKey] = React.useState<InfrastructureTabId>(
    INFRASTRUCTURE_TABS[0].id,
  );
  const utilizationContentRef = React.useRef<HTMLElement>(null);
  const quotaUsageContentRef = React.useRef<HTMLElement>(null);
  const tabContentRefs: Record<InfrastructureTabId, React.RefObject<HTMLElement>> = {
    utilization: utilizationContentRef,
    'quota-usage': quotaUsageContentRef,
  };

  React.useEffect(() => {
    if (metrics.loaded && !hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      const totalAccelerators = metrics.accelerators?.total;
      const acceleratorsInUse = metrics.accelerators?.inUse;
      const props: PageViewedProperties = {
        path: '/observe-and-monitor/infrastructure',
        sectionCount: INFRASTRUCTURE_SECTIONS.length,
        hasKueueEnabled: isKueueAvailable,
        totalAccelerators,
        acceleratorsInUse,
        totalUtilizationPct:
          totalAccelerators && totalAccelerators > 0
            ? Math.round(((acceleratorsInUse ?? 0) / totalAccelerators) * 100)
            : undefined,
        avgComputeUtilPct: metrics.computeUtilization?.percentage,
        avgMemoryUtilPct: metrics.memoryUtilization?.percentage,
      };
      fireMiscTrackingEvent(GPUAAS_EVENTS.PAGE_VIEWED, props);
    }
  }, [
    metrics.loaded,
    metrics.accelerators,
    metrics.computeUtilization,
    metrics.memoryUtilization,
    isKueueAvailable,
  ]);

  const handleRefresh = React.useCallback(() => {
    const secondsSinceLastUpdate = metrics.lastRefreshed
      ? Math.round((Date.now() - metrics.lastRefreshed.getTime()) / 1000)
      : undefined;
    metrics.refresh();
    fireMiscTrackingEvent(GPUAAS_EVENTS.DATA_REFRESHED, { secondsSinceLastUpdate });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- .refresh is stable from useFetch
  }, [metrics.lastRefreshed, metrics.refresh]);

  const handleQuotaRefresh = React.useCallback(async () => {
    await refreshQuotaHierarchy();
    await detailRefreshRef.current();
    void quotaWorkloadRefreshRef.current?.();
    handleRefresh();
  }, [handleRefresh, refreshQuotaHierarchy]);

  const registerDetailRefresh = React.useCallback((refresh: () => Promise<unknown[]>) => {
    detailRefreshRef.current = refresh;
  }, []);

  const handleTabSelect = React.useCallback(
    (
      _event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
      eventKey: string | number,
    ) => {
      const tab = INFRASTRUCTURE_TABS.find((tabInfo) => tabInfo.id === eventKey);
      if (tab) {
        setActiveTabKey(tab.id);
      }
    },
    [],
  );

  const sectionComponents: Record<SectionId, React.ReactElement | null> = {
    cluster: <ClusterSummaryCards metrics={metrics} />,
    'hardware-usage': <HardwareUsageSection metrics={metrics} />,
    borrowing: <BorrowingLendingSection />,
    'quota-usage': (
      <QuotaUsageSection
        tree={quotaHierarchy.data.tree}
        loaded={quotaHierarchy.loaded}
        error={quotaHierarchy.error}
        onRegisterWorkloadRefresh={(refresh) => {
          quotaWorkloadRefreshRef.current = refresh;
        }}
        onRegisterDetailRefresh={registerDetailRefresh}
      />
    ),
  };

  const renderRefreshBadge = (
    onRefresh: () => void,
    testId = 'infrastructure-refresh-badge',
  ): React.ReactNode =>
    metrics.lastRefreshed ? (
      <Flex
        justifyContent={{ default: 'justifyContentFlexEnd' }}
        alignItems={{ default: 'alignItemsCenter' }}
        spaceItems={{ default: 'spaceItemsSm' }}
        data-testid={testId}
      >
        <FlexItem>
          <Tooltip content="Refresh">
            <Button variant="plain" aria-label="Refresh" onClick={onRefresh}>
              <SyncAltIcon />
            </Button>
          </Tooltip>
        </FlexItem>
        <FlexItem>
          <Content component="small" className="pf-v6-u-color-200">
            Updated {relativeTime(Date.now(), metrics.lastRefreshed.getTime())}
          </Content>
        </FlexItem>
      </Flex>
    ) : null;

  const getSectionRenderOptions = (section: InfrastructureSection): SectionRenderOptions => ({
    headerAction: section.refreshBadgeTestId
      ? renderRefreshBadge(
          section.id === 'quota-usage' ? handleQuotaRefresh : handleRefresh,
          section.refreshBadgeTestId,
        )
      : undefined,
    descriptionAddon: section.showKueueHelpLink ? <InfrastructureKueueHelpLink /> : undefined,
  });

  const renderQuotaUsageTab = (): React.ReactNode => {
    const section = INFRASTRUCTURE_SECTIONS.find((entry) => entry.id === 'quota-usage');
    if (!section) {
      return null;
    }

    const options = getSectionRenderOptions(section);

    return (
      <>
        <div className="gpuaas-quota-usage-tab__header">
          {renderSectionHeader(section, options)}
        </div>
        <Card
          isPlain={section.isPlain}
          data-testid="infrastructure-quota-usage-section"
          className="gpuaas-quota-usage-tab__body pf-v6-u-h-100 pf-v6-u-min-height-0"
        >
          {sectionComponents['quota-usage']}
        </Card>
      </>
    );
  };

  const renderTabPanel = (tabId: InfrastructureTabId): React.ReactNode => {
    const tabInfo = INFRASTRUCTURE_TABS.find((entry) => entry.id === tabId);
    if (tabInfo?.layout === 'viewport') {
      return renderQuotaUsageTab();
    }

    const tabSections = INFRASTRUCTURE_SECTIONS.filter((section) => section.tab === tabId);

    return (
      <Stack hasGutter>
        {tabSections.map((section) =>
          renderInfrastructureSection(
            section,
            sectionComponents[section.id],
            getSectionRenderOptions(section),
          ),
        )}
      </Stack>
    );
  };

  return (
    <ApplicationsPage loaded empty={false} noHeader provideChildrenPadding={false}>
      <PageGroup isFilled={false} stickyOnBreakpoint={{ default: 'top' }}>
        <PageSection hasBodyWrapper={false} id="infrastructure-hub-header" className="pf-v6-u-pb-0">
          <Stack hasGutter>
            <StackItem>
              <Content component="h1" data-testid="app-page-title">
                Infrastructure
              </Content>
              <Content component="p" data-testid="app-page-description">
                {INFRASTRUCTURE_PAGE_DESCRIPTION}
              </Content>
            </StackItem>
            <StackItem>
              <Tabs
                activeKey={activeTabKey}
                onSelect={handleTabSelect}
                aria-label="Infrastructure page tabs"
                data-testid="infrastructure-tabs"
              >
                {INFRASTRUCTURE_TABS.map((tabInfo) => {
                  const TabIcon = TAB_ICONS[tabInfo.id];
                  return (
                    <Tab
                      key={tabInfo.id}
                      eventKey={tabInfo.id}
                      title={
                        <>
                          <TabTitleIcon>
                            <TabIcon />
                          </TabTitleIcon>
                          <TabTitleText>{tabInfo.title}</TabTitleText>
                        </>
                      }
                      tabContentId={getTabPanelId(tabInfo.id)}
                      tabContentRef={tabContentRefs[tabInfo.id]}
                      data-testid={`infrastructure-tab-${tabInfo.id}`}
                    />
                  );
                })}
              </Tabs>
            </StackItem>
          </Stack>
        </PageSection>
      </PageGroup>
      <PageSection
        isFilled
        hasBodyWrapper={false}
        className="pf-v6-u-pt-0"
        id="infrastructure-hub-content"
      >
        {INFRASTRUCTURE_TABS.map((tabInfo) => (
          <TabContent
            className={
              tabInfo.layout === 'viewport'
                ? 'pf-v6-u-px-lg gpuaas-infrastructure-tab--viewport'
                : 'pf-v6-u-px-lg'
            }
            key={tabInfo.id}
            id={getTabPanelId(tabInfo.id)}
            eventKey={tabInfo.id}
            ref={tabContentRefs[tabInfo.id]}
            hidden={activeTabKey !== tabInfo.id}
          >
            {activeTabKey === tabInfo.id ? renderTabPanel(tabInfo.id) : null}
          </TabContent>
        ))}
      </PageSection>
    </ApplicationsPage>
  );
};

export default InfrastructurePage;
