import React from 'react';

import {
  Tabs,
  Tab,
  TabTitleText,
  TabContentBody,
  TabContent,
  PageSection,
  FlexItem,
  Flex,
} from '@patternfly/react-core';

import PipelineDetailsYAML from '#~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsYAML';
import {
  PipelineRecurringRunKF,
  PipelineRunKF,
  PipelineSpecVariable,
} from '#~/concepts/pipelines/kfTypes';
import { isPipelineRecurringRun } from '#~/concepts/pipelines/content/utils';
import { Artifact } from '#~/third_party/mlmd';
import PipelineRunTabDetails from './PipelineRunTabDetails';
import PipelineRunTabParameters from './PipelineRunTabParameters';

enum DetailsTabKey {
  Graph = 'graph',
  Details = 'details',
  InputParameter = 'input-parameter',
  Spec = 'spec',
}

interface PipelineRunDetailsTabsProps {
  run: PipelineRunKF | PipelineRecurringRunKF | null;
  pipelineSpec: PipelineSpecVariable | undefined;
  graphContent: React.ReactNode;
  versionError?: Error;
  artifacts?: Artifact[];
}

export const PipelineRunDetailsTabs: React.FC<PipelineRunDetailsTabsProps> = ({
  run,
  pipelineSpec,
  graphContent,
  versionError,
  artifacts,
}) => {
  const [activeKey, setActiveKey] = React.useState<string | number>(DetailsTabKey.Graph);
  const isRecurringRun = run && isPipelineRecurringRun(run);

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      padding={{ default: 'noPadding' }}
      style={{ flexBasis: 0 }}
    >
      <Flex
        direction={{ default: 'column' }}
        style={{ height: '100%' }}
        spaceItems={{ default: 'spaceItemsNone' }}
      >
        <FlexItem>
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
                <PipelineRunTabDetails
                  workflowName={run?.display_name}
                  run={run}
                  artifacts={artifacts}
                />
              </TabContentBody>
            </Tab>
            <Tab
              eventKey={DetailsTabKey.InputParameter}
              title={<TabTitleText>Input parameters</TabTitleText>}
              aria-label="Input parameter tab"
              data-testid="pipeline-run-tab-parameters"
            >
              <TabContentBody data-testid="pipeline-parameter-tab" hasPadding>
                <PipelineRunTabParameters run={run} pipelineSpec={pipelineSpec} />
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
        </FlexItem>
        <FlexItem flex={{ default: 'flex_1' }} style={{ overflowY: 'hidden' }}>
          <TabContent
            id={DetailsTabKey.Graph}
            eventKey={DetailsTabKey.Graph}
            className="pf-v6-u-h-100"
            data-testid="pipeline-graph-tab"
            hidden={activeKey !== DetailsTabKey.Graph}
          >
            <TabContentBody className="pf-v6-u-h-100">{graphContent}</TabContentBody>
          </TabContent>

          <TabContent
            id={DetailsTabKey.Spec}
            eventKey={DetailsTabKey.Spec}
            hidden={activeKey !== DetailsTabKey.Spec}
            style={{ flex: 1 }}
            className="pf-v6-u-h-100"
            data-testid="pipeline-spec-tab"
          >
            <TabContentBody className="pf-v6-u-h-100" hasPadding>
              <PipelineDetailsYAML
                filename={run?.display_name}
                content={pipelineSpec}
                versionError={versionError}
              />
            </TabContentBody>
          </TabContent>
        </FlexItem>
      </Flex>
    </PageSection>
  );
};
