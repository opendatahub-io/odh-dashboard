import React from 'react';
import classNames from 'classnames';
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
    enabled: boolean;
  };
};

const OdhAppCard: React.FC<OdhAppCardProps> = ({ odhApp }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const onToggle = (value) => {
    setIsOpen(value);
  };

  const onSelect = () => {
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
  if (odhApp.enabled && odhApp.link) {
    cardFooter = (
      <CardFooter className="footer">
        <a href={odhApp.link} target="_blank" rel="noopener noreferrer">
          <ExternalLinkAltIcon /> Launch
        </a>
      </CardFooter>
    );
  } else if (odhApp.enabled) {
    cardFooter = <CardFooter className="footer" />;
  } else {
    cardFooter = (
      <CardFooter className="footer">
        <Badge isRead>Not Installed</Badge>
      </CardFooter>
    );
  }

  return (
    <Card
      isHoverable
      className={classNames('odh-app-card', {
        'not-installed': !odhApp.enabled,
      })}
    >
      <CardHeader>
        <CardHeaderMain>
          <Brand className="header-brand" src={odhApp.img} alt={odhApp.label} />
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
