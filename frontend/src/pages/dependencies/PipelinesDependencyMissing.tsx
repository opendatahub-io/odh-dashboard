import * as React from 'react';
import {
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  EmptyStateVariant,
  Bullseye,
  Button,
  Spinner,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useOpenShiftURL } from '~/utilities/clusterUtils';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import { useAccessReview } from '~/api';
import { AccessReviewResourceAttributes } from '~/k8sTypes';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'operators.coreos.com/v1alpha1',
  resource: 'ClusterServiceVersion',
  verb: 'create',
};

const PipelinesDependencyMissing: React.FC = () => {
  const url = useOpenShiftURL();

  const [allowCreate, rbacLoaded] = useAccessReview(accessReviewResource);

  if (!rbacLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (allowCreate) {
    return (
      <Bullseye>
        <EmptyState variant={EmptyStateVariant.lg}>
          <EmptyStateHeader
            titleText="Install the Pipelines Operator"
            icon={
              <EmptyStateIcon
                color="var(--pf-v5-global--danger-color--100)"
                icon={ExclamationCircleIcon}
              />
            }
            headingLevel="h2"
          />
          <EmptyStateBody>
            To use pipelines, first install the Red Hat OpenShift Pipelines Operator.
          </EmptyStateBody>
          <EmptyStateFooter>
            {url && (
              <Button
                variant="primary"
                onClick={() => {
                  window.open(
                    `${url}/operatorhub/ns/openshift-operators?keyword=red+hat+openshift+pipelines`,
                  );
                }}
              >
                Install operator
              </Button>
            )}
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  return (
    <Bullseye>
      <EmptyState variant={EmptyStateVariant.lg}>
        <EmptyStateHeader
          titleText="Missing the pipelines operator"
          icon={
            <EmptyStateIcon
              color="var(--pf-v5-global--danger-color--100)"
              icon={ExclamationCircleIcon}
            />
          }
          headingLevel="h2"
        />
        <EmptyStateBody>
          To use pipelines, first your {ODH_PRODUCT_NAME} admin needs to install the Red Hat
          OpenShift Pipelines operator.
        </EmptyStateBody>
      </EmptyState>
    </Bullseye>
  );
};

export default PipelinesDependencyMissing;
