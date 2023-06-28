import * as React from 'react';
import {
  EmptyState,
  EmptyStateIcon,
  Title,
  EmptyStateBody,
  EmptyStateVariant,
  Bullseye,
  Button,
  Spinner,
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
        <EmptyState variant={EmptyStateVariant.large}>
          <EmptyStateIcon
            color="var(--pf-global--danger-color--100)"
            icon={ExclamationCircleIcon}
          />
          <Title headingLevel="h2" size="2xl">
            Install the Pipelines Operator
          </Title>
          <EmptyStateBody>
            To use pipelines, first install the Red Hat OpenShift Pipelines Operator.
          </EmptyStateBody>
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
        </EmptyState>
      </Bullseye>
    );
  }

  return (
    <Bullseye>
      <EmptyState variant={EmptyStateVariant.large}>
        <EmptyStateIcon color="var(--pf-global--danger-color--100)" icon={ExclamationCircleIcon} />
        <Title headingLevel="h2" size="2xl">
          Missing the pipelines operator
        </Title>
        <EmptyStateBody>
          To use pipelines, first your {ODH_PRODUCT_NAME} admin needs to install the Red Hat
          OpenShift Pipelines operator.
        </EmptyStateBody>
      </EmptyState>
    </Bullseye>
  );
};

export default PipelinesDependencyMissing;
