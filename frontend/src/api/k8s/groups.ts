import React from 'react';
import { WatchK8sResource } from '@openshift/dynamic-plugin-sdk-utils';
import { AccessReviewResourceAttributes, GroupKind } from '#~/k8sTypes';
import { GroupModel } from '#~/api/models';
import { groupVersionKind } from '#~/api/k8sUtils';
import { useAccessReview } from '#~/api/useAccessReview';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';
import { CustomWatchK8sResult } from '#~/types';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'user.openshift.io',
  resource: 'groups',
  verb: 'list',
};

export const useGroups = (): CustomWatchK8sResult<GroupKind[]> => {
  const [allowList, accessReviewLoaded] = useAccessReview(accessReviewResource);
  const initResource: WatchK8sResource | null =
    allowList && accessReviewLoaded
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(GroupModel),
        }
      : null;

  const [groupData, loaded, error] = useK8sWatchResourceList<GroupKind[]>(initResource, GroupModel);

  return React.useMemo(() => {
    if (!accessReviewLoaded) {
      return [[], false, undefined];
    }
    if (!allowList) {
      return [[], true, undefined];
    }
    return [groupData, loaded, error];
  }, [accessReviewLoaded, allowList, groupData, loaded, error]);
};
