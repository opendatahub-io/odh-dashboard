import React from "react";
import {
  Card,
  Button,
  CardBody,
  CardFooter,
  Brand,
  CardHeaderMain,
  CardHeader,
} from "@patternfly/react-core";

import { ExternalLinkSquareAltIcon } from "@patternfly/react-icons";

/**
 * This function creates a Card using Props
 */
function OdhAppCard(props) {
  return (
    <Card isHoverable className="cardItem" onClick={() => window.location.href = props.link}>
      <CardHeader className="cardHeader">
        <CardHeaderMain>
          <Brand src={props.img} alt={props.altName} className="cardImages" />
        </CardHeaderMain>
      </CardHeader>
      <CardBody className="card-description">{props.description}</CardBody>
      <br />
    </Card>
  );
}

export default OdhAppCard;
