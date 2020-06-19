import React from "react";
import { PageHeader, Brand } from "@patternfly/react-core";
import imgLogo from "./images/opendatahub.png";

/**
 * It provides Page Header on top of the page
 */
const Header = <PageHeader logo={<Brand src={imgLogo} alt="ODH Logo" className="header" />} />;

export default Header;
