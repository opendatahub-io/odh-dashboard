import { WatchK8sResult, useK8sWatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import React from 'react';
import { AccessReviewResourceAttributes, GroupKind } from '~/k8sTypes';
import { GroupModel } from '~/api/models';
import { groupVersionKind } from '~/api/k8sUtils';
import { useAccessReview } from '~/api/useAccessReview';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'user.openshift.io',
  resource: 'groups',
  verb: 'list',
};

export const useGroups = (): WatchK8sResult<GroupKind[]> => {
  const [allowList, accessReviewLoaded] = useAccessReview(accessReviewResource);
  const [groupData, loaded, error] = useK8sWatchResource<GroupKind[]>(
    allowList && accessReviewLoaded
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(GroupModel),
        }
      : null,
    GroupModel,
  );
  return React.useMemo(() => {
    if (!allowList) {
      return [[], true, undefined];
    }
    return [groupData, loaded, error];
  }, [error, groupData, loaded, allowList]);
};
