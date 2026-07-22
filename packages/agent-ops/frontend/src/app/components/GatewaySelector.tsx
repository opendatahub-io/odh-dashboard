import * as React from 'react';
import {
  Content,
  Divider,
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
import CreateGatewayModal from '~/app/components/CreateGatewayModal';
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
  const { gateways, selectedGateway, setSelectedGateway, loaded, refresh } = useGatewayContext();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [createDeployMode, setCreateDeployMode] = React.useState(false);

  const onSelect = React.useCallback(
    (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
      if (value === '__register__') {
        setCreateDeployMode(false);
        setShowCreateModal(true);
        setIsOpen(false);
        return;
      }
      if (value === '__deploy__') {
        setCreateDeployMode(true);
        setShowCreateModal(true);
        setIsOpen(false);
        return;
      }
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
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
          <Spinner size="sm" aria-label="Loading gateways" />
          <FlexItem>Loading gateways...</FlexItem>
        </Flex>
      );
    }

    if (!selectedGateway) {
      return 'Select a gateway';
    }

    return (
      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
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
        isDisabled={!loaded}
        data-testid="gateway-selector-toggle"
        aria-label="Select gateway"
      >
        {toggleContent}
      </MenuToggle>
    ),
    [isOpen, loaded, toggleContent],
  );

  return (
    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
      <FlexItem>
        <Content component="p">Gateway</Content>
      </FlexItem>
      <FlexItem>
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
                <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                  <FlexItem>
                    <Label color={gatewayStatusColor(gw.status)} isCompact>
                      {gw.status}
                    </Label>
                  </FlexItem>
                  <FlexItem>{gw.name}</FlexItem>
                </Flex>
              </DropdownItem>
            ))}
            <Divider />
            <DropdownItem
              key="__register__"
              value="__register__"
              data-testid="gateway-register-action"
            >
              Register existing gateway
            </DropdownItem>
            <DropdownItem
              key="__deploy__"
              value="__deploy__"
              data-testid="gateway-deploy-action"
            >
              Deploy new gateway
            </DropdownItem>
          </DropdownList>
        </Dropdown>
      </FlexItem>
      <CreateGatewayModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setShowCreateModal(false);
          refresh();
        }}
        deployMode={createDeployMode}
      />
    </Flex>
  );
};

export default GatewaySelector;
