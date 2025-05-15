import * as React from 'react';

import { Button, Icon, Skeleton, Tooltip, Truncate } from '@patternfly/react-core';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KnownLabels, ServingRuntimeKind } from '~/k8sTypes';
import SimpleMenuActions from '~/components/SimpleMenuActions';
import EmptyTableCellForAlignment from '~/pages/projects/components/EmptyTableCellForAlignment';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ServingRuntimeTableTabs } from '~/pages/modelServing/screens/types';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { getDisplayNameFromServingRuntimeTemplate } from '~/pages/modelServing/customServingRuntimes/utils';
import { modelVersionRoute } from '~/routes/modelRegistry/modelVersions';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

import {
  getInferenceServiceFromServingRuntime,
  isServingRuntimeTokenEnabled,
} from '~/pages/modelServing/screens/projects/utils';
import ServingRuntimeTableExpandedSection from './ServingRuntimeTableExpandedSection';

type ServingRuntimeTableRowProps = {
  obj: ServingRuntimeKind;
  onDeleteServingRuntime: (obj: ServingRuntimeKind) => void;
  onEditServingRuntime: (obj: ServingRuntimeKind) => void;
  onDeployModel: (obj: ServingRuntimeKind) => void;
  expandedServingRuntimeName?: string;
  allowDelete: boolean;
};

const ServingRuntimeTableRow: React.FC<ServingRuntimeTableRowProps> = ({
  obj,
  onDeleteServingRuntime,
  onEditServingRuntime,
  onDeployModel,
  expandedServingRuntimeName,
  allowDelete,
}) => {
  const navigate = useNavigate();

  const [queryParams] = useSearchParams();
  const modelRegistryName = queryParams.get('modelRegistryName');
  const registeredModelId = queryParams.get('registeredModelId');
  const modelVersionId = queryParams.get('modelVersionId');
  // deployingFromRegistry = User came from the Model Registry page because this project didn't have a serving platform selected
  const deployingFromRegistry = !!(modelRegistryName && registeredModelId && modelVersionId);

  const {
    currentProject,
    inferenceServices: {
      data: inferenceServices,
      loaded: inferenceServicesLoaded,
      error: inferenceServicesLoadError,
    },
    serverSecrets: { loaded: secretsLoaded, error: secretsLoadError },
    filterTokens,
  } = React.useContext(ProjectDetailsContext);

  const [expandedColumn, setExpandedColumn] = React.useState<ServingRuntimeTableTabs>();

  React.useEffect(() => {
    if (expandedServingRuntimeName === obj.metadata.name) {
      setExpandedColumn(ServingRuntimeTableTabs.DEPLOYED_MODELS);
    }
  }, [expandedServingRuntimeName, obj.metadata.name]);

  const tokens = filterTokens(obj.metadata.name);

  const modelInferenceServices = getInferenceServiceFromServingRuntime(inferenceServices, obj);

  const serverMetricsSupported =
    useIsAreaAvailable(SupportedArea.PERFORMANCE_METRICS).status &&
    currentProject.metadata.labels?.[KnownLabels.MODEL_SERVING_PROJECT] === 'true';

  const compoundExpandParams = (
    col: ServingRuntimeTableTabs,
    isDisabled: boolean,
  ): React.ComponentProps<typeof Td>['compoundExpand'] =>
    !isDisabled
      ? {
          isExpanded: expandedColumn === col,
          onToggle: (_, __, colIndex: ServingRuntimeTableTabs) => {
            setExpandedColumn(expandedColumn === colIndex ? undefined : colIndex);
          },
          columnIndex: col,
          expandId: `expand-table-row-${obj.metadata.name}-${col}`,
        }
      : undefined;

  return (
    <Tbody isExpanded={!!expandedColumn}>
      <Tr isControlRow>
        <EmptyTableCellForAlignment />
        <Td
          dataLabel="Model Server Name"
          compoundExpand={compoundExpandParams(ServingRuntimeTableTabs.TYPE, false)}
        >
          {obj.metadata.annotations?.['openshift.io/display-name'] ||
            obj.spec.builtInAdapter?.serverType ||
            'Custom Runtime'}
        </Td>
        <Td dataLabel="Serving Runtime">
          <Truncate content={getDisplayNameFromServingRuntimeTemplate(obj)} />
        </Td>
        <Td
          dataLabel="Deployed models"
          compoundExpand={
            inferenceServicesLoaded
              ? compoundExpandParams(
                  ServingRuntimeTableTabs.DEPLOYED_MODELS,
                  !(modelInferenceServices.length >= 1),
                )
              : undefined
          }
        >
          {inferenceServicesLoaded ? (
            <>
              {modelInferenceServices.length}{' '}
              {inferenceServicesLoadError && (
                <Tooltip
                  aria-labelledby="Deployed models load error"
                  content={inferenceServicesLoadError.message}
                >
                  <Icon role="button" status="danger" aria-label="error icon" tabIndex={0}>
                    <ExclamationCircleIcon />
                  </Icon>
                </Tooltip>
              )}
            </>
          ) : (
            <Skeleton />
          )}
        </Td>
        <Td
          dataLabel="Tokens"
          compoundExpand={
            secretsLoaded
              ? compoundExpandParams(
                  ServingRuntimeTableTabs.TOKENS,
                  tokens.length === 0 || !isServingRuntimeTokenEnabled(obj),
                )
              : undefined
          }
        >
          {secretsLoaded ? (
            <>
              {!isServingRuntimeTokenEnabled(obj) ? 'Tokens disabled' : tokens.length}{' '}
              {secretsLoadError && (
                <Tooltip aria-labelledby="Tokens load error" content={secretsLoadError.message}>
                  <Icon role="button" status="danger" aria-label="error icon" tabIndex={0}>
                    <ExclamationCircleIcon />
                  </Icon>
                </Tooltip>
              )}
            </>
          ) : (
            <Skeleton />
          )}
        </Td>
        <Td style={{ textAlign: 'end' }}>
          {deployingFromRegistry ? (
            <SimpleMenuActions
              key={`action-${ProjectSectionID.MODEL_SERVER}`}
              testId="deploy-model-dropdown"
              toggleProps={{ variant: 'secondary' }}
              toggleLabel="Deploy model"
              dropdownItems={[
                {
                  key: 'deploy',
                  label: 'Deploy model',
                  onClick: () => onDeployModel(obj),
                },
                {
                  key: 'deployFromRegistry',
                  label: 'Deploy model from model registry',
                  onClick: () => {
                    navigate(
                      modelVersionRoute(modelVersionId, registeredModelId, modelRegistryName),
                    );
                  },
                },
              ]}
            />
          ) : (
            <Button
              data-testid="deploy-model-button"
              onClick={() => onDeployModel(obj)}
              key={`action-${ProjectSectionID.MODEL_SERVER}`}
              variant="secondary"
            >
              Deploy model
            </Button>
          )}
        </Td>
        <Td isActionCell>
          <ActionsColumn
            items={[
              {
                title: 'Edit model server',
                onClick: () => onEditServingRuntime(obj),
              },
              ...(serverMetricsSupported
                ? [
                    {
                      title: 'View model server metrics',
                      onClick: () =>
                        navigate(
                          `/projects/${currentProject.metadata.name}/metrics/server/${obj.metadata.name}`,
                        ),
                    },
                  ]
                : []),
              ...(allowDelete
                ? [
                    { isSeparator: true },
                    {
                      title: 'Delete model server',
                      onClick: () => onDeleteServingRuntime(obj),
                    },
                  ]
                : []),
            ]}
          />
        </Td>
      </Tr>
      <Tr isExpanded={!!expandedColumn}>
        <ServingRuntimeTableExpandedSection
          activeColumn={expandedColumn}
          obj={obj}
          onClose={() => setExpandedColumn(undefined)}
        />
      </Tr>
    </Tbody>
  );
};

export default ServingRuntimeTableRow;
