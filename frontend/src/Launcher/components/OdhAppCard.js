import React from 'react';
import { Card, Button, CardBody, CardFooter,Brand,CardHeaderMain, CardHeader } from '@patternfly/react-core';

import { ExternalLinkSquareAltIcon } from '@patternfly/react-icons';
import '../../common/commonStyle.css'


/**
 * This function creates a Card using Props
 */
function OdhAppCard(props) {  

    return (
        <Card isHoverable className="cardItem">
        <CardHeader>
            <CardHeaderMain>
            <Brand src={props.img} alt={props.altName} className = "header"/>
            </CardHeaderMain>
    </CardHeader>  
    <CardBody>
    {props.description}
    </CardBody><br />
    <CardFooter>
    <Button component="a" variant="link" href={props.link} target="_blank" icon={<ExternalLinkSquareAltIcon />} iconPosition="right">
        {props.buttonName} 
    </Button>
    </CardFooter>
    </Card>
    )
};


export default OdhAppCard
