import React from "react";
import { PageSection, PageSectionVariants, Grid, GridItem } from "@patternfly/react-core";
import OdhAppCard from "./OdhAppCard";
import "./Launcher.scss";
import { connect } from "react-redux";

const _Launcher = ({ components }) => {
  return (
    <PageSection variant={PageSectionVariants.light} className="launcher">
      <Grid hasGutter className="gridItem">
        {components.map((a) => (
          <GridItem span={12} sm={12} md={6} lg={4} xl={3} key={a.label}>
            <OdhAppCard
              img={a.img}
              link={a.link}
              description={a.description}
              buttonName={a.buttonName}
              altName={a.label}
              status={a.enabled}
            />
          </GridItem>
        ))}
      </Grid>
    </PageSection>
  );
};

const mapStateToProps = (state) => {
  return state.appReducer;
};

const mapDispatchToProps = (dispatch) => ({});

export const Launcher = connect(mapStateToProps, mapDispatchToProps)(_Launcher);
export default Launcher;
