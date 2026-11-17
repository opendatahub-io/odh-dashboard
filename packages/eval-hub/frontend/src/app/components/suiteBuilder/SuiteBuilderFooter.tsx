import * as React from 'react';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  WizardFooterWrapper,
  useWizardContext,
} from '@patternfly/react-core';
import { MagicIcon } from '@patternfly/react-icons';

type SuiteBuilderFooterProps = {
  canContinueSettings: boolean;
  canRecommend: boolean;
  canContinueOverview: boolean;
  isStarting: boolean;
  isBusy: boolean;
  onCancel: () => void;
};

const SuiteBuilderFooter: React.FC<SuiteBuilderFooterProps> = ({
  canContinueSettings,
  canRecommend,
  canContinueOverview,
  isStarting,
  isBusy,
  onCancel,
}) => {
  const { activeStep, goToPrevStep, goToNextStep } = useWizardContext();
  const isSettingsStep = activeStep.id === 'suite-settings';
  const isDefineGoalStep = activeStep.id === 'define-goal';
  const isOverviewStep = activeStep.id === 'benchmark-overview';

  return (
    <WizardFooterWrapper>
      <ActionList>
        <ActionListGroup>
          {isSettingsStep ? (
            <ActionListItem>
              <Button
                variant="primary"
                form="suite-settings-form"
                type="submit"
                isDisabled={!canContinueSettings}
                data-testid="next-suite-settings"
              >
                Next
              </Button>
            </ActionListItem>
          ) : isDefineGoalStep ? (
            <>
              <ActionListItem>
                <Button
                  variant="primary"
                  form="define-goal-form"
                  type="submit"
                  icon={<MagicIcon aria-hidden />}
                  isDisabled={!canRecommend || isStarting}
                  data-testid="recommend-benchmarks-with-ai"
                >
                  {isStarting ? 'Starting recommendations…' : 'Recommend benchmarks with AI'}
                </Button>
              </ActionListItem>
              <ActionListItem>
                <Button
                  variant="secondary"
                  onClick={goToPrevStep}
                  isDisabled={isBusy}
                  data-testid="suite-builder-back"
                >
                  Back
                </Button>
              </ActionListItem>
            </>
          ) : isOverviewStep ? (
            <>
              <ActionListItem>
                <Button
                  variant="secondary"
                  onClick={goToPrevStep}
                  isDisabled={isBusy}
                  data-testid="suite-builder-back"
                >
                  Back
                </Button>
              </ActionListItem>
              <ActionListItem>
                <Button
                  variant="primary"
                  isDisabled={!canContinueOverview}
                  onClick={goToNextStep}
                  data-testid="next-benchmark-overview"
                >
                  Next
                </Button>
              </ActionListItem>
            </>
          ) : (
            <>
              <ActionListItem>
                <Button variant="secondary" onClick={goToPrevStep} data-testid="suite-builder-back">
                  Back
                </Button>
              </ActionListItem>
              <ActionListItem>
                <Button variant="primary" isDisabled>
                  Next
                </Button>
              </ActionListItem>
            </>
          )}
          <ActionListItem>
            <Button
              variant="link"
              onClick={onCancel}
              isDisabled={isBusy}
              data-testid="suite-builder-cancel"
            >
              Cancel
            </Button>
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
    </WizardFooterWrapper>
  );
};

export default SuiteBuilderFooter;
