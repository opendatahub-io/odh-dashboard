import * as React from 'react';
import { Button, Icon, Skeleton, Tooltip } from '@patternfly/react-core';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ServingRuntimeKind } from '~/k8sTypes';
import EmptyTableCellForAlignment from '~/pages/projects/components/EmptyTableCellForAlignment';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ServingRuntimeTableTabs } from '~/pages/modelServing/screens/types';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { getDisplayNameFromServingRuntimeTemplate } from '~/pages/modelServing/customServingRuntimes/utils';
import ServingRuntimeTableExpandedSection from './ServingRuntimeTableExpandedSection';
import { isServingRuntimeTokenEnabled } from './utils';

type ServingRuntimeTableRowProps = {
  obj: ServingRuntimeKind;
  onDeleteServingRuntime: (obj: ServingRuntimeKind) => void;
  onEditServingRuntime: (obj: ServingRuntimeKind) => void;
  onDeployModal: (obj: ServingRuntimeKind) => void;
};

const ServingRuntimeTableRow: React.FC<ServingRuntimeTableRowProps> = ({
  obj,
  onDeleteServingRuntime,
  onEditServingRuntime,
  onDeployModal,
}) => {
  const [expandedColumn, setExpandedColumn] = React.useState<ServingRuntimeTableTabs | undefined>();

  const {
    inferenceServices: {
      data: inferenceServices,
      loaded: inferenceServicesLoaded,
      error: inferenceServicesLoadError,
    },
    serverSecrets: { loaded: secretsLoaded, error: secretsLoadError },
    filterTokens,
  } = React.useContext(ProjectDetailsContext);

  const tokens = filterTokens(obj.metadata.name);

  const onToggle = (_, __, colIndex: ServingRuntimeTableTabs) => {
    setExpandedColumn(expandedColumn === colIndex ? undefined : colIndex);
  };

  const compoundExpandParams = (col: ServingRuntimeTableTabs, isDisabled: boolean) =>
    !isDisabled
      ? {
          isExpanded: expandedColumn === col,
          onToggle,
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
        <Td dataLabel="Serving Runtime">{getDisplayNameFromServingRuntimeTemplate(obj)}</Td>
        <Td
          dataLabel="Deployed models"
          compoundExpand={compoundExpandParams(ServingRuntimeTableTabs.DEPLOYED_MODELS, false)}
        >
          {inferenceServicesLoaded ? (
            <>
              {inferenceServices.length}{' '}
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
            onClick={() => onDeployModal(obj)}
            key={`action-${ProjectSectionID.CLUSTER_STORAGES}`}
            variant="secondary"
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
              {
                title: 'Delete model server',
                onClick: () => onDeleteServingRuntime(obj),
              },
            ]}
          />
        </Td>
      </Tr>
      <Tr isExpanded={!!expandedColumn}>
        <ServingRuntimeTableExpandedSection
          activeColumn={expandedColumn}
          obj={obj}
          onClose={() => setExpandedColumn(undefined)}
          onDeployModel={() => onDeployModal(obj)}
        />
      </Tr>
    </Tbody>
  );
};

export default ServingRuntimeTableRow;
