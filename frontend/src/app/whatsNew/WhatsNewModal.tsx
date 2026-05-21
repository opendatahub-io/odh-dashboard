import React from 'react';
/* eslint-disable @odh-dashboard/no-restricted-imports -- ContentModal doesn't support split-footer layout */
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Content,
  ContentVariants,
  Label,
  Flex,
  FlexItem,
  Icon,
  Popover,
  PopoverPosition,
} from '@patternfly/react-core';
/* eslint-enable @odh-dashboard/no-restricted-imports */
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowRightIcon } from '@patternfly/react-icons';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';
import { SupportedArea } from '#~/concepts/areas/types';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';
import { useWhatsNewTourListener } from './whatsNewEvent';

const STORAGE_KEY = 'odh-whats-new-3.4-seen';

type FeatureStep = {
  title: string;
  description: string;
  navHint: string;
  available: boolean;
  flagName: string;
  tourSelector?: string;
  parentSectionTitle?: string;
};

const useFeatureSteps = (): FeatureStep[] => {
  const mcpAvailable = useIsAreaAvailable(SupportedArea.MCP_CATALOG).status;
  const genAiAvailable = useIsAreaAvailable(SupportedArea.PLUGIN_GEN_AI).status;
  const rayJobsAvailable = useIsAreaAvailable(SupportedArea.RAY_JOBS).status;
  const yamlViewerAvailable = useIsAreaAvailable(SupportedArea.YAML_VIEWER).status;

  return React.useMemo<FeatureStep[]>(
    () => [
      {
        title: 'MCP Servers',
        description:
          'Browse and deploy Model Context Protocol (MCP) servers from a new catalog. Discover available servers and manage deployments from a single hub under AI hub.',
        navHint: 'AI hub → MCP servers',
        available: mcpAvailable,
        flagName: 'mcpCatalog',
        tourSelector: '[data-tour="nav-mcp-servers"]',
        parentSectionTitle: 'AI hub',
      },
      {
        title: 'Gen AI Studio',
        description:
          'A dedicated space for generative AI workflows. Chat with deployed models in the Playground, and manage model endpoints, MCP servers, and vector stores from AI asset endpoints.',
        navHint: 'Gen AI studio → Playground / AI asset endpoints',
        available: genAiAvailable,
        flagName: 'genAiStudio',
        tourSelector: '[data-tour="nav-gen-ai-studio"]',
      },
      {
        title: 'Training Jobs with Ray',
        description:
          'Submit and monitor distributed training jobs powered by Ray. View TrainJob and RayJob statuses, filter by job type, and scale node counts — all from the Jobs page.',
        navHint: 'Develop & train → Jobs',
        available: rayJobsAvailable,
        flagName: 'trainingJobs',
        tourSelector: '[data-tour="nav-training-jobs"]',
        parentSectionTitle: 'Develop & train',
      },
      {
        title: 'YAML Viewer',
        description:
          'The model deployment wizard now includes a YAML viewer. Toggle between form and YAML views to inspect or edit the generated deployment manifest before deploying.',
        navHint: 'Models → Deployments → Deploy (Form/YAML toggle)',
        available: yamlViewerAvailable,
        flagName: 'deploymentWizardYAMLViewer',
      },
    ],
    [mcpAvailable, genAiAvailable, rayJobsAvailable, yamlViewerAvailable],
  );
};

const AvailabilityBadge: React.FC<{ available: boolean; flagName: string }> = ({
  available,
  flagName,
}) =>
  available ? (
    <Label color="green" isCompact icon={<CheckCircleIcon />}>
      Available on your cluster
    </Label>
  ) : (
    <Label color="orange" isCompact icon={<ExclamationTriangleIcon />}>
      Not enabled — requires {flagName}
    </Label>
  );

const expandNavSectionByTitle = (sectionTitle: string): void => {
  const nav = document.querySelector<HTMLElement>('nav[aria-label="Navigation"]') ?? document;
  const buttons = nav.querySelectorAll<HTMLButtonElement>('button[aria-expanded]');
  for (const btn of buttons) {
    const text = btn.textContent.trim();
    if (text.startsWith(sectionTitle) && btn.getAttribute('aria-expanded') === 'false') {
      btn.click();
      break;
    }
  }
};

const StepBody: React.FC<{
  step: FeatureStep;
}> = ({ step }) => (
  <>
    <Content component={ContentVariants.p}>{step.description}</Content>
    <Content component={ContentVariants.p}>
      <Flex
        gap={{ default: 'gapSm' }}
        alignItems={{ default: 'alignItemsCenter' }}
        component="span"
      >
        <FlexItem>
          <Icon size="sm">
            <ArrowRightIcon />
          </Icon>
        </FlexItem>
        <FlexItem>
          <strong>Where to find it:</strong> {step.navHint}
        </FlexItem>
      </Flex>
    </Content>
    {!step.available && (
      <Content component={ContentVariants.p}>
        <Content component={ContentVariants.small}>
          Ask your administrator to enable the <code>{step.flagName}</code> feature flag to use this
          feature.
        </Content>
      </Content>
    )}
  </>
);

const StepFooter: React.FC<{
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}> = ({ isFirst, isLast, onBack, onNext, onClose }) => (
  <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} style={{ width: '100%' }}>
    <FlexItem>
      {!isFirst && (
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
      )}
    </FlexItem>
    <Flex gap={{ default: 'gapSm' }}>
      {!isLast && (
        <FlexItem>
          <Button variant="link" onClick={onClose}>
            Skip tour
          </Button>
        </FlexItem>
      )}
      <FlexItem>
        {isLast ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <Button variant="primary" onClick={onNext}>
            Next
          </Button>
        )}
      </FlexItem>
    </Flex>
  </Flex>
);

const WhatsNewModal: React.FC = () => {
  const [seen, setSeen] = useBrowserStorage<boolean>(STORAGE_KEY, false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const featureSteps = useFeatureSteps();
  const [targetEl, setTargetEl] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!seen) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [seen]);

  useWhatsNewTourListener(
    React.useCallback(() => {
      setStepIndex(0);
      setIsOpen(true);
    }, []),
  );

  const close = React.useCallback(() => {
    setIsOpen(false);
    setSeen(true);
  }, [setSeen]);

  const isWelcome = stepIndex === 0;
  const isSummary = stepIndex === featureSteps.length + 1;
  const featureIndex = stepIndex - 1;
  const totalSteps = featureSteps.length + 2;
  const isLastStep = stepIndex === totalSteps - 1;
  const disabledCount = featureSteps.filter((s) => !s.available).length;

  const currentFeature = !isWelcome && !isSummary ? featureSteps[featureIndex] : null;
  const usePopover = currentFeature?.available && !!currentFeature.tourSelector;

  React.useEffect(() => {
    const selector = currentFeature?.tourSelector;
    if (!isOpen || !selector || !currentFeature.available) {
      setTargetEl(null);
      return;
    }

    if (currentFeature.parentSectionTitle) {
      expandNavSectionByTitle(currentFeature.parentSectionTitle);
    }

    const timer = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        setTargetEl(el);
      } else {
        setTargetEl(null);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen, stepIndex, currentFeature]);

  if (!isOpen) {
    return null;
  }

  const stepLabel = (
    <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>
        <Label color="blue" isCompact>
          {stepIndex + 1} of {totalSteps}
        </Label>
      </FlexItem>
      {currentFeature && (
        <FlexItem>
          <AvailabilityBadge
            available={currentFeature.available}
            flagName={currentFeature.flagName}
          />
        </FlexItem>
      )}
    </Flex>
  );

  const footerProps = {
    isFirst: isWelcome,
    isLast: isLastStep,
    onBack: () => setStepIndex((i) => i - 1),
    onNext: () => setStepIndex((i) => i + 1),
    onClose: close,
  };

  if (usePopover && targetEl) {
    return (
      <Popover
        data-testid="whats-new-popover"
        isVisible
        shouldClose={() => close()}
        position={PopoverPosition.right}
        triggerRef={() => targetEl}
        headerContent={
          <>
            <div>{currentFeature.title}</div>
            {stepLabel}
          </>
        }
        bodyContent={<StepBody step={currentFeature} />}
        footerContent={<StepFooter {...footerProps} />}
        hasAutoWidth
        maxWidth="28rem"
        showClose={false}
      />
    );
  }

  return (
    <Modal
      data-testid="whats-new-modal"
      variant={ModalVariant.medium}
      isOpen
      aria-labelledby="whats-new-modal-title"
      onClose={close}
    >
      <ModalHeader
        title={
          isWelcome
            ? "What's new in 3.4"
            : isSummary
            ? "You're all set!"
            : currentFeature?.title ?? ''
        }
        labelId="whats-new-modal-title"
        description={stepLabel}
      />
      <ModalBody>
        {isWelcome && (
          <>
            <Content component={ContentVariants.p}>
              Welcome! This walkthrough highlights the key new features in this release.
            </Content>
            <Content component={ContentVariants.p}>
              Each step describes a feature and shows whether it&apos;s available on your cluster.
              Features that aren&apos;t enabled yet will note which flag your administrator needs to
              turn on.
            </Content>
          </>
        )}

        {currentFeature && <StepBody step={currentFeature} />}

        {isSummary && (
          <>
            <Content component={ContentVariants.p}>
              Here&apos;s a summary of what&apos;s new:
            </Content>
            {featureSteps.map((step) => (
              <Flex
                key={step.title}
                gap={{ default: 'gapSm' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>
                  <AvailabilityBadge available={step.available} flagName={step.flagName} />
                </FlexItem>
                <FlexItem>
                  <strong>{step.title}</strong>
                </FlexItem>
              </Flex>
            ))}
            {disabledCount > 0 && (
              <Content component={ContentVariants.p}>
                {disabledCount} feature{disabledCount > 1 ? 's are' : ' is'} not yet enabled.
                Contact your administrator to unlock the full 3.4 experience.
              </Content>
            )}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <StepFooter {...footerProps} />
      </ModalFooter>
    </Modal>
  );
};

export default WhatsNewModal;
