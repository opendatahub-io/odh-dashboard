import * as React from 'react';
import {
  DescriptionListTerm,
  Gallery,
  Card,
  CardHeader,
  Dropdown,
  MenuToggleElement,
  MenuToggle,
  DropdownList,
  DropdownItem,
  CardTitle,
  CardBody,
  DescriptionList,
  CardFooter,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { Table } from '~/components/table';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';

type InferenceServiceCardsProps = {
  clearFilters?: () => void;
  inferenceServices: InferenceServiceKind[];
  servingRuntimes: ServingRuntimeKind[];
  refresh: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination' | 'toolbarContent'>>;

const InferenceServiceCards: React.FC<InferenceServiceCardsProps> = ({ inferenceServices }) => {
  const [state, setState] = React.useState<{ [x: string]: boolean }>({});

  const onCardKebabDropdownToggle = (
    event:
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
      | React.MouseEvent<HTMLDivElement, MouseEvent>,
    key: string,
  ) => {
    setState({
      [key]: !state[key as keyof object],
    });
  };

  return (
    <DescriptionList>
      <DescriptionListTerm>List of Deployed Models</DescriptionListTerm>
      <Gallery hasGutter minWidths={{ xl: '30%' }} aria-label="Selectable card container">
        {inferenceServices.map((product, key) => (
          <Card
            isCompact
            isFlat
            isClickable
            key={product.metadata.name}
            id={product.metadata.name.replace(/ /g, '-')}
          >
            <CardHeader
              actions={{
                actions: (
                  <>
                    <Dropdown
                      isOpen={!!state[key] !== false ? state[key] : false}
                      onOpenChange={(isOpen) => setState({ [key]: isOpen })}
                      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                        <MenuToggle
                          ref={toggleRef}
                          aria-label={`${product.metadata.name} actions`}
                          variant="plain"
                          onClick={(e) => {
                            onCardKebabDropdownToggle(e, key.toString());
                          }}
                          // isExpanded={!!state[key]}
                        >
                          <EllipsisVIcon />
                        </MenuToggle>
                      )}
                      popperProps={{ position: 'right' }}
                    >
                      <DropdownList>
                        <DropdownItem
                          key="edit"
                          onClick={() => {
                            // TODO
                            // editItem(product);
                          }}
                        >
                          Edit
                        </DropdownItem>
                        <DropdownItem
                          key="trash"
                          onClick={() => {
                            // TODO
                            // deleteItem(product);
                          }}
                        >
                          Delete
                        </DropdownItem>
                      </DropdownList>
                    </Dropdown>
                  </>
                ),
              }}
            >
              <CardTitle>{product.metadata.name}</CardTitle>
            </CardHeader>
            <CardBody>https://www.replacethis</CardBody>
            <CardFooter>Deployed model</CardFooter>
          </Card>
        ))}
      </Gallery>
    </DescriptionList>
  );
};

export default InferenceServiceCards;
