import React from 'react';
import {
  Alert,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import type { ExternalDataMap } from '../deploymentWizard/ExternalDataLoader';
import { ExternalRouteField } from '../deploymentWizard/fields/ExternalRouteField';
import { GenericFieldRenderer } from '../deploymentWizard/fields/GenericFieldRenderer';
import { GenAiStudioAvailabilityFields } from '../deploymentWizard/fields/ModelAvailabilityFields';
import { TokenAuthenticationField } from '../deploymentWizard/fields/TokenAuthenticationField';
import type { UseModelDeploymentWizardState } from '../deploymentWizard/useDeploymentWizard';

type UsersAndAvailabilityFormProps = {
  wizardState: UseModelDeploymentWizardState;
  externalData: ExternalDataMap;
  allowCreate: boolean;
};

const UsersAndAvailabilityForm: React.FC<UsersAndAvailabilityFormProps> = ({
  wizardState,
  externalData,
  allowCreate,
}) => {
  if (!wizardState.loaded.externalDataLoaded) {
    return <Spinner data-testid="spinner" />;
  }

  const { modelAvailability, externalRoute, tokenAuthentication } = wizardState.state;
  const { isExternalRouteVisible, shouldAutoCheckTokens } = wizardState.advancedOptions;
  const hasUsersField = wizardState.fields.some((field) => field.parentId === 'model-users');
  const showAvailability = modelAvailability.showField && modelAvailability.isGenAiEnabled;
  const maasConfigurationAlert = modelAvailability.isMaaSSubscriptionSelected && (
    <Alert
      className="pf-v6-u-mt-md"
      variant="info"
      title="Additional configuration required"
      data-testid="maas-additional-configuration-alert"
      isInline
    >
      To make the endpoint accessible to users, an admin must configure subscriptions and
      authorization policies under <strong>Settings &gt; MaaS governance</strong>. To view their API
      keys, subscriptions, and accessible models, users can go to{' '}
      <strong>Gen AI studio &gt; API keys</strong>.
    </Alert>
  );

  const handleExternalRouteChange = (checked: boolean) => {
    externalRoute.setData(checked);

    // When external route is enabled, automatically enable token authentication for security.
    if (checked && !tokenAuthentication.data?.length) {
      tokenAuthentication.setData([
        { uuid: `ml-${Date.now()}`, displayName: 'default-token', error: '' },
      ]);
    }
  };

  return (
    <Stack hasGutter>
      {hasUsersField && (
        <StackItem>
          <FormGroup label="Users" data-testid="model-users" fieldId="model-users">
            <FormHelperText className="pf-v6-u-mb-md">
              <HelperText>
                <HelperTextItem>
                  Select which users can discover this endpoint within OpenShift AI.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
            <GenericFieldRenderer
              parentId="model-users"
              wizardState={wizardState}
              externalData={externalData}
            />
            {!showAvailability && maasConfigurationAlert}
          </FormGroup>
        </StackItem>
      )}
      {showAvailability && (
        <StackItem>
          <FormGroup
            label="Availability"
            data-testid="model-availability"
            fieldId="model-availability"
          >
            <FormHelperText className="pf-v6-u-mb-md">
              <HelperText>
                <HelperTextItem>Select where users can access endpoint details.</HelperTextItem>
              </HelperText>
            </FormHelperText>
            <GenAiStudioAvailabilityFields
              data={modelAvailability.data}
              setData={modelAvailability.setData}
              isDisabled={modelAvailability.isDisabled}
              showUseCase={!modelAvailability.isMaaSSubscriptionSelected}
            />
            {maasConfigurationAlert}
          </FormGroup>
        </StackItem>
      )}
      <GenericFieldRenderer
        parentId="networking"
        wizardState={wizardState}
        externalData={externalData}
      />
      {isExternalRouteVisible && (
        <StackItem>
          <FormGroup
            label="Model access"
            data-testid="external-route-section"
            fieldId="model-access"
          >
            <ExternalRouteField
              isChecked={externalRoute.data}
              allowCreate={allowCreate}
              onChange={handleExternalRouteChange}
            />
          </FormGroup>
        </StackItem>
      )}
      <StackItem>
        <FormGroup
          label="Token authentication"
          data-testid="auth-section"
          fieldId="alt-form-checkbox-auth"
        >
          <TokenAuthenticationField
            tokens={tokenAuthentication.data}
            allowCreate={allowCreate && !tokenAuthentication.isDisabled}
            onChange={tokenAuthentication.setData}
            shouldAutoCheck={shouldAutoCheckTokens}
            isExternalRouteVisible={isExternalRouteVisible}
            externalRouteData={externalRoute.data}
            disabledHelperText={tokenAuthentication.disabledHelperText}
          />
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export default UsersAndAvailabilityForm;
