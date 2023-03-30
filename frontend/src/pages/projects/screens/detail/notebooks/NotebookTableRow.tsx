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
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { NotebookState } from '~/pages/projects/notebook/types';
import { getNotebookDescription, getNotebookDisplayName } from '~/pages/projects/utils';
import NotebookRouteLink from '~/pages/projects/notebook/NotebookRouteLink';
import NotebookStatusToggle from '~/pages/projects/notebook/NotebookStatusToggle';
import { NotebookKind } from '~/k8sTypes';
import NotebookImagePackageDetails from '~/pages/projects/notebook/NotebookImagePackageDetails';
import ResourceNameTooltip from '~/pages/projects/components/ResourceNameTooltip';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import useNotebookDeploymentSize from './useNotebookDeploymentSize';
import useNotebookImage from './useNotebookImage';
import NotebookSizeDetails from './NotebookSizeDetails';
import NotebookStorageBars from './NotebookStorageBars';

type NotebookTableRowProps = {
  obj: NotebookState;
  rowIndex: number;
  onNotebookDelete: (notebook: NotebookKind) => void;
  onNotebookAddStorage: (notebook: NotebookKind) => void;
};

const NotebookTableRow: React.FC<NotebookTableRowProps> = ({
  obj,
  rowIndex,
  onNotebookDelete,
  onNotebookAddStorage,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const navigate = useNavigate();
  const [isExpanded, setExpanded] = React.useState(false);
  const { size: notebookSize, error: sizeError } = useNotebookDeploymentSize(obj.notebook);
  const [notebookImage, loaded] = useNotebookImage(obj.notebook);

  return (
    <Tbody isExpanded={isExpanded}>
      <Tr>
        <Td
          expand={{
            rowIndex: rowIndex,
            expandId: 'notebook-row-item',
            isExpanded,
            onToggle: () => setExpanded(!isExpanded),
          }}
        />
        <Td dataLabel="Name">
          <Title headingLevel="h3" size="md">
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
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td />
        <Td dataLabel="Workbench storages">
          <ExpandableRowContent>
            <NotebookStorageBars notebook={obj.notebook} onAddStorage={onNotebookAddStorage} />
          </ExpandableRowContent>
        </Td>
        <Td dataLabel="Packages">
          <ExpandableRowContent>
            {notebookImage ? (
              <NotebookImagePackageDetails dependencies={notebookImage.dependencies} />
            ) : (
              'Unknown package info'
            )}
          </ExpandableRowContent>
        </Td>
        <Td dataLabel="Limits">
          <ExpandableRowContent>
            {notebookSize && <NotebookSizeDetails notebookSize={notebookSize} />}
          </ExpandableRowContent>
        </Td>
        <Td />
        <Td />
        <Td />
      </Tr>
    </Tbody>
  );
};

export default NotebookTableRow;
