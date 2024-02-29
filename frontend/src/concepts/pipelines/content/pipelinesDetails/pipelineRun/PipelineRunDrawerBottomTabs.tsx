import * as React from 'react';
import { Tabs, Tab, TabContent, DrawerPanelBody } from '@patternfly/react-core';
import PipelineDetailsYAML from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsYAML';
import { PipelineRunJobKFv2, PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { isPipelineRunJob } from '~/concepts/pipelines/content/utils';
import PipelineRunTabDetails from './PipelineRunTabDetails';
import PipelineRunTabParameters from './PipelineRunTabParameters';

export enum RunDetailsTabs {
  DETAILS = 'details',
  PARAMETERS = 'input-parameters',
  YAML = 'run-output',
}

const RunDetailsTabTitles = {
  [RunDetailsTabs.DETAILS]: 'Details',
  [RunDetailsTabs.PARAMETERS]: 'Input parameters',
  [RunDetailsTabs.YAML]: 'Run output',
};

export type RunDetailsTabSelection = RunDetailsTabs | null;

type PipelineRunBottomDrawerProps = {
  selection: RunDetailsTabSelection;
  onSelection: (id: RunDetailsTabs) => void;
  pipelineRunDetails?: PipelineRunKFv2 | PipelineRunJobKFv2;
};

export const PipelineRunDrawerBottomTabs: React.FC<PipelineRunBottomDrawerProps> = ({
  selection,
  onSelection,
  pipelineRunDetails,
}) => {
  const isJob = pipelineRunDetails && isPipelineRunJob(pipelineRunDetails);

  return (
    <>
      <Tabs
        activeKey={selection ?? undefined}
        style={{ flexShrink: 0 }}
        data-testid="pipeline-run-drawer-bottom"
      >
        {Object.values(RunDetailsTabs)
          .filter((key) => (isJob ? key !== RunDetailsTabs.YAML : true)) // do not include yaml tab for jobs
          .map((tab) => (
            <Tab
              data-testid={`bottom-drawer-tab-${tab}`}
              key={tab}
              title={RunDetailsTabTitles[tab]}
              eventKey={tab}
              tabContentId={tab}
              onClick={() => onSelection(tab)}
            />
          ))}
      </Tabs>
      {selection && (
        <DrawerPanelBody style={{ flexGrow: 1, overflow: 'hidden auto' }}>
          <TabContent
            id={RunDetailsTabs.DETAILS}
            eventKey={RunDetailsTabs.DETAILS}
            activeKey={selection}
            hidden={RunDetailsTabs.DETAILS !== selection}
          >
            <PipelineRunTabDetails
              workflowName={pipelineRunDetails?.display_name}
              pipelineRunKF={pipelineRunDetails}
            />
          </TabContent>
          <TabContent
            id={RunDetailsTabs.PARAMETERS}
            eventKey={RunDetailsTabs.PARAMETERS}
            activeKey={selection}
            hidden={RunDetailsTabs.PARAMETERS !== selection}
          >
            <PipelineRunTabParameters run={pipelineRunDetails} />
          </TabContent>
          {!isJob && ( // do not include yaml tab for jobs
            <TabContent
              id={RunDetailsTabs.YAML}
              eventKey={RunDetailsTabs.YAML}
              activeKey={selection}
              hidden={RunDetailsTabs.YAML !== selection}
              style={{ height: '100%' }}
            >
              <PipelineDetailsYAML
                filename={pipelineRunDetails?.display_name}
                content={
                  pipelineRunDetails
                    ? {
                        run: pipelineRunDetails,
                      }
                    : null
                }
              />
            </TabContent>
          )}
        </DrawerPanelBody>
      )}
    </>
  );
};

export default PipelineRunDrawerBottomTabs;
