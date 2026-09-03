/* eslint-disable camelcase */
import { VolumeInfo, AssetResponse, ConnectionRef } from '~/app/types';

export const volumeToAsset = (volume: VolumeInfo, collection: string): AssetResponse => {
  // Extract connection_ref from properties if it exists
  let connectionRef: ConnectionRef | null = null;
  const connRefStr = volume.properties?.['connection-ref'];
  if (connRefStr) {
    // Assume RHAI type for now - would need backend to clarify format
    connectionRef = {
      type: 'rhai',
      secret_name: connRefStr,
    };
  }

  // Filter out fields we're already showing in dedicated detail fields
  // so they don't show up twice (once in detail, once in Properties card)
  const displayProperties = { ...volume.properties };
  delete displayProperties['connection-ref'];
  delete displayProperties.description;
  delete displayProperties['content-type'];
  delete displayProperties.registered_by;
  delete displayProperties.location;

  return {
    name: volume.name,
    asset_type: 'Unstructured',
    format: volume['volume-type'],
    location: volume['storage-location'] || volume.properties?.location,
    content_type: volume.properties?.['content-type'],
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
