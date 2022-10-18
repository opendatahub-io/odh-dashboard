import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Spinner, Text, TextVariants, Title } from '@patternfly/react-core';
import { NotebookState } from '../../../notebook/types';
import { getNotebookDescription, getNotebookDisplayName } from '../../../utils';
import NotebookRouteLink from '../../../notebook/NotebookRouteLink';
import NotebookStatusToggle from '../../../notebook/NotebookStatusToggle';
import useWorkspaceSize from './useWorkspaceSize';
import useWorkspaceImage from './useWorkspaceImage';
import WorkspaceSizeDetails from './WorkspaceSizeDetails';
import NotebookImagePackageDetails from '../../../notebook/NotebookImagePackageDetails';
import WorkspaceStorageBars from './WorkspaceStorageBars';

type WorkspaceTableRowProps = {
  obj: NotebookState;
};

const WorkspaceTableRow: React.FC<WorkspaceTableRowProps> = ({ obj }) => {
  const [isExpanded, setExpanded] = React.useState<boolean>(false);
  const notebookSize = useWorkspaceSize(obj.notebook);
  const [notebookImage, loaded] = useWorkspaceImage(obj.notebook);

  return (
    <>
      <Tr>
        <Td expand={{ rowIndex: 0, isExpanded, onToggle: () => setExpanded(!isExpanded) }} />
        <Td>
          <Title headingLevel="h4">{getNotebookDisplayName(obj.notebook)}</Title>
          <Text>{getNotebookDescription(obj.notebook)}</Text>
        </Td>
        <Td>
          {!loaded ? (
            <Spinner size="md" />
          ) : (
            <Text component="p">{notebookImage?.imageName ?? 'Unknown'}</Text>
          )}
          {isExpanded && notebookImage?.tagSoftware && (
            <Text component={TextVariants.small}>{notebookImage.tagSoftware}</Text>
          )}
        </Td>
        <Td>{notebookSize?.name ?? 'Unknown'}</Td>
        <Td>
          <NotebookStatusToggle notebookState={obj} />
        </Td>
        <Td>
          <NotebookRouteLink label="Open" notebook={obj.notebook} isRunning={obj.isRunning} />
        </Td>
        <Td isActionCell>
          <ActionsColumn
            items={[
              {
                title: 'Edit workspace',
                onClick: () => {
                  alert('Not implemented yet');
                },
              },
              {
                title: 'Delete workspace',
                onClick: () => {
                  alert('Not implemented yet');
                },
              },
            ]}
          />
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td />
        <Td>
          <WorkspaceStorageBars notebook={obj.notebook} />
        </Td>
        <Td>
          {notebookImage ? (
            <NotebookImagePackageDetails dependencies={notebookImage.dependencies} />
          ) : (
            'Unknown package info'
          )}
        </Td>
        <Td>{notebookSize && <WorkspaceSizeDetails notebookSize={notebookSize} />}</Td>
        <Td />
        <Td />
        <Td />
      </Tr>
    </>
  );
};

export default WorkspaceTableRow;
