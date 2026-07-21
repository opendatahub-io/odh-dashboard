import * as React from 'react';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  MenuToggle,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router';
import { TopologyType, TopologyTypeLabels } from '../types';

const primaryTopologyType = TopologyType.SINGLE_NODE;
const dropdownTopologyTypes = Object.values(TopologyType).filter((t) => t !== primaryTopologyType);

const EmptyTopologyConfigurations: React.FC = () => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  return (
    <EmptyState
      headingLevel="h2"
      icon={PlusCircleIcon}
      titleText="No llm-d topology configurations"
      data-testid="empty-topology-configurations"
    >
      <EmptyStateBody>
        Topology configurations define how llm-d workloads are composed for model serving. Add a
        configuration to make it available in the model serving wizard.
      </EmptyStateBody>
      <EmptyStateFooter>
        <Dropdown
          isOpen={isDropdownOpen}
          onOpenChange={setIsDropdownOpen}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              variant="primary"
              splitButtonItems={[
                <Button
                  key="primary-add"
                  variant="primary"
                  data-testid="add-topology-config-button"
                  onClick={() => navigate(`add/${primaryTopologyType}`)}
                >
                  Add {TopologyTypeLabels[primaryTopologyType].toLowerCase()} configuration
                </Button>,
              ]}
              aria-label="Add topology configuration"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              data-testid="add-topology-config-dropdown-toggle"
            />
          )}
        >
          <DropdownList>
            {dropdownTopologyTypes.map((tt) => (
              <DropdownItem
                key={tt}
                data-testid={`add-config-${tt}`}
                onClick={() => {
                  setIsDropdownOpen(false);
                  navigate(`add/${tt}`);
                }}
              >
                Add {TopologyTypeLabels[tt].toLowerCase()} configuration
              </DropdownItem>
            ))}
          </DropdownList>
        </Dropdown>
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default EmptyTopologyConfigurations;
