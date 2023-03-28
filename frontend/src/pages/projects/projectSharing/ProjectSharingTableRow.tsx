import * as React from 'react';
import { ActionsColumn, ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import {
  Flex,
  FlexItem,
  Icon,
  Spinner,
  Text,
  TextVariants,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { UserPermission } from './types';


type ProjectSharingTableRowProps = {
  obj: UserPermission;
  rowIndex: number;
  onUserDelete: (user: UserPermission) => void;
  onUserAdd: (user: UserPermission) => void;
};

const ProjectSharingTableRow: React.FC<ProjectSharingTableRowProps> = ({
  obj,
  rowIndex,
  onUserDelete,
  onUserAdd,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const navigate = useNavigate();


  return (
    <Tbody>
      <Tr>
        {/* <Td dataLabel="Username">
          <Title headingLevel="h4">
            <ResourceNameTooltip resource={obj.notebook}>
              {getNotebookDisplayName(obj.notebook)}
            </ResourceNameTooltip>
          </Title>
          <Text>{getNotebookDescription(obj.notebook)}</Text>
        </Td>
        <Td dataLabel="Notebook image">
          {!loaded ? (
            <Spinner size="md" />
          ) : (
            <Text component="p">{notebookImage?.imageName ?? 'Unknown'}</Text>
          )}
          {isExpanded && notebookImage?.tagSoftware && (
            <Text component={TextVariants.small}>{notebookImage.tagSoftware}</Text>
          )}
        </Td>
        <Td dataLabel="Container size">
          <Flex
            spaceItems={{ default: 'spaceItemsXs' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>{notebookSize?.name ?? 'Unknown'}</FlexItem>
            {sizeError && (
              <Tooltip removeFindDomNode content={sizeError}>
                <Icon status="danger">
                  <ExclamationCircleIcon />
                </Icon>
              </Tooltip>
            )}
          </Flex>
        </Td>
        <Td dataLabel="Status">
          <NotebookStatusToggle notebookState={obj} doListen={false} />
        </Td>
        <Td>
          <NotebookRouteLink label="Open" notebook={obj.notebook} isRunning={obj.isRunning} />
        </Td>
        <Td isActionCell>
          <ActionsColumn
            items={[
              {
                isDisabled: obj.isStarting,
                title: 'Edit workbench',
                onClick: () => {
                  navigate(
                    `/projects/${currentProject.metadata.name}/spawner/${obj.notebook.metadata.name}`,
                  );
                },
              },
              {
                title: 'Delete workbench',
                onClick: () => {
                  onNotebookDelete(obj.notebook);
                },
              },
            ]}
          />
        </Td> */}
      </Tr>
    </Tbody>
  );
};

export default ProjectSharingTableRow;
