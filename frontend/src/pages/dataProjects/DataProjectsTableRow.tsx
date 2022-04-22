import * as React from 'react';
import { Button, Flex, FlexItem, Switch } from '@patternfly/react-core';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { Project } from '../../types';
import { useHistory } from 'react-router';

import './DataProjectsTable.scss';
import { useGetNotebooks } from '../../utilities/useGetNotebooks';
import { getContainerStatus } from '../../utilities/imageUtils';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import NotebookStatusSwitch from './components/NotebookStatusSwitch';
import { relativeTime } from '../../utilities/time';

type DataProjectsTableRowProps = {
  project: Project;
  rowIndex: number;
  columns: string[];
  rowActions: IAction[] | null;
};

const DataProjectsTableRow: React.FC<DataProjectsTableRowProps> = React.memo(
  ({ project, rowIndex, columns, rowActions }) => {
    const history = useHistory();
    const { notebookList, loadNotebooks, watchNotebookStatus } = useGetNotebooks(
      project.metadata.name,
    );
    const [updateInProgress, setUpdateInProgress] = React.useState(false);
    const currentTimeStamp: number = Date.now();

    React.useEffect(() => {
      loadNotebooks();
    }, []);

    return (
      <Tr key={rowIndex}>
        <Td dataLabel={columns[0]}>
          <Button
            className="odh-data-projects__table-project-name"
            isInline
            variant="link"
            isDisabled={project.status.phase !== 'Active'}
            onClick={() => history.push(`data-projects/${project.metadata.name}`)}
          >
            {project.metadata.name}
          </Button>
          <div className="pf-u-color-200">{project.metadata.labels?.['opendatahub.io/user']}</div>
        </Td>
        <Td dataLabel={columns[1]}>
          {notebookList?.items?.map((notebook) => (
            <Button
              key={`${notebook.metadata.name}-link-open`}
              className="odh-data-projects__table-workspace-button"
              isSmall
              isDisabled={getContainerStatus(notebook) !== 'Running'}
              variant="link"
              icon={<ExternalLinkAltIcon />}
              iconPosition="right"
            >
              <a
                href={notebook.metadata.annotations?.['opendatahub.io/link'] ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
              >
                {notebook.metadata.name}
              </a>
            </Button>
          ))}
        </Td>
        <Td dataLabel={columns[2]}>
          <Flex direction={{ default: 'column' }}>
            {notebookList?.items?.map((notebook) => (
              <FlexItem key={`${notebook.metadata.name}-status-switch`}>
                <NotebookStatusSwitch
                  notebook={notebook}
                  loadNotebooks={loadNotebooks}
                  watchNotebookStatus={watchNotebookStatus}
                  updateInProgress={updateInProgress}
                  setUpdateInProgress={setUpdateInProgress}
                />
              </FlexItem>
            ))}
          </Flex>
        </Td>
        <Td dataLabel={columns[3]}>
          {relativeTime(currentTimeStamp, new Date(project.metadata.creationTimestamp).getTime())}
        </Td>
        <Td dataLabel={columns[4]}>Not served</Td>
        <Td>
          <Button isInline variant="link" onClick={() => console.log('do something')}>
            Serve
          </Button>
        </Td>
        <Td isActionCell>{rowActions ? <ActionsColumn items={rowActions} /> : null}</Td>
      </Tr>
    );
  },
);

DataProjectsTableRow.displayName = 'DataProjectsTableRow';

export default DataProjectsTableRow;
