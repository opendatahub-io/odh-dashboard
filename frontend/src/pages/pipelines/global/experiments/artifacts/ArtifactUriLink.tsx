import React from 'react';
import { Link } from 'react-router-dom';

import { Flex, FlexItem, Skeleton, Truncate } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

import { generateGcsConsoleUri, generateMinioArtifactUrl, generateS3ArtifactUrl } from './utils';

interface ArtifactUriLinkProps {
  uri: string;
  downloadHost: string;
  isLoaded?: boolean;
}

export const ArtifactUriLink: React.FC<ArtifactUriLinkProps> = ({
  uri,
  downloadHost,
  isLoaded = true,
}) => {
  let uriLinkTo = '';

  if (!isLoaded) {
    return <Skeleton />;
  }

  if (uri.startsWith('gs:')) {
    uriLinkTo = generateGcsConsoleUri(uri);
  }

  if (uri.startsWith('s3:')) {
    uriLinkTo = `${downloadHost}/${generateS3ArtifactUrl(uri)}`;
  }

  if (uri.startsWith('http:') || uri.startsWith('https:')) {
    uriLinkTo = uri;
  }

  if (uri.startsWith('minio:')) {
    uriLinkTo = `${downloadHost}/${generateMinioArtifactUrl(uri)}`;
  }

  return uriLinkTo ? (
    <Link to={uriLinkTo} target="_blank">
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        spaceItems={{ default: 'spaceItemsSm' }}
        flexWrap={{ default: 'nowrap' }}
      >
        <FlexItem>
          <Truncate content={uri} />
        </FlexItem>

        <FlexItem>
          <ExternalLinkAltIcon />
        </FlexItem>
      </Flex>
    </Link>
  ) : (
    uri
  );
};
