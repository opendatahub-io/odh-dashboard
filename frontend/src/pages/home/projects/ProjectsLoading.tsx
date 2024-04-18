import * as React from 'react';
import { Gallery, Skeleton } from '@patternfly/react-core';

const ProjectsLoading: React.FC = () => (
  <Gallery
    hasGutter
    minWidths={{ default: '100%', lg: '20%' }}
    maxWidths={{ default: '100%', lg: '20%' }}
  >
    <Skeleton style={{ height: 250 }} />
    <Skeleton style={{ height: 250 }} />
    <Skeleton style={{ height: 250 }} />
  </Gallery>
);

export default ProjectsLoading;
