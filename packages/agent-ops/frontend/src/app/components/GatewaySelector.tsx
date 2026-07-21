import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Label,
  MenuToggle,
  type MenuToggleElement,
  Spinner,
} from '@patternfly/react-core';
import { useGatewayContext } from '~/app/context/GatewayContext';
import type { Gateway } from '~/app/types/gateway';

const gatewayStatusColor = (status: Gateway['status']): 'green' | 'red' | 'grey' => {
  switch (status) {
    case 'healthy':
      return 'green';
    case 'unhealthy':
      return 'red';
    default:
      return 'grey';
  }
};

const GatewaySelector: React.FC = () => {
  const { gateways, selectedGateway, setSelectedGateway, loaded } = useGatewayContext();
  const [isOpen, setIsOpen] = React.useState(false);

  const onSelect = React.useCallback(
    (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
      const gateway = gateways.find((gw) => gw.name === value);
      if (gateway) {
        setSelectedGateway(gateway);
      }
      setIsOpen(false);
    },
    [gateways, setSelectedGateway],
  );

  const toggleContent = React.useMemo(() => {
    if (!loaded) {
      return (
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          gap={{ default: 'gapSm' }}
        >
          <Spinner size="sm" aria-label="Loading gateways" />
          <FlexItem>Loading gateways...</FlexItem>
        </Flex>
      );
    }

    if (!selectedGateway) {
      return 'No gateways available';
    }

    return (
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        gap={{ default: 'gapSm' }}
      >
        <FlexItem>
          <Label color={gatewayStatusColor(selectedGateway.status)} isCompact>
            {selectedGateway.status}
          </Label>
        </FlexItem>
        <FlexItem>{selectedGateway.name}</FlexItem>
      </Flex>
    );
  }, [loaded, selectedGateway]);

  const toggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsOpen((prev) => !prev)}
        isExpanded={isOpen}
        isDisabled={!loaded || gateways.length === 0}
        data-testid="gateway-selector-toggle"
        aria-label="Select gateway"
      >
        {toggleContent}
      </MenuToggle>
    ),
    [isOpen, loaded, gateways.length, toggleContent],
  );

  return (
    <Dropdown
      isOpen={isOpen}
      onSelect={onSelect}
      onOpenChange={setIsOpen}
      toggle={toggle}
      data-testid="gateway-selector"
    >
      <DropdownList>
        {gateways.map((gw) => (
          <DropdownItem
            key={gw.name}
            value={gw.name}
            isSelected={selectedGateway?.name === gw.name}
            data-testid={`gateway-option-${gw.name}`}
          >
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              gap={{ default: 'gapSm' }}
            >
              <FlexItem>
                <Label color={gatewayStatusColor(gw.status)} isCompact>
                  {gw.status}
                </Label>
              </FlexItem>
              <FlexItem>{gw.name}</FlexItem>
            </Flex>
          </DropdownItem>
        ))}
      </DropdownList>
    </Dropdown>
  );
};

export default GatewaySelector;
