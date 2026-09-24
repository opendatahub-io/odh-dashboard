/* eslint-disable camelcase */
import { VolumeInfo, AssetResponse } from '~/app/types';
import { getRawUnstructuredFormat, normalizeUnstructuredFormat } from './formatUtils';

export const volumeToAsset = (volume: VolumeInfo, collection: string): AssetResponse => {
  // connection_ref is a top-level field in VolumeInfo, already in ConnectionRef format
  const connectionRef = volume.connection_ref || null;

  // Filter out fields we're already showing in dedicated detail fields
  // so they don't show up twice (once in detail, once in Properties card)
  // Also remove the volume-prefixed metadata properties since we map them to standard names below
  const displayProperties = { ...volume.properties };
  delete displayProperties.description;
  delete displayProperties['connection-ref'];
  delete displayProperties.registered_by;
  delete displayProperties.updated_by;
  delete displayProperties.location;
  delete displayProperties.volume_purpose;
  delete displayProperties.volume_license;
  delete displayProperties.volume_maturity;

  const contentType = getRawUnstructuredFormat(volume.properties?.['content-type']);

  // Map volume-prefixed properties to standard names for frontend display
  // (backend uses volume_* prefix to avoid conflicts)
  const volumeMetadata: Record<string, string> = {};
  if (volume.properties?.volume_purpose) {
    volumeMetadata.purpose = volume.properties.volume_purpose;
  }
  if (volume.properties?.volume_license) {
    volumeMetadata.license = volume.properties.volume_license;
  }
  if (volume.properties?.volume_maturity) {
    volumeMetadata.maturity = volume.properties.volume_maturity;
  }
  if (volume.properties?.pii_status) {
    volumeMetadata.pii_status = volume.properties.pii_status;
  }

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
    properties: { ...volumeMetadata, ...displayProperties },
    registered_by: volume.properties?.registered_by,
    updated_by: volume.properties?.updated_by,
    created_at: volume['created-at'],
    updated_at: volume['updated-at'],
  };
};
