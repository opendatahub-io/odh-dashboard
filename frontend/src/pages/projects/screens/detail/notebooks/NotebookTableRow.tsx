import * as React from 'react';
import { ActionsColumn, ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import { Spinner, Text, TextVariants, Title } from '@patternfly/react-core';
import { NotebookState } from '../../../notebook/types';
import { getNotebookDescription, getNotebookDisplayName } from '../../../utils';
import NotebookRouteLink from '../../../notebook/NotebookRouteLink';
import NotebookStatusToggle from '../../../notebook/NotebookStatusToggle';
import { NotebookKind } from '../../../../../k8sTypes';
import NotebookImagePackageDetails from '../../../notebook/NotebookImagePackageDetails';
import useNotebookDeploymentSize from './useNotebookDeploymentSize';
import useNotebookImage from './useNotebookImage';
import NotebookSizeDetails from './NotebookSizeDetails';
import NotebookStorageBars from './NotebookStorageBars';
import ResourceNameTooltip from '../../../components/ResourceNameTooltip';
import { useNavigate } from 'react-router-dom';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';

type NotebookTableRowProps = {
  obj: NotebookState;
  onNotebookDelete: (notebook: NotebookKind) => void;
  onNotebookAddStorage: (notebook: NotebookKind) => void;
};

const NotebookTableRow: React.FC<NotebookTableRowProps> = ({
  obj,
  onNotebookDelete,
  onNotebookAddStorage,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const navigate = useNavigate();
  const [isExpanded, setExpanded] = React.useState(false);
  const notebookSize = useNotebookDeploymentSize(obj.notebook);
  const [notebookImage, loaded] = useNotebookImage(obj.notebook);

  return (
    <Tbody isExpanded={isExpanded}>
      <Tr>
        <Td expand={{ rowIndex: 0, isExpanded, onToggle: () => setExpanded(!isExpanded) }} />
        <Td dataLabel="Name">
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
        <Td dataLabel="Container size">{notebookSize?.name ?? 'Unknown'}</Td>
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
