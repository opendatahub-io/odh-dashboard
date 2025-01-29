import React from 'react';
import { Button, Flex, FlexItem, Truncate } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { ArtifactType } from '~/concepts/pipelines/kfTypes';
import { useArtifactStorage } from '~/concepts/pipelines/apiHooks/useArtifactStorage';
import { Artifact } from '~/third_party/mlmd';
import { triggerFileDownload } from '~/utilities/string';

interface ArtifactUriLinkProps {
  artifact: Artifact;
}

export const ArtifactUriLink: React.FC<ArtifactUriLinkProps> = ({ artifact }) => {
  const isClassificationMetrics = artifact.getType() === ArtifactType.CLASSIFICATION_METRICS;
  const [loading, setLoading] = React.useState<boolean>(false);

  const { getStorageObjectUrl } = useArtifactStorage();

  const handleOnClick = async () => {
    const url = await getStorageObjectUrl(artifact);
    return url;
  };

  const uri = artifact.getUri();

  if (isClassificationMetrics) {
    return uri;
  }

  return (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      flexWrap={{ default: 'nowrap' }}
      spaceItems={{ default: 'spaceItemsNone' }}
    >
      <FlexItem>
        <Button
          isLoading={loading}
          variant="link"
          isInline
          icon={<ExternalLinkAltIcon />}
          href={uri}
          component="a"
          iconPosition="end"
          onClick={(e) => {
            e.preventDefault();
            setLoading(true);
            handleOnClick()
              .then((url) => {
                if (url) {
                  triggerFileDownload('', url);
                }
              })
              .catch((error) => {
                // eslint-disable-next-line no-console
                console.error('Failed to get the storage URL:', error);
              })
              .finally(() => {
                setLoading(false);
              });
          }}
        >
          <Truncate content={uri} position="middle" trailingNumChars={30} />
        </Button>
      </FlexItem>
    </Flex>
  );
};
