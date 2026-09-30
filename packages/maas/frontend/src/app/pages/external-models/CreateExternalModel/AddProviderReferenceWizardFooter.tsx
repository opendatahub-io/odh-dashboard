import React from 'react';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  useWizardContext,
  WizardFooterWrapper,
} from '@patternfly/react-core';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core/contexts/AnalyticsContext';
import {
  ExternalModelProviderContext,
  ExternalModelProviderReferenceAddedProperties,
  ExternalModelWizardStepContinuedProperties,
  MaaSEvents,
  convertStringToExternalModelProviderSource,
  convertStringToExternalModelProviderType,
  convertStringToExternalProviderRefApiFormat,
} from '~/app/types/event-tracking';
import { AuthMechanism } from '~/app/types/external-models';

type AddProviderReferenceWizardFooterProps = {
  providerSource: string;
  providerType: string;
  apiFormat: string;
  authMechanism: AuthMechanism;
  hasCreatedSecret: boolean;
  hasPathOverride: boolean;
  countOfConfigOverrides: number;
  context: ExternalModelProviderContext;
  isNextDisabled: boolean;
  isAddDisabled: boolean;
  isNextLoading?: boolean;
  isAddLoading?: boolean;
  submitLabel: string;
  onAdd?: () => boolean | Promise<boolean>;
  onNext?: () => boolean | Promise<boolean>;
};

const AddProviderReferenceWizardFooter: React.FC<AddProviderReferenceWizardFooterProps> = ({
  providerSource,
  providerType,
  apiFormat,
  authMechanism,
  hasCreatedSecret,
  hasPathOverride,
  countOfConfigOverrides,
  context,
  isNextDisabled,
  isAddDisabled,
  isNextLoading = false,
  isAddLoading = false,
  submitLabel,
  onAdd,
  onNext,
}) => {
  const { activeStep, steps, goToNextStep, goToPrevStep, close } = useWizardContext();
  const isFirstStep = activeStep.index === 1;
  const isLastStep = activeStep.index === steps.length;

  const handleNext = async () => {
    if (onNext) {
      const canProceed = await onNext();
      if (!canProceed) {
        return;
      }
    }
    fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODEL_WIZARD_STEP_CONTINUED, {
      providerSource: convertStringToExternalModelProviderSource(providerSource),
      providerType: convertStringToExternalModelProviderType(providerType),
      hasCreatedSecret,
      context,
    } satisfies ExternalModelWizardStepContinuedProperties);
    goToNextStep();
  };

  const handleAdd = async () => {
    const success = onAdd ? await onAdd() : false;
    fireMiscTrackingEvent(MaaSEvents.EXTERNAL_MODEL_PROVIDER_REFERENCE_ADDED, {
      outcome: TrackingOutcome.submit,
      success,
      providerSource: convertStringToExternalModelProviderSource(providerSource),
      providerType: convertStringToExternalModelProviderType(providerType),
      apiFormat: convertStringToExternalProviderRefApiFormat(apiFormat),
      authMechanism,
      hasCreatedSecret,
      hasPathOverride,
      countOfConfigOverrides,
      context,
    } satisfies ExternalModelProviderReferenceAddedProperties);
  };

  return (
    <WizardFooterWrapper>
      <ActionList>
        <ActionListGroup>
          {!isFirstStep && (
            <ActionListItem>
              <Button
                variant="secondary"
                onClick={goToPrevStep}
                isDisabled={isFirstStep}
                data-testid="provider-ref-wizard-back"
              >
                Back
              </Button>
            </ActionListItem>
          )}
          {isLastStep ? (
            <ActionListItem>
              <Button
                variant="primary"
                onClick={handleAdd}
                isDisabled={isAddDisabled}
                isLoading={isAddLoading}
                data-testid="add-provider-reference-submit"
              >
                {submitLabel}
              </Button>
            </ActionListItem>
          ) : (
            <ActionListItem>
              <Button
                variant="primary"
                onClick={handleNext}
                isDisabled={isNextDisabled}
                isLoading={isNextLoading}
                data-testid="provider-ref-wizard-next"
              >
                Next
              </Button>
            </ActionListItem>
          )}
        </ActionListGroup>
        <ActionListGroup>
          <ActionListItem>
            <Button
              variant="link"
              data-testid="provider-ref-wizard-cancel"
              onClick={() => {
                fireFormTrackingEvent(MaaSEvents.EXTERNAL_MODEL_PROVIDER_REFERENCE_ADDED, {
                  outcome: TrackingOutcome.cancel,
                  success: false,
                  providerSource: convertStringToExternalModelProviderSource(providerSource),
                  providerType: convertStringToExternalModelProviderType(providerType),
                  apiFormat: convertStringToExternalProviderRefApiFormat(apiFormat),
                  authMechanism,
                  hasCreatedSecret,
                  hasPathOverride,
                  countOfConfigOverrides,
                  context,
                } satisfies ExternalModelProviderReferenceAddedProperties);
                close();
              }}
            >
              Cancel
            </Button>
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
    </WizardFooterWrapper>
  );
};

export default AddProviderReferenceWizardFooter;
