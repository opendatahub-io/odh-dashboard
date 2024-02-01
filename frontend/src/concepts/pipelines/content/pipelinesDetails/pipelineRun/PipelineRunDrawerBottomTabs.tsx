import * as React from 'react';
import { Tabs, Tab, TabContent, DrawerPanelBody } from '@patternfly/react-core';
import PipelineDetailsYAML from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsYAML';
import { PipelineRunKind } from '~/k8sTypes';
import { PipelineRunJobKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';
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
  pipelineRunDetails?: {
    kind: PipelineRunKind;
    kf: PipelineRunKF | PipelineRunJobKF;
  };
};

export const PipelineRunDrawerBottomTabs: React.FC<PipelineRunBottomDrawerProps> = ({
  selection,
  onSelection,
  pipelineRunDetails,
}) => {
  const isJob = isPipelineRunJob(pipelineRunDetails?.kf);

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
              data-testid={`bottom-drawer-tab-${RunDetailsTabTitles[tab]}`}
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
              workflowName={pipelineRunDetails?.kind.metadata.name}
              pipelineRunKF={pipelineRunDetails?.kf}
            />
          </TabContent>
          <TabContent
            id={RunDetailsTabs.PARAMETERS}
            eventKey={RunDetailsTabs.PARAMETERS}
            activeKey={selection}
            hidden={RunDetailsTabs.PARAMETERS !== selection}
          >
            <PipelineRunTabParameters pipelineSpec={pipelineRunDetails?.kf.pipeline_spec} />
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
                filename={pipelineRunDetails?.kf.name}
                content={
                  pipelineRunDetails
                    ? {
                        // eslint-disable-next-line camelcase
                        pipeline_runtime: { workflow_manifest: pipelineRunDetails.kind },
                        run: pipelineRunDetails.kf,
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
