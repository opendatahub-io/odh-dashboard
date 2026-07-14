import * as React from 'react';

import {
  default as FilterToolbar,
  ToolbarFilterProps,
} from '@odh-dashboard/ui-core/components/FilterToolbar';
import { FilterOptions } from '#~/concepts/pipelines/content/tables/usePipelineFilter';

const PipelineFilterBar = <Options extends FilterOptions>(
  props: ToolbarFilterProps<Options>,
): React.JSX.Element => <FilterToolbar {...props} testId="pipeline-filter" />;

export default PipelineFilterBar;
