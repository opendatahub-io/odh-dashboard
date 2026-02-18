import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Label,
  PageSection,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Title,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Timestamp,
  TimestampFormat,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import { SyncAltIcon } from '@patternfly/react-icons/dist/esm/icons/sync-alt-icon';
import { PipelineRunKF, PipelineVersionKF, RuntimeStateKF } from '~/app/types/pipeline';
import { usePipelineTaskTopology } from '~/app/topology/usePipelineTaskTopology';
import PipelineTopology from '~/app/topology/PipelineTopology';

type RunDetailsProps = {
  runs: PipelineRunKF[];
  pipelineVersion: PipelineVersionKF;
};

const getStatusLabel = (state: string) => {
  switch (state) {
    case RuntimeStateKF.SUCCEEDED:
    case 'SUCCEEDED':
      return (
        <Label color="green" icon={<CheckCircleIcon />}>
          Succeeded
        </Label>
      );
    case RuntimeStateKF.FAILED:
    case 'FAILED':
      return (
        <Label color="red" icon={<ExclamationCircleIcon />}>
          Failed
        </Label>
      );
    case RuntimeStateKF.RUNNING:
    case 'RUNNING':
      return (
        <Label color="blue" icon={<SyncAltIcon />}>
          Running
        </Label>
      );
    default:
      return <Label>{state}</Label>;
  }
};

const RunDetails: React.FC<RunDetailsProps> = ({ runs, pipelineVersion }) => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = React.useState<string[] | undefined>();

  const run = runs.find((r) => r.run_id === runId);

  const pipelineSpec = pipelineVersion.pipeline_spec;

  const nodes = usePipelineTaskTopology(pipelineSpec, run?.run_details);

  if (!run) {
    return (
      <PageSection>
        <Title headingLevel="h1">Run not found</Title>
      </PageSection>
    );
  }

  const duration =
    run.finished_at && run.created_at
      ? Math.round(
          (new Date(run.finished_at).getTime() - new Date(run.created_at).getTime()) / 1000,
        )
      : undefined;
  const durationStr = duration ? `${Math.floor(duration / 60)}m ${duration % 60}s` : '-';

  return (
    <Stack hasGutter>
      <StackItem>
        <PageSection style={{ paddingBottom: 0 }}>
          <Breadcrumb>
            <BreadcrumbItem
              to="#"
              onClick={(e) => {
                e.preventDefault();
                navigate('..');
              }}
            >
              AutoRAG
            </BreadcrumbItem>
            <BreadcrumbItem isActive>{run.display_name}</BreadcrumbItem>
          </Breadcrumb>
        </PageSection>
      </StackItem>
      <StackItem>
        <PageSection style={{ paddingTop: 0 }}>
          <Split hasGutter>
            <SplitItem>
              <Title headingLevel="h1">{run.display_name}</Title>
            </SplitItem>
            <SplitItem>{getStatusLabel(run.state)}</SplitItem>
          </Split>
          <DescriptionList isHorizontal isCompact style={{ marginTop: 16 }}>
            <DescriptionListGroup>
              <DescriptionListTerm>Pipeline</DescriptionListTerm>
              <DescriptionListDescription>
                {pipelineVersion.display_name}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Created</DescriptionListTerm>
              <DescriptionListDescription>
                <Timestamp date={new Date(run.created_at)} dateFormat={TimestampFormat.long} />
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Duration</DescriptionListTerm>
              <DescriptionListDescription>{durationStr}</DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </PageSection>
      </StackItem>
      <StackItem isFilled>
        <div style={{ height: 500, position: 'relative' }}>
          <PipelineTopology
            nodes={nodes}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>
      </StackItem>
    </Stack>
  );
};

export default RunDetails;
