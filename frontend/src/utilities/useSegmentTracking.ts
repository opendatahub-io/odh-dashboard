import React from 'react';
import { useAppContext } from '~/app/AppContext';
import { initSegment } from '~/utilities/segmentIOUtils';
import { useAppSelector } from '~/redux/hooks';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { useAccessReview } from '~/api';
import { useUser } from '~/redux/selectors';
import { useWatchSegmentKey } from './useWatchSegmentKey';

export const useSegmentTracking = (): void => {
  const { segmentKey, loaded, loadError } = useWatchSegmentKey();
  const { dashboardConfig } = useAppContext();
  const username = useAppSelector((state) => state.user);
  const clusterID = useAppSelector((state) => state.clusterID);

  // TODO this should go to a helper, as it is called from multiple places
  const createReviewResource: AccessReviewResourceAttributes = {
    group: 'project.openshift.io',
    resource: 'projectrequests',
    verb: 'create',
  };
  const [allowCreate, createLoaded] = useAccessReview(createReviewResource);

  // TODO this should go to a helper, as it is called from multiple places
  const deleteReviewResource: AccessReviewResourceAttributes = {
    group: 'project.openshift.io',
    resource: 'projectrequests',
    verb: 'delete',
  };
  const [allowDelete, deleteLoaded] = useAccessReview(deleteReviewResource);

  const updateReviewResource: AccessReviewResourceAttributes = {
    group: 'datasciencecluster.opendatahub.io/v1',
    resource: 'DataScienceCluster',
    verb: 'update',
  };
  const [allowUpdate, updateLoaded] = useAccessReview(updateReviewResource);

  const { isAdmin } = useUser();

  React.useEffect(() => {
    if (
      segmentKey &&
      loaded &&
      !loadError &&
      createLoaded &&
      deleteLoaded &&
      updateLoaded &&
      username &&
      clusterID
    ) {
      window.clusterID = clusterID;
      initSegment({
        segmentKey,
        username,
        enabled: !dashboardConfig.spec.dashboardConfig.disableTracking,
        canCreate: allowCreate,
        canDelete: allowDelete,
        canUpdate: allowUpdate,
        isAdmin,
      });
    }
  }, [
    clusterID,
    loadError,
    loaded,
    segmentKey,
    username,
    dashboardConfig,
    allowCreate,
    allowDelete,
    isAdmin,
    createLoaded,
    deleteLoaded,
    updateLoaded,
    allowUpdate,
  ]);
};
