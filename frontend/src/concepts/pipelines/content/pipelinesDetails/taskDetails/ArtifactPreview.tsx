import React from 'react';
import { Bullseye, CodeBlock, CodeBlockCode, Spinner } from '@patternfly/react-core';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { Artifact } from '~/third_party/mlmd';
import { extractS3UriComponents } from '~/concepts/pipelines/content/artifacts/utils';
import { fetchStorageObject } from '~/services/storageService';

type ArtifactPreviewProps = {
  artifact: Artifact;
  maxBytes?: number;
  maxLines?: number;
};

const ArtifactPreview: React.FC<ArtifactPreviewProps> = ({
  artifact,
  maxBytes = 255,
  maxLines = 4,
}) => {
  const isS3EndpointAvailable = useIsAreaAvailable(SupportedArea.S3_ENDPOINT).status;
  const { namespace } = usePipelinesAPI();
  const [preview, setPreview] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    const uri = artifact.getUri();
    if (!uri || !isS3EndpointAvailable) {
      return;
    }

    setPreview(null);
    const uriComponents = extractS3UriComponents(uri);
    if (!uriComponents) {
      return;
    }
    setIsLoading(true);
    fetchStorageObject(namespace, uriComponents.path, maxBytes)
      .catch(() => null)
      .then((text) => setPreview(text))
      .finally(() => setIsLoading(false));
  }, [artifact, isS3EndpointAvailable, maxBytes, namespace]);

  if (isLoading) {
    return (
      <Bullseye>
        <Spinner size="lg" />
      </Bullseye>
    );
  }

  if (!preview) {
    return null;
  }

  // Try to parse the preview as JSON
  let code = preview;
  try {
    code = JSON.parse(preview);
    code = JSON.stringify(code, null, 2);
  } catch {
    // ignore
  }

  code = code.split('\n').slice(0, maxLines).join('\n').trim();
  code = `${code}...`;

  return (
    <CodeBlock>
      <CodeBlockCode>{code}</CodeBlockCode>
    </CodeBlock>
  );
};

export default ArtifactPreview;
