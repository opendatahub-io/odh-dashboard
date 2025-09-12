import React from 'react';
import { BYONImage } from '#~/types';
import { Table } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { useDashboardNamespace } from '#~/redux/selectors';
import useAcceleratorProfiles from '#~/pages/notebookController/screens/server/useAcceleratorProfiles';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import { useHardwareProfilesByFeatureVisibility } from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility';
import ManageBYONImageModal from './BYONImageModal/ManageBYONImageModal';
import DeleteBYONImageModal from './BYONImageModal/DeleteBYONImageModal';
import { columns } from './tableData';
import BYONImagesTableRow from './BYONImagesTableRow';
import BYONImagesToolbar from './BYONImagesToolbar';
import { initialBYONImagesFilterData, BYONImagesFilterDataType } from './const';

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
        const nameFilter = filterData.Name?.toLowerCase();
        const providerFilter = filterData.Provider?.toLowerCase();

        if (nameFilter && !image.display_name.toLowerCase().includes(nameFilter)) {
          return false;
        }

        return !providerFilter || image.provider.toLowerCase().includes(providerFilter);
      }),
    [images, filterData],
  );

  const [editImage, setEditImage] = React.useState<BYONImage>();
  const [deleteImage, setDeleteImage] = React.useState<BYONImage>();

  const { dashboardNamespace } = useDashboardNamespace();
  const acceleratorProfiles = useAcceleratorProfiles(dashboardNamespace);
  const hardwareProfiles = useHardwareProfilesByFeatureVisibility([
    HardwareProfileFeatureVisibility.WORKBENCH,
  ]);

  const isHardwareProfileAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;

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
        columns={
          isHardwareProfileAvailable
            ? columns.filter((column) => column.field !== 'recommendedAccelerators')
            : columns.filter((column) => column.field !== 'recommendedHardwareProfiles')
        }
        defaultSortColumn={1}
        emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
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
