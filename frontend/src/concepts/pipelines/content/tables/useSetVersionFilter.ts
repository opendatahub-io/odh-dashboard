import React from 'react';
import { useLocation } from 'react-router-dom';

import { PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { FilterOptions, FilterProps } from './usePipelineFilter';

/**
 * Update filter with the last location-stored pipeline version.
 * @param onFilterUpdate
 */
export const useSetVersionFilter = (onFilterUpdate: FilterProps['onFilterUpdate']): void => {
  const { state } = useLocation();
  const [versionToFilter, setVersionToFilter] = React.useState<PipelineVersionKFv2 | undefined>(
    state?.lastVersion,
  );

  React.useEffect(() => {
    if (versionToFilter) {
      onFilterUpdate(FilterOptions.PIPELINE_VERSION, {
        label: versionToFilter.display_name,
        value: versionToFilter.pipeline_version_id,
      });
    }

    return () => {
      // Reset the location-stored pipeline version to avoid re-creating
      // a filter that might otherwise have been removed/changed by the user.
      setVersionToFilter(undefined);
    };
  }, [onFilterUpdate, versionToFilter]);
};
