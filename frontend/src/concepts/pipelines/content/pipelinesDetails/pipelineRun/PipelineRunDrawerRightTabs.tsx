import * as React from 'react';
import { DrawerPanelBody, Tab, TabContent, Tabs } from '@patternfly/react-core';
import SelectedNodeDetailsTab from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/SelectedNodeDetailsTab';
import SelectedNodeInputOutputTab from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/SelectedNodeInputOutputTab';
import LogsTab from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/LogsTab';
import './PipelineRunDrawer.scss';
import { PipelineTask } from '~/concepts/pipelines/topology';
import SelectedNodeVolumeMountsTab from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/SelectedNodeVolumeMountsTab';

enum PipelineRunNodeTabs {
  INPUT_OUTPUT = 'inputoutput',
  // VISUALIZATIONS = 'Visualizations',
  DETAILS = 'details',
  VOLUMES = 'volumes',
  LOGS = 'logs',
  // POD = 'Pod',
  // EVENTS = 'Events',
  // ML_METADATA = 'ML Metadata',
}

const PipelineRunNodeTabsTitles = {
  [PipelineRunNodeTabs.INPUT_OUTPUT]: 'Input/Output',
  [PipelineRunNodeTabs.DETAILS]: 'Task details',
  [PipelineRunNodeTabs.VOLUMES]: 'Volumes',
  [PipelineRunNodeTabs.LOGS]: 'Logs',
};

type PipelineRunDrawerRightTabsProps = {
  task: PipelineTask;
};

const PipelineRunDrawerRightTabs: React.FC<PipelineRunDrawerRightTabsProps> = ({ task }) => {
  const [selection, setSelection] = React.useState(PipelineRunNodeTabs.INPUT_OUTPUT);

  const tabContents: Record<PipelineRunNodeTabs, React.ReactNode> = {
    [PipelineRunNodeTabs.INPUT_OUTPUT]: <SelectedNodeInputOutputTab task={task} />,
    // [PipelineRunNodeTabs.VISUALIZATIONS]: <>TBD 2</>,
    [PipelineRunNodeTabs.DETAILS]: <SelectedNodeDetailsTab task={task} />,
    [PipelineRunNodeTabs.VOLUMES]: <SelectedNodeVolumeMountsTab task={task} />,
    [PipelineRunNodeTabs.LOGS]: <LogsTab task={task} />,
    // [PipelineRunNodeTabs.POD]: <>TBD 6</>,
    // [PipelineRunNodeTabs.EVENTS]: <>TBD 7</>,
    // [PipelineRunNodeTabs.ML_METADATA]: <>TBD 8</>,
  };

  return (
    <>
      <Tabs activeKey={selection} mountOnEnter>
        {Object.values(PipelineRunNodeTabs).map((tab) => (
          <Tab
            data-testid={`right-drawer-tab-${tab}`}
            key={tab}
            title={PipelineRunNodeTabsTitles[tab]}
            eventKey={tab}
            tabContentId={tab}
            onClick={() => setSelection(tab)}
          />
        ))}
      </Tabs>
      <DrawerPanelBody className="pipeline-run__drawer-panel-body pf-v5-u-px-sm">
        <TabContent
          id={selection}
          eventKey={selection}
          activeKey={selection}
          style={{ flex: '1 1 auto' }}
        >
          {tabContents[selection]}
        </TabContent>
      </DrawerPanelBody>
    </>
  );
};

export default PipelineRunDrawerRightTabs;
