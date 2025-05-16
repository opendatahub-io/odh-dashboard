import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Flex,
  FlexItem,
  PageSection,
  Tab,
  TabContent,
  TabContentBody,
  Tabs,
  TabTitleText,
  Truncate,
} from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { usePipelineTaskTopology } from '~/concepts/pipelines/topology';
import { PipelineTopology, PipelineTopologyEmpty } from '~/concepts/topology';
import MarkdownView from '~/components/MarkdownView';
import PipelineDetailsYAML from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsYAML';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import usePipelineById from '~/concepts/pipelines/apiHooks/usePipelineById';
import PipelineVersionSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineVersionSelector';
import DeletePipelinesModal from '~/concepts/pipelines/content/DeletePipelinesModal';
import { pipelineVersionDetailsRoute, pipelinesBaseRoute } from '~/routes/pipelines/global';
import { getCorePipelineSpec } from '~/concepts/pipelines/getCorePipelineSpec';
import { isArgoWorkflow } from '~/concepts/pipelines/content/tables/utils';
import PipelineDetailsActions from './PipelineDetailsActions';
import SelectedTaskDrawerContent from './SelectedTaskDrawerContent';
import PipelineNotFound from './PipelineNotFound';
import { PipelineSummaryDescriptionList } from './PipelineSummaryDescriptionList';
import PipelineNotSupported from './PipelineNotSupported';

enum PipelineDetailsTab {
  GRAPH,
  SUMMARY,
  YAML,
}

const PipelineDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => {
  const navigate = useNavigate();

  const [isDeletionOpen, setDeletionOpen] = React.useState(false);
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(PipelineDetailsTab.GRAPH);
  const [selectedIds, setSelectedIds] = React.useState<string[] | undefined>();

  const { namespace } = usePipelinesAPI();

  // get pipeline and version from url
  const { pipelineId, pipelineVersionId } = useParams();
  const [pipelineVersion, isPipelineVersionLoaded, pipelineVersionLoadError] =
    usePipelineVersionById(pipelineId, pipelineVersionId);
  const [pipeline, isPipelineLoaded, pipelineLoadError] = usePipelineById(pipelineId);

  const nodes = usePipelineTaskTopology(pipelineVersion?.pipeline_spec);
  const isInvalidPipelineVersion = isArgoWorkflow(pipelineVersion?.pipeline_spec);

  const selectedNode = React.useMemo(() => {
    if (isInvalidPipelineVersion) {
      return null;
    }
    return selectedIds ? nodes.find((n) => n.id === selectedIds[0]) : undefined;
  }, [isInvalidPipelineVersion, nodes, selectedIds]);

  const isLoaded = isPipelineVersionLoaded && isPipelineLoaded && !!pipelineVersion?.pipeline_spec;

  if (pipelineVersionLoadError || pipelineLoadError) {
    const title = 'Pipeline version not found';

    return (
      <ApplicationsPage
        breadcrumb={
          <Breadcrumb>
            {breadcrumbPath}
            <BreadcrumbItem isActive>{title}</BreadcrumbItem>
          </Breadcrumb>
        }
        title={title}
        empty={false}
        loaded
      >
        <PipelineNotFound />
      </ApplicationsPage>
    );
  }

  const panelContent = selectedNode ? (
    <SelectedTaskDrawerContent
      task={selectedNode.data.pipelineTask}
      onClose={() => setSelectedIds(undefined)}
    />
  ) : null;

  return (
    <>
      <ApplicationsPage
        breadcrumb={
          <Breadcrumb>
            {breadcrumbPath}
            <BreadcrumbItem style={{ maxWidth: 300 }}>
              {/* TODO: Remove the custom className after upgrading to PFv6 */}
              <Truncate
                content={pipeline?.display_name || 'Loading...'}
                className="truncate-no-min-width"
              />
            </BreadcrumbItem>
            <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
              {/* TODO: Remove the custom className after upgrading to PFv6 */}
              <Truncate
                content={pipelineVersion?.display_name || 'Loading...'}
                className="truncate-no-min-width"
              />
            </BreadcrumbItem>
          </Breadcrumb>
        }
        title={
          <Truncate
            content={pipelineVersion?.display_name || 'Loading...'}
            // TODO: Remove the custom className after upgrading to PFv6
            className="truncate-no-min-width"
          />
        }
        {...(pipelineVersion && {
          description: (
            <MarkdownView component="span" conciseDisplay markdown={pipelineVersion.description} />
          ),
        })}
        empty={false}
        loaded={isLoaded}
        headerAction={
          isPipelineVersionLoaded && (
            <Flex
              spaceItems={{ default: 'spaceItemsMd' }}
              alignItems={{ default: 'alignItemsFlexStart' }}
            >
              <FlexItem style={{ width: '300px' }}>
                <PipelineVersionSelector
                  pipelineId={pipeline?.pipeline_id}
                  selection={pipelineVersion?.display_name}
                  onSelect={(version) =>
                    navigate(
                      pipelineVersionDetailsRoute(
                        namespace,
                        version.pipeline_id,
                        version.pipeline_version_id,
                      ),
                    )
                  }
                />
              </FlexItem>
              <FlexItem>
                {isLoaded && (
                  <PipelineDetailsActions
                    onDelete={() => setDeletionOpen(true)}
                    pipeline={pipeline}
                    pipelineVersion={pipelineVersion}
                    isPipelineSupported={!isArgoWorkflow(pipelineVersion.pipeline_spec)}
                  />
                )}
              </FlexItem>
            </Flex>
          )
        }
      >
        {isInvalidPipelineVersion ? (
          <PipelineNotSupported />
        ) : (
          <PageSection
            hasBodyWrapper={false}
            isFilled
            padding={{ default: 'noPadding' }}
            style={{ flexBasis: 0 }}
          >
            <Flex
              direction={{ default: 'column' }}
              style={{ height: '100%' }}
              spaceItems={{ default: 'spaceItemsNone' }}
            >
              <FlexItem>
                <Tabs
                  activeKey={activeTabKey}
                  onSelect={(e, tabIndex) => {
                    setActiveTabKey(tabIndex);
                    setSelectedIds(undefined);
                  }}
                  aria-label="Pipeline Details tabs"
                  role="region"
                >
                  <Tab
                    eventKey={PipelineDetailsTab.GRAPH}
                    title={<TabTitleText>Graph</TabTitleText>}
                    aria-label="Pipeline Graph Tab"
                    tabContentId={`tabContent-${PipelineDetailsTab.GRAPH}`}
                  />
                  <Tab
                    eventKey={PipelineDetailsTab.SUMMARY}
                    title={<TabTitleText>Summary</TabTitleText>}
                    aria-label="Pipeline Summary Tab"
                  >
                    <TabContentBody hasPadding>
                      <PipelineSummaryDescriptionList
                        pipeline={pipeline}
                        version={pipelineVersion}
                      />
                    </TabContentBody>
                  </Tab>
                  <Tab
                    eventKey={PipelineDetailsTab.YAML}
                    title={<TabTitleText>Pipeline spec</TabTitleText>}
                    data-testid="pipeline-yaml-tab"
                    aria-label="Pipeline YAML Tab"
                    tabContentId={`tabContent-${PipelineDetailsTab.YAML}`}
                  />
                </Tabs>
              </FlexItem>
              <FlexItem flex={{ default: 'flex_1' }} style={{ overflowY: 'hidden' }}>
                <TabContent
                  id={`tabContent-${PipelineDetailsTab.GRAPH}`}
                  eventKey={PipelineDetailsTab.GRAPH}
                  activeKey={activeTabKey}
                  hidden={PipelineDetailsTab.GRAPH !== activeTabKey}
                  style={{ height: '100%' }}
                  data-testid="pipeline-version-topology-content"
                >
                  {nodes.length === 0 ? (
                    <PipelineTopologyEmpty />
                  ) : (
                    <PipelineTopology
                      nodes={nodes}
                      selectedIds={selectedIds}
                      onSelectionChange={setSelectedIds}
                      sidePanel={panelContent}
                    />
                  )}
                </TabContent>
                <TabContent
                  id={`tabContent-${PipelineDetailsTab.YAML}`}
                  eventKey={PipelineDetailsTab.YAML}
                  activeKey={activeTabKey}
                  hidden={PipelineDetailsTab.YAML !== activeTabKey}
                  className="pf-v6-u-h-100"
                >
                  <TabContentBody hasPadding className="pf-v6-u-h-100">
                    <PipelineDetailsYAML
                      filename={`Pipeline ${
                        getCorePipelineSpec(pipelineVersion?.pipeline_spec)?.pipelineInfo.name ??
                        'details'
                      }`}
                      content={pipelineVersion?.pipeline_spec}
                    />
                  </TabContentBody>
                </TabContent>
              </FlexItem>
            </Flex>
          </PageSection>
        )}
      </ApplicationsPage>
      {pipeline && isDeletionOpen ? (
        <DeletePipelinesModal
          toDeletePipelineVersions={
            pipelineVersion
              ? [{ pipelineName: pipeline.display_name, version: pipelineVersion }]
              : []
          }
          onClose={(deleted) => {
            setDeletionOpen(false);
            if (deleted) {
              navigate(pipelinesBaseRoute(namespace));
            }
          }}
        />
      ) : null}
    </>
  );
};

export default PipelineDetails;
