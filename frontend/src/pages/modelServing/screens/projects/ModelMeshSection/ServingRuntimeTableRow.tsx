import * as React from 'react';
import {
  Button,
  DropdownDirection,
  Icon,
  Skeleton,
  Tooltip,
  Truncate,
} from '@patternfly/react-core';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { ServingRuntimeKind } from '~/k8sTypes';
import EmptyTableCellForAlignment from '~/pages/projects/components/EmptyTableCellForAlignment';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ServingRuntimeTableTabs } from '~/pages/modelServing/screens/types';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { getDisplayNameFromServingRuntimeTemplate } from '~/pages/modelServing/customServingRuntimes/utils';
import {
  getInferenceServiceFromServingRuntime,
  isServingRuntimeTokenEnabled,
} from '~/pages/modelServing/screens/projects/utils';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
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

  const performanceMetricsAreaAvailable = useIsAreaAvailable(
    SupportedArea.PERFORMANCE_METRICS,
  ).status;

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
      <Tr>
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
          compoundExpand={compoundExpandParams(ServingRuntimeTableTabs.DEPLOYED_MODELS, false)}
        >
          {inferenceServicesLoaded ? (
            <>
              {modelInferenceServices.length}{' '}
              {inferenceServicesLoadError && (
                <Tooltip
                  removeFindDomNode
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
          compoundExpand={compoundExpandParams(
            ServingRuntimeTableTabs.TOKENS,
            tokens.length === 0 || !isServingRuntimeTokenEnabled(obj),
          )}
        >
          {secretsLoaded ? (
            <>
              {!isServingRuntimeTokenEnabled(obj) ? 'Tokens disabled' : tokens.length}{' '}
              {secretsLoadError && (
                <Tooltip
                  removeFindDomNode
                  aria-labelledby="Tokens load error"
                  content={secretsLoadError.message}
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
        <Td style={{ textAlign: 'end' }}>
          <Button
            onClick={() => onDeployModel(obj)}
            key={`action-${ProjectSectionID.CLUSTER_STORAGES}`}
            variant="secondary"
          >
            Deploy model
          </Button>
        </Td>
        <Td isActionCell>
          <ActionsColumn
            dropdownDirection={DropdownDirection.up}
            items={[
              {
                title: 'Edit model server',
                onClick: () => onEditServingRuntime(obj),
              },
              ...(performanceMetricsAreaAvailable
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
          onDeployModel={() => onDeployModel(obj)}
        />
      </Tr>
    </Tbody>
  );
};

export default ServingRuntimeTableRow;
