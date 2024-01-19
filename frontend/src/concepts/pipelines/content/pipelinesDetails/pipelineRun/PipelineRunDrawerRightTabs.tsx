import * as React from 'react';
import { DrawerPanelBody, Tab, TabContent, Tabs } from '@patternfly/react-core';
import SelectedNodeDetailsTab from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/SelectedNodeDetailsTab';
import { PipelineRunTaskDetails, TaskReferenceMap } from '~/concepts/pipelines/content/types';
import SelectedNodeInputOutputTab from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/SelectedNodeInputOutputTab';
import SelectedNodeVolumeMountsTab from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/SelectedNodeVolumeMountsTab';
import { PipelineRunTaskParam } from '~/k8sTypes';
import LogsTab from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/LogsTab';
import './PipelineRunDrawer.scss';

enum PipelineRunNodeTabs {
  INPUT_OUTPUT = 'Input / Output',
  // VISUALIZATIONS = 'Visualizations',
  DETAILS = 'Details',
  VOLUMES = 'Volumes',
  LOGS = 'Logs',
  // POD = 'Pod',
  // EVENTS = 'Events',
  // ML_METADATA = 'ML Metadata',
}

type PipelineRunDrawerRightTabsProps = {
  task: PipelineRunTaskDetails;
  taskReferences: TaskReferenceMap;
  parameters?: PipelineRunTaskParam[];
};

const PipelineRunDrawerRightTabs: React.FC<PipelineRunDrawerRightTabsProps> = ({
  task,
  taskReferences,
  parameters,
}) => {
  const [selection, setSelection] = React.useState(PipelineRunNodeTabs.INPUT_OUTPUT);

  const tabContents: Record<PipelineRunNodeTabs, React.ReactNode> = {
    [PipelineRunNodeTabs.INPUT_OUTPUT]: (
      <SelectedNodeInputOutputTab
        taskReferences={taskReferences}
        task={task}
        parameters={parameters}
      />
    ),
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
      <Tabs activeKey={selection ?? undefined} mountOnEnter>
        {Object.values(PipelineRunNodeTabs).map((tab) => (
          <Tab
            key={tab}
            title={tab}
            eventKey={tab}
            tabContentId={tab}
            onClick={() => setSelection(tab)}
          />
        ))}
      </Tabs>
      {selection && (
        <DrawerPanelBody className="pipeline-run__drawer-panel-body pf-v5-u-px-sm">
          <TabContent
            id={selection}
            eventKey={selection}
            activeKey={selection ?? ''}
            style={{ flex: '1 1 auto' }}
          >
            {tabContents[selection]}
          </TabContent>
        </DrawerPanelBody>
      )}
    </>
  );
};

export default PipelineRunDrawerRightTabs;
