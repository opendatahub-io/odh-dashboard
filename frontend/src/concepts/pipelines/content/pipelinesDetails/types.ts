import * as React from 'react';
import { BreadcrumbItem } from '@patternfly/react-core';

export type PipelineCoreDetailsPageComponent = React.FC<{
  breadcrumbPath: React.ReactElement<typeof BreadcrumbItem>[];
}>;
