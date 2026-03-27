import React from 'react';
import {
  k8sGetResource,
  WatchK8sResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { AccessReviewResourceAttributes, GroupKind } from '#~/k8sTypes';
import { GroupModel } from '#~/api/models';
import { groupVersionKind } from '#~/api/k8sUtils';
import { useAccessReview } from '#~/api/useAccessReview';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';
import { CustomWatchK8sResult } from '#~/types';

const GROUP_LIST_LIMIT = 250;

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
    // When there are more groups than the SDK pagination limit (250),
    // the SDK may return partial data with an error. Accept partial data
    // as loaded to prevent the page from crashing.
    if (groupData.length > 0 && error) {
      return [groupData, true, undefined];
    }
    return [groupData, loaded, error];
  }, [accessReviewLoaded, allowList, groupData, loaded, error]);
};

/** Validate that a single group exists by name. Returns true if the group exists. */
export const validateGroupName = async (name: string): Promise<boolean> => {
  try {
    await k8sGetResource<GroupKind>({ model: GroupModel, queryOptions: { name } });
    return true;
  } catch {
    return false;
  }
};

export { GROUP_LIST_LIMIT };
