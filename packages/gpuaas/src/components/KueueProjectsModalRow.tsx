import * as React from 'react';
import { Label, Truncate } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { KUEUE_MANAGED_STATUS_LABEL } from './kueueProjectsModalConst';
import type { KueueProject } from '../types';

type KueueProjectsModalRowProps = {
  project: KueueProject;
};

const KueueProjectsModalRow: React.FC<KueueProjectsModalRowProps> = ({ project }) => (
  <Tr data-testid={`kueue-projects-row-${project.name}`}>
    <Td dataLabel="Name">
      <Truncate content={project.name} />
    </Td>
    <Td dataLabel="Status">
      <Label color="green" isCompact data-testid="kueue-managed-status-label">
        {KUEUE_MANAGED_STATUS_LABEL}
      </Label>
    </Td>
  </Tr>
);

export default KueueProjectsModalRow;
