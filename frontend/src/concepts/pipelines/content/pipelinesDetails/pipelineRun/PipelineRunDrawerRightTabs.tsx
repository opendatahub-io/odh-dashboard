import * as React from 'react';
import { DrawerPanelBody, Tab, TabContent, Tabs } from '@patternfly/react-core';
import SelectedNodeDetailsTab from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/SelectedNodeDetailsTab';
import { PipelineRunTaskDetails, TaskReferenceMap } from '~/concepts/pipelines/content/types';
import SelectedNodeInputOutputTab from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/SelectedNodeInputOutputTab';
import SelectedNodeVolumeMountsTab from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/SelectedNodeVolumeMountsTab';
import { PipelineRunTaskParam } from '~/k8sTypes';
import LogsTab from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/LogsTab';

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

  const tabContentProps = (tab: PipelineRunNodeTabs): React.ComponentProps<typeof TabContent> => ({
    id: tab,
    eventKey: tab,
    activeKey: selection ?? '',
    hidden: tab !== selection,
    style: { flex: '1 1 auto' },
  });

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
        <DrawerPanelBody style={{ display: 'flex', flexDirection: 'column' }}>
          <TabContent {...tabContentProps(PipelineRunNodeTabs.INPUT_OUTPUT)}>
            <SelectedNodeInputOutputTab
              taskReferences={taskReferences}
              task={task}
              parameters={parameters}
            />
          </TabContent>
          {/*<TabContent {...tabContentProps(PipelineRunNodeTabs.VISUALIZATIONS)}>TBD 2</TabContent>*/}
          <TabContent {...tabContentProps(PipelineRunNodeTabs.DETAILS)}>
            <SelectedNodeDetailsTab task={task} />
          </TabContent>
          <TabContent {...tabContentProps(PipelineRunNodeTabs.VOLUMES)}>
            <SelectedNodeVolumeMountsTab task={task} />
          </TabContent>
          <TabContent {...tabContentProps(PipelineRunNodeTabs.LOGS)}>
            <LogsTab task={task} />
          </TabContent>
          {/*<TabContent {...tabContentProps(PipelineRunNodeTabs.POD)}>TBD 6</TabContent>*/}
          {/*<TabContent {...tabContentProps(PipelineRunNodeTabs.EVENTS)}>TBD 7</TabContent>*/}
          {/*<TabContent {...tabContentProps(PipelineRunNodeTabs.ML_METADATA)}>TBD 8</TabContent>*/}
        </DrawerPanelBody>
      )}
    </>
  );
};

export default PipelineRunDrawerRightTabs;
