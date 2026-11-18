import * as React from 'react';
import { Card, CardBody, Content, Flex, FlexItem, Label, Title } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import './CreateCollectionOptionCard.scss';

type CreateCollectionOptionCardBaseProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  testId: string;
};

type CreateCollectionOptionCardProps = CreateCollectionOptionCardBaseProps &
  (
    | { destination: string; unavailable?: false }
    | { unavailable: true; badgeText: string; ariaLabel: string }
  );

const CreateCollectionOptionCard: React.FC<CreateCollectionOptionCardProps> = (props) => {
  const { title, description, icon, testId } = props;
  const isUnavailable = props.unavailable === true;

  const card = (
    <Card
      isFullHeight
      className="evalhub-create-collection-option-card"
      role={isUnavailable ? 'group' : undefined}
      aria-label={isUnavailable && 'ariaLabel' in props ? props.ariaLabel : undefined}
      aria-disabled={isUnavailable ? 'true' : undefined}
      data-testid={isUnavailable ? testId : undefined}
    >
      <CardBody>
        <Flex
          alignItems={{ default: 'alignItemsFlexStart' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <span className="evalhub-create-collection-option-card__icon" aria-hidden="true">
              {icon}
            </span>
          </FlexItem>
          {isUnavailable && (
            <FlexItem>
              <Label color="grey">{props.badgeText}</Label>
            </FlexItem>
          )}
        </Flex>
        <Title headingLevel="h2" size="lg" className="evalhub-create-collection-option-card__title">
          {title}
        </Title>
        <Content component="p" className="evalhub-create-collection-option-card__description">
          {description}
        </Content>
      </CardBody>
    </Card>
  );

  if (props.unavailable === true) {
    return card;
  }

  return (
    <Link
      to={props.destination}
      className="evalhub-create-collection-option-card__link"
      data-testid={testId}
    >
      {card}
    </Link>
  );
};

export default CreateCollectionOptionCard;
