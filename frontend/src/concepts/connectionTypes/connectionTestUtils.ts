import { Connection } from '#~/concepts/connectionTypes/types';

// Must stay in sync with the probe registry in
// distributions/core-bff/bff/internal/api/connection_test_handler.go
const CONNECTION_TEST_SUPPORTED_TYPES = ['s3', 'uri', 'oci'];

export const CONNECTION_TEST_UNSUPPORTED_TOOLTIP =
  'Verification is not available for this connection type. Only S3 compatible object storage, URI, and OCI compliant registry connections can be verified.';

/**
 * Mirrors the BFF lookup: an exact match on a supported type, or a versioned
 * name such as "uri-v1" / "oci_v1".
 */
export const isConnectionTestSupported = (connectionType?: string): boolean =>
  !!connectionType &&
  CONNECTION_TEST_SUPPORTED_TYPES.some(
    (type) =>
      connectionType === type ||
      connectionType.startsWith(`${type}-`) ||
      connectionType.startsWith(`${type}_`),
  );

export const getConnectionTestType = (connection: Connection): string =>
  connection.metadata.annotations['opendatahub.io/connection-type-ref'] ??
  connection.metadata.annotations['opendatahub.io/connection-type'] ??
  '';
