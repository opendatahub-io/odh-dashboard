import React, { useRef, useState } from 'react';
import {
  Drawer,
  DrawerPanelContent,
  Button,
  DrawerContent,
  DrawerContentBody,
  Bullseye,
  Spinner,
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Gallery,
  Title,
  MenuToggle,
  Menu,
  MenuContent,
  MenuItem,
  Checkbox,
  Popper,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import ApplicationsPage from '#~/pages/ApplicationsPage.tsx';
import ExperimentRunsListView from '#~/pages/experiments/screens/Runs/ExperimentRunsListView';
import { RegistryExperimentRun } from '#~/concepts/modelRegistry/types';
import useAllRuns from '#~/concepts/modelRegistry/apiHooks/useAllRuns.ts';
import useExperimentRunsArtifacts from '#~/concepts/modelRegistry/apiHooks/useExperimentRunsArtifacts.ts';
import MultiRunMetricChart from '#~/pages/experiments/screens/Metrics/MultiRunMetricChart';

type RunMetricsProps = Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const RunMetrics: React.FC<RunMetricsProps> = ({ ...pageProps }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedRuns, setSelectedRuns] = useState<RegistryExperimentRun[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
  const drawerRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch all runs across all experiments
  const [runs, loaded, loadError] = useAllRuns();

  // Get available metrics from all runs
  const [aggregatedArtifacts, artifactsLoaded] = useExperimentRunsArtifacts(runs);

  const onExpand = () => {
    if (drawerRef.current) {
      drawerRef.current.focus();
    }
  };

  const onClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleMetricToggle = (metricName: string) => {
    const newSelectedMetrics = new Set(selectedMetrics);
    if (newSelectedMetrics.has(metricName)) {
      newSelectedMetrics.delete(metricName);
    } else {
      newSelectedMetrics.add(metricName);
    }
    setSelectedMetrics(newSelectedMetrics);
  };

  const panelContent = (
    <DrawerPanelContent isResizable defaultSize="400px" minSize="200px">
      <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
        {!loaded ? (
          <Bullseye>
            <Spinner size="lg" />
          </Bullseye>
        ) : loadError ? (
          <EmptyState
            headingLevel="h4"
            icon={ExclamationCircleIcon}
            titleText="Error loading runs"
            variant={EmptyStateVariant.sm}
          >
            <EmptyStateBody>{loadError.message}</EmptyStateBody>
          </EmptyState>
        ) : (
          <ExperimentRunsListView
            experimentRuns={runs}
            compact
            showCompareRunsButton={false}
            selectedRuns={selectedRuns}
            setSelectedRuns={setSelectedRuns}
          />
        )}
      </div>
    </DrawerPanelContent>
  );

  const mainContent = (
    <div style={{ padding: '20px' }}>
      {/* Metric Selector Toolbar */}
      <Toolbar style={{ marginBottom: '20px' }}>
        <ToolbarContent>
          <ToolbarItem>
            <Title headingLevel="h3" size="md">
              Select Metrics to Display:
            </Title>
          </ToolbarItem>
          <ToolbarItem>
            {artifactsLoaded && aggregatedArtifacts.metrics.size > 0 ? (
              <Popper
                trigger={
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsMetricDropdownOpen(!isMetricDropdownOpen)}
                    isExpanded={isMetricDropdownOpen}
                    style={{ minWidth: '200px' }}
                  >
                    {selectedMetrics.size === 0
                      ? 'Select metrics'
                      : `${selectedMetrics.size} metric${
                          selectedMetrics.size === 1 ? '' : 's'
                        } selected`}
                  </MenuToggle>
                }
                popper={
                  <Menu
                    ref={menuRef}
                    onSelect={(e, itemId) => {
                      e?.preventDefault();
                      if (typeof itemId === 'string') {
                        handleMetricToggle(itemId);
                      }
                    }}
                    style={{ maxHeight: '300px', overflowY: 'auto' }}
                  >
                    <MenuContent>
                      {Array.from(aggregatedArtifacts.metrics).map((metricName) => (
                        <MenuItem key={metricName} itemId={metricName}>
                          <Checkbox
                            id={`metric-${metricName}`}
                            isChecked={selectedMetrics.has(metricName)}
                            label={metricName}
                          />
                        </MenuItem>
                      ))}
                    </MenuContent>
                  </Menu>
                }
                isVisible={isMetricDropdownOpen}
                onDocumentClick={(event) => {
                  if (
                    event &&
                    event.target &&
                    event.target instanceof Node &&
                    toggleRef.current &&
                    menuRef.current &&
                    !toggleRef.current.contains(event.target) &&
                    !menuRef.current.contains(event.target)
                  ) {
                    setIsMetricDropdownOpen(false);
                  }
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: 'var(--pf-v5-global--FontSize--sm)',
                  color: 'var(--pf-v5-global--Color--200)',
                }}
              >
                {!artifactsLoaded ? 'Loading metrics...' : 'No metrics available'}
              </span>
            )}
          </ToolbarItem>
          <ToolbarItem align={{ default: 'alignEnd' }}>
            <Button aria-expanded={isExpanded} onClick={onClick}>
              {isExpanded ? 'Hide all runs' : 'Show all runs'}
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {/* Metric Charts */}
      {selectedMetrics.size > 0 && selectedRuns.length > 0 ? (
        <Gallery hasGutter minWidths={{ default: '400px' }}>
          {Array.from(selectedMetrics).map((metricName) => (
            <MultiRunMetricChart
              key={metricName}
              metricName={metricName}
              experimentRuns={selectedRuns}
              width={400}
              height={300}
            />
          ))}
        </Gallery>
      ) : (
        <EmptyState variant={EmptyStateVariant.sm}>
          <EmptyStateBody>
            {selectedMetrics.size === 0 && selectedRuns.length === 0
              ? 'Select metrics from the toolbar above and runs from the table below to display charts.'
              : selectedMetrics.size === 0
              ? 'Select metrics from the toolbar above to display charts.'
              : 'Select runs from the table below to display charts.'}
          </EmptyStateBody>
        </EmptyState>
      )}
    </div>
  );

  return (
    <ApplicationsPage
      {...pageProps}
      title="Run metrics"
      description="Analyze and compare metrics across all experiment runs"
      loaded={loaded}
      loadError={loadError}
      provideChildrenPadding={false}
    >
      <div style={{ height: 'calc(100vh - 140px)' }}>
        <Drawer isExpanded={isExpanded} onExpand={onExpand} position="bottom">
          <DrawerContent panelContent={panelContent}>
            <DrawerContentBody>{mainContent}</DrawerContentBody>
          </DrawerContent>
        </Drawer>
      </div>
    </ApplicationsPage>
  );
};

export default RunMetrics;
