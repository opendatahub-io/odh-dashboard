import React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  Popover,
  Select,
  SelectOption,
  SelectVariant,
  SearchInput,
  Spinner,
  Switch,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import {
  ActionsColumn,
  TableComposable,
  Thead,
  Tr,
  Th,
  ThProps,
  Tbody,
  Td,
  ExpandableRowContent,
  IAction,
} from '@patternfly/react-table';
import { Notebook } from 'types';
import { ImportImageModal } from './ImportImageModal';
import { CheckIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { relativeTime } from '../../utilities/time';
import './NotebookImagesTable.scss';
import { DeleteImageModal } from './DeleteImageModal';
import { UpdateImageModal } from './UpdateImageModal';
import { updateNotebook } from '../../services/notebookImageService';

export type NotebookImagesTableProps = {
  notebooks: Notebook[];
  forceUpdate: () => void;
};

type NotebookEnabled = {
  id: string;
  visible?: boolean;
};

type NotebookTableFilterOptions = 'user' | 'name' | 'description' | 'phase' | 'user' | 'uploaded';
type NotebookTableFilter = {
  filter: string;
  option: NotebookTableFilterOptions;
};

export const NotebookImagesTable: React.FC<NotebookImagesTableProps> = ({
  notebooks,
  forceUpdate,
}) => {
  const rowActions = (notebook: Notebook): IAction[] => [
    {
      title: 'Edit',
      onClick: () => {
        setCurrentNotebook(notebook);
        setUpdateImageModalVisible(true);
      },
    },
    {
      isSeparator: true,
    },
    {
      title: 'Delete',
      onClick: () => {
        setCurrentNotebook(notebook);
        setDeleteImageModalVisible(true);
      },
    },
  ];
  const getPhase = (nb: Notebook) => {
    if (nb.phase === 'Succeeded')
      return (
        <>
          <CheckIcon className="phase-success" /> {nb.phase}
        </>
      );
    else if (nb.phase === 'Failed')
      return (
        <Popover
          aria-label="Alert popover"
          alertSeverityVariant={'warning'}
          headerContent="Failed to load image"
          headerIcon={ExclamationTriangleIcon}
          headerComponent="h1"
          bodyContent={
            <div>
              {nb.error && nb.error.message ? nb.error?.message : 'An unknown error has occurred.'}
            </div>
          }
        >
          <div className="phase-failed-cursor">
            <ExclamationTriangleIcon className="phase-failed" /> {nb.phase}
          </div>
        </Popover>
      );
    else
      return (
        <>
          <Spinner size="md" /> {nb.phase}
        </>
      );
  };
  const [currentNotebook, setCurrentNotebook] = React.useState<Notebook>(notebooks[0]);
  const [deleteImageModalVisible, setDeleteImageModalVisible] = React.useState<boolean>(false);
  const [importImageModalVisible, setImportImageModalVisible] = React.useState<boolean>(false);
  const [updateImageModalVisible, setUpdateImageModalVisible] = React.useState<boolean>(false);

  const [activeSortIndex, setActiveSortIndex] = React.useState<number | undefined>(0);
  const [activeSortDirection, setActiveSortDirection] = React.useState<'asc' | 'desc' | undefined>(
    'asc',
  );

  const getSortableRowValues = (nb: Notebook): string[] => {
    const { name, description = '', phase = '', visible = false, user = '' } = nb;
    return [name, description, phase, visible.toString(), user];
  };

  if (activeSortIndex !== undefined) {
    notebooks.sort((a, b) => {
      const aValue = getSortableRowValues(a)[activeSortIndex];
      const bValue = getSortableRowValues(b)[activeSortIndex];

      if (activeSortDirection === 'asc') {
        return (aValue as string).localeCompare(bValue as string);
      }
      return (bValue as string).localeCompare(aValue as string);
    });
  }

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: activeSortIndex,
      direction: activeSortDirection,
      defaultDirection: 'asc',
    },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  const columnNames = {
    name: 'Name',
    description: 'Description',
    status: 'Status',
    enable: 'Enable',
    user: 'User',
    uploaded: 'Uploaded',
  };

  const currentTimeStamp: number = Date.now();

  const [expandedNotebookIDs, setExpandedNotebookIDs] = React.useState<string[]>([]);
  const setNotebookExpanded = (notebook: Notebook, isExpanding = true) => {
    setExpandedNotebookIDs((prevExpanded) => {
      const otherExpandedRepoNames = prevExpanded.filter((r) => r !== notebook.id);
      return isExpanding ? [...otherExpandedRepoNames, notebook.id] : otherExpandedRepoNames;
    });
  };
  const isNotebookExpanded = (notebook: Notebook) => {
    console.log('List of notebooks: ' + expandedNotebookIDs.toString());
    return expandedNotebookIDs.includes(notebook.id);
  };
  const [notebookVisible, setNotebookVisible] = React.useState<NotebookEnabled[]>(
    notebooks.map((notebook) => {
      return { id: notebook.id, visible: notebook.visible };
    }),
  );

  const selectOptions = [
    <SelectOption key={1} value="name">
      Name
    </SelectOption>,
    <SelectOption key={2} value="description">
      Description
    </SelectOption>,
    <SelectOption key={3} value="phase">
      Status
    </SelectOption>,
    <SelectOption key={4} value="user">
      User
    </SelectOption>,
    <SelectOption key={5} value="uploaded">
      Uploaded
    </SelectOption>,
  ];
  const [tableFilter, setTableFilter] = React.useState<NotebookTableFilter>({
    filter: '',
    option: 'name',
  });
  const [selected, setSelected] = React.useState<string>('name');
  const [tableSelectIsOpen, setTableSelectIsOpen] = React.useState<boolean>(false);

  const items = (
    <React.Fragment>
      <ToolbarItem variant="search-filter">
        <Select
          variant={SelectVariant.single}
          aria-label="Select for notebook images table"
          onToggle={(isExpanded) => {
            setTableSelectIsOpen(isExpanded);
          }}
          onSelect={(_event, value) => {
            setSelected(value as string);
            setTableFilter({
              filter: tableFilter.filter,
              option: value as NotebookTableFilterOptions,
            });
          }}
          selections={selected}
          isOpen={tableSelectIsOpen}
        >
          {selectOptions}
        </Select>
      </ToolbarItem>
      <ToolbarItem variant="search-filter">
        <SearchInput
          aria-label="search input for notebook images table"
          value={tableFilter.filter}
          onChange={(value) => {
            setTableFilter({
              filter: value,
              option: tableFilter.option,
            });
          }}
          onClear={() => {
            setTableFilter({
              filter: '',
              option: tableFilter.option,
            });
          }}
        />
      </ToolbarItem>
      <ToolbarItem>
        <Button
          onClick={() => {
            setImportImageModalVisible(true);
          }}
        >
          Import new image
        </Button>
      </ToolbarItem>
    </React.Fragment>
  );

  const applyTableFilter = (notebook: Notebook): boolean => {
    if (
      tableFilter.filter !== '' &&
      notebook[tableFilter.option] &&
      tableFilter.option !== 'uploaded'
    ) {
      const notebookValue: string = notebook[tableFilter.option] as string;
      return !notebookValue.includes(tableFilter.filter);
    }
    if (
      tableFilter.filter !== '' &&
      notebook[tableFilter.option] &&
      tableFilter.option === 'uploaded'
    ) {
      const notebookValue: string = relativeTime(
        currentTimeStamp,
        new Date(notebook.uploaded as Date).getTime(),
      );
      return !notebookValue.includes(tableFilter.filter);
    }
    return false;
  };
  return (
    <React.Fragment>
      <DeleteImageModal
        notebook={currentNotebook}
        isOpen={deleteImageModalVisible}
        onDeleteHandler={forceUpdate}
        onCloseHandler={() => {
          setDeleteImageModalVisible(false);
        }}
      />
      <ImportImageModal
        isOpen={importImageModalVisible}
        onCloseHandler={() => {
          setImportImageModalVisible(false);
        }}
        onImportHandler={forceUpdate}
      />
      <UpdateImageModal
        notebook={currentNotebook}
        isOpen={updateImageModalVisible}
        onUpdateHandler={forceUpdate}
        onCloseHandler={() => {
          setUpdateImageModalVisible(false);
        }}
      />
      <Toolbar id="toolbar-items">
        <ToolbarContent>{items}</ToolbarContent>
      </Toolbar>
      <TableComposable aria-label="Notebook Images table" variant="compact">
        <Thead>
          <Tr>
            <Th />
            <Th sort={getSortParams(0)}>{columnNames.name}</Th>
            <Th sort={getSortParams(1)}>{columnNames.description}</Th>
            <Th sort={getSortParams(2)}>{columnNames.status}</Th>
            <Th sort={getSortParams(3)}>{columnNames.enable}</Th>
            <Th sort={getSortParams(4)}>{columnNames.user}</Th>
            <Th>{columnNames.uploaded}</Th>
            <Th />
          </Tr>
        </Thead>
        {notebooks.map((notebook, rowIndex) => {
          const packages: any = [];
          notebook.packages?.forEach((nbpackage) => {
            packages.push(<p>{`${nbpackage.name} ${nbpackage.version}`}</p>);
          });
          return (
            <Tbody key={notebook.name} isExpanded={isNotebookExpanded(notebook)}>
              <Tr isHidden={applyTableFilter(notebook)}>
                <Td
                  expand={{
                    rowIndex,
                    isExpanded: isNotebookExpanded(notebook),
                    onToggle: () => setNotebookExpanded(notebook, !isNotebookExpanded(notebook)),
                  }}
                />
                <Td dataLabel={columnNames.name}>{notebook.name}</Td>
                <Td dataLabel={columnNames.description}>{notebook.description}</Td>
                <Td dataLabel={columnNames.status}>{getPhase(notebook)}</Td>
                <Td dataLabel={columnNames.enable}>
                  <Switch
                    className="enable-switch"
                    aria-label={`Enable Switch ${notebook.name}`}
                    id={`enabled-disable-${notebook.id}`}
                    isDisabled={notebook.phase === 'Failed'}
                    isChecked={notebookVisible.find((value) => notebook.id === value.id)?.visible}
                    onChange={() => {
                      updateNotebook({
                        id: notebook.id,
                        visible: !notebook.visible,
                        packages: notebook.packages,
                      });
                      setNotebookVisible(
                        notebookVisible.map((value) =>
                          notebook.id === value.id
                            ? { id: value.id, visible: !value.visible }
                            : value,
                        ),
                      );
                    }}
                  />
                </Td>
                <Td dataLabel={columnNames.user}>{notebook.user}</Td>
                <Td dataLabel={columnNames.uploaded}>
                  {relativeTime(currentTimeStamp, new Date(notebook.uploaded as Date).getTime())}
                </Td>
                <Td isActionCell>
                  <ActionsColumn items={rowActions(notebook)} />
                </Td>
              </Tr>
              <Tr isHidden={applyTableFilter(notebook)} isExpanded={isNotebookExpanded(notebook)}>
                <Td dataLabel="Package Details" colSpan={Object.entries(columnNames).length}>
                  <ExpandableRowContent>
                    <Flex>
                      <FlexItem>Packages Include</FlexItem>
                      <FlexItem>{packages}</FlexItem>
                    </Flex>
                  </ExpandableRowContent>
                </Td>
              </Tr>
            </Tbody>
          );
        })}
      </TableComposable>
    </React.Fragment>
  );
};
