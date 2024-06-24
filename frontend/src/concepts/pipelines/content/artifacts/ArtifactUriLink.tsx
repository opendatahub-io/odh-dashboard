import React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  Icon,
  Popover,
  Split,
  SplitItem,
  Truncate,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import { MAX_STORAGE_OBJECT_SIZE, fetchStorageObjectSize } from '~/services/storageService';
import { bytesAsRoundedGiB } from '~/utilities/number';
import { ArtifactType } from '~/concepts/pipelines/kfTypes';
import { extractS3UriComponents, getArtifactUrlFromUri } from './utils';

interface ArtifactUriLinkProps {
  uri: string;
  type: string;
}

export const ArtifactUriLink: React.FC<ArtifactUriLinkProps> = ({ uri, type }) => {
  const { namespace } = usePipelinesAPI();
  const isS3EndpointAvailable = useIsAreaAvailable(SupportedArea.S3_ENDPOINT).status;
  const [size, setSize] = React.useState<number | null>(null);
  const isClassificationMetrics = type === ArtifactType.CLASSIFICATION_METRICS;

  const url = React.useMemo(() => {
    if (!uri || !isS3EndpointAvailable) {
      return;
    }

    const uriComponents = extractS3UriComponents(uri);

    if (uriComponents) {
      fetchStorageObjectSize(namespace, uriComponents.path)
        .then((sizeBytes) => setSize(sizeBytes))
        .catch(() => null);
    }

    return getArtifactUrlFromUri(uri, namespace);
  }, [isS3EndpointAvailable, namespace, uri]);

  if (!url || isClassificationMetrics) {
    return uri;
  }

  // we do not fetch over 100MB
  const isOversizedFile = size !== null && size > MAX_STORAGE_OBJECT_SIZE;

  return (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      flexWrap={{ default: 'nowrap' }}
      spaceItems={{ default: 'spaceItemsNone' }}
    >
      {isOversizedFile && (
        <FlexItem>
          <Popover
            aria-label="Oversized file popover"
            headerContent="Oversized file"
            bodyContent={`This file is ${bytesAsRoundedGiB(
              size,
            )} GiB in size but we do not fetch files over 100MB. To view the full file, please download it from your S3 bucket.`}
          >
            <Button variant="plain" isInline data-testid="storage-file-oversized-warning">
              <Icon status="warning">
                <ExclamationTriangleIcon />
              </Icon>
            </Button>
          </Popover>
        </FlexItem>
      )}
      <FlexItem>
        <Button
          variant="link"
          isInline
          onClick={() => {
            window.open(url);
          }}
        >
          <Split>
            <SplitItem>
              <Truncate content={uri} />
            </SplitItem>
            <SplitItem>
              <ExternalLinkAltIcon />
            </SplitItem>
          </Split>
        </Button>
      </FlexItem>
    </Flex>
  );
};
