import * as React from 'react';
import { Tab, TabContent, TabContentBody, Tabs } from '@patternfly/react-core';
import SelectedNodeDetailsTab from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/SelectedNodeDetailsTab';
import SelectedNodeInputOutputTab from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/SelectedNodeInputOutputTab';
import LogsTab from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/runLogs/LogsTab';
import './PipelineRunDrawer.scss';
import { PipelineTask } from '#~/concepts/pipelines/topology';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { Execution } from '#~/third_party/mlmd';
import useIsMlflowPipelinesAvailable from '#~/concepts/mlflow/hooks/useIsMlflowPipelinesAvailable';
import { getMlflowExperimentId } from '#~/concepts/pipelines/content/tables/pipelineRun/utils';
import { renderDetailItems } from './utils';

enum PipelineRunNodeTab {
  INPUT_OUTPUT = 'inputoutput',
  DETAILS = 'details',
  VOLUMES = 'volumes',
  LOGS = 'logs',
}

type PipelineRunDrawerRightTabsProps = {
  task: PipelineTask;
  executions: Execution[];
  run?: PipelineRunKF | null;
};

const PipelineRunDrawerRightTabs: React.FC<PipelineRunDrawerRightTabsProps> = ({
  task,
  executions,
  run,
}) => {
  const { available: isMlflowAvailable } = useIsMlflowPipelinesAvailable();
  const hasNoInputsOutputs = !task.inputs && !task.outputs;
  const [selection, setSelection] = React.useState<string>(
    hasNoInputsOutputs ? PipelineRunNodeTab.DETAILS : PipelineRunNodeTab.INPUT_OUTPUT,
  );
  const taskExecution = executions.find(
    (e) => e.getCustomPropertiesMap().get('task_name')?.getStringValue() === task.name,
  );

  const isCachedTask = !!taskExecution
    ?.getCustomPropertiesMap()
    .get('cached_execution_id')
    ?.getStringValue();

  const mlflowRunId = isMlflowAvailable
    ? taskExecution?.getCustomPropertiesMap().get('plugins.mlflow.run_id')?.getStringValue()
    : undefined;

  const mlflowExperimentId = isMlflowAvailable && run ? getMlflowExperimentId(run) : undefined;

  const tabs: Record<string, { title: string; isDisabled?: boolean; content: React.ReactNode }> = {
    [PipelineRunNodeTab.INPUT_OUTPUT]: {
      title: 'Input/Output',
      isDisabled: hasNoInputsOutputs,
      content: <SelectedNodeInputOutputTab task={task} execution={taskExecution?.toObject()} />,
    },
    [PipelineRunNodeTab.DETAILS]: {
      title: 'Task details',
      content: (
        <SelectedNodeDetailsTab
          task={task}
          mlflowRunId={mlflowRunId}
          mlflowExperimentId={mlflowExperimentId}
        />
      ),
    },
    [PipelineRunNodeTab.VOLUMES]: {
      title: 'Volumes',
      isDisabled: !task.volumeMounts || task.volumeMounts.length === 0,
      content: renderDetailItems(
        (task.volumeMounts ?? []).map(({ name, mountPath }) => ({ key: mountPath, value: name })),
      ),
    },
    [PipelineRunNodeTab.LOGS]: {
      title: 'Logs',
      isDisabled: !task.status?.podName && !isCachedTask,
      content: <LogsTab task={task} isCached={isCachedTask} />,
    },
  };

  return (
    <>
      <Tabs activeKey={selection} mountOnEnter>
        {Object.entries(tabs).map(([tabName, { title, isDisabled }]) => (
          <Tab
            data-testid={`right-drawer-tab-${tabName}`}
            key={tabName}
            title={title}
            eventKey={tabName}
            tabContentId={tabName}
            isDisabled={isDisabled}
            onClick={() => setSelection(tabName)}
          />
        ))}
      </Tabs>
      {!tabs[selection].isDisabled && (
        <TabContent
          id={selection}
          eventKey={selection}
          activeKey={selection}
          style={{ flex: '1 1 auto' }}
        >
          <TabContentBody className="pf-v6-u-pl-sm pf-v6-u-pt-lg">
            {tabs[selection].content}
          </TabContentBody>
        </TabContent>
      )}
    </>
  );
};

export default PipelineRunDrawerRightTabs;
