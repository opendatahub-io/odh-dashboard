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
} from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import usePipelineTemplate from '~/concepts/pipelines/apiHooks/usePipelineVersionTemplates';
import { PipelineTopology, usePipelineTaskTopology } from '~/concepts/pipelines/topology';
import MarkdownView from '~/components/MarkdownView';
import PipelineDetailsYAML from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsYAML';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineTopologyEmpty from '~/concepts/pipelines/content/pipelinesDetails/PipelineTopologyEmpty';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import DeletePipelineCoreResourceModal from '~/concepts/pipelines/content/DeletePipelineCoreResourceModal';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import usePipelineById from '~/concepts/pipelines/apiHooks/usePipelineById';
import { RelationshipKF, ResourceTypeKF } from '~/concepts/pipelines/kfTypes';
import PipelineVersionSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineVersionSelector';
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

  const [isDeleting, setDeleting] = React.useState(false);
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(PipelineDetailsTab.GRAPH);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const { namespace } = usePipelinesAPI();
  const [pipelineVersion, isPipelineVersionLoaded, pipelineVersionLoadError] =
    usePipelineVersionById(pipelineVersionId);

  const pipelineId = pipelineVersion?.resource_references.find(
    (ref) => ref.relationship === RelationshipKF.OWNER && ref.key.type === ResourceTypeKF.PIPELINE,
  )?.key.id;

  const [pipeline, isPipelineLoaded, pipelineLoadError] = usePipelineById(pipelineId);
  const [pipelineVersionRun, isPipelineVersionTemplateLoaded, templateLoadError] =
    usePipelineTemplate(pipelineVersionId);
  const { taskMap, nodes } = usePipelineTaskTopology(pipelineVersionRun);
  const isLoaded = isPipelineVersionLoaded && isPipelineLoaded && isPipelineVersionTemplateLoaded;

  if (pipelineVersionLoadError || pipelineLoadError) {
    const errorText = 'Pipeline version not found';

    return (
      <ApplicationsPage
        breadcrumb={
          <Breadcrumb>
            {breadcrumbPath}
            <BreadcrumbItem isActive>{errorText}</BreadcrumbItem>
          </Breadcrumb>
        }
        title={errorText}
        empty={false}
        loaded={!isLoaded}
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
                  <BreadcrumbItem>{pipeline?.name || 'Loading...'}</BreadcrumbItem>
                  <BreadcrumbItem isActive>{pipelineVersion?.name || 'Loading...'}</BreadcrumbItem>
                </Breadcrumb>
              }
              title={pipelineVersion?.name || 'Loading...'}
              {...(pipelineVersion && {
                description: (
                  <MarkdownView conciseDisplay markdown={pipelineVersion?.description} />
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
                        selection={`Pipeline version: ${pipelineVersion?.name}`}
                        onSelect={(version) =>
                          navigate(`/pipelines/${namespace}/pipeline/view/${version.id}`)
                        }
                      />
                    </FlexItem>
                    <FlexItem>
                      {isLoaded && (
                        <PipelineDetailsActions
                          onDelete={() => setDeleting(true)}
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
      <DeletePipelineCoreResourceModal
        type="pipeline"
        toDeleteResources={isDeleting && pipelineVersion ? [pipelineVersion] : []}
        onClose={() => {
          navigate(`/pipelines/${namespace}`);
        }}
      />
    </>
  );
};

export default PipelineDetails;
