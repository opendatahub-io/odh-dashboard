import { k8sCreateResource } from '@openshift/dynamic-plugin-sdk-utils';
import * as React from 'react';
import { ProjectModel, SelfSubjectAccessReviewModel } from '~/api/models';
import { AccessReviewResourceAttributes, SelfSubjectAccessReviewKind } from '~/k8sTypes';

const checkAccess = ({
  group,
  resource,
  subresource,
  verb,
  name,
  namespace,
}: Required<AccessReviewResourceAttributes>): Promise<SelfSubjectAccessReviewKind> => {
  // Projects are a special case. `namespace` must be set to the project name
  // even though it's a cluster-scoped resource.
  const reviewNamespace =
    group === ProjectModel.apiGroup && resource === ProjectModel.plural ? name : namespace;
  const selfSubjectAccessReview: SelfSubjectAccessReviewKind = {
    apiVersion: 'authorization.k8s.io/v1',
    kind: 'SelfSubjectAccessReview',
    spec: {
      resourceAttributes: {
        group,
        resource,
        subresource,
        verb,
        name,
        namespace: reviewNamespace,
      },
    },
  };
  return k8sCreateResource<SelfSubjectAccessReviewKind>({
    model: SelfSubjectAccessReviewModel,
    resource: selfSubjectAccessReview,
  });
};

export const useAccessReview = (
  resourceAttributes: AccessReviewResourceAttributes,
  shouldRunCheck = true,
): [boolean, boolean] => {
  const [loaded, setLoaded] = React.useState(false);
  const [isAllowed, setAllowed] = React.useState(false);

  const {
    group = '',
    resource = '',
    subresource = '',
    verb,
    name = '',
    namespace = '',
  } = resourceAttributes;

  React.useEffect(() => {
    if (shouldRunCheck) {
      checkAccess({ group, resource, subresource, verb, name, namespace })
        .then((result) => {
          if (result.status) {
            setAllowed(result.status.allowed);
          } else {
            setAllowed(true);
          }
          setLoaded(true);
        })
        .catch((e) => {
          // eslint-disable-next-line no-console
          console.warn('SelfSubjectAccessReview failed', e);
          setAllowed(true);
          setLoaded(true);
        });
    }
  }, [group, name, namespace, resource, subresource, verb, shouldRunCheck]);

  return [isAllowed, loaded];
};
