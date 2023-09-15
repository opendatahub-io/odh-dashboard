import React from 'react';
import { ToolbarItem } from '@patternfly/react-core';
import { BYONImage } from '~/types';
import Table from '~/components/table/Table';
import DashboardSearchField, { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import ManageBYONImageModal from './BYONImageModal/ManageBYONImageModal';
import DeleteBYONImageModal from './BYONImageModal/DeleteBYONImageModal';
import { columns } from './tableData';
import BYONImagesTableRow from './BYONImagesTableRow';
import ImportBYONImageButton from './ImportBYONImageButton';

export type BYONImagesTableProps = {
  images: BYONImage[];
  refresh: () => void;
};

export const BYONImagesTable: React.FC<BYONImagesTableProps> = ({ images, refresh }) => {
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.NAME);
  const [search, setSearch] = React.useState('');
  const filteredImages = images.filter((image) => {
    if (!search) {
      return true;
    }

    switch (searchType) {
      case SearchType.NAME:
        return image.display_name.toLowerCase().includes(search.toLowerCase());
      case SearchType.DESCRIPTION:
        return image.description.toLowerCase().includes(search.toLowerCase());
      case SearchType.PROVIDER:
        return image.provider.toLowerCase().includes(search.toLowerCase());
      default:
        return true;
    }
  });

  const resetFilters = () => {
    setSearch('');
  };

  const searchTypes = React.useMemo(
    () => [SearchType.NAME, SearchType.DESCRIPTION, SearchType.PROVIDER],
    [],
  );

  const [editImage, setEditImage] = React.useState<BYONImage>();
  const [deleteImage, setDeleteImage] = React.useState<BYONImage>();

  return (
    <>
      <Table
        aria-label="Notebook images table"
        enablePagination
        data={filteredImages}
        columns={columns}
        defaultSortColumn={1}
        emptyTableView={<DashboardEmptyTableView onClearFilters={resetFilters} />}
        disableRowRenderSupport
        rowRenderer={(image, index) => (
          <BYONImagesTableRow
            rowIndex={index}
            key={image.id}
            obj={image}
            onEditImage={(i) => setEditImage(i)}
            onDeleteImage={(i) => setDeleteImage(i)}
          />
        )}
        toolbarContent={
          <>
            <ToolbarItem>
              <DashboardSearchField
                types={searchTypes}
                searchType={searchType}
                searchValue={search}
                onSearchTypeChange={(searchType) => {
                  setSearchType(searchType);
                }}
                onSearchValueChange={(searchValue) => {
                  setSearch(searchValue);
                }}
              />
            </ToolbarItem>
            <ToolbarItem>
              <ImportBYONImageButton refresh={refresh} />
            </ToolbarItem>
          </>
        }
      />
      <DeleteBYONImageModal
        image={deleteImage}
        onClose={(deleted) => {
          if (deleted) {
            refresh();
          }
          setDeleteImage(undefined);
        }}
      />
      <ManageBYONImageModal
        isOpen={!!editImage}
        onClose={(updated) => {
          if (updated) {
            refresh();
          }
          setEditImage(undefined);
        }}
        existingImage={editImage}
      />
    </>
  );
};
