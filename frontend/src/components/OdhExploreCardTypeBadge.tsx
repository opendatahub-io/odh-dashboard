import * as React from 'react';
import { Tooltip } from '@patternfly/react-core';
import { OdhApplicationCategory } from '../types';

type OdhExploreCardTypeBadgeProps = {
  category: OdhApplicationCategory;
};

const OdhExploreCardTypeBadge: React.FC<OdhExploreCardTypeBadgeProps> = ({ category }) => {
  let content;

  if (category === OdhApplicationCategory.RedHatManaged) {
    content = 'Red Hat managed software is hosted on Red Hat’s OSD cluster';
  } else if (category === OdhApplicationCategory.PartnerManaged) {
    content = 'Partner managed software is hosted on the ISV’s cloud service';
  } else if (category === OdhApplicationCategory.SelfManaged) {
    content =
      'Self-managed software is installed to a RHODS cluster, but does not support upgrade testing, alerting, or other features of externally managed software';
  } else {
    return category;
  }

  return (
    <Tooltip content={content} removeFindDomNode>
      <span>{category}</span>
    </Tooltip>
  );
};

export default OdhExploreCardTypeBadge;
