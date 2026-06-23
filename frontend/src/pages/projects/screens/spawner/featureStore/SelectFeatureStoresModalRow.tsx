import * as React from 'react';
import { Truncate } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import type { FeatureStoreProject } from '#~/api/featureStore/custom';
import { FeatureStorePermissionLabels } from './FeatureStorePermissionLabels';
import { getFeatureStoreProjectId } from './selectFeatureStoresModalConst';

export type SelectFeatureStoresModalRowProps = {
  rowIndex: number;
  project: FeatureStoreProject;
  isSelected: boolean;
  onToggle: (project: FeatureStoreProject) => void;
};

export const SelectFeatureStoresModalRow: React.FC<SelectFeatureStoresModalRowProps> = ({
  rowIndex,
  project,
  isSelected,
  onToggle,
}) => {
  const projectId = getFeatureStoreProjectId(project);

  return (
    <Tr data-testid={`select-feature-stores-row-${projectId}`}>
      <Td
        select={{
          rowIndex,
          isSelected,
          onSelect: () => onToggle(project),
        }}
        aria-label={`Toggle ${project.feastProjectName}`}
      />
      <Td dataLabel="Name">
        <Truncate content={project.feastProjectName} />
      </Td>
      <Td dataLabel="Namespace">
        <Truncate content={project.namespace} />
      </Td>
      <Td dataLabel="Description">
        {project.description ? <Truncate content={project.description} /> : '-'}
      </Td>
      <Td dataLabel="Permission level">
        {project.permissionLevel.length > 0 ? (
          <FeatureStorePermissionLabels permissions={project.permissionLevel} />
        ) : (
          '-'
        )}
      </Td>
    </Tr>
  );
};

export default SelectFeatureStoresModalRow;
