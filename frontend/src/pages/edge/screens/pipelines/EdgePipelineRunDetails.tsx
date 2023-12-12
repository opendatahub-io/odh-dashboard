import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Spinner,
  Tab,
  TabContent,
  TabTitleText,
  Tabs,
} from '@patternfly/react-core';
import { useParams } from 'react-router-dom';
import { EDGE_CONSTANT } from '~/concepts/edge/const';
import { useK8sPipelineRunTaskTopology } from '~/concepts/edge/hooks/useK8sPipelineRunTaskTopology';
import { PipelineTopology, PipelineTopologyEmpty } from '~/concepts/topology';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import useK8sPipelinesRun from '~/concepts/edge/hooks/useK8sPipelinesRun';
import EdgePipelineRunNotFound from '~/concepts/edge/content/pipelines/EdgePipelineRunNotFound';
import ApplicationsPage from '~/pages/ApplicationsPage';
import PipelineDetailsYAML from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsYAML';
import { PipelineDetailsTab } from './EdgePipelineDetails';

const EdgePipelineRunDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => {
  const { pipelineRunName } = useParams();
  const [pipelineRun, loaded, loadError] = useK8sPipelinesRun(EDGE_CONSTANT, pipelineRunName);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const { taskMap, nodes } = useK8sPipelineRunTaskTopology(pipelineRun);
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(PipelineDetailsTab.GRAPH);

  if (!loaded && !loadError) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (loadError) {
    return (
      <ApplicationsPage
        breadcrumb={
          <Breadcrumb>
            {breadcrumbPath}
            <BreadcrumbItem isActive>{'Pipeline run not found'}</BreadcrumbItem>
          </Breadcrumb>
        }
        title={'Pipeline run not found'}
        empty={false}
        loaded={true}
      >
        <EdgePipelineRunNotFound errorMessage={loadError.message} />;
      </ApplicationsPage>
    );
  }

  return (
    <ApplicationsPage
      title={loadError ? 'Error loading run' : pipelineRun?.metadata.name}
      loaded={loaded}
      loadError={loadError}
      breadcrumb={
        <Breadcrumb>
          {breadcrumbPath}
          <BreadcrumbItem isActive>
            {loadError ? 'Run details' : pipelineRun?.metadata.name ?? 'Loading...'}
          </BreadcrumbItem>
        </Breadcrumb>
      }
      empty={false}
    >
      <Tabs
        style={{ flexShrink: 0 }}
        activeKey={activeTabKey}
        onSelect={(e, tabIndex) => {
          setActiveTabKey(tabIndex);
          setSelectedId(null);
        }}
        aria-label="Pipeline Run Details tabs"
        role="region"
      >
        <Tab
          eventKey={PipelineDetailsTab.GRAPH}
          title={<TabTitleText>Graph</TabTitleText>}
          aria-label="Pipeline Run Graph Tab"
          tabContentId={`tabContent-${PipelineDetailsTab.GRAPH}`}
        />
        <Tab
          eventKey={PipelineDetailsTab.YAML}
          title={<TabTitleText>YAML</TabTitleText>}
          aria-label="Pipeline Run YAML Tab"
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
            filename={`Pipeline ${pipelineRun?.metadata.name}`}
            content={pipelineRun}
          />
        </TabContent>
      </div>
    </ApplicationsPage>
  );
};

export default EdgePipelineRunDetails;
