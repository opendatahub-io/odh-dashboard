import React from 'react';
import { ExpandableSection } from '@patternfly/react-core';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';

import './DashboardExpandableSection.scss';

type DashboardExpandableSectionProps = {
  children: React.ReactNode;
  title: string;
  storageKey: string;
};

const DashboardExpandableSection: React.FC<DashboardExpandableSectionProps> = ({
  children,
  title,
  storageKey,
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useBrowserStorage(storageKey, true, true, true);

  return (
    <ExpandableSection
      className="odh-dashboard-expandable-section-heading"
      toggleText={title}
      onToggle={(e, currentIsExpanded) => setIsExpanded(currentIsExpanded)}
      isExpanded={isExpanded}
      {...props}
    >
      {children}
    </ExpandableSection>
  );
};

export default DashboardExpandableSection;
