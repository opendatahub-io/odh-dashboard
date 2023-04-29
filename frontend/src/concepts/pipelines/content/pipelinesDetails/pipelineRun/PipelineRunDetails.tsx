import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Drawer,
  DrawerContent,
  DrawerContentBody,
} from '@patternfly/react-core';
import { useParams } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { PipelineTopology, usePipelineTaskTopology } from '~/concepts/pipelines/topology';
import { PipelineRunKind } from '~/k8sTypes';
import MarkdownView from '~/components/MarkdownView';
import usePipelineRunById from '~/concepts/pipelines/apiHooks/usePipelineRunById';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/pipelinesDetails/types';
import { PipelineRunResourceKF } from '~/concepts/pipelines/kfTypes';
import PipelineTopologyEmpty from '~/concepts/pipelines/content/pipelinesDetails/PipelineTopologyEmpty';
import PipelineRunDrawerBottomContent from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerBottomContent';
import PipelineRunDetailsActions from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetailsActions';
import PipelineRunDrawerRightContent from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightContent';
import { RunDetailsTabSelection } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerBottomTabs';

const getPipelineRunKind = (
  pipelineRuntime?: PipelineRunResourceKF['pipeline_runtime'],
): PipelineRunKind | null => {
  if (!pipelineRuntime) {
    return null;
  }
  try {
    return JSON.parse(pipelineRuntime.workflow_manifest);
  } catch (e) {
    return null;
  }
};

const PipelineRunDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath }) => {
  const { pipelineRunId } = useParams();
  const [runResource, loaded, error] = usePipelineRunById(pipelineRunId);
  const [, setDeleting] = React.useState(false);
  const [detailsTab, setDetailsTab] = React.useState<RunDetailsTabSelection>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const pipelineRuntime = getPipelineRunKind(runResource?.pipeline_runtime);
  const { taskMap, nodes } = usePipelineTaskTopology(pipelineRuntime);
  const run = runResource?.run;

  return (
    <Drawer isExpanded={!!selectedId}>
      <DrawerContent
        panelContent={
          <PipelineRunDrawerRightContent
            task={selectedId ? taskMap[selectedId] : undefined}
            onClose={() => setSelectedId(null)}
          />
        }
      >
        <DrawerContentBody>
          <Drawer isInline isExpanded position="bottom">
            <DrawerContent
              panelContent={
                <PipelineRunDrawerBottomContent
                  detailsTab={detailsTab}
                  onSelectionChange={(selection) => {
                    setDetailsTab(selection);
                    setSelectedId(null);
                  }}
                  pipelineRunDetails={
                    runResource && pipelineRuntime
                      ? { kf: runResource.run, kind: pipelineRuntime }
                      : undefined
                  }
                />
              }
            >
              <ApplicationsPage
                title={run?.name ?? 'Loading...'}
                description={run ? <MarkdownView conciseDisplay markdown={run.description} /> : ''}
                loaded={loaded}
                loadError={error}
                breadcrumb={
                  <Breadcrumb>
                    {breadcrumbPath}
                    <BreadcrumbItem isActive>{run?.name || 'Loading...'}</BreadcrumbItem>
                  </Breadcrumb>
                }
                headerAction={
                  <PipelineRunDetailsActions run={run} onDelete={() => setDeleting(true)} />
                }
                empty={false}
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
                        setDetailsTab(null);
                        setSelectedId(firstId);
                      }
                    }}
                  />
                )}
              </ApplicationsPage>
            </DrawerContent>
          </Drawer>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default PipelineRunDetails;
