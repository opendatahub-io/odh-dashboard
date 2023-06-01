import React from 'react';
import { ExpandableSection } from '@patternfly/react-core';
import TrustyChart from '~/pages/modelServing/screens/metrics/bias/TrustyChart';

type BiasMetricChartWrapperProps = {
  children: React.ReactElement<typeof TrustyChart>;
  name: string;
};

//TODO
// * Format title properly
const BiasMetricsChartWrapper: React.FC<BiasMetricChartWrapperProps> = ({ children, name }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const onToggle = (isExpanded: boolean) => {
    setIsExpanded(isExpanded);
  };

  return (
    <ExpandableSection toggleContent={<h2>{name}</h2>} onToggle={onToggle} isExpanded={isExpanded}>
      {children}
    </ExpandableSection>
  );
};

export default BiasMetricsChartWrapper;

/*

import React from 'react';
import { Select, SelectOption, SelectVariant, Divider } from '@patternfly/react-core';

class MultiTypeaheadSelectInputCustomObjects extends React.Component {
  constructor(props) {
    super(props);
    this.createState = (name, abbreviation, capital, founded) => {
      return {
        name: name,
        abbreviation: abbreviation,
        capital: capital,
        founded: founded,
        toString: function() {
          return `${this.name} (${this.abbreviation}) - Founded: ${this.founded}`;
        },
        compareTo: function(value) {
          return this.toString()
            .toLowerCase()
            .includes(value.toString().toLowerCase());
        }
      };
    };
    this.options = [
      <SelectOption key={0} value={this.createState('Alabama', 'AL', 'Montgomery', 1846)} />,
      <Divider component="li" key={111} />,
      <SelectOption key={1} value={this.createState('Florida', 'FL', 'Tailahassee', 1845)} />,
      <SelectOption key={2} value={this.createState('New Jersey', 'NJ', 'Trenton', 1787)} />,
      <SelectOption key={3} value={this.createState('New Mexico', 'NM', 'Santa Fe', 1912)} />,
      <SelectOption key={4} value={this.createState('New York', 'NY', 'Albany', 1788)} />,
      <SelectOption key={5} value={this.createState('North Carolina', 'NC', 'Raleigh', 1789)} />
    ];

    this.state = {
      isOpen: false,
      selected: []
    };

    this.onToggle = isOpen => {
      this.setState({
        isOpen
      });
    };

    this.onSelect = (event, selection) => {
      const { selected } = this.state;
      if (selected.includes(selection)) {
        this.setState(
          prevState => ({ selected: prevState.selected.filter(item => item !== selection) }),
          () => console.log('selections: ', this.state.selected)
        );
      } else {
        this.setState(
          prevState => ({ selected: [...prevState.selected, selection] }),
          () => console.log('selections: ', this.state.selected)
        );
      }
    };

    this.clearSelection = () => {
      this.setState({
        selected: [],
        isOpen: false
      });
    };
  }

  render() {
    const { isOpen, selected } = this.state;
    const titleId = 'multi-typeahead-select-id-2';

    return (
      <div>
        <span id={titleId} hidden>
          Select a state
        </span>
        <Select
          variant={SelectVariant.typeaheadMulti}
          typeAheadAriaLabel="Select a state"
          onToggle={this.onToggle}
          onSelect={this.onSelect}
          onClear={this.clearSelection}
          onFilter={this.customFilter}
          selections={selected}
          isOpen={isOpen}
          aria-labelledby={titleId}
          placeholderText="Select a state"
        >
          {this.options}
        </Select>
      </div>
    );
  }
}
 */
