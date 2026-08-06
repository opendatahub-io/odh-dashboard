import React from 'react';
import { debounce, type DebouncedFunc } from 'lodash-es';
import {
  DashboardEmptyTableView,
  Table,
  TrackingOutcome,
  type FormTrackingEventProperties,
} from '@odh-dashboard/ui-core';
import { BYONImage } from '#~/types';
import { useHardwareProfilesByFeatureVisibility } from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility';
import { WORKBENCH_VISIBILITY } from '#~/concepts/hardwareProfiles/const';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
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

const filterByonImages = (imgs: BYONImage[], data: BYONImagesFilterDataType): BYONImage[] =>
  imgs.filter((image) => {
    const nameFilter = data[BYONImagesToolbarFilterOptions.name]?.toLowerCase();
    const providerFilter = data[BYONImagesToolbarFilterOptions.provider]?.toLowerCase();
    const typeFilter = data[BYONImagesToolbarFilterOptions.type];
    const enabledFilter = data[BYONImagesToolbarFilterOptions.enabled];

    if (nameFilter && !image.display_name.toLowerCase().includes(nameFilter)) {
      return false;
    }
    if (providerFilter && !image.provider.toLowerCase().includes(providerFilter)) {
      return false;
    }
    if (typeFilter) {
      const isPreInstalled = typeFilter === ImageTypeFilter.preInstalled;
      if (image.isOOTB !== isPreInstalled) {
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
  });

const getActiveFilterCount = (data: BYONImagesFilterDataType): number => {
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
};

const safeFireFilterEvent = (properties: FormTrackingEventProperties): void => {
  try {
    fireFormTrackingEvent('Workbench Images Filter Applied', properties);
  } catch {
    // noop
  }
};

export type BYONImagesTableProps = {
  images: BYONImage[];
};

export const BYONImagesTable: React.FC<BYONImagesTableProps> = ({ images }) => {
  const [filterData, setFilterData] = React.useState<BYONImagesFilterDataType>(
    initialBYONImagesFilterData,
  );
  const sessionToggleIndexRef = React.useRef(0);

  const filteredImages = React.useMemo(
    () => filterByonImages(images, filterData),
    [images, filterData],
  );

  const [editImage, setEditImage] = React.useState<BYONImage>();
  const [deleteImage, setDeleteImage] = React.useState<BYONImage>();

  const { globalProfiles: hardwareProfiles } =
    useHardwareProfilesByFeatureVisibility(WORKBENCH_VISIBILITY);

  const pendingTrackRef = React.useRef<{
    key: string;
    filterValue: string;
    previousValue: string;
    isTextFilter: boolean;
  } | null>(null);

  const debouncedTrackersRef = React.useRef(
    new Map<string, DebouncedFunc<(p: FormTrackingEventProperties) => void>>(),
  );

  React.useEffect(
    () => () => {
      debouncedTrackersRef.current.forEach((d) => d.cancel());
    },
    [],
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) => {
      if (!isFilterOption(key)) {
        return;
      }
      const filterValue = typeof value === 'string' ? value : value?.value;

      setFilterData((prev) => {
        pendingTrackRef.current = {
          key,
          filterValue: filterValue ?? '',
          previousValue: prev[key] ?? '',
          isTextFilter:
            key === BYONImagesToolbarFilterOptions.name ||
            key === BYONImagesToolbarFilterOptions.provider,
        };
        return { ...prev, [key]: filterValue };
      });
    },
    [],
  );

  React.useEffect(() => {
    const pending = pendingTrackRef.current;
    if (!pending) {
      return;
    }
    pendingTrackRef.current = null;

    const activeFilterCount = getActiveFilterCount(filterData);
    const trackingProperties: FormTrackingEventProperties = {
      outcome: TrackingOutcome.submit,
      filterType: pending.key,
      filterValue: pending.filterValue,
      previousFilterValue: pending.previousValue,
      hasActiveFilters: activeFilterCount > 0,
      activeFilterCount,
      resultCount: filteredImages.length,
      totalImageCount: images.length,
    };

    if (pending.isTextFilter) {
      let debounced = debouncedTrackersRef.current.get(pending.key);
      if (!debounced) {
        debounced = debounce(safeFireFilterEvent, 400);
        debouncedTrackersRef.current.set(pending.key, debounced);
      }
      debounced(trackingProperties);
    } else {
      safeFireFilterEvent(trackingProperties);
    }
  }, [filterData, filteredImages.length, images.length]);

  const onClearFilters = React.useCallback(
    () => setFilterData(initialBYONImagesFilterData),
    [setFilterData],
  );

  const claimSessionToggleIndex = React.useCallback(() => {
    const index = sessionToggleIndexRef.current;
    sessionToggleIndexRef.current += 1;
    return index;
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
            claimSessionToggleIndex={claimSessionToggleIndex}
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
