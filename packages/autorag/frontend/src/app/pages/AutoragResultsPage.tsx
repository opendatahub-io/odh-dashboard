import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  Content,
  ContentVariants,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Flex,
  FlexItem,
  Label,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Skeleton,
  Split,
  SplitItem,
  Truncate,
} from '@patternfly/react-core';
import { CogIcon, OpenDrawerRightIcon, RedoIcon, StopCircleIcon } from '@patternfly/react-icons';
import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { Link, useLocation, useParams } from 'react-router';
import AutoragHeader from '~/app/components/common/AutoragHeader/AutoragHeader';
import InvalidPipelineRun from '~/app/components/empty-states/InvalidPipelineRun';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import AutoragResults from '~/app/components/run-results/AutoragResults';
import AutoragInputParametersPanel from '~/app/components/run-results/AutoragInputParametersPanel';
import StopRunModal from '~/app/components/run-results/StopRunModal';
import { AutoragResultsContext, getAutoragContext } from '~/app/context/AutoragResultsContext';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { useAutoragRunActions } from '~/app/hooks/useAutoragRunActions';
import { useNotification } from '~/app/hooks/useNotification';
import { usePipelineRunQuery } from '~/app/hooks/queries';
import { useAutoragResults } from '~/app/hooks/useAutoragResults';
import { autoragExperimentsPathname, autoragReconfigurePathname } from '~/app/utilities/routes';
import {
  formatMetricName,
  formatPatternName,
  getOptimizedMetricForRAG,
  isRunTerminatable,
  isRunRetryable,
  parseErrorStatus,
} from '~/app/utilities/utils';
import type { ResponsesTemplate } from '~/app/types/autoragPattern';

const EmbeddedPlayground = React.lazy(() => import('~/app/components/EmbeddedPlayground'));

type PlaygroundPatternInfo = {
  patternName: string;
  modelId: string;
  optimizedMetricName: string;
  optimizedMetricValue: number | string;
  chunkMethod: string;
};

type DrawerContentType =
  | { type: 'run-details' }
  | {
      type: 'playground';
      secretName: string;
      responsesTemplate: ResponsesTemplate;
      patternInfo: PlaygroundPatternInfo;
    };

function AutoragResultsPage(): React.JSX.Element {
  const { namespace, runId } = useParams();
  const location = useLocation();
  const { namespaces, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelectorWithPersistence();
  const [drawerContent, setDrawerContent] = React.useState<DrawerContentType | null>(null);
  const isDrawerOpen = drawerContent !== null;
  const handleDrawerClose = React.useCallback(() => setDrawerContent(null), []);
  const [isPatternSelectOpen, setIsPatternSelectOpen] = React.useState(false);

  // Close drawer on route changes
  const locationKey = location.key;
  React.useEffect(() => {
    setDrawerContent(null);
  }, [locationKey]);
  const [isStopModalOpen, setIsStopModalOpen] = React.useState(false);
  const { handleRetry, handleConfirmStop, isRetrying, isTerminating } = useAutoragRunActions(
    namespace ?? '',
    runId ?? '',
  );

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

  const notification = useNotification();

  const {
    data: pipelineRun,
    isPending: pipelineRunPending,
    isFetching: pipelineRunFetching,
    isError: pipelineRunError,
    error: pipelineRunLoadError,
  } = usePipelineRunQuery(runId, namespace);

  // Two-tier error strategy: polling errors (data already loaded) show a non-blocking
  // notification with stale data, while initial load errors (no data yet) show a full error page.
  const hasPreviousData = !!pipelineRun;
  const isPollingError = pipelineRunError && hasPreviousData;
  const isInitialLoadError = pipelineRunError && !hasPreviousData;

  React.useEffect(() => {
    if (isPollingError) {
      notification.warning(
        'Pipeline run status update failed',
        'The status update has failed consistently for multiple attempts. The displayed results may not reflect the current state of the pipeline run.',
      );
    }
  }, [isPollingError, notification]);

  const invalidPipelineRunId =
    isInitialLoadError &&
    pipelineRunLoadError instanceof Error &&
    parseErrorStatus(pipelineRunLoadError) === 404;

  // Fetch and process AutoRAG results using custom hook
  const {
    patterns,
    failedPatterns,
    isLoading: patternsLoading,
    isError: patternsError,
    error: patternsLoadError,
    refetch: refetchPatterns,
    ragPatternsBasePath,
  } = useAutoragResults(runId, namespace, pipelineRun);

  const failedPatternsNotifiedKey = React.useRef('');
  React.useEffect(() => {
    const key = [...failedPatterns].toSorted().join(',');
    if (failedPatterns.length > 0 && failedPatternsNotifiedKey.current !== key) {
      failedPatternsNotifiedKey.current = key;
      const total = failedPatterns.length + Object.keys(patterns).length;
      notification.warning(
        `${failedPatterns.length} of ${total} patterns could not be loaded`,
        `The following patterns failed to load: ${failedPatterns.join(', ')}`,
      );
    }
  }, [failedPatterns, patterns, notification]);

  const runTerminatable = isRunTerminatable(pipelineRun?.state);
  const runRetryable = isRunRetryable(pipelineRun?.state);

  const handleStop = React.useCallback(async () => {
    try {
      await handleConfirmStop();
      setIsStopModalOpen(false);
    } catch {
      // Keep modal open on failure; error notification is shown by the hook.
    }
  }, [handleConfirmStop]);

  const ReconfigureLink = React.useCallback(
    (props: React.ComponentProps<typeof Link>) => (
      <Link
        {...props}
        to={`${autoragReconfigurePathname}/${namespace}/${runId}`}
        state={{ from: 'results' }}
      />
    ),
    [namespace, runId],
  );

  const contextValue = React.useMemo(
    () =>
      getAutoragContext({
        pipelineRun,
        patterns,
        pipelineRunLoading: pipelineRunPending || pipelineRunFetching,
        patternsLoading,
        patternsError,
        patternsLoadError,
        onRetryPatterns: refetchPatterns,
        ragPatternsBasePath,
      }),
    [
      pipelineRun,
      patterns,
      pipelineRunPending,
      pipelineRunFetching,
      patternsLoading,
      patternsError,
      patternsLoadError,
      refetchPatterns,
      ragPatternsBasePath,
    ],
  );

  const handleTryInPlayground = React.useCallback(
    (patternName: string) => {
      const pattern = patterns[patternName];
      const responsesTemplate = pattern.settings.responses_template;
      const secretName = contextValue.parameters?.ogx_secret_name;
      if (!responsesTemplate || !secretName) {
        return;
      }

      const optimizedMetric = getOptimizedMetricForRAG(pipelineRun);
      const scoreLookup = Object.fromEntries(
        Object.entries(pattern.scores).map(([k, v]) => [k.toLowerCase(), v]),
      );
      const metricMean = scoreLookup[optimizedMetric.toLowerCase()]?.mean;
      setDrawerContent({
        type: 'playground',
        secretName,
        responsesTemplate,
        patternInfo: {
          patternName,
          modelId: pattern.settings.generation.model_id || 'N/A',
          optimizedMetricName: formatMetricName(optimizedMetric),
          optimizedMetricValue:
            metricMean != null && Number.isFinite(metricMean) ? metricMean : 'N/A',
          chunkMethod: pattern.settings.chunking.method || 'N/A',
        },
      });
    },
    [patterns, contextValue.parameters?.ogx_secret_name, pipelineRun],
  );

  return (
    <AutoragResultsContext.Provider value={contextValue}>
      <Drawer isExpanded={isDrawerOpen} position="end">
        <DrawerContent
          panelContent={
            drawerContent?.type === 'run-details' ? (
              <AutoragInputParametersPanel
                onClose={handleDrawerClose}
                parameters={contextValue.parameters}
                isLoading={pipelineRunPending}
              />
            ) : drawerContent?.type === 'playground' ? (
              <DrawerPanelContent
                defaultSize="50%"
                minSize="400px"
                data-testid="playground-drawer-panel"
              >
                <DrawerHead>
                  <Flex
                    justifyContent={{ default: 'justifyContentSpaceBetween' }}
                    alignItems={{ default: 'alignItemsCenter' }}
                  >
                    <FlexItem>
                      <Select
                        isOpen={isPatternSelectOpen}
                        onOpenChange={setIsPatternSelectOpen}
                        onSelect={(_e, value) => {
                          if (typeof value === 'string') {
                            handleTryInPlayground(value);
                          }
                          setIsPatternSelectOpen(false);
                        }}
                        selected={drawerContent.patternInfo.patternName}
                        toggle={(toggleRef) => (
                          <MenuToggle
                            ref={toggleRef}
                            onClick={() => setIsPatternSelectOpen((prev) => !prev)}
                            isExpanded={isPatternSelectOpen}
                            variant="plainText"
                            style={{ fontSize: 'var(--pf-t--global--font--size--heading--h2)' }}
                            data-testid="playground-pattern-select"
                          >
                            {formatPatternName(drawerContent.patternInfo.patternName)}
                          </MenuToggle>
                        )}
                      >
                        <SelectList>
                          {Object.entries(patterns)
                            .filter(([, p]) => p.settings.responses_template)
                            .map(([name]) => (
                              <SelectOption key={name} value={name}>
                                {formatPatternName(name)}
                              </SelectOption>
                            ))}
                        </SelectList>
                      </Select>
                    </FlexItem>
                    <FlexItem>
                      <Label color="blue">Read-only</Label>
                    </FlexItem>
                  </Flex>
                  <DrawerActions>
                    <DrawerCloseButton
                      onClick={handleDrawerClose}
                      data-testid="playground-drawer-close"
                    />
                  </DrawerActions>
                </DrawerHead>
                <DrawerPanelBody
                  hasNoPadding
                  style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                >
                  <div className="pf-v6-u-p-md" style={{ flexShrink: 0 }}>
                    <Card isCompact>
                      <CardBody>
                        <DescriptionList
                          isHorizontal
                          isCompact
                          columnModifier={{ default: '2Col' }}
                        >
                          <DescriptionListGroup>
                            <DescriptionListTerm>Pattern</DescriptionListTerm>
                            <DescriptionListDescription>
                              {formatPatternName(drawerContent.patternInfo.patternName)}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Model</DescriptionListTerm>
                            <DescriptionListDescription>
                              {drawerContent.patternInfo.modelId}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>
                              {drawerContent.patternInfo.optimizedMetricName}
                            </DescriptionListTerm>
                            <DescriptionListDescription>
                              {typeof drawerContent.patternInfo.optimizedMetricValue === 'number'
                                ? drawerContent.patternInfo.optimizedMetricValue.toFixed(2)
                                : drawerContent.patternInfo.optimizedMetricValue}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                          <DescriptionListGroup>
                            <DescriptionListTerm>Chunk method</DescriptionListTerm>
                            <DescriptionListDescription>
                              {drawerContent.patternInfo.chunkMethod.charAt(0).toUpperCase() +
                                drawerContent.patternInfo.chunkMethod.slice(1)}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        </DescriptionList>
                        <Content component={ContentVariants.small} className="pf-v6-u-mt-md">
                          This is a read-only evaluation. Ask questions to test this pattern&apos;s
                          responses and see which documents it retrieves.
                        </Content>
                      </CardBody>
                    </Card>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <React.Suspense fallback={null}>
                      <EmbeddedPlayground
                        key={drawerContent.patternInfo.patternName}
                        namespace={namespace ?? ''}
                        secretName={drawerContent.secretName}
                        responsesTemplate={drawerContent.responsesTemplate}
                        patternName={drawerContent.patternInfo.patternName}
                        bffBasePath="/gen-ai/api/v1"
                        placeholderBotContent={`Ask a question about your documents to see how ${formatPatternName(drawerContent.patternInfo.patternName)} responds.`}
                        welcomeContent={<></>}
                      />
                    </React.Suspense>
                  </div>
                </DrawerPanelBody>
              </DrawerPanelContent>
            ) : undefined
          }
        >
          <DrawerContentBody>
            <ApplicationsPage
              title={<AutoragHeader />}
              subtext={
                <h2 className="pf-v6-u-mt-sm">
                  {pipelineRun ? (
                    <span>
                      &quot;
                      <Truncate content={pipelineRun.display_name || ''} />
                      &quot; results
                    </span>
                  ) : (
                    <Skeleton width="300px" />
                  )}
                </h2>
              }
              headerAction={
                <Split hasGutter>
                  <SplitItem>
                    {runTerminatable && (
                      <Button
                        variant="secondary"
                        icon={<StopCircleIcon />}
                        onClick={() => setIsStopModalOpen(true)}
                        data-testid="stop-run-button"
                      >
                        Stop
                      </Button>
                    )}
                    {runRetryable && (
                      <Button
                        variant="secondary"
                        icon={<RedoIcon />}
                        onClick={() => void handleRetry().catch(() => undefined)}
                        isDisabled={isRetrying}
                        isLoading={isRetrying}
                        spinnerAriaValueText="Retrying run"
                        data-testid="retry-run-button"
                      >
                        Retry
                      </Button>
                    )}
                  </SplitItem>
                  <SplitItem>
                    <Button
                      variant="secondary"
                      icon={<CogIcon />}
                      component={ReconfigureLink}
                      data-testid="reconfigure-run-button"
                    >
                      Reconfigure
                    </Button>
                  </SplitItem>
                  <SplitItem>
                    <Button
                      variant="link"
                      icon={<OpenDrawerRightIcon />}
                      onClick={() =>
                        setDrawerContent((prev) =>
                          prev?.type === 'run-details' ? null : { type: 'run-details' },
                        )
                      }
                      aria-expanded={drawerContent?.type === 'run-details'}
                      data-testid="run-details-button"
                    >
                      Run details
                    </Button>
                  </SplitItem>
                </Split>
              }
              breadcrumb={
                <Breadcrumb>
                  <BreadcrumbItem>
                    <Link to={getRedirectPath(namespace!)}>AutoRAG: {namespace}</Link>
                  </BreadcrumbItem>
                  <BreadcrumbItem isActive>
                    <Truncate content={pipelineRun?.display_name || ''} />
                  </BreadcrumbItem>
                </Breadcrumb>
              }
              empty={noNamespaces || invalidNamespace || invalidPipelineRunId}
              emptyStatePage={
                invalidPipelineRunId ? (
                  <InvalidPipelineRun />
                ) : (
                  <InvalidProject namespace={namespace} getRedirectPath={getRedirectPath} />
                )
              }
              loadError={
                hasPreviousData ? undefined : (pipelineRunLoadError ?? namespacesLoadError)
              }
              loaded={namespacesLoaded && !pipelineRunPending}
            >
              <AutoragResults onTryInPlayground={handleTryInPlayground} />
            </ApplicationsPage>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
      <StopRunModal
        isOpen={isStopModalOpen}
        onClose={() => setIsStopModalOpen(false)}
        onConfirm={handleStop}
        isTerminating={isTerminating}
        runName={pipelineRun?.display_name}
      />
    </AutoragResultsContext.Provider>
  );
}

export default AutoragResultsPage;
