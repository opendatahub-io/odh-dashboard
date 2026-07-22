import React from 'react';
import { DashboardEmptyTableView, Table } from '@odh-dashboard/ui-core';
import { BYONImage } from '#~/types';
import { useHardwareProfilesByFeatureVisibility } from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility';
import { WORKBENCH_VISIBILITY } from '#~/concepts/hardwareProfiles/const';
import ManageBYONImageModal from './BYONImageModal/ManageBYONImageModal';
import DeleteBYONImageModal from './BYONImageModal/DeleteBYONImageModal';
import { columns } from './tableData';
import BYONImagesTableRow from './BYONImagesTableRow';
import BYONImagesToolbar from './BYONImagesToolbar';
import {
  initialBYONImagesFilterData,
  BYONImagesFilterDataType,
  BYONImagesToolbarFilterOptions,
  ImageTypeFilter,
  ImageEnabledFilter,
} from './const';
import { isImageEffectivelyEnabled } from './utils';

export type BYONImagesTableProps = {
  images: BYONImage[];
};

export const BYONImagesTable: React.FC<BYONImagesTableProps> = ({ images }) => {
  const [filterData, setFilterData] = React.useState<BYONImagesFilterDataType>(
    initialBYONImagesFilterData,
  );

  const filteredImages = React.useMemo(
    () =>
      images.filter((image) => {
        const nameFilter = filterData[BYONImagesToolbarFilterOptions.name]?.toLowerCase();
        const providerFilter = filterData[BYONImagesToolbarFilterOptions.provider]?.toLowerCase();
        const typeFilter = filterData[BYONImagesToolbarFilterOptions.type];
        const enabledFilter = filterData[BYONImagesToolbarFilterOptions.enabled];

        if (nameFilter && !image.display_name.toLowerCase().includes(nameFilter)) {
          return false;
        }

        if (providerFilter && !image.provider.toLowerCase().includes(providerFilter)) {
          return false;
        }

        if (typeFilter) {
          const isRedHat = typeFilter === ImageTypeFilter.redHat;
          if (image.isOOTB !== isRedHat) {
            return false;
          }
        }

        if (enabledFilter) {
          const isEnabled = enabledFilter === ImageEnabledFilter.enabled;
          if (isEnabled !== isImageEffectivelyEnabled(image)) {
            return false;
          }
        }

        return true;
      }),
    [images, filterData],
  );

  const [editImage, setEditImage] = React.useState<BYONImage>();
  const [deleteImage, setDeleteImage] = React.useState<BYONImage>();

  const { globalProfiles: hardwareProfiles } =
    useHardwareProfilesByFeatureVisibility(WORKBENCH_VISIBILITY);

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  const onClearFilters = React.useCallback(
    () => setFilterData(initialBYONImagesFilterData),
    [setFilterData],
  );

  return (
    <>
      <Table
        aria-label="Workbench images table"
        data-testid="notebook-images-table"
        enablePagination
        data={filteredImages}
        columns={columns}
        defaultSortColumn={1}
        emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
        disableRowRenderSupport
        rowRenderer={(image, index) => (
          <BYONImagesTableRow
            rowIndex={index}
            key={image.id}
            obj={image}
            images={images}
            onEditImage={(i) => setEditImage(i)}
            onDeleteImage={(i) => setDeleteImage(i)}
            hardwareProfiles={hardwareProfiles}
          />
        )}
        onClearFilters={onClearFilters}
        toolbarContent={
          <BYONImagesToolbar filterData={filterData} onFilterUpdate={onFilterUpdate} />
        }
      />
      {deleteImage ? (
        <DeleteBYONImageModal
          image={deleteImage}
          onClose={() => {
            setDeleteImage(undefined);
          }}
        />
      ) : null}
      {editImage ? (
        <ManageBYONImageModal
          onClose={() => {
            setEditImage(undefined);
          }}
          existingImage={editImage}
        />
      ) : null}
    </>
  );
};
