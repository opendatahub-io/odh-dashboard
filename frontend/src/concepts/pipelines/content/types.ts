import * as React from 'react';
import { BreadcrumbItem } from '@patternfly/react-core';
import { PipelineRunTask, PipelineRunTaskRunStatus } from '~/k8sTypes';
import { createNode } from '~/concepts/topology';

export type PathProps = {
  breadcrumbPath: React.ReactElement<typeof BreadcrumbItem>[];
  contextPath?: string;
};

export type PipelineCoreDetailsPageComponent = React.FC<PathProps>;

export type PipelineRunTaskRunDetails = {
  runID: string;
} & PipelineRunTaskRunStatus;

export type PipelineRunTaskDetails = {
  runDetails?: PipelineRunTaskRunDetails;
  skipped: boolean;
} & PipelineRunTask;

/** [Task.name]: Task */
export type TaskReferenceMap = Record<string, PipelineRunTaskDetails>;

export type KubeFlowTaskTopology = {
  taskMap: TaskReferenceMap;
  nodes: ReturnType<typeof createNode>[];
};

export enum PipelineRunSearchParam {
  RunType = 'runType',
  TriggerType = 'triggerType',
}
