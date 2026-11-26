import * as React from 'react';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  type ButtonProps,
  Wizard,
  WizardFooterWrapper,
  WizardStep,
  useWizardContext,
} from '@patternfly/react-core';
import './CollectionWizard.scss';

export type CollectionWizardStep = {
  id: string;
  name: string;
  content: React.ReactNode;
  canEnter: boolean;
  actions: CollectionWizardAction[];
};

export type CollectionWizardAction = {
  label: React.ReactNode;
  variant: ButtonProps['variant'];
  dataTestId?: string;
  type?: ButtonProps['type'];
  form?: string;
  icon?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  navigation?: 'next' | 'previous';
  requiresNextStep?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
};

export type CollectionWizardCleanup = {
  fromStepIds: readonly string[];
  toStepIds: readonly string[];
  onLeave: () => Promise<unknown>;
};

type CollectionWizardFooterProps = {
  steps: CollectionWizardStep[];
  isBusy?: boolean;
  className?: string;
  cleanup?: CollectionWizardCleanup;
};

const CollectionWizardFooter: React.FC<CollectionWizardFooterProps> = ({
  steps,
  isBusy = false,
  className,
  cleanup,
}) => {
  const { activeStep, goToNextStep, goToPrevStep } = useWizardContext();
  const previousStepId = React.useRef(activeStep.id);
  const activeStepId = React.useRef(activeStep.id);
  const cleanupRef = React.useRef(cleanup);
  activeStepId.current = activeStep.id;
  cleanupRef.current = cleanup;

  React.useEffect(() => {
    const currentCleanup = cleanupRef.current;
    if (
      currentCleanup &&
      currentCleanup.fromStepIds.includes(String(previousStepId.current)) &&
      currentCleanup.toStepIds.includes(String(activeStep.id))
    ) {
      void currentCleanup.onLeave().catch(() => {
        // The owning page keeps the cleanup error for the next step to display.
      });
    }
    previousStepId.current = activeStep.id;
  }, [activeStep.id]);

  React.useEffect(
    () => () => {
      const currentCleanup = cleanupRef.current;
      if (currentCleanup && currentCleanup.fromStepIds.includes(String(activeStepId.current))) {
        void currentCleanup.onLeave().catch(() => {
          // There is no wizard surface to show a cleanup error after unmount.
        });
      }
    },
    [],
  );

  const activeActions = steps.find((step) => step.id === activeStep.id)?.actions ?? [];
  const activeStepIndex = steps.findIndex((step) => step.id === activeStep.id);
  const canEnterNextStep =
    activeStepIndex >= 0 &&
    activeStepIndex + 1 < steps.length &&
    steps[activeStepIndex + 1].canEnter;
  return (
    <WizardFooterWrapper className={className}>
      <ActionList>
        <ActionListGroup>
          {activeActions.map((action, index) => {
            const {
              navigation,
              requiresNextStep,
              isDisabled,
              onClick,
              label,
              dataTestId,
              ...buttonProps
            } = action;
            const navigate =
              navigation === 'next'
                ? goToNextStep
                : navigation === 'previous'
                  ? goToPrevStep
                  : undefined;
            return (
              <ActionListItem key={action.dataTestId ?? `${activeStep.id}-${index}`}>
                <Button
                  {...buttonProps}
                  onClick={
                    navigate
                      ? (event) => {
                          onClick?.(event);
                          if (!event.defaultPrevented) {
                            navigate();
                          }
                        }
                      : onClick
                  }
                  isDisabled={Boolean(
                    isDisabled ||
                    isBusy ||
                    ((navigation === 'next' || requiresNextStep) && !canEnterNextStep),
                  )}
                  data-testid={dataTestId}
                >
                  {label}
                </Button>
              </ActionListItem>
            );
          })}
        </ActionListGroup>
      </ActionList>
    </WizardFooterWrapper>
  );
};

type CollectionWizardProps = {
  steps: CollectionWizardStep[];
  isBusy?: boolean;
  isVisitRequired?: boolean;
  navAriaLabel: string;
  className?: string;
  footerClassName?: string;
  cleanup?: CollectionWizardCleanup;
};

const CollectionWizard: React.FC<CollectionWizardProps> = ({
  steps,
  isBusy,
  isVisitRequired,
  navAriaLabel,
  className,
  footerClassName,
  cleanup,
}) => (
  <Wizard
    className={['evalhub-collection-wizard', className].filter(Boolean).join(' ')}
    height="100%"
    isVisitRequired={isVisitRequired}
    navAriaLabel={navAriaLabel}
    footer={
      <CollectionWizardFooter
        steps={steps}
        isBusy={isBusy}
        className={footerClassName}
        cleanup={cleanup}
      />
    }
  >
    {steps.map((step) => (
      <WizardStep key={step.id} id={step.id} name={step.name} isDisabled={!step.canEnter || isBusy}>
        {step.content}
      </WizardStep>
    ))}
  </Wizard>
);

export default CollectionWizard;
