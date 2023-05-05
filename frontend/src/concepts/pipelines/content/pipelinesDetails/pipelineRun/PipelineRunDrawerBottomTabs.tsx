import * as React from 'react';
import { Tabs, Tab, TabContent, DrawerPanelBody } from '@patternfly/react-core';
import PipelineRunTabDetails from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunTabDetails';
import PipelineDetailsYAML from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsYAML';
import { PipelineRunKind } from '~/k8sTypes';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';

export enum RunDetailsTabs {
  DETAILS = 'Details',
  YAML = 'Run output',
}

export type RunDetailsTabSelection = RunDetailsTabs | null;

type PipelineRunBottomDrawerProps = {
  selection: RunDetailsTabSelection;
  onSelection: (id: RunDetailsTabs) => void;
  pipelineRunDetails?: {
    kind: PipelineRunKind;
    kf: PipelineRunKF;
  };
};

export const PipelineRunDrawerBottomTabs: React.FC<PipelineRunBottomDrawerProps> = ({
  selection,
  onSelection,
  pipelineRunDetails,
}) => (
  <>
    <Tabs activeKey={selection ?? undefined}>
      {Object.values(RunDetailsTabs).map((tab) => (
        <Tab
          key={tab}
          title={tab}
          eventKey={tab}
          tabContentId={tab}
          onClick={() => onSelection(tab)}
        />
      ))}
    </Tabs>
    {selection && (
      <div style={{ height: '100%', overflow: 'hidden auto' }}>
        <DrawerPanelBody>
          <TabContent
            id={RunDetailsTabs.DETAILS}
            eventKey={RunDetailsTabs.DETAILS}
            activeKey={selection ?? ''}
            hidden={RunDetailsTabs.DETAILS !== selection}
          >
            <PipelineRunTabDetails
              workflowName={pipelineRunDetails?.kind.metadata.name}
              pipelineRunKF={pipelineRunDetails?.kf}
            />
          </TabContent>
          <TabContent
            id={RunDetailsTabs.YAML}
            eventKey={RunDetailsTabs.YAML}
            activeKey={selection ?? ''}
            hidden={RunDetailsTabs.YAML !== selection}
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
        </DrawerPanelBody>
      </div>
    )}
  </>
);

export default PipelineRunDrawerBottomTabs;
