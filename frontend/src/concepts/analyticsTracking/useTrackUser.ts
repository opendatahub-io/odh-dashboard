import React from 'react';
import { useUser } from '#~/redux/selectors';
import { useAccessReview } from '#~/api';
import { AccessReviewResourceAttributes } from '#~/k8sTypes';
import { IdentifyEventProperties } from '#~/concepts/analyticsTracking/trackingProperties';

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
    const computeAnonymousUserId = async () => {
      const anonymousIDBuffer = await crypto.subtle.digest(
        'SHA-1',
        new TextEncoder().encode(username),
      );
      const anonymousIDArray = Array.from(new Uint8Array(anonymousIDBuffer));
      const aId = anonymousIDArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return aId;
    };

    if (!userID) {
      computeAnonymousUserId().then((val) => {
        setUserID(val);
      });
    }
    // compute anonymousId only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
