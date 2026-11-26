import * as React from 'react';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  WizardFooterWrapper,
  useWizardContext,
} from '@patternfly/react-core';

type ManualCollectionWizardFooterProps = {
  mode: 'copy' | 'create' | 'edit';
  isSettingsValid: boolean;
  isSelectionValid: boolean;
  isValid: boolean;
  isBusy: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSaveAndRun: () => void;
  onSaveOnly: () => void;
};

const ManualCollectionWizardFooter: React.FC<ManualCollectionWizardFooterProps> = ({
  mode,
  isSettingsValid,
  isSelectionValid,
  isValid,
  isBusy,
  isSubmitting,
  onCancel,
  onSaveAndRun,
  onSaveOnly,
}) => {
  const { activeStep, goToNextStep, goToPrevStep } = useWizardContext();
  const isSettingsStep = activeStep.id === 'settings';
  const isSelectionStep = activeStep.id === 'selectBenchmarks';
  const isBenchmarkSettingsStep = activeStep.id === 'benchmarks';
  const isReviewStep = activeStep.id === 'review';

  return (
    <WizardFooterWrapper className="evalhub-copy-suite-page__wizard-footer">
      <ActionList>
        <ActionListGroup>
          {isSettingsStep ? (
            <ActionListItem>
              <Button
                variant="primary"
                onClick={goToNextStep}
                isDisabled={!isSettingsValid || isBusy}
                data-testid="copy-suite-next"
              >
                Next
              </Button>
            </ActionListItem>
          ) : null}
          {isSelectionStep ? (
            <>
              <ActionListItem>
                <Button
                  variant="secondary"
                  onClick={goToPrevStep}
                  isDisabled={isBusy}
                  data-testid="copy-suite-back-select-benchmarks"
                >
                  Back
                </Button>
              </ActionListItem>
              <ActionListItem>
                <Button
                  variant="primary"
                  onClick={goToNextStep}
                  isDisabled={!isSelectionValid || isBusy}
                  data-testid="copy-suite-next-select-benchmarks"
                >
                  Next
                </Button>
              </ActionListItem>
            </>
          ) : null}
          {isBenchmarkSettingsStep ? (
            <>
              <ActionListItem>
                <Button
                  variant="secondary"
                  onClick={goToPrevStep}
                  isDisabled={isBusy}
                  data-testid="copy-suite-back-step-2"
                >
                  Back
                </Button>
              </ActionListItem>
              <ActionListItem>
                <Button
                  variant="primary"
                  onClick={goToNextStep}
                  isDisabled={!isValid || isBusy}
                  data-testid="copy-suite-next-review"
                >
                  Next
                </Button>
              </ActionListItem>
            </>
          ) : null}
          {isReviewStep ? (
            <>
              <ActionListItem>
                <Button
                  variant="secondary"
                  onClick={goToPrevStep}
                  isDisabled={isBusy}
                  data-testid="copy-suite-back-review"
                >
                  Back
                </Button>
              </ActionListItem>
              <ActionListItem>
                <Button
                  variant="primary"
                  onClick={onSaveAndRun}
                  isDisabled={!isValid || isBusy}
                  isLoading={isSubmitting}
                  data-testid={
                    mode === 'create'
                      ? 'create-suite-submit'
                      : mode === 'edit'
                        ? 'edit-suite-save-and-run'
                        : 'copy-suite-save-and-run'
                  }
                >
                  Save and run
                </Button>
              </ActionListItem>
              <ActionListItem>
                <Button
                  variant="secondary"
                  onClick={onSaveOnly}
                  isDisabled={!isValid || isBusy}
                  data-testid="copy-suite-save-only"
                >
                  {mode === 'edit' ? 'Save changes' : 'Add to my collections'}
                </Button>
              </ActionListItem>
            </>
          ) : null}
          <ActionListItem>
            <Button
              variant="link"
              onClick={onCancel}
              isDisabled={isBusy}
              data-testid={
                isSettingsStep
                  ? 'copy-suite-cancel'
                  : isSelectionStep
                    ? 'copy-suite-cancel-select-benchmarks'
                    : 'copy-suite-cancel-step-2'
              }
            >
              Cancel
            </Button>
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
    </WizardFooterWrapper>
  );
};

export default ManualCollectionWizardFooter;
