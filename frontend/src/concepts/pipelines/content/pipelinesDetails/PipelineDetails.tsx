import * as React from 'react';
import { useParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Tab,
  TabContent,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import usePipelineTemplate from '~/concepts/pipelines/apiHooks/usePipelineTemplate';
import { PipelineTopology, usePipelineTaskTopology } from '~/concepts/pipelines/topology';
import usePipelineById from '~/concepts/pipelines/apiHooks/usePipelineById';
import MarkdownView from '~/components/MarkdownView';
import SelectedTaskDrawerContent from '~/concepts/pipelines/content/pipelinesDetails/SelectedTaskDrawerContent';
import PipelineDetailsActions from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsActions';
import PipelineDetailsYAML from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsYAML';

type PipelineDetailsProps = {
  breadcrumbPath: React.ReactElement<typeof BreadcrumbItem>[];
};

enum PipelineDetailsTab {
  GRAPH,
  YAML,
}

const PipelineDetails: React.FC<PipelineDetailsProps> = ({ breadcrumbPath }) => {
  const { pipelineId } = useParams();
  const [pipeline, pipelineLoad, pipelineLoadError] = usePipelineById(pipelineId);
  const [pipelineRun, pipelineTemplateLoaded, templateLoadError] = usePipelineTemplate(pipelineId);
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(PipelineDetailsTab.GRAPH);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const { taskMap, nodes } = usePipelineTaskTopology(pipelineRun);

  return (
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
                <BreadcrumbItem isActive>{pipeline?.name || 'Loading...'}</BreadcrumbItem>
              </Breadcrumb>
            }
            title={pipeline?.name || 'Loading...'}
            description={
              pipeline ? <MarkdownView conciseDisplay markdown={pipeline.description} /> : ''
            }
            empty={false}
            loaded={pipelineLoad && pipelineTemplateLoaded}
            loadError={pipelineLoadError && templateLoadError}
            headerAction={<PipelineDetailsActions />}
          >
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
                eventKey={PipelineDetailsTab.YAML}
                title={<TabTitleText>YAML</TabTitleText>}
                aria-label="Pipeline YAML Tab"
                tabContentId={`tabContent-${PipelineDetailsTab.YAML}`}
              />
            </Tabs>
            <TabContent
              id={`tabContent-${PipelineDetailsTab.GRAPH}`}
              eventKey={PipelineDetailsTab.GRAPH}
              activeKey={activeTabKey}
              hidden={PipelineDetailsTab.GRAPH !== activeTabKey}
              style={{ flexGrow: 1 }}
            >
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
            </TabContent>
            <TabContent
              id={`tabContent-${PipelineDetailsTab.YAML}`}
              eventKey={PipelineDetailsTab.YAML}
              activeKey={activeTabKey}
              hidden={PipelineDetailsTab.YAML !== activeTabKey}
              style={{ flexGrow: 1 }}
            >
              <PipelineDetailsYAML pipelineRun={pipelineRun} />
            </TabContent>
          </ApplicationsPage>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default PipelineDetails;
