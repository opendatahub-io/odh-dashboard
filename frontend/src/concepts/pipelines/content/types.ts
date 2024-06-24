import * as React from 'react';
import { BreadcrumbItem } from '@patternfly/react-core';
import { PipelineRunType } from '~/pages/pipelines/global/runs';

export type PathProps = {
  breadcrumbPath: (runType?: PipelineRunType | null) => React.ReactElement<typeof BreadcrumbItem>[];
  contextPath?: string;
};

export type PipelineCoreDetailsPageComponent = React.FC<PathProps>;

export enum PipelineRunSearchParam {
  RunType = 'runType',
  TriggerType = 'triggerType',
}

export enum CompareRunsSearchParam {
  RUNS = 'runs',
}
