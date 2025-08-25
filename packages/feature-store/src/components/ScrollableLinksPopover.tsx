import { Content, List, ListItem, Popover, Truncate } from '@patternfly/react-core';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';
import * as React from 'react';
import { Link } from 'react-router';

type LinkItem = {
  name: string;
  to: string;
  type?: string;
};

type ScrollableLinksPopoverProps = {
  'aria-label'?: string;
  className?: string;
  links: LinkItem[];
  trigger: React.ReactNode;
};

const ScrollableLinksPopover: React.FC<ScrollableLinksPopoverProps> = ({
  'aria-label': ariaLabel,
  className,
  links,
  trigger,
}) => {
  if (links.length === 0) {
    return <Content component="p">-</Content>;
  }

  const popoverContent = (
    <List>
      {links.map((link, index) => (
        <ListItem key={`${link.name}-${index}`}>
          <Link to={link.to} data-testid={`popover-link-${link.name}`}>
            <Truncate
              content={link.name}
              style={{
                textDecoration: 'underline',
                textUnderlineOffset: ExtraSmallSpacerSize.var,
              }}
            />
          </Link>
        </ListItem>
      ))}
    </List>
  );

  return (
    <Popover
      aria-label={ariaLabel || 'Links popover'}
      bodyContent={popoverContent}
      className={`odh-u-scrollable ${className || ''}`}
    >
      <Content component="a">{trigger}</Content>
    </Popover>
  );
};

export default ScrollableLinksPopover;
