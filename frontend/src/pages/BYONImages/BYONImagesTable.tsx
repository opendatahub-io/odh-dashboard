import React, { DetailedHTMLProps, HTMLAttributes } from 'react';
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
import { BYONImage } from 'types';
import { ImportImageModal } from './ImportImageModal';
import { relativeTime } from '../../utilities/time';
import './BYONImagesTable.scss';
import { DeleteImageModal } from './DeleteBYONImageModal';
import { UpdateImageModal } from './UpdateImageModal';
import { updateBYONImage } from '../../services/imagesService';

export type BYONImagesTableProps = {
  images: BYONImage[];
  forceUpdate: () => void;
};

type BYONImageEnabled = {
  id: string;
  visible?: boolean;
};

type BYONImageTableFilterOptions = 'user' | 'name' | 'description' | 'phase' | 'user' | 'uploaded';
type BYONImageTableFilter = {
  filter: string;
  option: BYONImageTableFilterOptions;
  count: number;
};

export const BYONImagesTable: React.FC<BYONImagesTableProps> = ({ images, forceUpdate }) => {
  const rowActions = (image: BYONImage): IAction[] => [
    {
      title: 'Edit',
      id: `${image.name}-edit-button`,
      onClick: () => {
        setcurrentImage(image);
        setUpdateImageModalVisible(true);
      },
    },
    {
      isSeparator: true,
    },
    {
      title: 'Delete',
      id: `${image.name}-delete-button`,
      onClick: () => {
        setcurrentImage(image);
        setDeleteImageModalVisible(true);
      },
    },
  ];

  React.useEffect(() => {
    setBYONImageVisible(
      images.map((image) => {
        return { id: image.id, visible: image.visible };
      }),
    );
  }, [images]);

  const [currentImage, setcurrentImage] = React.useState<BYONImage>(images[0]);
  const [deleteImageModalVisible, setDeleteImageModalVisible] = React.useState<boolean>(false);
  const [importImageModalVisible, setImportImageModalVisible] = React.useState<boolean>(false);
  const [updateImageModalVisible, setUpdateImageModalVisible] = React.useState<boolean>(false);

  const [activeSortIndex, setActiveSortIndex] = React.useState<number | undefined>(0);
  const [activeSortDirection, setActiveSortDirection] = React.useState<'asc' | 'desc' | undefined>(
    'asc',
  );

  const getFilterCount = (value: string, option): number => {
    let total = 0;
    images.forEach((image) => {
      (image[option] as string).includes(value) ? total++ : null;
    });
    return total;
  };

  const getSortableRowValues = (nb: BYONImage): string[] => {
    const { name, description = '', phase = '', visible = false, user = '', uploaded = '' } = nb;
    return [name, description, phase, visible.toString(), user, uploaded.toString()];
  };

  if (activeSortIndex !== undefined) {
    [...images].sort((a, b) => {
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

  const [expandedBYONImageIDs, setExpandedBYONImageIDs] = React.useState<string[]>([]);
  const setBYONImageExpanded = (image: BYONImage, isExpanding = true) => {
    setExpandedBYONImageIDs((prevExpanded) => {
      const otherExpandedRepoNames = prevExpanded.filter((r) => r !== image.id);
      return isExpanding ? [...otherExpandedRepoNames, image.id] : otherExpandedRepoNames;
    });
  };
  const isBYONImageExpanded = (image: BYONImage) => {
    return expandedBYONImageIDs.includes(image.id);
  };
  const [BYONImageVisible, setBYONImageVisible] = React.useState<BYONImageEnabled[]>(
    images.map((image) => {
      return { id: image.id, visible: image.visible };
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
  const [tableFilter, setTableFilter] = React.useState<BYONImageTableFilter>({
    filter: '',
    option: 'name',
    count: images.length,
  });
  const [selected, setSelected] = React.useState<string>('name');
  const [tableSelectIsOpen, setTableSelectIsOpen] = React.useState<boolean>(false);

  const items = (
    <React.Fragment>
      <ToolbarItem variant="search-filter" className="filter-select">
        <Select
          id="search-filter-select"
          variant={SelectVariant.single}
          aria-label="Select for image images table"
          onToggle={(isExpanded) => {
            setTableSelectIsOpen(isExpanded);
          }}
          onSelect={(_event, value) => {
            setSelected(value as string);
            const newCount = getFilterCount(tableFilter.filter, value);
            setTableFilter({
              filter: tableFilter.filter,
              option: value as BYONImageTableFilterOptions,
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
          aria-label="search input for image images table"
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
              count: images.length,
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

  const applyTableFilter = (image: BYONImage): boolean => {
    if (
      tableFilter.filter !== '' &&
      image[tableFilter.option] &&
      tableFilter.option !== 'uploaded'
    ) {
      const BYONImageValue: string = image[tableFilter.option] as string;
      return !BYONImageValue.includes(tableFilter.filter);
    }
    if (
      tableFilter.filter !== '' &&
      image[tableFilter.option] &&
      tableFilter.option === 'uploaded'
    ) {
      const BYONImageValue: string = relativeTime(
        currentTimeStamp,
        new Date(image.uploaded as Date).getTime(),
      );
      return !BYONImageValue.includes(tableFilter.filter);
    }
    return false;
  };
  return (
    <React.Fragment>
      <DeleteImageModal
        image={currentImage}
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
        image={currentImage}
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
        aria-label="Notebook images table"
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
          images.map((image, rowIndex) => {
            const packages: DetailedHTMLProps<
              HTMLAttributes<HTMLParagraphElement>,
              HTMLParagraphElement
            >[] = [];
            image.packages?.forEach((nbpackage) => {
              packages.push(<p>{`${nbpackage.name} ${nbpackage.version}`}</p>);
            });
            return (
              <Tbody key={image.name} isExpanded={isBYONImageExpanded(image)}>
                <Tr isHidden={applyTableFilter(image)}>
                  <Td
                    expand={{
                      rowIndex,
                      isExpanded: isBYONImageExpanded(image),
                      onToggle: () => setBYONImageExpanded(image, !isBYONImageExpanded(image)),
                    }}
                  />
                  <Td dataLabel={columnNames.name}>{image.name}</Td>
                  <Td dataLabel={columnNames.description}>{image.description}</Td>
                  <Td>
                    <Switch
                      className="enable-switch"
                      aria-label={`Enable Switch ${image.name}`}
                      id={`enabled-disable-${image.id}`}
                      isChecked={
                        BYONImageVisible.find((value) => {
                          return image.id === value.id;
                        })?.visible
                      }
                      onChange={() => {
                        updateBYONImage({
                          id: image.id,
                          visible: !image.visible,
                          packages: image.packages,
                        });
                        setBYONImageVisible(
                          BYONImageVisible.map((value) =>
                            image.id === value.id
                              ? { id: value.id, visible: !value.visible }
                              : value,
                          ),
                        );
                      }}
                    />
                  </Td>
                  <Td dataLabel={columnNames.user}>{image.user}</Td>
                  <Td dataLabel={columnNames.uploaded}>
                    {relativeTime(currentTimeStamp, new Date(image.uploaded as Date).getTime())}
                  </Td>
                  <Td isActionCell>
                    <ActionsColumn items={rowActions(image)} />
                  </Td>
                </Tr>
                <Tr isHidden={applyTableFilter(image)} isExpanded={isBYONImageExpanded(image)}>
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
                          count: images.length,
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
