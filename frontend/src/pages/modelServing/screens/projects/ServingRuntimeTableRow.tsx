import * as React from 'react';
import { Icon, Skeleton, Tooltip } from '@patternfly/react-core';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import { ServingRuntimeKind } from '../../../../k8sTypes';
import EmptyTableCellForAlignment from '../../../projects/components/EmptyTableCellForAlignment';
import { ProjectDetailsContext } from '../../../projects/ProjectDetailsContext';
import { ServingRuntimeTableTabs } from '../types';
import ServingRuntimeTableExpandedSection from './ServingRuntimeTableExpandedSection';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { isTokenEnabledServingRuntime } from './utils';

type ServingRuntimeTableRowProps = {
  obj: ServingRuntimeKind;
  onDeleteServingRuntime: (obj: ServingRuntimeKind) => void;
  onEditServingRuntime: (obj: ServingRuntimeKind) => void;
};

const ServingRuntimeTableRow: React.FC<ServingRuntimeTableRowProps> = ({
  obj,
  onDeleteServingRuntime,
  onEditServingRuntime,
}) => {
  const [expandedColumn, setExpandedColumn] = React.useState<ServingRuntimeTableTabs>();
  const isRowExpanded = !!expandedColumn;
  const {
    inferenceServices: {
      data: inferenceServices,
      loaded: inferenceServicesLoaded,
      error: inferenceServicesLoadError,
    },
    serverSecrets: { data: secrets, loaded: secretsLoaded, error: secretsLoadError },
  } = React.useContext(ProjectDetailsContext);

  const onToggle = (_, __, colIndex: number) => {
    setExpandedColumn(expandedColumn === colIndex ? undefined : colIndex);
  };

  const compoundExpandParams = (col: ServingRuntimeTableTabs, isDisabled: boolean) =>
    !isDisabled
      ? {
          isExpanded: expandedColumn === col,
          onToggle,
          columnIndex: col,
        }
      : undefined;

  return (
    <Tbody isExpanded={isRowExpanded}>
      <Tr>
        <EmptyTableCellForAlignment />
        <Td
          dataLabel="Type"
          compoundExpand={compoundExpandParams(ServingRuntimeTableTabs.TYPE, false)}
        >
          {obj.spec.builtInAdapter.serverType}
        </Td>
        <Td
          dataLabel="Deployed models"
          compoundExpand={compoundExpandParams(
            ServingRuntimeTableTabs.DEPLOYED_MODELS,
            inferenceServices.length === 0,
          )}
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
                  <Icon status="danger">
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
            secrets.length === 0 || isTokenEnabledServingRuntime(obj),
          )}
        >
          {secretsLoaded ? (
            <>
              {isTokenEnabledServingRuntime(obj) ? 'Tokens disabled' : secrets.length}{' '}
              {secretsLoadError && (
                <Tooltip
                  removeFindDomNode
                  aria-labelledby="Tokens load error"
                  content={secretsLoadError.message}
                >
                  <Icon status="danger">
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
          <Link to={'#'}>View metrics</Link>
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
      <Tr isExpanded={isRowExpanded}>
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
