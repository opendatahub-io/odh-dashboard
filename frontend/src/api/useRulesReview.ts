import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import * as React from 'react';
import { SelfSubjectRulesReviewModel } from '#~/api/models';
import { SelfSubjectRulesReviewKind } from '#~/k8sTypes';

const checkAccess = (ns: string): Promise<SelfSubjectRulesReviewKind> => {
  const selfSubjectRulesReview: SelfSubjectRulesReviewKind = {
    apiVersion: 'authorization.k8s.io/v1',
    kind: 'SelfSubjectRulesReview',
    spec: {
      namespace: ns,
    },
  };
  return k8sCreateResource<SelfSubjectRulesReviewKind>({
    model: SelfSubjectRulesReviewModel,
    resource: selfSubjectRulesReview,
  });
};

export const useRulesReview = (
  namespace: string | undefined,
): [SelfSubjectRulesReviewKind['status'], boolean, () => void] => {
  const [loaded, setLoaded] = React.useState(false);
  const [status, setStatus] = React.useState<SelfSubjectRulesReviewKind['status']>(undefined);

  const refreshRulesReview = React.useCallback(() => {
    // If namespace is undefined, mark as loaded but don't make the API call
    if (!namespace) {
      setLoaded(true);
      return;
    }

    setLoaded(false);
    checkAccess(namespace)
      .then((result) => {
        if (!result.status?.incomplete && !result.status?.evaluationError) {
          setStatus(result.status);
        }
        setLoaded(true);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('SelfSubjectRulesReview failed', e);
        setLoaded(true);
      });
  }, [namespace]);

  React.useEffect(() => {
    refreshRulesReview();
  }, [refreshRulesReview]);

  return [status, loaded, refreshRulesReview];
};
