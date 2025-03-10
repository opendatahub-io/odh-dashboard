import React from 'react';
import { Label, Split, SplitItem, Truncate } from '@patternfly/react-core';

type ArtifactDetailsTitleProps = {
  name: string;
  isArtifactModelRegistered: boolean;
};

const ArtifactDetailsTitle: React.FC<ArtifactDetailsTitleProps> = ({
  name,
  isArtifactModelRegistered,
}) => (
  <>
    <Split hasGutter>
      <SplitItem>
        <Truncate content={name} />
      </SplitItem>
      {isArtifactModelRegistered && (
        <SplitItem>
          <Label color="green">Registered</Label>
        </SplitItem>
      )}
    </Split>
  </>
);
export default ArtifactDetailsTitle;
