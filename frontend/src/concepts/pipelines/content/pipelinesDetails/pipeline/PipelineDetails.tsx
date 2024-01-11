import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Flex,
  FlexItem,
  Tab,
  TabContent,
  Tabs,
  TabTitleText,
  Truncate,
} from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import usePipelineVersionTemplate from '~/concepts/pipelines/apiHooks/usePipelineVersionTemplates';
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
import { getPipelineIdByPipelineVersion } from '~/concepts/pipelines/content/utils';
import PipelineDetailsActions from './PipelineDetailsActions';
import SelectedTaskDrawerContent from './SelectedTaskDrawerContent';
import PipelineNotFound from './PipelineNotFound';

enum PipelineDetailsTab {
  GRAPH,
  YAML,
}

const PipelineDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => {
  const { pipelineVersionId } = useParams();
  const navigate = useNavigate();

  const [isDeletionOpen, setDeletionOpen] = React.useState(false);
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(PipelineDetailsTab.GRAPH);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const { namespace } = usePipelinesAPI();
  const [pipelineVersion, isPipelineVersionLoaded, pipelineVersionLoadError] =
    usePipelineVersionById(pipelineVersionId);

  const pipelineId = getPipelineIdByPipelineVersion(pipelineVersion);

  const [pipeline, isPipelineLoaded, pipelineLoadError] = usePipelineById(pipelineId);
  const pipelineName = pipeline?.name;
  const [pipelineVersionRun, isPipelineVersionTemplateLoaded, templateLoadError] =
    usePipelineVersionTemplate(pipelineVersionId);
  const { taskMap, nodes } = usePipelineTaskTopology(pipelineVersionRun);
  const isLoaded = isPipelineVersionLoaded && isPipelineLoaded && isPipelineVersionTemplateLoaded;

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

  return (
    <>
      <Drawer isExpanded={!!selectedId}>
        <DrawerContent
          panelContent={
            <SelectedTaskDrawerContent
              task={selectedId ? taskMap[selectedId] : undefined}
              onClose={() => setSelectedId(null)}
            />
          }
        >
          <DrawerContentBody style={{ display: 'flex', flexDirection: 'column' }}>
            <ApplicationsPage
              breadcrumb={
                <Breadcrumb>
                  {breadcrumbPath}
                  <BreadcrumbItem>{pipelineName || 'Loading...'}</BreadcrumbItem>
                  <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
                    <Truncate content={pipelineVersion?.name || 'Loading...'} />
                  </BreadcrumbItem>
                </Breadcrumb>
              }
              title={<Truncate content={pipelineVersion?.name || 'Loading...'} />}
              {...(pipelineVersion && {
                description: (
                  <MarkdownView
                    component="span"
                    conciseDisplay
                    markdown={pipelineVersion?.description}
                  />
                ),
              })}
              empty={false}
              loaded={isLoaded}
              loadError={templateLoadError}
              headerAction={
                isPipelineVersionLoaded && (
                  <Flex
                    spaceItems={{ default: 'spaceItemsMd' }}
                    alignItems={{ default: 'alignItemsFlexStart' }}
                  >
                    <FlexItem style={{ width: '300px' }}>
                      <PipelineVersionSelector
                        pipelineId={pipeline?.id}
                        selection={pipelineVersion?.name}
                        onSelect={(version) =>
                          navigate(`/pipelines/${namespace}/pipeline/view/${version.id}`)
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
              <Tabs
                style={{ flexShrink: 0 }}
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
                  eventKey={PipelineDetailsTab.YAML}
                  title={<TabTitleText>YAML</TabTitleText>}
                  aria-label="Pipeline YAML Tab"
                  tabContentId={`tabContent-${PipelineDetailsTab.YAML}`}
                />
              </Tabs>
              <div style={{ flexGrow: 1 }}>
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
                        const firstId = ids[0];
                        if (ids.length === 0) {
                          setSelectedId(null);
                        } else if (taskMap[firstId]) {
                          setSelectedId(firstId);
                        }
                      }}
                    />
                  )}
                </TabContent>
                <TabContent
                  id={`tabContent-${PipelineDetailsTab.YAML}`}
                  eventKey={PipelineDetailsTab.YAML}
                  activeKey={activeTabKey}
                  hidden={PipelineDetailsTab.YAML !== activeTabKey}
                  style={{ height: '100%' }}
                >
                  <PipelineDetailsYAML
                    filename={`Pipeline ${pipelineVersionRun?.metadata.name}`}
                    content={pipelineVersionRun}
                  />
                </TabContent>
              </div>
            </ApplicationsPage>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>

      {pipelineName && (
        <DeletePipelinesModal
          isOpen={isDeletionOpen}
          toDeletePipelineVersions={
            pipelineVersion ? [{ pipelineName, version: pipelineVersion }] : []
          }
          onClose={(deleted) => {
            setDeletionOpen(false);
            if (deleted) {
              navigate(`/pipelines/${namespace}`);
            }
          }}
        />
      )}
    </>
  );
};

export default PipelineDetails;
