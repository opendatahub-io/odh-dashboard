import React from 'react';
import { Button, Flex, FlexItem, Truncate } from '@patternfly/react-core';
import { DownloadIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { ArtifactType } from '~/concepts/pipelines/kfTypes';
import { useArtifactStorage } from '~/concepts/pipelines/apiHooks/useArtifactStorage';
import { Artifact } from '~/third_party/mlmd';
import { triggerFileDownload } from '~/utilities/string';
import useNotification from '~/utilities/useNotification';

interface ArtifactUriLinkProps {
  artifact: Artifact;
}

export const ArtifactUriLink: React.FC<ArtifactUriLinkProps> = ({ artifact }) => {
  const isMetrics =
    artifact.getType() === ArtifactType.CLASSIFICATION_METRICS ||
    artifact.getType() === ArtifactType.METRICS ||
    artifact.getType() === ArtifactType.SLICED_CLASSIFICATION_METRICS;

  const isDownloadableOnly =
    artifact.getType() === ArtifactType.MODEL || artifact.getType() === ArtifactType.ARTIFACT;
  const { getStorageObjectDownloadUrl, getStorageObjectRenderUrl } = useArtifactStorage();
  const [loading, setLoading] = React.useState<boolean>(false);
  const notification = useNotification();

  const handleDownload = () => {
    getStorageObjectDownloadUrl(artifact)
      .then((url) => {
        if (url) {
          triggerFileDownload('', url);
        }
      })
      .catch((error) => {
        notification.error('Failed to get the storage URL', error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handlePreview = () => {
    getStorageObjectRenderUrl(artifact)
      .then((url) => {
        if (url) {
          window.open(url, '_blank');
        }
      })
      .catch((error) => {
        notification.error('Failed to get the storage URL', error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const uri = artifact.getUri();

  // If the artifact is a metrics type, there's no need to show the uri
  // because it's not linked to anything
  if (isMetrics) {
    return '-';
  }

  return (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      flexWrap={{ default: 'nowrap' }}
      spaceItems={{ default: 'spaceItemsSm' }}
    >
      <FlexItem>
        <Button
          isLoading={loading}
          variant="link"
          isInline
          icon={isDownloadableOnly ? <DownloadIcon /> : <ExternalLinkAltIcon />}
          href={uri}
          component="a"
          iconPosition="end"
          onClick={(e) => {
            e.preventDefault();
            setLoading(true);
            if (isDownloadableOnly) {
              handleDownload();
            } else {
              handlePreview();
            }
          }}
        >
          <Truncate content={uri} position="middle" trailingNumChars={30} />
        </Button>
      </FlexItem>
      {!isDownloadableOnly && (
        <FlexItem>
          <Button
            variant="link"
            isInline
            icon={<DownloadIcon />}
            href={uri}
            component="a"
            onClick={(e) => {
              e.preventDefault();
              setLoading(true);
              handleDownload();
            }}
          />
        </FlexItem>
      )}
    </Flex>
  );
};
