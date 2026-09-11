/* eslint-disable camelcase */
import { VolumeInfo, AssetResponse } from '~/app/types';
import { getRawUnstructuredFormat, normalizeUnstructuredFormat } from './formatUtils';

export const volumeToAsset = (volume: VolumeInfo, collection: string): AssetResponse => {
  // connection_ref is a top-level field in VolumeInfo, already in ConnectionRef format
  const connectionRef = volume.connection_ref || null;

  // Filter out fields we're already showing in dedicated detail fields
  // so they don't show up twice (once in detail, once in Properties card)
  const displayProperties = { ...volume.properties };
  delete displayProperties.description;
  delete displayProperties.registered_by;
  delete displayProperties.updated_by;
  delete displayProperties.location;

  const contentType = getRawUnstructuredFormat(volume.properties?.['content-type']);

  return {
    name: volume.name,
    asset_type: 'Unstructured',
    format: normalizeUnstructuredFormat(
      getRawUnstructuredFormat(contentType, volume['volume-type']),
    ),
    location: volume['storage-location'] || volume.properties?.location,
    content_type: contentType,
    collection,
    connection_ref: connectionRef,
    owner: volume.owner,
    description: volume.properties?.description || volume.comment,
    labels: volume.labels,
    properties: displayProperties,
    registered_by: volume.properties?.registered_by,
    updated_by: volume.properties?.updated_by,
    created_at: volume['created-at'],
    updated_at: volume['updated-at'],
  };
};
