import * as React from 'react';
import { ActionsColumn, ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import { Flex, FlexItem, Icon, Tooltip } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { NotebookState } from '~/pages/projects/notebook/types';
import { getNotebookDescription, getNotebookDisplayName } from '~/pages/projects/utils';
import NotebookRouteLink from '~/pages/projects/notebook/NotebookRouteLink';
import NotebookStatusToggle from '~/pages/projects/notebook/NotebookStatusToggle';
import { NotebookKind } from '~/k8sTypes';
import NotebookImagePackageDetails from '~/pages/projects/notebook/NotebookImagePackageDetails';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { TableRowTitleDescription } from '~/components/table';
import useNotebookDeploymentSize from './useNotebookDeploymentSize';
import useNotebookImage from './useNotebookImage';
import NotebookSizeDetails from './NotebookSizeDetails';
import NotebookStorageBars from './NotebookStorageBars';
import { NotebookImageDisplayName } from './NotebookImageDisplayName';
import { NotebookImageAvailability } from './const';

type NotebookTableRowProps = {
  obj: NotebookState;
  rowIndex: number;
  onNotebookDelete: (notebook: NotebookKind) => void;
  onNotebookAddStorage: (notebook: NotebookKind) => void;
  canEnablePipelines: boolean;
};

const NotebookTableRow: React.FC<NotebookTableRowProps> = ({
  obj,
  rowIndex,
  onNotebookDelete,
  onNotebookAddStorage,
  canEnablePipelines,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const navigate = useNavigate();
  const [isExpanded, setExpanded] = React.useState(false);
  const { size: notebookSize, error: sizeError } = useNotebookDeploymentSize(obj.notebook);
  const [notebookImage, loaded, loadError] = useNotebookImage(obj.notebook);

  return (
    <Tbody isExpanded={isExpanded}>
      <Tr>
        <Td
          expand={{
            rowIndex,
            expandId: 'notebook-row-item',
            isExpanded,
            onToggle: () => setExpanded(!isExpanded),
          }}
        />
        <Td dataLabel="Name">
          <TableRowTitleDescription
            title={getNotebookDisplayName(obj.notebook)}
            resource={obj.notebook}
            description={getNotebookDescription(obj.notebook)}
          />
        </Td>
        <Td dataLabel="Notebook image">
          <NotebookImageDisplayName
            notebookImage={notebookImage}
            loaded={loaded}
            loadError={loadError}
            isExpanded={isExpanded}
          />
        </Td>
        <Td dataLabel="Container size">
          <Flex
            spaceItems={{ default: 'spaceItemsXs' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>{notebookSize?.name ?? 'Unknown'}</FlexItem>
            {sizeError && (
              <Tooltip content={sizeError}>
                <Icon aria-label="error icon" role="button" status="danger" tabIndex={0}>
                  <ExclamationCircleIcon />
                </Icon>
              </Tooltip>
            )}
          </Flex>
        </Td>
        <Td dataLabel="Status">
          <NotebookStatusToggle
            notebookState={obj}
            doListen={false}
            enablePipelines={canEnablePipelines}
            isDisabled={
              notebookImage?.imageAvailability === NotebookImageAvailability.DELETED &&
              !obj.isRunning
            }
          />
        </Td>
        <Td>
          <NotebookRouteLink label="Open" notebook={obj.notebook} isRunning={obj.isRunning} />
        </Td>
        <Td isActionCell>
          <ActionsColumn
            items={[
              {
                isDisabled: obj.isStarting || obj.isStopping,
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
            {notebookImage &&
            notebookImage.imageAvailability !== NotebookImageAvailability.DELETED ? (
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
