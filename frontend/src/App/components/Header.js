import React from "react";
import { PageHeader, Brand } from "@patternfly/react-core";
import odhLogo from "../../images/odh-logo.svg";

/**
 * It provides Page Header on top of the page
 */
export const Header = (
  <PageHeader logo={<Brand src={odhLogo} alt="ODH Logo" className="header" />} />
);
export default Header;
