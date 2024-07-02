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
import { routePipelineDetailsNamespace, routePipelinesNamespace } from '~/routes';
import { getCorePipelineSpec } from '~/concepts/pipelines/getCorePipelineSpec';
import PipelineDetailsActions from './PipelineDetailsActions';
import SelectedTaskDrawerContent from './SelectedTaskDrawerContent';
import PipelineNotFound from './PipelineNotFound';
import { PipelineSummaryDescriptionList } from './PipelineSummaryDescriptionList';

enum PipelineDetailsTab {
  GRAPH,
  SUMMARY,
  YAML,
}

const PipelineDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => {
  const navigate = useNavigate();

  const [isDeletionOpen, setDeletionOpen] = React.useState(false);
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(PipelineDetailsTab.GRAPH);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const { namespace } = usePipelinesAPI();

  // get pipeline and version from url
  const { pipelineId, pipelineVersionId } = useParams();
  const [pipelineVersion, isPipelineVersionLoaded, pipelineVersionLoadError] =
    usePipelineVersionById(pipelineId, pipelineVersionId);
  const [pipeline, isPipelineLoaded, pipelineLoadError] = usePipelineById(pipelineId);

  const nodes = usePipelineTaskTopology(pipelineVersion?.pipeline_spec);

  const selectedNode = React.useMemo(
    () => nodes.find((n) => n.id === selectedId),
    [selectedId, nodes],
  );
  const isLoaded = isPipelineVersionLoaded && isPipelineLoaded && !!pipelineVersion?.pipeline_spec;

  if (pipelineVersionLoadError || pipelineLoadError) {
    const title = 'Pipeline version not found';

    return (
      <ApplicationsPage
        breadcrumb={
          <Breadcrumb>
            {breadcrumbPath()}
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

  return (
    <>
      <ApplicationsPage
        breadcrumb={
          <Breadcrumb>
            {breadcrumbPath()}
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
                      routePipelineDetailsNamespace(
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
                  />
                )}
              </FlexItem>
            </Flex>
          )
        }
      >
        <PageSection
          isFilled
          padding={{ default: 'noPadding' }}
          style={{ flexBasis: 0, overflowY: 'hidden' }}
          variant="light"
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
                  setSelectedId(null);
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
                    <PipelineSummaryDescriptionList pipeline={pipeline} version={pipelineVersion} />
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
                    selectedIds={selectedId ? [selectedId] : []}
                    onSelectionChange={(ids) => {
                      setSelectedId(ids.length ? ids[0] : null);
                    }}
                    sidePanel={
                      <SelectedTaskDrawerContent
                        task={selectedNode?.data.pipelineTask}
                        onClose={() => setSelectedId(null)}
                      />
                    }
                  />
                )}
              </TabContent>
              <TabContent
                id={`tabContent-${PipelineDetailsTab.YAML}`}
                eventKey={PipelineDetailsTab.YAML}
                activeKey={activeTabKey}
                hidden={PipelineDetailsTab.YAML !== activeTabKey}
                className="pf-v5-u-h-100"
              >
                <TabContentBody hasPadding className="pf-v5-u-h-100">
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
      </ApplicationsPage>
      {pipeline && (
        <DeletePipelinesModal
          isOpen={isDeletionOpen}
          toDeletePipelineVersions={
            pipelineVersion
              ? [{ pipelineName: pipeline.display_name, version: pipelineVersion }]
              : []
          }
          onClose={(deleted) => {
            setDeletionOpen(false);
            if (deleted) {
              navigate(routePipelinesNamespace(namespace));
            }
          }}
        />
      )}
    </>
  );
};

export default PipelineDetails;
