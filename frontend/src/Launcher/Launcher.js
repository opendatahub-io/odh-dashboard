import React, {useState, useEffect} from "react";
import { PageSection, PageSectionVariants, Grid, GridItem } from "@patternfly/react-core";
import OdhAppCard from "./components/OdhAppCard";
import { useFetch } from "./hooks";


function Launcher() {
  

  const [data, loading] = useFetch(
    "http://localhost:8080/api/getFile"
  );

  return (
    <PageSection variant={PageSectionVariants.light}>
      <Grid hasGutter className="gridItem">
        {data.map((a) => (
          <GridItem span={12} sm={12} md={6} lg={4} xl={3} key={a.altName}>
            <OdhAppCard 
              img={a.img}
              link={a.link}
              description={a.description}
              buttonName={a.buttonName}
              altName={a.altName}
            />
          </GridItem>
        ))}
      </Grid>  
    </PageSection>
  );
}

export default Launcher;
