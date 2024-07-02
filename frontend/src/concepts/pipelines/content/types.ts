import * as React from 'react';
import { BreadcrumbItem } from '@patternfly/react-core';

export type PathProps = {
  breadcrumbPath: React.ReactElement<typeof BreadcrumbItem>[];
  contextPath: string;
};

export type PipelineCoreDetailsPageComponent = React.FC<PathProps>;

export enum PipelineRunSearchParam {
  TriggerType = 'triggerType',
}

export enum CompareRunsSearchParam {
  RUNS = 'runs',
}
