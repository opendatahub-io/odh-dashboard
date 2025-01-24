import React from 'react';
import { ToolbarItem } from '@patternfly/react-core';
import { BYONImage } from '~/types';
import { Table } from '~/components/table';
import DashboardSearchField, { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import { useDashboardNamespace } from '~/redux/selectors';
import useAcceleratorProfiles from '~/pages/notebookController/screens/server/useAcceleratorProfiles';
import useHardwareProfiles from '~/pages/hardwareProfiles/useHardwareProfiles';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
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
      case SearchType.PROVIDER:
        return image.provider.toLowerCase().includes(search.toLowerCase());
      default:
        return true;
    }
  });

  const resetFilters = () => {
    setSearch('');
  };

  const searchTypes = React.useMemo(() => [SearchType.NAME, SearchType.PROVIDER], []);

  const [editImage, setEditImage] = React.useState<BYONImage>();
  const [deleteImage, setDeleteImage] = React.useState<BYONImage>();

  const { dashboardNamespace } = useDashboardNamespace();
  const acceleratorProfiles = useAcceleratorProfiles(dashboardNamespace);
  const hardwareProfiles = useHardwareProfiles(dashboardNamespace);

  const isHardwareProfileAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;

  return (
    <>
      <Table
        aria-label="Notebook images table"
        data-testid="notebook-images-table"
        enablePagination
        data={filteredImages}
        columns={
          isHardwareProfileAvailable
            ? columns.filter((column) => column.field !== 'recommendedAccelerators')
            : columns.filter((column) => column.field !== 'recommendedHardwareProfiles')
        }
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
            acceleratorProfiles={acceleratorProfiles}
            hardwareProfiles={hardwareProfiles}
          />
        )}
        toolbarContent={
          <>
            <ToolbarItem>
              <DashboardSearchField
                types={searchTypes}
                searchType={searchType}
                searchValue={search}
                onSearchTypeChange={(newSearchType) => {
                  setSearchType(newSearchType);
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
      {deleteImage ? (
        <DeleteBYONImageModal
          image={deleteImage}
          onClose={(deleted) => {
            if (deleted) {
              refresh();
            }
            setDeleteImage(undefined);
          }}
        />
      ) : null}
      {editImage ? (
        <ManageBYONImageModal
          onClose={(updated) => {
            if (updated) {
              refresh();
            }
            setEditImage(undefined);
          }}
          existingImage={editImage}
        />
      ) : null}
    </>
  );
};
