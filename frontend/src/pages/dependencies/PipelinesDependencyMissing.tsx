import * as React from 'react';
import {
  EmptyState,
  EmptyStateIcon,
  Title,
  EmptyStateBody,
  EmptyStateVariant,
  Bullseye,
  Button,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useOpenShiftURL } from '~/utilities/clusterUtils';
import { useUser } from '~/redux/selectors';
import { ODH_PRODUCT_NAME } from '~/utilities/const';

const PipelinesDependencyMissing: React.FC = () => {
  const url = useOpenShiftURL();
  const { isAdmin } = useUser();

  if (isAdmin) {
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
                  `${url}/operatorhub/ns/startup-pipeline-state?details-item=openshift-pipelines-operator-rh-redhat-operators-openshift-marketplace`,
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
