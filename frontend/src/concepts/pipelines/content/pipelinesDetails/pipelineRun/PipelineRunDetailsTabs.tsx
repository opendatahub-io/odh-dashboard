import React from 'react';

import { Tabs, Tab, TabTitleText, TabContentBody, TabContent } from '@patternfly/react-core';

import PipelineDetailsYAML from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsYAML';
import {
  PipelineRecurringRunKFv2,
  PipelineRunKFv2,
  PipelineSpecVariable,
} from '~/concepts/pipelines/kfTypes';
import { isPipelineRecurringRun } from '~/concepts/pipelines/content/utils';
import PipelineRunTabDetails from './PipelineRunTabDetails';

enum DetailsTabKey {
  Graph = 'graph',
  Details = 'details',
  Spec = 'spec',
}

interface PipelineRunDetailsTabsProps {
  run: PipelineRunKFv2 | PipelineRecurringRunKFv2 | null;
  pipelineSpec: PipelineSpecVariable | undefined;
  graphContent: React.ReactNode;
  versionError?: Error;
}

export const PipelineRunDetailsTabs: React.FC<PipelineRunDetailsTabsProps> = ({
  run,
  pipelineSpec,
  graphContent,
  versionError,
}) => {
  const [activeKey, setActiveKey] = React.useState<string | number>(DetailsTabKey.Graph);
  const isRecurringRun = run && isPipelineRecurringRun(run);

  return (
    <>
      <Tabs
        activeKey={activeKey}
        onSelect={(_, eventKey) => setActiveKey(eventKey)}
        aria-label="Pipeline run details tabs"
      >
        <Tab
          eventKey={DetailsTabKey.Graph}
          tabContentId={DetailsTabKey.Graph}
          title={<TabTitleText>Graph</TabTitleText>}
          aria-label="Run graph tab"
          data-testid="pipeline-run-tab-graph"
        />

        <Tab
          eventKey={DetailsTabKey.Details}
          title={<TabTitleText>Details</TabTitleText>}
          aria-label="Run details tab"
          data-testid="pipeline-run-tab-details"
        >
          <TabContentBody hasPadding>
            <PipelineRunTabDetails workflowName={run?.display_name} run={run} />
          </TabContentBody>
        </Tab>

        {!isRecurringRun && (
          <Tab
            eventKey={DetailsTabKey.Spec}
            tabContentId={DetailsTabKey.Spec}
            title={<TabTitleText>Pipeline spec</TabTitleText>}
            aria-label="Run spec tab"
            data-testid="pipeline-run-tab-spec"
          />
        )}
      </Tabs>

      <div style={{ flex: 1 }} hidden={activeKey !== DetailsTabKey.Graph}>
        <TabContent
          id={DetailsTabKey.Graph}
          eventKey={DetailsTabKey.Graph}
          className="pf-v5-u-h-100"
          data-testid="pipeline-graph-tab"
        >
          <TabContentBody className="pf-v5-u-h-100">{graphContent}</TabContentBody>
        </TabContent>
      </div>

      <TabContent
        id={DetailsTabKey.Spec}
        eventKey={DetailsTabKey.Spec}
        hidden={activeKey !== DetailsTabKey.Spec}
        style={{ flex: 1 }}
        data-testid="pipeline-spec-tab"
      >
        <TabContentBody className="pf-v5-u-h-100">
          <PipelineDetailsYAML
            filename={run?.display_name}
            content={pipelineSpec}
            versionError={versionError}
          />
        </TabContentBody>
      </TabContent>
    </>
  );
};
