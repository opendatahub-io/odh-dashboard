import * as React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';

export type OverviewView = 'models' | 'groups';

type OverviewViewToggleProps = {
  view: OverviewView;
  onChange: (view: OverviewView) => void;
};

const OverviewViewToggle: React.FC<OverviewViewToggleProps> = ({ view, onChange }) => (
  <ToggleGroup aria-label="Overview view" data-testid="overview-view-toggle">
    <ToggleGroupItem
      data-testid="overview-models-view"
      text="Models"
      isSelected={view === 'models'}
      onChange={() => onChange('models')}
    />
    <ToggleGroupItem
      data-testid="overview-groups-view"
      text="Groups"
      isSelected={view === 'groups'}
      onChange={() => onChange('groups')}
    />
  </ToggleGroup>
);

export default OverviewViewToggle;
