import React from 'react';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import type { IdentifyEventProperties } from '@odh-dashboard/ui-core/contexts/AnalyticsContext';
import { computeAnonymousUserId } from '@odh-dashboard/analytics';
import { useUser } from '#~/redux/selectors';

export const useTrackUser = (username?: string): [IdentifyEventProperties, boolean] => {
  const { isAdmin, userID } = useUser();
  const [finalUserID, setUserID] = React.useState<string | undefined>(userID);

  const createReviewResource: AccessReviewResourceAttributes = {
    group: 'project.openshift.io',
    resource: 'projectrequests',
    verb: 'create',
  };
  const [allowCreate, acLoaded] = useAccessReview(createReviewResource);

  React.useEffect(() => {
    if (!userID && username) {
      computeAnonymousUserId(username)
        .then((val) => {
          setUserID(val);
        })
        .catch(() => undefined);
    }
  }, [userID, username]);

  const props: IdentifyEventProperties = React.useMemo(
    () => ({
      isAdmin,
      canCreateProjects: allowCreate,
      userID: finalUserID,
    }),
    [isAdmin, allowCreate, finalUserID],
  );

  return [props, acLoaded && !!finalUserID];
};
