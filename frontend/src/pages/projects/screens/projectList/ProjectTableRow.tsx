import * as React from 'react';
import { ProjectKind } from '../../../../k8sTypes';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import ProjectLink from './ProjectLink';
import { Text, TextVariants, Timestamp } from '@patternfly/react-core';
import useProjectNotebooks from '../../notebook/useProjectNotebooks';
import ListNotebookState from '../../notebook/ListNotebookState';

const ProjectTableRow: React.FC<{ obj: ProjectKind }> = ({ obj: project }) => {
  const [notebookStates, loaded, error] = useProjectNotebooks(project.metadata.name);
  const owner = project.metadata.annotations?.['openshift.io/requester'];

  return (
    <Tr>
      <Td>
        <ProjectLink project={project} />
        <br />
        {owner && <Text component={TextVariants.small}>{owner}</Text>}
      </Td>
      <Td>
        <ListNotebookState
          notebookStates={notebookStates}
          loaded={loaded}
          error={error}
          show="notebook"
        />
      </Td>
      <Td>
        <ListNotebookState
          notebookStates={notebookStates}
          loaded={loaded}
          error={error}
          show="status"
        />
      </Td>
      <Td>
        {project.metadata.creationTimestamp ? (
          <Timestamp date={new Date(project.metadata.creationTimestamp)} />
        ) : (
          'Unknown'
        )}
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: '????',
              onClick: () => {
                console.debug('clicky');
              },
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default ProjectTableRow;
