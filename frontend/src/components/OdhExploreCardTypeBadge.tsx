import * as React from 'react';
import { Tooltip, Label } from '@patternfly/react-core';
import { OdhApplicationCategory } from '#~/types';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';

type OdhExploreCardTypeBadgeProps = {
  category: OdhApplicationCategory | string;
  isDisabled?: boolean;
};

const OdhExploreCardTypeBadge: React.FC<OdhExploreCardTypeBadgeProps> = ({
  category,
  isDisabled,
}) => {
  let content;

  if (category === OdhApplicationCategory.RedHatManaged) {
    content = 'Red Hat managed software is hosted on Red Hat’s OSD cluster';
  } else if (category === OdhApplicationCategory.PartnerManaged) {
    content = 'Partner managed software is hosted on the ISV’s cloud service';
  } else if (category === OdhApplicationCategory.SelfManaged) {
    content = `Self-managed software is installed to a ${ODH_PRODUCT_NAME} cluster, but does not support upgrade testing, alerting, or other features of externally managed software`;
  }

  if (!content) {
    return <span>{category}</span>;
  }

  return (
    <Tooltip content={content}>
      <Label className={isDisabled ? 'pf-m-disabled' : undefined} tabIndex={0} variant="outline">
        {category}
      </Label>
    </Tooltip>
  );
};

export default OdhExploreCardTypeBadge;
