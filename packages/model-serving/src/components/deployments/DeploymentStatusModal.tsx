import React from 'react';
import {
  Button,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  Icon,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports -- custom modal with ProgressStepper timeline and embedded status badge; ContentModal does not support this layout
  Modal,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports
  ModalBody,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports
  ModalFooter,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports
  ModalHeader,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports
  ModalVariant,
  ProgressStep,
  ProgressStepVariant,
  ProgressStepper,
  Spinner,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
  Timestamp,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import { InProgressIcon, InfoCircleIcon } from '@patternfly/react-icons';
import {
  t_global_text_color_status_danger_default as DangerColor,
  t_global_color_status_warning_300 as WarningColor,
  t_global_color_nonstatus_purple_400 as PurpleColor,
  t_global_font_weight_body_bold as BoldWeight,
} from '@patternfly/react-tokens';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { useKueueConfiguration } from '@odh-dashboard/hardware-profiles/shared/kueueUtils';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import { ClusterQueueModel } from '@odh-dashboard/internal/api/models/kueue';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { KUEUE_QUEUE_LABEL } from '@odh-dashboard/internal/concepts/kueue/index';
import { KUEUE_STATUSES_OVERRIDE_MODEL_DEPLOYMENT } from '@odh-dashboard/internal/concepts/kueue/types';
import {
  ModelStatusIcon,
  getDeploymentStatusSubtitleColor,
} from '@odh-dashboard/model-serving/shared/components';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';
import DeploymentResourcesTab from './DeploymentResourcesTab';
import type {
  Deployment,
  DeploymentCondition,
  DeploymentConditionStatus,
  DeploymentStatus,
} from '../../../extension-points';

type DeploymentStatusModalProps = {
  deployment: Deployment;
  onClose: () => void;
  onStopDeployment?: () => void;
  onEditDeployment?: () => void;
  isEditLoading?: boolean;
};

const getStepVariant = (status: DeploymentConditionStatus | undefined): ProgressStepVariant => {
  switch (status) {
    case 'True':
      return ProgressStepVariant.success;
    case 'False':
      return ProgressStepVariant.danger;
    case 'Warning':
      return ProgressStepVariant.warning;
    default:
      return ProgressStepVariant.pending;
  }
};

const ConditionTimestamp: React.FC<{ isoString?: string }> = ({ isoString }) => {
  if (!isoString) {
    return null;
  }
  const date = new Date(isoString);
  return (
    <Timestamp
      date={date}
      tooltip={{ variant: TimestampTooltipVariant.default }}
      dateFormat="long"
      timeFormat="long"
    />
  );
};

const getMessageColor = (status: DeploymentConditionStatus | undefined): string | undefined => {
  switch (status) {
    case 'False':
      return DangerColor.var;
    case 'Warning':
      return WarningColor.var;
    default:
      return undefined;
  }
};

const getConditionMessageColor = (
  condition: DeploymentCondition,
  deploymentStatus?: DeploymentStatus | null,
): string | undefined => {
  if (
    condition.type === 'CreatePod' &&
    deploymentStatus?.kueueStatus?.status &&
    KUEUE_STATUSES_OVERRIDE_MODEL_DEPLOYMENT.includes(deploymentStatus.kueueStatus.status)
  ) {
    return getDeploymentStatusSubtitleColor(deploymentStatus);
  }
  const messageStatus = condition.messageStatus ?? condition.status;
  return getMessageColor(messageStatus);
};

/** In-progress steps (e.g. waiting on Kueue) render a spinner instead of the default variant icon. */
const InProgressStepIcon: React.FC = () => (
  <Icon isInline>
    <InProgressIcon
      className="ai-u-spin"
      style={{ color: 'var(--pf-t--global--icon--color--brand--default)' }}
    />
  </Icon>
);

const ConditionDescription: React.FC<{
  condition: DeploymentCondition;
  deploymentStatus?: DeploymentStatus | null;
}> = ({ condition, deploymentStatus }) => {
  const messageStatus = condition.messageStatus ?? condition.status;
  const messageColor = getConditionMessageColor(condition, deploymentStatus);
  const showMessage =
    Boolean(condition.message) &&
    (messageStatus === 'False' || messageStatus === 'Warning' || messageStatus === 'Unknown');
  return (
    <>
      <ConditionTimestamp isoString={condition.lastTransitionTime} />
      {showMessage && (
        <Content
          component={ContentVariants.small}
          style={messageColor ? { color: messageColor } : undefined}
        >
          {condition.message}
        </Content>
      )}
    </>
  );
};

const ConditionChildren: React.FC<{
  children: DeploymentCondition[];
  deploymentStatus?: DeploymentStatus | null;
}> = ({ children, deploymentStatus }) => (
  <ProgressStepper isVertical style={{ paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
    {children.map((child) => (
      <ProgressStep
        key={child.type}
        variant={getStepVariant(child.status)}
        icon={child.inProgress ? <InProgressStepIcon /> : undefined}
        aria-label={`${child.label}: ${child.status ?? 'pending'}`}
        id={`condition-child-${child.type}`}
        titleId={`condition-child-${child.type}-title`}
        description={<ConditionDescription condition={child} deploymentStatus={deploymentStatus} />}
        data-testid={`deployment-condition-${child.type}`}
      >
        {child.label}
      </ProgressStep>
    ))}
  </ProgressStepper>
);

const ConditionsProgressStepper: React.FC<{
  conditions: DeploymentCondition[];
  deploymentStatus?: DeploymentStatus | null;
}> = ({ conditions, deploymentStatus }) => (
  <ProgressStepper isVertical data-testid="deployment-status-steps">
    {conditions.map((condition) => (
      <ProgressStep
        key={condition.type}
        variant={getStepVariant(condition.status)}
        icon={condition.inProgress ? <InProgressStepIcon /> : undefined}
        aria-label={`${condition.label}: ${condition.status ?? 'pending'}`}
        id={`condition-${condition.type}`}
        titleId={`condition-${condition.type}-title`}
        description={
          <>
            <ConditionDescription condition={condition} deploymentStatus={deploymentStatus} />
            {condition.children && condition.children.length > 0 && (
              <ConditionChildren deploymentStatus={deploymentStatus}>
                {condition.children}
              </ConditionChildren>
            )}
          </>
        }
        data-testid={`deployment-condition-${condition.type}`}
      >
        {condition.label}
      </ProgressStep>
    ))}
  </ProgressStepper>
);

const PROGRESS_TAB = 'progress';
const RESOURCES_TAB = 'resources';

const DeploymentProgressDisclaimer: React.FC = () => (
  <HelperText data-testid="deployment-status-progress-disclaimer">
    <HelperTextItem
      variant="indeterminate"
      icon={<InfoCircleIcon style={{ color: PurpleColor.var }} />}
      style={{ fontWeight: BoldWeight.var }}
    >
      Steps may occur in any order, depending on the deployment type.
    </HelperTextItem>
  </HelperText>
);

const DeploymentProgressTab: React.FC<{
  conditions: DeploymentCondition[];
  deploymentStatus?: DeploymentStatus | null;
}> = ({ conditions, deploymentStatus }) => (
  <Stack hasGutter>
    <StackItem>
      <DeploymentProgressDisclaimer />
    </StackItem>
    <StackItem>
      <ConditionsProgressStepper conditions={conditions} deploymentStatus={deploymentStatus} />
    </StackItem>
  </Stack>
);

const DeploymentStatusModal: React.FC<DeploymentStatusModalProps> = ({
  deployment,
  onClose,
  onStopDeployment,
  onEditDeployment,
  isEditLoading,
}) => {
  const conditions = deployment.status?.conditions ?? [];
  const displayName = getDisplayNameFromK8sResource(deployment.model);
  const { namespace } = deployment.model.metadata;

  const { projects } = React.useContext(ProjectsContext);
  const project = projects.find((p) => p.metadata.name === namespace);
  const { isKueueFeatureEnabled, isProjectKueueEnabled } = useKueueConfiguration(project);
  const localQueueName = deployment.model.metadata.labels?.[KUEUE_QUEUE_LABEL];
  const [canViewClusterQueue] = useAccessReview(
    { group: ClusterQueueModel.apiGroup, resource: ClusterQueueModel.plural, verb: 'get' },
    Boolean(isKueueFeatureEnabled && isProjectKueueEnabled),
  );
  // Tab visibility depends only on Kueue being enabled for this project — not on whether this
  // particular deployment has a queue label. A missing label is handled as an empty state inside
  // DeploymentResourcesTab, so the tab strip stays consistent across all deployment states.
  const showResourcesTab = Boolean(
    isKueueFeatureEnabled && isProjectKueueEnabled && canViewClusterQueue,
  );

  const [activeTab, setActiveTab] = React.useState<string>(PROGRESS_TAB);

  React.useEffect(() => {
    if (!showResourcesTab && activeTab === RESOURCES_TAB) {
      setActiveTab(PROGRESS_TAB);
    }
  }, [showResourcesTab, activeTab]);

  return (
    <Modal
      appendTo={document.body}
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      data-testid="deployment-status-modal"
    >
      <ModalHeader
        data-testid="deployment-status-modal-header"
        title={
          <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>{displayName} status</FlexItem>
            <FlexItem>
              <ModelStatusIcon
                state={deployment.status?.state ?? ModelDeploymentState.UNKNOWN}
                stoppedStates={deployment.status?.stoppedStates}
                kueueStatus={deployment.status?.kueueStatus}
                variant="filled"
              />
            </FlexItem>
          </Flex>
        }
      />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            {/* Tab strip is always shown, even when Resources is the only conditional tab, so
                the modal shape stays consistent as more tabs (e.g. Events) are added later. */}
            <Tabs
              activeKey={activeTab}
              onSelect={(_event, tabKey) => setActiveTab(String(tabKey))}
              aria-label="Deployment status tabs"
              data-testid="deployment-status-tabs"
            >
              <Tab
                eventKey={PROGRESS_TAB}
                aria-label={PROGRESS_TAB}
                title={<TabTitleText>Progress</TabTitleText>}
                data-testid="deployment-status-progress-tab"
              />
              {showResourcesTab && (
                <Tab
                  eventKey={RESOURCES_TAB}
                  aria-label={RESOURCES_TAB}
                  title={<TabTitleText>Resources</TabTitleText>}
                  data-testid="deployment-status-resources-tab"
                />
              )}
            </Tabs>
          </StackItem>
          <StackItem>
            {showResourcesTab && activeTab === RESOURCES_TAB && namespace ? (
              <DeploymentResourcesTab
                localQueueName={localQueueName}
                namespace={namespace}
                deploymentName={deployment.model.metadata.name}
              />
            ) : (
              <DeploymentProgressTab conditions={conditions} deploymentStatus={deployment.status} />
            )}
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Flex gap={{ default: 'gapMd' }}>
          {onStopDeployment && (
            <FlexItem>
              <Button
                variant="primary"
                isDanger
                onClick={onStopDeployment}
                data-testid="deployment-status-stop-button"
              >
                Stop deployment
              </Button>
            </FlexItem>
          )}
          {onEditDeployment && (
            <FlexItem>
              <Button
                variant="link"
                onClick={onEditDeployment}
                isDisabled={isEditLoading}
                icon={isEditLoading ? <Spinner size="sm" /> : undefined}
                data-testid="deployment-status-edit-button"
              >
                {isEditLoading ? 'Loading deployment...' : 'Edit deployment'}
              </Button>
            </FlexItem>
          )}
        </Flex>
      </ModalFooter>
    </Modal>
  );
};

export default DeploymentStatusModal;
