import * as React from 'react';
import { Content, Gallery, PageSection } from '@patternfly/react-core';
import OdhExploreCard from '~/components/OdhExploreCard';
import { OdhApplication } from '~/types';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import { useAppContext } from '~/app/AppContext';
import { fireMiscTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';

import '~/pages/exploreApplication/ExploreApplications.scss';

const description = `Add optional applications to your ${ODH_PRODUCT_NAME} instance.`;
const disabledDescription = `View optional applications for your ${ODH_PRODUCT_NAME} instance. Contact an administrator to install these applications.`;

type ExploreApplicationsListProps = {
  exploreComponents: OdhApplication[];
  selectedComponent?: OdhApplication;
  updateSelection: (selectedId?: string | null) => void;
  enableApp?: OdhApplication;
  setEnableApp: (app?: OdhApplication) => void;
  showDescription?: boolean;
};

const ExploreApplicationsList: React.FC<ExploreApplicationsListProps> = ({
  exploreComponents,
  selectedComponent,
  updateSelection,
  enableApp,
  setEnableApp,
  showDescription,
}) => {
  const { dashboardConfig } = useAppContext();
  const { disableInfo } = dashboardConfig.spec.dashboardConfig;

  return (
    <PageSection style={{ height: '100%' }} hasBodyWrapper={false} isFilled data-id="page-content">
      {showDescription ? (
        <Content>{disableInfo ? disabledDescription : description}</Content>
      ) : null}
      <Gallery maxWidths={{ default: '330px' }} role="list" hasGutter>
        {exploreComponents.map((c) => (
          <OdhExploreCard
            key={c.metadata.name}
            odhApp={c}
            isSelected={selectedComponent?.metadata.name === c.metadata.name}
            onSelect={() => {
              updateSelection(c.metadata.name);
              fireMiscTrackingEvent('Explore card clicked', {
                name: c.metadata.name,
              });
            }}
            disableInfo={disableInfo}
            enableOpen={c.metadata.name === enableApp?.metadata.name}
            onEnableClose={() => setEnableApp(undefined)}
          />
        ))}
      </Gallery>
    </PageSection>
  );
};

export default ExploreApplicationsList;
