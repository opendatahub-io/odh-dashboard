import React from 'react';
import { DashboardEmptyTableView, Table } from '@odh-dashboard/ui-core';
import { BYONImage } from '#~/types';
import { useHardwareProfilesByFeatureVisibility } from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility';
import { WORKBENCH_VISIBILITY } from '#~/concepts/hardwareProfiles/const';
import { fireMiscTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
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

const filterOptionValues: string[] = Object.values(BYONImagesToolbarFilterOptions);
const isFilterOption = (key: string): key is BYONImagesToolbarFilterOptions =>
  filterOptionValues.includes(key);

export type BYONImagesTableProps = {
  images: BYONImage[];
};

export const BYONImagesTable: React.FC<BYONImagesTableProps> = ({ images }) => {
  const [filterData, setFilterData] = React.useState<BYONImagesFilterDataType>(
    initialBYONImagesFilterData,
  );
  const sessionToggleIndexRef = React.useRef(0);

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

  const getActiveFilterCount = React.useCallback((data: BYONImagesFilterDataType): number => {
    let count = 0;
    if (data[BYONImagesToolbarFilterOptions.name]) {
      count++;
    }
    if (data[BYONImagesToolbarFilterOptions.provider]) {
      count++;
    }
    if (data[BYONImagesToolbarFilterOptions.type]) {
      count++;
    }
    if (data[BYONImagesToolbarFilterOptions.enabled]) {
      count++;
    }
    return count;
  }, []);

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) => {
      setFilterData((prevValues) => {
        const newFilterData = { ...prevValues, [key]: value };
        const previousValue = isFilterOption(key) ? prevValues[key] : undefined;
        const newActiveFilterCount = getActiveFilterCount(newFilterData);

        fireMiscTrackingEvent('Workbench Images Filtered', {
          filterType: key,
          filterValue: typeof value === 'string' ? value : value?.value ?? '',
          previousFilterValue: previousValue ?? '',
          hasActiveFilters: newActiveFilterCount > 0,
          activeFilterCount: newActiveFilterCount,
          resultCount: images.filter((image) => {
            const nameFilter = newFilterData[BYONImagesToolbarFilterOptions.name]?.toLowerCase();
            const providerFilter =
              newFilterData[BYONImagesToolbarFilterOptions.provider]?.toLowerCase();
            const typeFilter = newFilterData[BYONImagesToolbarFilterOptions.type];
            const enabledFilter = newFilterData[BYONImagesToolbarFilterOptions.enabled];

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
          }).length,
          totalImageCount: images.length,
        });

        return newFilterData;
      });
    },
    [getActiveFilterCount, images],
  );

  const onClearFilters = React.useCallback(
    () => setFilterData(initialBYONImagesFilterData),
    [setFilterData],
  );

  const getSessionToggleIndex = React.useCallback(() => sessionToggleIndexRef.current, []);

  const incrementSessionToggleIndex = React.useCallback(() => {
    sessionToggleIndexRef.current += 1;
  }, []);

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
            getSessionToggleIndex={getSessionToggleIndex}
            incrementSessionToggleIndex={incrementSessionToggleIndex}
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
