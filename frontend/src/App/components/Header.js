import React from "react";
import { Brand, PageHeader } from "@patternfly/react-core";

import odhLogo from "../../images/odh-logo.svg";

// export const Header = ({ isNavOpen, onNavToggle }) => {
export const Header = () => {
  return (
    <PageHeader
      className="header"
      logo={<Brand src={odhLogo} alt="ODH Logo" />}
      // showNavToggle
      // isNavOpen={isNavOpen}
      // onNavToggle={onNavToggle}
    />
  );
};
