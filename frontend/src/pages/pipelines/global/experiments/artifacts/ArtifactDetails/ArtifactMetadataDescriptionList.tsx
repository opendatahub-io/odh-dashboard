import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { MaxHeightCodeEditor } from '#~/components/MaxHeightCodeEditor';

type ArtifactMetadataDescriptionListProps = {
  metadata: Record<string, unknown>;
};

export const ArtifactMetadataDescriptionList: React.FC<ArtifactMetadataDescriptionListProps> = ({
  metadata,
}) => (
  <DescriptionList isHorizontal data-testid="artifact-metadata-list">
    {Object.entries(metadata).map(([name, value]) => (
      <DescriptionListGroup key={name}>
        <DescriptionListTerm>{name}</DescriptionListTerm>
        <DescriptionListDescription>
          {value != null && typeof value === 'object' ? (
            <MaxHeightCodeEditor isReadOnly code={JSON.stringify(value, null, 2)} maxHeight={300} />
          ) : (
            String(value ?? '—')
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
    ))}
  </DescriptionList>
);
