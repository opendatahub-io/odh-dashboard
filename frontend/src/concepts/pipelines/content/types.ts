import * as React from 'react';
import { BreadcrumbItem } from '@patternfly/react-core';

export type PathProps = {
  breadcrumbPath: React.ReactElement<typeof BreadcrumbItem>[];
  contextPath: string;
};

export type PipelineCoreDetailsPageComponent = React.FC<PathProps>;

export type BreadcrumbDetailsComponentProps = React.FC<
  PathProps & { setHomePath: React.Dispatch<React.SetStateAction<string>> }
>;

export enum PipelineRunSearchParam {
  TriggerType = 'triggerType',
}

export enum CompareRunsSearchParam {
  RUNS = 'compareRuns',
}
