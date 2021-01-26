import React from 'react';
import {
  Brand,
  Card,
  CardHeader,
  CardHeaderMain,
  CardActions,
  CardTitle,
  CardBody,
  CardFooter,
  Dropdown,
  DropdownItem,
  KebabToggle,
  Badge,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

type OdhAppCardProps = {
  odhApp: {
    label: string;
    description: string;
    img: string;
    link: string;
    docsLink: string;
  };
};

const OdhAppCard: React.FC<OdhAppCardProps> = ({ odhApp }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const onToggle = (value) => {
    setIsOpen(value);
  };

  const onSelect = (e) => {
    setIsOpen(!isOpen);
  };

  const dropdownItems = [
    <DropdownItem key="docs" href={odhApp.docsLink} target="_blank" rel="noopener noreferrer">
      Documentation
    </DropdownItem>,
  ];

  if (odhApp.link) {
    dropdownItems.push(
      <DropdownItem key="launch" href={odhApp.link} target="_blank" rel="noopener noreferrer">
        Launch
      </DropdownItem>,
    );
  }

  let cardFooter;
  if (odhApp.link) {
    cardFooter = (
      <CardFooter className="odh-installed-apps__card__footer">
        <a href={odhApp.link} target="_blank" rel="noopener noreferrer">
          {`Launch `}
          <ExternalLinkAltIcon />
        </a>
      </CardFooter>
    );
  } else {
    cardFooter = <CardFooter className="odh-installed-apps__card__footer" />;
  }

  return (
    <Card isHoverable className="odh-installed-apps__card">
      <CardHeader>
        <CardHeaderMain>
          <Brand
            className="odh-installed-apps__card__header-brand"
            src={odhApp.img}
            alt={odhApp.label}
          />
        </CardHeaderMain>
        <CardActions>
          <Dropdown
            onSelect={onSelect}
            toggle={<KebabToggle onToggle={onToggle} />}
            isOpen={isOpen}
            isPlain
            dropdownItems={dropdownItems}
            position={'right'}
          />
        </CardActions>
      </CardHeader>
      <CardTitle>{odhApp.label}</CardTitle>
      <CardBody>{odhApp.description}</CardBody>
      {cardFooter}
    </Card>
  );
};

export default OdhAppCard;
