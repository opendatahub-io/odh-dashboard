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
import {
  DataScienceStackComponent,
  SupportedArea,
  useIsAreaAvailable,
} from '@odh-dashboard/plugin-core/areas';
import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';
import { useAppContext } from '#~/app/AppContext';
import { useUser } from '#~/redux/selectors';
import { TOUR_SEEN_STORAGE_KEY, TOUR_VERSION } from '#~/concepts/whatsNew/const';
import type { GuidedTourDismissMethod, GuidedTourEntryPoint } from './tracking/guidedTourTracking';
import { useGuidedTourTracking } from './tracking/useGuidedTourTracking';
import { useWhatsNewTourListener } from './whatsNewEvent';

// TODO: Verify these 3.6 doc URLs resolve once the 3.6 docs are published.
const DEFAULT_DOC_URL =
  'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.6';

type NewFeature = {
  title: string;
  description: string;
  available: boolean;
  flags?: { name: string; enabled: boolean }[];
  component?: { name: DataScienceStackComponent; installed: boolean };
};

const withAvailability = (features: Omit<NewFeature, 'available'>[]): NewFeature[] =>
  features.map((f) => ({
    ...f,
    available: (f.flags?.every((flag) => flag.enabled) ?? true) && (f.component?.installed ?? true),
  }));

type TourStep = {
  id: string;
  title: string;
  description: string;
  navSelector: string;
  docUrl?: string;
  sectionAvailable: boolean;
  sectionFlagName?: string;
  newFeatures: NewFeature[];
};

const useTourSteps = (isAdmin: boolean): TourStep[] => {
  const { dashboardConfig } = useAppContext();
  const config = dashboardConfig.spec.dashboardConfig;

  const genAiAvailable = config.genAiStudio ?? false;
  const mcpCatalogAvailable = config.mcpCatalog ?? false;
  const agentsCatalogAvailable = config.agentsCatalog ?? false;
  const agentOpsAvailable = config.agentOps ?? false;
  const lmEvalAvailable = !config.disableLMEval;
  const dataRegistryAvailable = config.dataRegistry ?? false;
  const nimWizardAvailable = config.nimWizard ?? false;
  const llmGatewayFieldAvailable = config.llmGatewayField ?? false;
  const featureStoreAdminAvailable = config.featureStoreAdmin ?? false;
  const dataConnectHubAvailable = config.dataConnectHub ?? false;
  const genAiMcpRegistryServersAvailable = config.genAiMcpRegistryServers ?? false;
  const genAiAgentDeploymentAvailable = config.genAiAgentDeployment ?? false;
  const agentConfigManagementAvailable = config.agentConfigManagement ?? false;
  const hardwareProfileDRAAvailable = config.hardwareProfileDRA ?? false;
  const inferencePriorityFieldAvailable = config.inferencePriorityField ?? false;
  const modelCatalogAvailable = !config.disableModelCatalog;
  const modelRegistryAvailable = !config.disableModelRegistry;
  const modelServingAvailable = !config.disableModelServing;
  const mlflowAvailable = useIsAreaAvailable(SupportedArea.MLFLOW).status;
  const skillRegistryEnabled = config.skillRegistry ?? false;
  const aiHubAvailable =
    modelCatalogAvailable ||
    modelRegistryAvailable ||
    modelServingAvailable ||
    mcpCatalogAvailable ||
    agentsCatalogAvailable ||
    agentOpsAvailable;

  return React.useMemo<TourStep[]>(
    () => [
      {
        id: 'projects',
        title: 'Projects',
        description:
          'Organize workbenches, pipelines, model servers, and storage so your team can collaborate in one place.',
        navSelector: 'a[href="/projects"]',
        docUrl:
          'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.6/html/getting_started_with_red_hat_openshift_ai_self-managed/index',
        sectionAvailable: true,
        newFeatures: [],
      },
      {
        id: 'ai-hub',
        title: 'AI hub',
        description:
          'Discover and deploy models, manage connections and data assets, and connect to MCP servers.',
        navSelector: 'button[id="ai-hub"]',
        docUrl:
          'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.6/html/working_with_the_model_catalog/index',
        sectionAvailable: aiHubAvailable,
        newFeatures: withAvailability([
          {
            title: 'Agent skills',
            description: 'Create tools that agents can reuse across projects.',
            flags: [{ name: 'skillRegistry', enabled: skillRegistryEnabled }],
            component: { name: DataScienceStackComponent.MLFLOW, installed: mlflowAvailable },
          },
          {
            title: 'Data assets',
            description: 'Find datasets and get code to use them in workbenches and pipelines.',
            flags: [{ name: 'dataRegistry', enabled: dataRegistryAvailable }],
          },
          {
            title: 'NIM deployments',
            description: 'Deploy NVIDIA NIM models using project-level API keys.',
            flags: [{ name: 'nimWizard', enabled: nimWizardAvailable }],
          },
          {
            title: 'Deployment gateways',
            description: 'Choose which gateways serve your model deployments.',
            flags: [{ name: 'llmGatewayField', enabled: llmGatewayFieldAvailable }],
          },
          {
            title: 'Simplified connection management',
            description: 'Manage connections and connection types on the same page.',
            flags: [{ name: 'dataConnectHub', enabled: dataConnectHubAvailable }],
          },
        ]),
      },
      {
        id: 'gen-ai-studio',
        title: 'Gen AI studio',
        description:
          'Test models and prompts, experiment with RAG, and prepare configurations before building them into applications.',
        navSelector: 'button[id="gen-ai-studio"]',
        docUrl:
          'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.6/html/experimenting_with_models_in_the_gen_ai_playground/index',
        sectionAvailable: genAiAvailable,
        sectionFlagName: 'genAiStudio',
        newFeatures: withAvailability([
          {
            title: 'MCP servers',
            description: 'Use MCP servers when testing models in the playground.',
            flags: [{ name: 'genAiMcpRegistryServers', enabled: genAiMcpRegistryServersAvailable }],
          },
          {
            title: 'Agent endpoints',
            description:
              'Deploy playground configurations as API endpoints listed with your AI assets.',
            flags: [
              { name: 'genAiAgentDeployment', enabled: genAiAgentDeploymentAvailable },
              { name: 'agentConfigManagement', enabled: agentConfigManagementAvailable },
            ],
          },
        ]),
      },
      {
        id: 'develop-and-train',
        title: 'Develop & train',
        description:
          'Build pipelines, run training jobs, track experiments, and evaluate model performance.',
        navSelector: 'button[id="develop-and-train"]',
        docUrl:
          'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.6/html/evaluating_ai_systems/index',
        sectionAvailable: true,
        newFeatures: withAvailability([
          {
            title: 'Evaluation gallery',
            description:
              'Browse Red Hat-curated sets of benchmarks that you can use to evaluate your models.',
            flags: [{ name: 'disableLMEval', enabled: lmEvalAvailable }],
          },
        ]),
      },
      {
        id: 'observe-and-monitor',
        title: 'Observe & monitor',
        description: 'Check resource usage and workload health across your projects.',
        navSelector: 'button[id="observe-and-monitor"]',
        docUrl:
          'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.6/html/monitoring_your_ai_systems/index',
        sectionAvailable: true,
        newFeatures: withAvailability([
          {
            title: 'Agent traces',
            description:
              'Review traces, sessions, and evaluations for your agents and gen AI apps.',
            component: { name: DataScienceStackComponent.MLFLOW, installed: mlflowAvailable },
          },
        ]),
      },
      ...(isAdmin
        ? [
            {
              id: 'settings',
              title: 'Settings',
              description:
                'Manage user access, environment setup, and model serving resources for your organization.',
              navSelector: 'button[id="settings"]',
              docUrl:
                'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.6/html/managing_openshift_ai/index',
              sectionAvailable: true,
              newFeatures: withAvailability([
                {
                  title: 'Runtime library',
                  description: 'Find and install runtimes for serving models.',
                  flags: [{ name: 'disableModelServing', enabled: modelServingAvailable }],
                },
                {
                  title: 'Feature stores',
                  description: 'Set up feature stores to share ML features across projects.',
                  flags: [{ name: 'featureStoreAdmin', enabled: featureStoreAdminAvailable }],
                },
                {
                  title: 'New hardware profile type',
                  description:
                    'Use hardware profiles with dynamic resource allocation for workbenches and model deployments.',
                  flags: [{ name: 'hardwareProfileDRA', enabled: hardwareProfileDRAAvailable }],
                },
                {
                  title: 'Inference priority control',
                  description:
                    'Control which inference requests get processed first by assigning priorities to MaaS subscriptions.',
                  flags: [
                    { name: 'inferencePriorityField', enabled: inferencePriorityFieldAvailable },
                  ],
                },
              ]),
            },
          ]
        : []),
    ],
    [
      genAiAvailable,
      lmEvalAvailable,
      skillRegistryEnabled,
      dataRegistryAvailable,
      nimWizardAvailable,
      llmGatewayFieldAvailable,
      featureStoreAdminAvailable,
      dataConnectHubAvailable,
      genAiMcpRegistryServersAvailable,
      genAiAgentDeploymentAvailable,
      agentConfigManagementAvailable,
      hardwareProfileDRAAvailable,
      inferencePriorityFieldAvailable,
      modelServingAvailable,
      aiHubAvailable,
      mlflowAvailable,
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

const getNavToggle = (): HTMLElement | null => document.getElementById('page-nav-toggle');

/** Opens the managed sidebar when collapsed so tour popovers can anchor to nav items. */
const ensureNavSidebarOpen = (): boolean => {
  const toggle = getNavToggle();
  if (toggle?.getAttribute('aria-expanded') === 'false') {
    toggle.click();
    return true;
  }
  return false;
};

/** Closes the managed sidebar when expanded (used to restore pre-tour collapsed state). */
const ensureNavSidebarClosed = (): void => {
  const toggle = getNavToggle();
  if (toggle?.getAttribute('aria-expanded') === 'true') {
    toggle.click();
  }
};

const WhatsNewModalContent: React.FC = () => {
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

  const pathStepIndices = React.useMemo(
    () =>
      tourSteps.flatMap((step, i) =>
        tourPath !== 'new-features-only' || step.newFeatures.length > 0 ? [i] : [],
      ),
    [tourPath, tourSteps],
  );
  const pathStepCount = pathStepIndices.length;

  const autoLaunchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True when this tour session expanded a previously collapsed sidebar. */
  const tourOpenedSidebarRef = React.useRef(false);

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
      tourOpenedSidebarRef.current = false;
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
    if (tourOpenedSidebarRef.current) {
      ensureNavSidebarClosed();
      tourOpenedSidebarRef.current = false;
    }
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
      return { dismissStepId: 'summary', dismissStepIndex: pathStepCount };
    }
    return {
      dismissStepId: tourSteps[stepIndex]?.id ?? 'unknown',
      dismissStepIndex: pathStepIndices.indexOf(stepIndex),
    };
  }, [showWelcome, stepIndex, tourSteps, pathStepCount, pathStepIndices]);

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

    // Collapsed nav still keeps anchors in the DOM, so the popover can mount off-screen
    // with only the backdrop visible. Open the sidebar first when a step needs a nav target.
    const openedSidebar = ensureNavSidebarOpen();
    if (openedSidebar) {
      tourOpenedSidebarRef.current = true;
    }

    const timer = setTimeout(
      () => {
        const el = findNavElement(currentStep);
        if (el) {
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          setTargetEl(el);
        } else {
          setTargetEl(null);
        }
        setTargetReady(true);
      },
      // Give the sidebar expand animation a moment before measuring the anchor.
      openedSidebar ? 300 : 150,
    );

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
        <ModalHeader
          title={`Welcome to OpenShift AI ${TOUR_VERSION}!`}
          labelId="whats-new-modal-title"
        />
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
                data-testid="whats-new-tour-new-features"
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
                onClick={() => setStepIndex(pathStepIndices[pathStepIndices.length - 1])}
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

  const learnMoreUrl = currentStep.docUrl ?? DEFAULT_DOC_URL;
  const unavailableFeatures = currentStep.newFeatures.filter((f) => !f.available);
  const unavailableFlags = [
    ...new Set(
      unavailableFeatures.flatMap((f) =>
        (f.flags ?? []).filter((flag) => !flag.enabled).map((flag) => flag.name),
      ),
    ),
  ];
  const unavailableComponents = [
    ...new Set(
      unavailableFeatures.flatMap((f) =>
        f.component && !f.component.installed ? [f.component.name] : [],
      ),
    ),
  ];
  const sectionFlagMissing = !currentStep.sectionAvailable && !!currentStep.sectionFlagName;
  const sectionUnavailable = !currentStep.sectionAvailable || !targetEl;
  const presentationType = targetEl ? 'popover' : 'modal';

  const stepBody = (
    <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
      <FlexItem>
        {sectionUnavailable && (
          <Flex gap={{ default: 'gapSm' }} className="pf-v6-u-mb-sm">
            <FlexItem>
              <Label
                variant="outline"
                color="orange"
                isCompact
                icon={
                  <ExclamationTriangleIcon color="var(--pf-t--global--color--nonstatus--orange--default)" />
                }
              >
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
              <strong>New in {TOUR_VERSION}</strong>
            </Content>
            {currentStep.newFeatures.map((feature) => (
              <div key={feature.title} className="pf-v6-u-mb-md">
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  gap={{ default: 'gapSm' }}
                  display={{ default: 'inlineFlex' }}
                >
                  <FlexItem>
                    <strong>{feature.title}</strong>
                  </FlexItem>
                  {!feature.available && (
                    <FlexItem>
                      <Label
                        variant="outline"
                        color="orange"
                        isCompact
                        icon={
                          <ExclamationTriangleIcon color="var(--pf-t--global--color--nonstatus--orange--default)" />
                        }
                      >
                        Unavailable in the cluster
                      </Label>
                    </FlexItem>
                  )}
                </Flex>
                <Content component={ContentVariants.p}>{feature.description}</Content>
              </div>
            ))}
            {(unavailableFeatures.length > 0 || sectionFlagMissing) && (
              <div>
                <ExclamationTriangleIcon color="var(--pf-t--global--color--nonstatus--orange--default)" />{' '}
                {isAdmin ? (
                  <strong>To enable unavailable features in your cluster:</strong>
                ) : (
                  <strong>
                    Contact your administrator to request access to unavailable features.
                  </strong>
                )}
                {isAdmin && (unavailableFlags.length > 0 || sectionFlagMissing) && (
                  <div className="pf-v6-u-mt-sm">
                    Enable these feature flags in OdhDashboardConfig:
                    <List>
                      {sectionFlagMissing && (
                        <ListItem key={currentStep.sectionFlagName}>
                          <code>{currentStep.sectionFlagName}</code> (section)
                        </ListItem>
                      )}
                      {unavailableFlags.map((flagName) => (
                        <ListItem key={flagName}>
                          {flagName.startsWith('disable') ? (
                            <>
                              Set <code>{flagName}</code> to <code>false</code>
                            </>
                          ) : (
                            <code>{flagName}</code>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  </div>
                )}
                {isAdmin && unavailableComponents.length > 0 && (
                  <div className="pf-v6-u-mt-sm">
                    Set these components to <code>Managed</code> in the DataScienceCluster:
                    <List>
                      {unavailableComponents.map((componentName) => (
                        <ListItem key={componentName}>
                          <code>{componentName}</code>
                        </ListItem>
                      ))}
                    </List>
                  </div>
                )}
              </div>
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
        {pathStepIndices.indexOf(stepIndex) + 1} of {pathStepCount}
      </FlexItem>
      <Flex gap={{ default: 'gapSm' }}>
        <FlexItem>
          <Button
            data-testid="tour-step-back"
            variant="secondary"
            onClick={() => {
              const previous = pathStepIndices.filter((i) => i < stepIndex).pop();
              if (previous === undefined) {
                setShowWelcome(true);
              } else {
                setStepIndex(previous);
              }
            }}
          >
            Back
          </Button>
        </FlexItem>
        <FlexItem>
          <Button
            data-testid="tour-step-next"
            variant="primary"
            onClick={() =>
              setStepIndex(pathStepIndices.find((i) => i > stepIndex) ?? tourSteps.length)
            }
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
          position="right-start"
          flipBehavior={['right-start', 'right-end', 'right']}
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

const WhatsNewModal: React.FC = () => {
  const isGuidedTourAvailable = useIsAreaAvailable(SupportedArea.GUIDED_TOUR).status;
  if (!isGuidedTourAvailable) {
    return null;
  }
  return <WhatsNewModalContent />;
};

export default WhatsNewModal;
