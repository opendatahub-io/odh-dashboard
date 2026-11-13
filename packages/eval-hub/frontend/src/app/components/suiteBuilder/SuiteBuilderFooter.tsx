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
import { Link } from 'react-router-dom';

type SuiteBuilderFooterProps = {
  cancelRoute: string;
  canContinueSettings: boolean;
  canRecommend: boolean;
};

const SuiteBuilderFooter: React.FC<SuiteBuilderFooterProps> = ({
  cancelRoute,
  canContinueSettings,
  canRecommend,
}) => {
  const { activeStep, goToPrevStep } = useWizardContext();
  const isSettingsStep = activeStep.id === 'suite-settings';
  const isDefineGoalStep = activeStep.id === 'define-goal';

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
                  isDisabled={!canRecommend}
                  data-testid="recommend-benchmarks-with-ai"
                >
                  Recommend benchmarks with AI
                </Button>
              </ActionListItem>
              <ActionListItem>
                <Button variant="secondary" onClick={goToPrevStep} data-testid="suite-builder-back">
                  Back
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
            <Button variant="link" component={(props) => <Link {...props} to={cancelRoute} />}>
              Cancel
            </Button>
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
    </WizardFooterWrapper>
  );
};

export default SuiteBuilderFooter;
