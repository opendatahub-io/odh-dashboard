import { ConnectionTypeConfigMapObj } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import {
  filterEnabledConnectionTypes,
  isModelServingCompatible,
  ModelServingCompatibleTypes,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import React from 'react';

export const useEnabledModelServingConnectionTypes = (
  allModelServingConnectionTypes: ConnectionTypeConfigMapObj[],
): {
  enabledConnectionTypes: ConnectionTypeConfigMapObj[];
  uriConnectionTypes: ConnectionTypeConfigMapObj[];
  ociConnectionTypes: ConnectionTypeConfigMapObj[];
  s3ConnectionTypes: ConnectionTypeConfigMapObj[];
} => {
  const filteredModelServingConnectionTypes = React.useMemo(() => {
    return filterEnabledConnectionTypes(allModelServingConnectionTypes);
  }, [allModelServingConnectionTypes]);

  return React.useMemo(() => {
    const uriConnectionTypes = filteredModelServingConnectionTypes.filter((t) =>
      isModelServingCompatible(t, ModelServingCompatibleTypes.URI),
    );
    const ociConnectionTypes = filteredModelServingConnectionTypes.filter((t) =>
      isModelServingCompatible(t, ModelServingCompatibleTypes.OCI),
    );
    const s3ConnectionTypes = filteredModelServingConnectionTypes.filter((t) =>
      isModelServingCompatible(t, ModelServingCompatibleTypes.S3ObjectStorage),
    );

    return {
      enabledConnectionTypes: filteredModelServingConnectionTypes,
      uriConnectionTypes,
      ociConnectionTypes,
      s3ConnectionTypes,
    };
  }, [filteredModelServingConnectionTypes]);
};
