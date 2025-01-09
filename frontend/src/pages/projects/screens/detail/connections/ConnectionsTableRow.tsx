import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { Icon, LabelGroup, Truncate } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { Connection, ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { TableRowTitleDescription } from '~/components/table';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import {
  getConnectionModelServingCompatibleTypes,
  getConnectionTypeDisplayName,
} from '~/concepts/connectionTypes/utils';
import CompatibilityLabel from '~/concepts/connectionTypes/CompatibilityLabel';
import ConnectedResources from '~/pages/projects/screens/detail/connections/ConnectedResources';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';

type ConnectionsTableRowProps = {
  obj: Connection;
  connectionTypes?: ConnectionTypeConfigMapObj[];
  kebabActions: IAction[];
  showCompatibilityCell?: boolean;
  showConnectedResourcesCell?: boolean;
  showWarningIcon?: boolean;
};

const ConnectionsTableRow: React.FC<ConnectionsTableRowProps> = ({
  obj,
  connectionTypes,
  kebabActions,
  showCompatibilityCell = true,
  showConnectedResourcesCell = true,
  showWarningIcon = false,
}) => {
  const { currentProject: contextProject } = React.useContext(ProjectDetailsContext);
  const { projects } = React.useContext(ProjectsContext);
  const connectionTypeDisplayName = React.useMemo(
    () => getConnectionTypeDisplayName(obj, connectionTypes ?? []) || 'Unknown',
    [obj, connectionTypes],
  );

  const compatibleTypes = getConnectionModelServingCompatibleTypes(obj);
  const currentProject = projects.find((p) => p.metadata.name === obj.metadata.namespace);

  return (
    <Tr>
      <Td dataLabel="Name">
        <TableRowTitleDescription
          title={<Truncate content={getDisplayNameFromK8sResource(obj)} />}
          titleIcon={
            showWarningIcon ? (
              <Icon status="warning" className="pf-v6-u-pl-lg">
                <ExclamationTriangleIcon />
              </Icon>
            ) : undefined
          }
          resource={obj}
          description={getDescriptionFromK8sResource(obj)}
          truncateDescriptionLines={2}
          wrapResourceTitle={false}
        />
      </Td>
      {contextProject.metadata.name !== obj.metadata.namespace && currentProject ? (
        <Td dataLabel="Project">{getDisplayNameFromK8sResource(currentProject)}</Td>
      ) : null}
      <Td dataLabel="Type">{connectionTypeDisplayName}</Td>
      {showCompatibilityCell && (
        <Td dataLabel="Compatibility">
          {compatibleTypes.length ? (
            <LabelGroup>
              {compatibleTypes.map((compatibleType) => (
                <CompatibilityLabel key={compatibleType} type={compatibleType} />
              ))}
            </LabelGroup>
          ) : (
            '-'
          )}
        </Td>
      )}
      {showConnectedResourcesCell && (
        <Td dataLabel="Connected resources">
          <ConnectedResources connection={obj} />
        </Td>
      )}
      <Td isActionCell>
        <ActionsColumn items={kebabActions} />
      </Td>
    </Tr>
  );
};

export default ConnectionsTableRow;
