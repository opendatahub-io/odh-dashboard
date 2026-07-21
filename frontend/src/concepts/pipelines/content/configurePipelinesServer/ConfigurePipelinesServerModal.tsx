import * as React from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Form,
  Stack,
  StackItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  ExpandableSection,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { createPipelinesCR, deleteSecret, listPipelinesCR } from '#~/api';
import { EMPTY_AWS_PIPELINE_DATA } from '#~/pages/projects/dataConnections/const';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';
import {
  NotificationResponseStatus,
  NotificationWatcherContext,
} from '#~/concepts/notificationWatcher/NotificationWatcherContext.tsx';
import usePipelinesConnections from '#~/pages/projects/screens/detail/connections/usePipelinesConnections';
import { FAST_POLL_INTERVAL } from '#~/utilities/const.ts';
import { pipelinesBaseRoute } from '#~/routes/pipelines/global.ts';
import { DSPipelineKind } from '#~/k8sTypes.ts';
import {
  dspaLoaded,
  hasServerTimedOut,
  isDspaAllReady,
} from '#~/concepts/pipelines/context/usePipelineNamespaceCR';
import { useAppContext } from '#~/app/AppContext';
import { PipelinesDatabaseSection } from './PipelinesDatabaseSection';
import { PipelineCachingSection } from './PipelineCachingSection';
import { ObjectStorageSection } from './ObjectStorageSection';
import {
  DATABASE_CONNECTION_FIELDS,
  EMPTY_DATABASE_CONNECTION,
  ExternalDatabaseSecret,
} from './const';
import { configureDSPipelineResourceSpec, objectStorageIsValid } from './utils';
import { PipelineServerConfigType } from './types';
import PipelinesDefinitionStorageSection from './PipelinesDefinitionStorageSection';
import ManagedPipelinesSettingsSection from './ManagedPipelinesSettingsSection';

type ConfigurePipelinesServerModalProps = {
  onClose: () => void;
  /** When provided, overrides usePipelinesAPI().namespace. */
  standaloneNamespace?: string;
  /** Called after successful DSPA creation (standalone mode). Replaces NotificationWatcher polling. */
  onSuccess?: () => void;
  /** Override initial form defaults (e.g. { enableManagedPipelines: true }). */
  defaultConfig?: Partial<PipelineServerConfigType>;
  /** Override the modal title (default: "Configure pipeline server"). */
  title?: string;
  /** Override the submit button label (default: "Configure pipeline server"). */
  submitLabel?: string;
  /** When true, shows a warning when managed pipelines is unchecked and starts advanced settings expanded. */
  showManagedPipelinesWarning?: boolean;
};

const FORM_DEFAULTS: PipelineServerConfigType = {
  database: { useDefault: true, value: EMPTY_DATABASE_CONNECTION },
  objectStorage: { newValue: EMPTY_AWS_PIPELINE_DATA },
  storeYamlInKubernetes: true,
  enableCaching: true,
  enableManagedPipelines: false,
};

const serverConfiguredEvent = 'Pipeline Server Configured';
export const ConfigurePipelinesServerModal: React.FC<ConfigurePipelinesServerModalProps> = ({
  onClose,
  standaloneNamespace,
  onSuccess,
  defaultConfig,
  showManagedPipelinesWarning = false,
  title: modalTitle = 'Configure pipeline server',
  submitLabel = 'Configure pipeline server',
}) => {
  const { namespace, startingStatusModalOpenRef } = usePipelinesAPI();
  const effectiveNamespace = standaloneNamespace ?? namespace;
  const [connections, loaded] = usePipelinesConnections(effectiveNamespace);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [advancedSettingsExpanded, setAdvancedSettingsExpanded] = React.useState(
    showManagedPipelinesWarning,
  );
  const [mergedDefaults] = React.useState<PipelineServerConfigType>(() =>
    defaultConfig ? { ...FORM_DEFAULTS, ...defaultConfig } : FORM_DEFAULTS,
  );
  const [config, setConfig] = React.useState<PipelineServerConfigType>(() => mergedDefaults);
  const { registerNotification } = React.useContext(NotificationWatcherContext);
  const advancedSettingsRef = React.useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { dashboardConfig } = useAppContext();
  // standaloneNamespace is currently only used in autorag and automl — skip the dashboardConfig
  // check because to reach those pages the feature must already be enabled.
  const isManagedPipelinesAvailable = standaloneNamespace
    ? true
    : dashboardConfig.spec.dashboardConfig.automl || dashboardConfig.spec.dashboardConfig.autorag;

  const databaseIsValid = config.database.useDefault
    ? true
    : config.database.value.every(({ key, value }) =>
        DATABASE_CONNECTION_FIELDS.filter((field) => field.isRequired)
          .map((field) => field.key)
          .includes(key)
          ? !!value
          : true,
      );

  const objectIsValid = objectStorageIsValid(config.objectStorage.newValue);
  const canSubmit = databaseIsValid && objectIsValid;

  const onBeforeClose = () => {
    onClose();
    setFetching(false);
    setError(undefined);
    setConfig(mergedDefaults);
    setAdvancedSettingsExpanded(showManagedPipelinesWarning);
  };

  const onCancel = () => {
    onBeforeClose();
    fireFormTrackingEvent(serverConfiguredEvent, { outcome: TrackingOutcome.cancel });
  };

  const submit = () => {
    const objectStorage: PipelineServerConfigType['objectStorage'] = {
      newValue: config.objectStorage.newValue.map((entry) => ({
        ...entry,
        value: entry.value.trim(),
      })),
    };
    setFetching(true);
    setError(undefined);

    const configureConfig: PipelineServerConfigType = {
      ...config,
      objectStorage,
    };

    configureDSPipelineResourceSpec(configureConfig, effectiveNamespace)
      .then(async (spec) => {
        let obj: DSPipelineKind;
        try {
          obj = await createPipelinesCR(effectiveNamespace, spec);
        } catch (e) {
          const caughtError = e instanceof Error ? e : new Error(String(e));
          setFetching(false);
          setError(caughtError);
          fireFormTrackingEvent(serverConfiguredEvent, {
            outcome: TrackingOutcome.submit,
            success: false,
            error: caughtError.message,
          });
          deleteSecret(effectiveNamespace, ExternalDatabaseSecret.NAME);
          return;
        }

        onBeforeClose();

        fireFormTrackingEvent(serverConfiguredEvent, {
          outcome: TrackingOutcome.submit,
          success: true,
        });

        if (onSuccess) {
          onSuccess();
          return;
        }

        const pollingNamespace = obj.metadata.namespace;
        registerNotification({
          callbackDelay: FAST_POLL_INTERVAL,
          callback: async (signal: AbortSignal) => {
            try {
              const response = await listPipelinesCR(pollingNamespace, { signal });
              const serverLoaded = dspaLoaded([response[0], true]);
              const serverAllReady = isDspaAllReady([response[0], true]);

              if (hasServerTimedOut([response[0], true], serverLoaded)) {
                const errorMessage =
                  response[0]?.status?.conditions?.find((condition) => condition.type === 'Ready')
                    ?.message || `${pollingNamespace} pipeline server creation timed out`;
                throw Error(errorMessage);
              }

              if (response.length === 0) {
                return {
                  status: NotificationResponseStatus.STOP,
                };
              }

              if (serverLoaded && serverAllReady) {
                if (startingStatusModalOpenRef?.current === pollingNamespace) {
                  return {
                    status: NotificationResponseStatus.STOP,
                  };
                }

                return {
                  status: NotificationResponseStatus.SUCCESS,
                  title: `Pipeline server for ${pollingNamespace} is ready.`,
                  actions: [
                    {
                      title: `${pollingNamespace} pipeline server`,
                      onClick: () => navigate(pipelinesBaseRoute(pollingNamespace)),
                    },
                  ],
                };
              }

              return {
                status: NotificationResponseStatus.REPOLL,
              };
            } catch (e) {
              if (startingStatusModalOpenRef?.current === pollingNamespace) {
                return {
                  status: NotificationResponseStatus.STOP,
                };
              }
              return {
                status: NotificationResponseStatus.ERROR,
                title: `Error configuring pipeline server for ${pollingNamespace}`,
                message: e instanceof Error ? e.message : 'Unknown error',
                actions: [
                  {
                    title: `${pollingNamespace} pipeline server`,
                    onClick: () => navigate(pipelinesBaseRoute(pollingNamespace)),
                  },
                ],
              };
            }
          },
        });
      })
      .catch((e) => {
        const caughtError = e instanceof Error ? e : new Error(String(e));
        setFetching(false);
        setError(caughtError);
        fireFormTrackingEvent(serverConfiguredEvent, {
          outcome: TrackingOutcome.submit,
          success: false,
          error: caughtError.message,
        });
      });
  };

  return (
    <Modal variant="medium" isOpen onClose={onCancel}>
      <ModalHeader
        title={modalTitle}
        description="Configuring a pipeline server enables you to create and manage pipelines."
      />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Alert
              variant="info"
              isInline
              title="Pipeline server configuration cannot be edited after creation. To use a different configuration after creation, delete the pipeline server and create a new one."
            />
          </StackItem>
          <StackItem>
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <ObjectStorageSection
                setConfig={setConfig}
                config={config}
                loaded={loaded}
                connections={connections}
              />
              <ExpandableSection
                data-testid="advanced-settings-section"
                isIndented
                toggleId="advanced-settings-toggle"
                toggleText="Advanced settings"
                onToggle={() => {
                  setAdvancedSettingsExpanded(!advancedSettingsExpanded);

                  if (!advancedSettingsExpanded) {
                    requestAnimationFrame(() => {
                      advancedSettingsRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    });
                  }
                }}
                isExpanded={advancedSettingsExpanded}
              >
                <div ref={advancedSettingsRef}>
                  <PipelinesDatabaseSection setConfig={setConfig} config={config} />
                  <PipelinesDefinitionStorageSection setConfig={setConfig} config={config} />
                  <div className="pf-v6-u-mt-lg">
                    <PipelineCachingSection
                      enableCaching={config.enableCaching}
                      setEnableCaching={(enableCaching) => setConfig({ ...config, enableCaching })}
                    />
                  </div>
                  {isManagedPipelinesAvailable ? (
                    <ManagedPipelinesSettingsSection
                      setConfig={setConfig}
                      config={config}
                      showWarning={showManagedPipelinesWarning}
                    />
                  ) : null}
                </div>
              </ExpandableSection>
            </Form>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel={submitLabel}
          onSubmit={submit}
          isSubmitLoading={fetching}
          isSubmitDisabled={!canSubmit || fetching}
          onCancel={onCancel}
          alertTitle="Error configuring pipeline server"
          error={error}
        />
      </ModalFooter>
    </Modal>
  );
};
