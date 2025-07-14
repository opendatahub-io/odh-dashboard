import * as React from 'react';

import { FilterOptions } from '#~/concepts/pipelines/content/tables/usePipelineFilter';
import { default as FilterToolbar, ToolbarFilterProps } from '#~/components/FilterToolbar';

const PipelineFilterBar = <Options extends FilterOptions>(
  props: ToolbarFilterProps<Options>,
): React.JSX.Element => <FilterToolbar {...props} testId="pipeline-filter" />;

export default PipelineFilterBar;
