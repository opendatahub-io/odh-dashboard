import * as React from 'react';
import { Button, Icon, Skeleton, Tooltip } from '@patternfly/react-core';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ServingRuntimeKind } from '~/k8sTypes';
import EmptyTableCellForAlignment from '~/pages/projects/components/EmptyTableCellForAlignment';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ServingRuntimeTableTabs } from '~/pages/modelServing/screens/types';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import ServingRuntimeTableExpandedSection from './ServingRuntimeTableExpandedSection';
import { isServingRuntimeTokenEnabled } from './utils';

type ServingRuntimeTableRowProps = {
  obj: ServingRuntimeKind;
  onDeleteServingRuntime: (obj: ServingRuntimeKind) => void;
  onEditServingRuntime: (obj: ServingRuntimeKind) => void;
  onDeployModal: () => void;
  onExpandColumn: (columnIndex?: ServingRuntimeTableTabs) => void;
  expandedColumn?: ServingRuntimeTableTabs;
};

const ServingRuntimeTableRow: React.FC<ServingRuntimeTableRowProps> = ({
  obj,
  onDeleteServingRuntime,
  onEditServingRuntime,
  onDeployModal,
  expandedColumn,
  onExpandColumn,
}) => {
  const isRowExpanded = !!expandedColumn;
  const {
    inferenceServices: {
      data: inferenceServices,
      loaded: inferenceServicesLoaded,
      error: inferenceServicesLoadError,
    },
    serverSecrets: { data: secrets, loaded: secretsLoaded, error: secretsLoadError },
  } = React.useContext(ProjectDetailsContext);

  const onToggle = (_, __, colIndex: ServingRuntimeTableTabs) => {
    onExpandColumn(expandedColumn === colIndex ? undefined : colIndex);
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
          {obj.metadata.annotations?.['openshift.io/display-name'] ||
            obj.spec.builtInAdapter?.serverType ||
            'Custom Runtime'}
        </Td>
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
            secrets.length === 0 || !isServingRuntimeTokenEnabled(obj),
          )}
        >
          {secretsLoaded ? (
            <>
              {!isServingRuntimeTokenEnabled(obj) ? 'Tokens disabled' : secrets.length}{' '}
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
          <Button
            onClick={() => onDeployModal()}
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
      <Tr isExpanded={isRowExpanded}>
        <ServingRuntimeTableExpandedSection
          activeColumn={expandedColumn}
          obj={obj}
          onClose={() => onExpandColumn(undefined)}
          onDeployModel={onDeployModal}
        />
      </Tr>
    </Tbody>
  );
};

export default ServingRuntimeTableRow;
