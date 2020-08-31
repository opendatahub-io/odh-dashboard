import React, { useState } from "react";
import {
  PageSection,
  PageSectionVariants,
  Gallery,
  TextContent,
  Text,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SelectOption,
  Select,
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  Spinner,
  Title,
  EmptyStateBody,
  Button,
} from "@patternfly/react-core";
import OdhAppCard from "./OdhAppCard";
import "./Launcher.scss";
import { connect } from "react-redux";
import { TimesCircleIcon, QuestionCircleIcon, WarningTriangleIcon } from "@patternfly/react-icons";

const filterOptions = [
  { value: "Show Enabled", disabled: false },
  { value: "Show All", disabled: false },
];

const _Launcher = ({ components, componentsLoading, componentsError }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filter, setFilter] = useState("Show Enabled");

  const onToolbarDropdownToggle = (value) => {
    setIsFilterOpen(!isFilterOpen);
  };

  const onFilterSelect = (event, selection) => {
    setFilter(selection);
    setIsFilterOpen(false);
  };

  const buildFilterDropdown = () => {
    const filterDropdownItems = filterOptions.map((option, index) => (
      <SelectOption key={index} value={option.value} isDisabled={option.disabled} />
    ));

    return (
      <Select
        aria-label="Products"
        onToggle={onToolbarDropdownToggle}
        onSelect={onFilterSelect}
        selections={filter}
        isOpen={isFilterOpen}
      >
        {filterDropdownItems}
      </Select>
    );
  };

  const buildComponentList = () => {
    if (componentsError) {
      return (
        <PageSection className="launcher-error">
          <EmptyState variant={EmptyStateVariant.full}>
            <EmptyStateIcon icon={WarningTriangleIcon} />
            <Title headingLevel="h5" size="lg">
              Error loading components
            </Title>
            <EmptyStateBody className="launcher-error-body">
              <div>
                <code className="display-error">{JSON.stringify(componentsError, null, 2)}</code>
              </div>
            </EmptyStateBody>
          </EmptyState>
        </PageSection>
      );
    }

    if (componentsLoading) {
      return (
        <PageSection className="launcher-loading">
          <EmptyState variant={EmptyStateVariant.full}>
            <Spinner size="xl" />
            <Title headingLevel="h5" size="lg">
              Loading
            </Title>
          </EmptyState>
        </PageSection>
      );
    }

    let filteredComponents;
    if (!components) {
      filteredComponents = [];
    } else if (filter === "Show All") {
      filteredComponents = components.map((c) => <OdhAppCard key={c.key} odhApp={c} />);
    } else {
      filteredComponents = components
        .filter((a) => a && a.enabled)
        .map((c) => <OdhAppCard key={c.key} odhApp={c} />);
    }

    if (!filteredComponents || filteredComponents.length === 0) {
      let actions = null;
      if (filter !== "Show All" && components && components.length > 0) {
        actions = (
          <>
            <EmptyStateBody>Try removing all filters</EmptyStateBody>
            <Button variant="primary" onClick={() => setFilter("Show All")}>
              <TimesCircleIcon /> Clear Filters
            </Button>
          </>
        );
      }

      return (
        <PageSection>
          <EmptyState variant={EmptyStateVariant.full}>
            <EmptyStateIcon icon={QuestionCircleIcon} />

            <Title headingLevel="h5" size="lg">
              No Components Found
            </Title>
            {actions}
          </EmptyState>
        </PageSection>
      );
    }

    return (
      <PageSection className="launcher-gallery">
        <Gallery hasGutter>{filteredComponents}</Gallery>
      </PageSection>
    );
  };

  return (
    <>
      <PageSection className="launcher-heading" variant={PageSectionVariants.light}>
        <TextContent className="launcher-text">
          <Text component="h1">Applications</Text>
          <Text component="h3">Welcome to Open Data Hub.</Text>
          <Text component="p">
            Open Data Hub is an open source project based on Kubeflow that provides open source AI
            tools for running large and distributed AI workloads on OpenShift Container Platform.
            Currently, the Open Data Hub project provides open source tools for data storage,
            distributed AI and Machine Learning (ML) workflows, Jupyter Notebook development
            environment and monitoring.
          </Text>
          <Text component="p">
            Open Data Hub includes several open source components, which can be individially
            enabled. Several have their own UIs which you can launch from this page. Click on an
            Open Data Hub component application to launch the UI or take you to the documentation to
            find out more.
          </Text>
        </TextContent>
        <Toolbar id="toolbar-group-types" clearAllFilters={() => {}}>
          <ToolbarContent>
            <ToolbarItem>{buildFilterDropdown()}</ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>
      {buildComponentList()}
    </>
  );
};

const mapStateToProps = (state) => {
  return state.appReducer;
};

const mapDispatchToProps = (dispatch) => ({});

export const Launcher = connect(mapStateToProps, mapDispatchToProps)(_Launcher);
export default Launcher;
