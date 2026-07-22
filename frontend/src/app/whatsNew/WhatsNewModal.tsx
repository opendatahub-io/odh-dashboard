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
  Popover,
  Divider,
  Backdrop,
  List,
  ListItem,
} from '@patternfly/react-core';
/* eslint-enable @odh-dashboard/no-restricted-imports */
import { ExternalLinkAltIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';
import { useAppContext } from '#~/app/AppContext';
import { useUser } from '#~/redux/selectors';
import {
  TOUR_SEEN_STORAGE_KEY,
  type GuidedTourDismissMethod,
  type GuidedTourEntryPoint,
} from './tracking/guidedTourTracking';
import { useGuidedTourTracking } from './tracking/useGuidedTourTracking';
import { useWhatsNewTourListener } from './whatsNewEvent';

const DEFAULT_DOC_URL =
  'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.5';

type NewIn35Feature = {
  title: string;
  description: string;
  flagName: string;
  available: boolean;
};

type TourStep = {
  id: string;
  title: string;
  description: string;
  navSelector: string;
  docUrl?: string;
  sectionAvailable: boolean;
  newFeatures: NewIn35Feature[];
};

const useTourSteps = (isAdmin: boolean): TourStep[] => {
  const { dashboardConfig } = useAppContext();
  const config = dashboardConfig.spec.dashboardConfig;

  const genAiAvailable = config.genAiStudio ?? false;
  const automlAvailable = config.automl ?? false;
  const autoragAvailable = (config.autorag ?? false) && genAiAvailable;
  const guardrailsAvailable = config.guardrails ?? false;
  const agentConfigAvailable = config.agentConfigManagement ?? false;
  const toolCallingAvailable = config.toolCalling ?? false;
  const observabilityAvailable = config.observabilityDashboard ?? false;
  const gpuaasAvailable = config.gpuaas ?? false;
  const mcpCatalogAvailable = config.mcpCatalog ?? false;
  const agentsCatalogAvailable = config.agentsCatalog ?? false;
  const agentOpsAvailable = config.agentOps ?? false;
  const roleManagementAvailable = config.roleManagement ?? false;
  const lmEvalAvailable = !config.disableLMEval;
  const genAiTracingAvailable = config.genAiTracing ?? false;
  const promptManagementAvailable = config.promptManagement ?? false;
  const globalProjectPromptsAvailable = config.globalProjectPrompts ?? false;
  const connectionTestAvailable = config.connectionTest ?? false;
  const mcpRegistryAvailable = config.mcpRegistry ?? false;
  const externalModelsAvailable = config.externalModels ?? false;
  const modelCatalogAvailable = !config.disableModelCatalog;
  const modelRegistryAvailable = !config.disableModelRegistry;
  const modelServingAvailable = !config.disableModelServing;
  const aiHubAvailable =
    modelCatalogAvailable ||
    modelRegistryAvailable ||
    modelServingAvailable ||
    mcpCatalogAvailable ||
    agentsCatalogAvailable;

  return React.useMemo<TourStep[]>(
    () => [
      {
        id: 'projects',
        title: 'Projects',
        description:
          'Organize workbenches, pipelines, model servers, and storage so your team can collaborate in one place.',
        navSelector: 'a[href="/projects"]',
        docUrl: DEFAULT_DOC_URL,
        sectionAvailable: true,
        newFeatures: [
          {
            title: 'Granular role creation',
            description:
              'Define what users can do within a project by creating and assigning roles.',
            flagName: 'roleManagement',
            available: roleManagementAvailable,
          },
          {
            title: 'Connection testing',
            description: 'Test S3, URI, and OCI connections before saving.',
            flagName: 'connectionTest',
            available: connectionTestAvailable,
          },
        ],
      },
      {
        id: 'gen-ai-studio',
        title: 'Gen AI studio',
        description:
          'Test models and prompts, experiment with RAG, and prepare configurations before building them into applications.',
        navSelector: 'button[id="gen-ai-studio"]',
        docUrl:
          'https://www.redhat.com/en/blog/introducing-ai-hub-and-genai-studio-new-command-center-enterprise-generative-ai-red-hat-openshift-ai',
        sectionAvailable: genAiAvailable,
        newFeatures: [
          {
            title: 'AutoRAG',
            description: 'Build RAG pipelines and let the system find the best retrieval strategy.',
            flagName: 'autorag',
            available: autoragAvailable,
          },
          {
            title: 'Guardrails',
            description: 'Apply safety filters to model inputs and outputs in the Playground.',
            flagName: 'guardrails',
            available: guardrailsAvailable,
          },
          {
            title: 'Agent configuration management',
            description:
              'Save and reuse configurations so you can compare setups without rebuilding.',
            flagName: 'agentConfigManagement',
            available: agentConfigAvailable,
          },
          {
            title: 'Gen AI tracing',
            description: 'See token counts, latency, and execution traces as you test.',
            flagName: 'genAiTracing',
            available: genAiTracingAvailable,
          },
          {
            title: 'Prompt management',
            description:
              'Create, version, and manage reusable prompts powered by MLflow within Gen AI studio.',
            flagName: 'promptManagement',
            available: promptManagementAvailable,
          },
        ],
      },
      {
        id: 'develop-and-train',
        title: 'Develop & train',
        description:
          'Build pipelines, run training jobs, track experiments, and evaluate model performance.',
        navSelector: 'button[id="develop-and-train"]',
        sectionAvailable: true,
        newFeatures: [
          {
            title: 'AutoML',
            description:
              'Train machine learning models using automated model selection, parameter optimization, and feature engineering.',
            flagName: 'automl',
            available: automlAvailable,
          },
        ],
      },
      {
        id: 'ai-hub',
        title: 'AI hub',
        description:
          'Discover, register, and deploy models. Browse agent templates to build agents, and connect to MCP servers.',
        navSelector: 'button[id="ai-hub"]',
        docUrl:
          'https://www.redhat.com/en/blog/introducing-ai-hub-and-genai-studio-new-command-center-enterprise-generative-ai-red-hat-openshift-ai',
        sectionAvailable: aiHubAvailable,
        newFeatures: [
          {
            title: 'Tool calling',
            description:
              'Define and attach tools that models can invoke during inference, enabling agentic workflows with function-calling capabilities.',
            flagName: 'toolCalling',
            available: toolCallingAvailable,
          },
          {
            title: 'MCP catalog',
            description: 'Find and deploy MCP servers for your organization.',
            flagName: 'mcpCatalog',
            available: mcpCatalogAvailable,
          },
          {
            title: 'Agents',
            description: 'Browse agent templates and deploy agents for your projects.',
            flagName: 'agentsCatalog',
            available: agentsCatalogAvailable && agentOpsAvailable,
          },
          {
            title: 'External models',
            description: 'View models from external providers alongside your deployed models.',
            flagName: 'externalModels',
            available: externalModelsAvailable,
          },
          {
            title: 'Safety and security insights',
            description:
              'View safety and security evaluation results for models in the model catalog.',
            flagName: 'disableLMEval',
            available: lmEvalAvailable,
          },
          {
            title: 'MCP registry',
            description: 'Register and manage MCP server definitions from a centralized registry.',
            flagName: 'mcpRegistry',
            available: mcpRegistryAvailable,
          },
        ],
      },
      {
        id: 'observe-and-monitor',
        title: 'Observe & monitor',
        description: 'Check resource usage and workload health across your projects.',
        navSelector: 'button[id="observe-and-monitor"]',
        sectionAvailable: true,
        newFeatures: [
          {
            title: 'Observability dashboard',
            description: 'View model serving metrics, costs, and workload status.',
            flagName: 'observabilityDashboard',
            available: observabilityAvailable,
          },
        ],
      },
      ...(isAdmin
        ? [
            {
              id: 'settings',
              title: 'Settings',
              description:
                'Manage user access, environment setup, and model serving resources for your organization.',
              navSelector: 'button[id="settings"]',
              sectionAvailable: true,
              newFeatures: [
                {
                  title: 'GPUaaS',
                  description: 'View GPU capacity, utilization, and usage by cohort.',
                  flagName: 'gpuaas',
                  available: gpuaasAvailable,
                },
                {
                  title: 'MaaS settings redesign',
                  description:
                    'Redesigned Model-as-a-Service settings page with improved information architecture.',
                  flagName: 'maasSettingsIaRedesign',
                  available: true,
                },
                {
                  title: 'MCP catalog settings',
                  description:
                    'Configure and manage MCP catalog sources and server settings from the Settings page.',
                  flagName: 'mcpCatalog',
                  available: mcpCatalogAvailable,
                },
                {
                  title: 'Global project prompts',
                  description: 'Use versioned prompt templates when testing models.',
                  flagName: 'globalProjectPrompts',
                  available: globalProjectPromptsAvailable,
                },
                {
                  title: 'LLM-D routing configurations',
                  description: 'Control how requests are routed to llm-d deployments.',
                  flagName: '',
                  available: true,
                },
                {
                  title: 'LLM-D topology configurations',
                  description: 'Configure how llm-d services are arranged and scaled.',
                  flagName: '',
                  available: true,
                },
                {
                  title: 'LLM accelerator configurations',
                  description: 'Set default accelerators for LLM serving.',
                  flagName: '',
                  available: true,
                },
              ],
            },
          ]
        : []),
    ],
    [
      genAiAvailable,
      autoragAvailable,
      guardrailsAvailable,
      agentConfigAvailable,
      automlAvailable,
      toolCallingAvailable,
      mcpCatalogAvailable,
      agentsCatalogAvailable,
      agentOpsAvailable,
      observabilityAvailable,
      gpuaasAvailable,
      roleManagementAvailable,
      lmEvalAvailable,
      genAiTracingAvailable,
      promptManagementAvailable,
      globalProjectPromptsAvailable,
      connectionTestAvailable,
      mcpRegistryAvailable,
      externalModelsAvailable,
      aiHubAvailable,
      isAdmin,
    ],
  );
};

const getNavContainer = (): HTMLElement | Document =>
  document.querySelector<HTMLElement>('nav[aria-label="Navigation"]') ?? document;

const findNavSectionButton = (sectionTitle: string): HTMLButtonElement | null => {
  const nav = getNavContainer();
  const buttons = nav.querySelectorAll<HTMLButtonElement>('button[aria-expanded]');
  for (const btn of buttons) {
    if (btn.textContent.trim().startsWith(sectionTitle)) {
      return btn;
    }
  }
  return null;
};

const findNavElement = (step: TourStep): HTMLElement | null => {
  const el = document.querySelector<HTMLElement>(step.navSelector);
  if (el) {
    return el;
  }
  return findNavSectionButton(step.title);
};

const WhatsNewModal: React.FC = () => {
  const { isAdmin } = useUser();
  const [seen, setSeen] = useBrowserStorage<boolean>(TOUR_SEEN_STORAGE_KEY, false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [showWelcome, setShowWelcome] = React.useState(true);
  const [stepIndex, setStepIndex] = React.useState(0);
  const tourSteps = useTourSteps(isAdmin);
  const [targetEl, setTargetEl] = React.useState<HTMLElement | null>(null);
  const {
    beginSession,
    selectPath,
    trackStepView,
    trackLearnMore,
    trackSummaryDocs,
    dismiss,
    complete,
    resetSession,
    tourPath,
  } = useGuidedTourTracking(isAdmin);

  const pathStepCount = React.useMemo(() => {
    if (tourPath === 'new-features-only') {
      return tourSteps.filter((step) => step.newFeatures.length > 0).length;
    }
    return tourSteps.length;
  }, [tourPath, tourSteps]);

  const autoLaunchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelAutoLaunch = React.useCallback(() => {
    if (autoLaunchTimerRef.current !== null) {
      clearTimeout(autoLaunchTimerRef.current);
      autoLaunchTimerRef.current = null;
    }
  }, []);

  const openTour = React.useCallback(
    (entryPoint: GuidedTourEntryPoint, isReturningUser: boolean) => {
      // Manual opens (masthead / task assistant) must cancel a pending auto-launch
      // so we don't reset the session and emit a duplicate Started event.
      cancelAutoLaunch();
      beginSession(entryPoint, isReturningUser);
      setShowWelcome(true);
      setStepIndex(0);
      setIsOpen(true);
    },
    [beginSession, cancelAutoLaunch],
  );

  const openTourRef = React.useRef(openTour);
  openTourRef.current = openTour;
  const seenRef = React.useRef(seen);
  seenRef.current = seen;

  React.useEffect(() => {
    if (!seen) {
      autoLaunchTimerRef.current = setTimeout(() => {
        autoLaunchTimerRef.current = null;
        openTourRef.current('auto-launch', false);
      }, 1500);
      return () => {
        if (autoLaunchTimerRef.current !== null) {
          clearTimeout(autoLaunchTimerRef.current);
          autoLaunchTimerRef.current = null;
        }
      };
    }
    return undefined;
  }, [seen]);

  useWhatsNewTourListener(
    React.useCallback((entryPoint) => {
      openTourRef.current(entryPoint, seenRef.current);
    }, []),
  );

  const closeUi = React.useCallback(() => {
    setIsOpen(false);
    setSeen(true);
    setShowWelcome(true);
    setStepIndex(0);
    resetSession();
  }, [resetSession, setSeen]);

  const getDismissLocation = React.useCallback((): {
    dismissStepId: string;
    dismissStepIndex: number;
  } => {
    if (showWelcome) {
      return { dismissStepId: 'welcome', dismissStepIndex: -1 };
    }
    if (stepIndex >= tourSteps.length) {
      return { dismissStepId: 'summary', dismissStepIndex: tourSteps.length };
    }
    return {
      dismissStepId: tourSteps[stepIndex]?.id ?? 'unknown',
      dismissStepIndex: stepIndex,
    };
  }, [showWelcome, stepIndex, tourSteps]);

  const handleDismiss = React.useCallback(
    (dismissMethod: GuidedTourDismissMethod) => {
      const { dismissStepId, dismissStepIndex } = getDismissLocation();
      dismiss({
        dismissMethod,
        dismissStepId,
        dismissStepIndex,
        pathStepCount,
      });
      closeUi();
    },
    [closeUi, dismiss, getDismissLocation, pathStepCount],
  );

  const handleComplete = React.useCallback(() => {
    complete(pathStepCount);
    closeUi();
  }, [closeUi, complete, pathStepCount]);

  const startTour = React.useCallback(() => {
    selectPath('full');
    setShowWelcome(false);
    setStepIndex(0);
  }, [selectPath]);

  const startWhatsNew = React.useCallback(() => {
    selectPath('new-features-only');
    const firstWithFeatures = tourSteps.findIndex((s) => s.newFeatures.length > 0);
    setShowWelcome(false);
    setStepIndex(firstWithFeatures >= 0 ? firstWithFeatures : 0);
  }, [selectPath, tourSteps]);

  const currentStep = !showWelcome ? tourSteps[stepIndex] ?? null : null;
  const [targetReady, setTargetReady] = React.useState(false);

  React.useEffect(() => {
    if (currentStep) {
      trackStepView(currentStep);
    }
  }, [currentStep, trackStepView]);

  React.useEffect(() => {
    if (!isOpen || !currentStep) {
      setTargetEl(null);
      setTargetReady(true);
      return;
    }

    setTargetReady(false);

    const timer = setTimeout(() => {
      const el = findNavElement(currentStep);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        setTargetEl(el);
      } else {
        setTargetEl(null);
      }
      setTargetReady(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen, showWelcome, stepIndex, currentStep]);

  if (!isOpen) {
    return null;
  }

  if (!showWelcome && !targetReady) {
    return <Backdrop />;
  }

  // ── Welcome modal ──
  if (showWelcome) {
    return (
      <Modal
        data-testid="whats-new-modal"
        variant={ModalVariant.medium}
        isOpen
        aria-labelledby="whats-new-modal-title"
        onClose={() => handleDismiss('modal_close')}
      >
        <ModalHeader title="Welcome to OpenShift AI 3.5!" labelId="whats-new-modal-title" />
        <ModalBody>
          <Content component={ContentVariants.p}>
            Take a guided tour to explore key areas and discover new features.
          </Content>
        </ModalBody>
        <ModalFooter>
          <Flex gap={{ default: 'gapSm' }}>
            <FlexItem>
              <Button data-testid="whats-new-start-tour" variant="primary" onClick={startTour}>
                Start full tour
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                data-testid="whats-new-whats-new-35"
                variant="secondary"
                onClick={startWhatsNew}
              >
                Tour what&apos;s new
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                data-testid="whats-new-skip-tour"
                variant="link"
                onClick={() => handleDismiss('skip_button')}
              >
                Close
              </Button>
            </FlexItem>
          </Flex>
        </ModalFooter>
      </Modal>
    );
  }

  // ── Completion screen ──
  // User has finished every step; both the footer Close and the modal X count as
  // Completed (not Dismissed). Dismissed is only for exiting before the summary.
  if (stepIndex >= tourSteps.length) {
    return (
      <Modal
        data-testid="whats-new-modal"
        variant={ModalVariant.small}
        isOpen
        aria-labelledby="whats-new-done-title"
        onClose={handleComplete}
      >
        <ModalHeader title="You're ready to go!" labelId="whats-new-done-title" />
        <ModalBody>
          <Content component={ContentVariants.p}>
            Learn more in the{' '}
            <Button
              variant="link"
              isInline
              component="a"
              href={DEFAULT_DOC_URL}
              target="_blank"
              rel="noopener noreferrer"
              icon={<ExternalLinkAltIcon />}
              iconPosition="end"
              onClick={() => trackSummaryDocs(DEFAULT_DOC_URL)}
            >
              documentation
            </Button>
            .
          </Content>
        </ModalBody>
        <ModalFooter>
          <Flex gap={{ default: 'gapSm' }}>
            <FlexItem>
              <Button
                data-testid="whats-new-done-back"
                variant="secondary"
                onClick={() => setStepIndex((i) => i - 1)}
              >
                Back
              </Button>
            </FlexItem>
            <FlexItem>
              <Button data-testid="whats-new-done-close" variant="primary" onClick={handleComplete}>
                Close
              </Button>
            </FlexItem>
          </Flex>
        </ModalFooter>
      </Modal>
    );
  }

  // ── Shared step content builders ──
  if (!currentStep) {
    return null;
  }

  const total = tourSteps.length;
  const learnMoreUrl = currentStep.docUrl ?? DEFAULT_DOC_URL;
  const unavailableFeatures = currentStep.newFeatures.filter((f) => !f.available);
  const sectionUnavailable = !currentStep.sectionAvailable || !targetEl;
  const presentationType = targetEl ? 'popover' : 'modal';

  const stepBody = (
    <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
      <FlexItem>
        {sectionUnavailable && (
          <Flex gap={{ default: 'gapSm' }} className="pf-v6-u-mb-sm">
            <FlexItem>
              <Label color="orange" isCompact icon={<ExclamationTriangleIcon />}>
                Unavailable in the cluster
              </Label>
            </FlexItem>
          </Flex>
        )}
        <Content component={ContentVariants.p}>{currentStep.description}</Content>
        <Button
          variant="link"
          isInline
          component="a"
          href={learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          icon={<ExternalLinkAltIcon />}
          iconPosition="end"
          onClick={() => trackLearnMore(currentStep.id, learnMoreUrl, presentationType)}
        >
          Learn more
        </Button>
      </FlexItem>

      {currentStep.newFeatures.length > 0 && (
        <>
          <Divider />
          <FlexItem>
            <Content component={ContentVariants.p}>
              <strong>New in 3.5</strong>
            </Content>
            {currentStep.newFeatures.map((feature) => (
              <Content key={feature.title} component={ContentVariants.p}>
                <strong>{feature.title}</strong>
                <br />
                {feature.description}
              </Content>
            ))}
            {unavailableFeatures.length > 0 && (
              <Content component={ContentVariants.small}>
                <ExclamationTriangleIcon color="var(--pf-t--global--color--nonstatus--orange--default)" />{' '}
                {isAdmin ? (
                  <>
                    To enable unavailable features in your cluster, enable the following feature
                    flags in <code>OdhDashboardConfig</code>:
                    <List>
                      {unavailableFeatures.map((f) => (
                        <ListItem key={f.flagName}>
                          {f.flagName.startsWith('disable') ? (
                            <>
                              Set <code>{f.flagName}</code> to <code>false</code>
                            </>
                          ) : (
                            <code>{f.flagName}</code>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  </>
                ) : (
                  <>Contact your administrator to request access to unavailable features.</>
                )}
              </Content>
            )}
          </FlexItem>
        </>
      )}
    </Flex>
  );

  const stepFooter = (
    <Flex
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
      alignItems={{ default: 'alignItemsCenter' }}
      className="pf-v6-u-w-100"
    >
      <FlexItem>
        {stepIndex + 1} of {total}
      </FlexItem>
      <Flex gap={{ default: 'gapSm' }}>
        <FlexItem>
          <Button
            data-testid="tour-step-back"
            variant="secondary"
            onClick={() => setStepIndex((i) => i - 1)}
            isDisabled={stepIndex === 0}
          >
            Back
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            data-testid="tour-step-skip"
            variant="link"
            onClick={() => handleDismiss('skip_button')}
          >
            Skip tour
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            data-testid="tour-step-next"
            variant="primary"
            onClick={() => setStepIndex((i) => i + 1)}
          >
            Next
          </Button>
        </FlexItem>
      </Flex>
    </Flex>
  );

  // ── Popover anchored to nav item (when the item is visible) ──
  if (targetEl) {
    return (
      <>
        {/* Visual only — outside clicks are handled by Popover shouldClose to avoid double dismiss telemetry. */}
        <Backdrop />
        <Popover
          data-testid="nav-tour-popover"
          isVisible
          shouldClose={() => handleDismiss('popover_close')}
          position="right"
          triggerRef={() => targetEl}
          headerContent={currentStep.title}
          bodyContent={
            <div style={{ maxHeight: '50vh', overflowY: 'auto', overflowX: 'hidden' }}>
              {stepBody}
            </div>
          }
          footerContent={stepFooter}
          hasAutoWidth
          maxWidth="28rem"
        />
      </>
    );
  }

  // ── Modal fallback (nav item not visible — section/flag is off) ──
  return (
    <Modal
      data-testid="whats-new-modal"
      variant={ModalVariant.medium}
      isOpen
      aria-labelledby="whats-new-step-title"
      onClose={() => handleDismiss('modal_close')}
    >
      <ModalHeader title={currentStep.title} labelId="whats-new-step-title" />
      <ModalBody>{stepBody}</ModalBody>
      <ModalFooter>{stepFooter}</ModalFooter>
    </Modal>
  );
};

export default WhatsNewModal;
