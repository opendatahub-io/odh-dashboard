import * as React from 'react';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  WizardFooterWrapper,
  useWizardContext,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';

type SuiteBuilderFooterProps = {
  cancelRoute: string;
  canContinueSettings: boolean;
};

const SuiteBuilderFooter: React.FC<SuiteBuilderFooterProps> = ({
  cancelRoute,
  canContinueSettings,
}) => {
  const { activeStep, goToPrevStep } = useWizardContext();
  const isSettingsStep = activeStep.id === 'suite-settings';

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
