import React from 'react';
import { Button, Flex, FlexItem, Icon, Popover, Truncate } from '@patternfly/react-core';
import { ExclamationTriangleIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { MAX_STORAGE_OBJECT_SIZE } from '~/services/storageService';
import { bytesAsRoundedGiB } from '~/utilities/number';
import { ArtifactType } from '~/concepts/pipelines/kfTypes';
import { useArtifactStorage } from '~/concepts/pipelines/apiHooks/useArtifactStorage';
import { Artifact } from '~/third_party/mlmd';

interface ArtifactUriLinkProps {
  uri: string;
  type: string;
  artifact: Artifact;
}

export const ArtifactUriLink: React.FC<ArtifactUriLinkProps> = ({ uri, type, artifact }) => {
  const isClassificationMetrics = type === ArtifactType.CLASSIFICATION_METRICS;
  const [url, setUrl] = React.useState<string | undefined>();
  const [size, setSize] = React.useState<number | undefined>();

  const artifactStorage = useArtifactStorage();

  React.useEffect(() => {
    if (artifactStorage.enabled) {
      artifactStorage.getStorageObjectUrl(artifact).then((u) => setUrl(u));
      artifactStorage.getStorageObjectSize(artifact).then((s) => setSize(s));
    }
  }, [artifact, artifactStorage]);

  if (!url || isClassificationMetrics) {
    return uri;
  }

  // we do not fetch over 100MB
  const isOversizedFile = !!size && size > MAX_STORAGE_OBJECT_SIZE;

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
          icon={<ExternalLinkAltIcon />}
          iconPosition="end"
          // TODO: remove this style override after upgrading to PFv6
          style={{ display: 'inline-flex' }}
          onClick={() => {
            window.open(url);
          }}
        >
          <Truncate content={uri} position="middle" trailingNumChars={30} />
        </Button>
      </FlexItem>
    </Flex>
  );
};
