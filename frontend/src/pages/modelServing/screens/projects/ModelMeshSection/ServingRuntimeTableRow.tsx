import * as React from 'react';

import { Button, Icon, Skeleton, Tooltip, Truncate } from '@patternfly/react-core';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import { ExclamationCircleIcon, PlayIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { KnownLabels, ServingRuntimeKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { getDisplayNameFromServingRuntimeTemplate } from '~/pages/modelServing/customServingRuntimes/utils';
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
  rowIndex: number;
};

const ServingRuntimeTableRow: React.FC<ServingRuntimeTableRowProps> = ({
  obj,
  onDeleteServingRuntime,
  onEditServingRuntime,
  onDeployModel,
  allowDelete,
  rowIndex,
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

  const [isExpanded, setExpanded] = React.useState(false);

  const tokens = filterTokens(obj.metadata.name);

  const modelInferenceServices = getInferenceServiceFromServingRuntime(inferenceServices, obj);

  const serverMetricsSupported =
    useIsAreaAvailable(SupportedArea.PERFORMANCE_METRICS).status &&
    currentProject.metadata.labels?.[KnownLabels.MODEL_SERVING_PROJECT] === 'true';

  return (
    <Tbody isExpanded={isExpanded}>
      <Tr {...(rowIndex % 2 === 0 && { isStriped: true })}>
        <Td
          expand={{
            rowIndex,
            expandId: `expand-table-row-${obj.metadata.name}-${rowIndex}`,
            isExpanded,
            onToggle: () => setExpanded(!isExpanded),
          }}
        />

        <Td dataLabel="Model Server Name">
          {obj.metadata.annotations?.['openshift.io/display-name'] ||
            obj.spec.builtInAdapter?.serverType ||
            'Custom Runtime'}
        </Td>
        <Td dataLabel="Serving Runtime">
          <Truncate content={getDisplayNameFromServingRuntimeTemplate(obj)} />
        </Td>
        <Td dataLabel="Deployed models">
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
        <Td dataLabel="Tokens">
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
          <Button
            onClick={() => onDeployModel(obj)}
            key={`action-${ProjectSectionID.CLUSTER_STORAGES}`}
            variant="link"
            icon={<PlayIcon />}
          >
            Deploy model
          </Button>
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
      <Tr isExpanded={isExpanded}>
        <ServingRuntimeTableExpandedSection obj={obj} />
      </Tr>
    </Tbody>
  );
};

export default ServingRuntimeTableRow;
