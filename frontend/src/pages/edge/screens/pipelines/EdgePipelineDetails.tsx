import * as React from 'react';
import { useParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Tab,
  TabContent,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { PipelineTopology, PipelineTopologyEmpty } from '~/concepts/topology';
import { EDGE_CONSTANT } from '~/concepts/edge/const';
import { useK8sPipelineTaskTopology } from '~/concepts/edge/hooks/useK8sPipelineTaskTopology';
import { EdgePipelineDetailsType } from '~/concepts/edge/types';
import ApplicationsPage from '~/pages/ApplicationsPage';
import PipelineDetailsYAML from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsYAML';
import EdgePipelineNotFound from '~/concepts/edge/content/pipelines/EdgePipelineNotFound';
import useK8sPipelines from '~/concepts/edge/hooks/useK8sPipelines';

export enum PipelineDetailsTab {
  GRAPH,
  YAML,
}

const EdgePipelineDetails: React.FC<EdgePipelineDetailsType> = ({ breadcrumbPath }) => {
  const { pipelineName } = useParams();
  const [pipeline, pipelineLoad, pipelineLoadError] = useK8sPipelines(EDGE_CONSTANT, pipelineName);
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(PipelineDetailsTab.GRAPH);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const { taskMap, nodes } = useK8sPipelineTaskTopology(pipeline);

  if (pipelineLoadError) {
    return (
      <ApplicationsPage
        breadcrumb={
          <Breadcrumb>
            {breadcrumbPath}
            <BreadcrumbItem isActive>{'Pipeline not found'}</BreadcrumbItem>
          </Breadcrumb>
        }
        title={'Pipeline not found'}
        empty={false}
        loaded={true}
      >
        <EdgePipelineNotFound />
      </ApplicationsPage>
    );
  }
  return (
    <ApplicationsPage
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive>{pipelineName || 'Loading...'}</BreadcrumbItem>
        </Breadcrumb>
      }
      title={pipelineName || 'Loading...'}
      empty={false}
      loaded={pipelineLoad}
      loadError={pipelineLoadError}
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
            filename={`Pipeline ${pipeline?.metadata.name}`}
            content={pipeline}
          />
        </TabContent>
      </div>
    </ApplicationsPage>
  );
};

export default EdgePipelineDetails;
