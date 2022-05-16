import React from 'react';
import {
  Button,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Select,
  SelectOption,
  SelectVariant,
  SearchInput,
  Switch,
  Title,
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
import { CubesIcon, SearchIcon } from '@patternfly/react-icons';
import { Notebook } from 'types';
import { ImportImageModal } from './ImportImageModal';
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
  count: number;
};

export const NotebookImagesTable: React.FC<NotebookImagesTableProps> = ({
  notebooks,
  forceUpdate,
}) => {
  const rowActions = (notebook: Notebook): IAction[] => [
    {
      title: 'Edit',
      id: `${notebook.name}-edit-button`,
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
      id: `${notebook.name}-delete-button`,
      onClick: () => {
        setCurrentNotebook(notebook);
        setDeleteImageModalVisible(true);
      },
    },
  ];

  React.useEffect(() => {
    setNotebookVisible(
      notebooks.map((notebook) => {
        return { id: notebook.id, visible: notebook.visible };
      }),
    );
  }, [notebooks]);

  const [currentNotebook, setCurrentNotebook] = React.useState<Notebook>(notebooks[0]);
  const [deleteImageModalVisible, setDeleteImageModalVisible] = React.useState<boolean>(false);
  const [importImageModalVisible, setImportImageModalVisible] = React.useState<boolean>(false);
  const [updateImageModalVisible, setUpdateImageModalVisible] = React.useState<boolean>(false);

  const [activeSortIndex, setActiveSortIndex] = React.useState<number | undefined>(0);
  const [activeSortDirection, setActiveSortDirection] = React.useState<'asc' | 'desc' | undefined>(
    'asc',
  );

  const getFilterCount = (value: string, option): number => {
    let total = 0;
    notebooks.forEach((notebook) => {
      (notebook[option] as string).includes(value) ? total++ : null;
    });
    return total;
  };

  const getSortableRowValues = (nb: Notebook): string[] => {
    const { name, description = '', phase = '', visible = false, user = '', uploaded = '' } = nb;
    return [name, description, phase, visible.toString(), user, uploaded.toString()];
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
    return expandedNotebookIDs.includes(notebook.id);
  };
  const [notebookVisible, setNotebookVisible] = React.useState<NotebookEnabled[]>(
    notebooks.map((notebook) => {
      return { id: notebook.id, visible: notebook.visible };
    }),
  );

  const selectOptions = [
    <SelectOption id="search-filter-name" key={1} value="name">
      Name
    </SelectOption>,
    <SelectOption id="search-filter-desc" key={2} value="description">
      Description
    </SelectOption>,
    <SelectOption id="search-filter-user" key={4} value="user">
      User
    </SelectOption>,
    <SelectOption id="search-filter-uploaded" key={5} value="uploaded">
      Uploaded
    </SelectOption>,
  ];
  const [tableFilter, setTableFilter] = React.useState<NotebookTableFilter>({
    filter: '',
    option: 'name',
    count: notebooks.length,
  });
  const [selected, setSelected] = React.useState<string>('name');
  const [tableSelectIsOpen, setTableSelectIsOpen] = React.useState<boolean>(false);

  const items = (
    <React.Fragment>
      <ToolbarItem variant="search-filter" className="filter-select">
        <Select
          id="search-filter-select"
          variant={SelectVariant.single}
          aria-label="Select for notebook images table"
          onToggle={(isExpanded) => {
            setTableSelectIsOpen(isExpanded);
          }}
          onSelect={(_event, value) => {
            setSelected(value as string);
            const newCount = getFilterCount(tableFilter.filter, value);
            setTableFilter({
              filter: tableFilter.filter,
              option: value as NotebookTableFilterOptions,
              count: newCount,
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
          id="search-filter-input"
          className="filter-search"
          aria-label="search input for notebook images table"
          value={tableFilter.filter}
          onChange={(value) => {
            const newCount = getFilterCount(value, tableFilter.option);
            setTableFilter({
              filter: value,
              option: tableFilter.option,
              count: newCount,
            });
          }}
          onClear={() => {
            setTableFilter({
              filter: '',
              option: tableFilter.option,
              count: notebooks.length,
            });
          }}
        />
      </ToolbarItem>
      <ToolbarItem>
        <Button
          id="import-new-image"
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
      <TableComposable
        className={tableFilter.count === 0 ? 'empty-table' : ''}
        aria-label="Notebook Images table"
        variant="compact"
      >
        <Thead>
          <Tr>
            <Th />
            <Th sort={getSortParams(0)}>{columnNames.name}</Th>
            <Th sort={getSortParams(1)}>{columnNames.description}</Th>
            <Th>Enable</Th>
            <Th sort={getSortParams(4)}>{columnNames.user}</Th>
            <Th sort={getSortParams(5)}>{columnNames.uploaded}</Th>
            <Th />
          </Tr>
        </Thead>
        {tableFilter.count > 0 ? (
          notebooks.map((notebook, rowIndex) => {
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
                  <Td>
                    <Switch
                      className="enable-switch"
                      aria-label={`Enable Switch ${notebook.name}`}
                      id={`enabled-disable-${notebook.id}`}
                      isChecked={
                        notebookVisible.find((value) => {
                          return notebook.id === value.id;
                        })?.visible
                      }
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
                    {packages.length > 0 ? (
                      <ExpandableRowContent>
                        <Flex className="included-packages">
                          <FlexItem>Packages Include</FlexItem>
                          <FlexItem className="included-packages-font">{packages}</FlexItem>
                        </Flex>
                      </ExpandableRowContent>
                    ) : (
                      <EmptyState variant={EmptyStateVariant.small}>
                        <EmptyStateIcon icon={CubesIcon} />
                        <Title headingLevel="h4" size="lg">
                          No packages detected
                        </Title>
                        <EmptyStateBody>Edit the image to add packages</EmptyStateBody>
                      </EmptyState>
                    )}
                  </Td>
                </Tr>
              </Tbody>
            );
          })
        ) : (
          <Tbody>
            <Tr>
              <Td colSpan={8}>
                <Bullseye>
                  <EmptyState variant={EmptyStateVariant.small}>
                    <EmptyStateIcon icon={SearchIcon} />
                    <Title headingLevel="h2" size="lg">
                      No results found
                    </Title>
                    <EmptyStateBody>Clear all filters and try again.</EmptyStateBody>
                    <Button
                      variant="link"
                      onClick={() => {
                        setTableFilter({
                          filter: '',
                          option: tableFilter.option,
                          count: notebooks.length,
                        });
                      }}
                    >
                      Clear all filters
                    </Button>
                  </EmptyState>
                </Bullseye>
              </Td>
            </Tr>
          </Tbody>
        )}
      </TableComposable>
    </React.Fragment>
  );
};
