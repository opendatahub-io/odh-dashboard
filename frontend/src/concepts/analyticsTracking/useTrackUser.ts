import React from 'react';
import { useUser } from '~/redux/selectors';
import { useAccessReview } from '~/api';
import { AccessReviewResourceAttributes } from '~/k8sTypes';
import { IdentifyEventProperties } from '~/concepts/analyticsTracking/trackingProperties';

export const useTrackUser = (username?: string): [IdentifyEventProperties, boolean] => {
  const { isAdmin } = useUser();
  const [anonymousId, setAnonymousId] = React.useState<string | undefined>(undefined);

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

    computeAnonymousUserId().then((val) => {
      setAnonymousId(val);
    });
    // compute anonymousId only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const props: IdentifyEventProperties = React.useMemo(
    () => ({
      isAdmin,
      canCreateProjects: allowCreate,
      anonymousID: anonymousId,
    }),
    [isAdmin, allowCreate, anonymousId],
  );

  return [props, acLoaded && !!anonymousId];
};
