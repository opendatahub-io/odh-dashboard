import React from 'react';
import { Select, SelectGroup, SelectOption, SelectVariant } from '@patternfly/react-core';
import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
import { BiasMetricConfig } from '~/concepts/explainability/types';

type BiasMetricConfigOption = {
  id: string;
  name: string;
  toString: () => string;
  compareTo: (x: BiasMetricConfigOption) => boolean;
};
const createOption = (biasMetricConfig: BiasMetricConfig): BiasMetricConfigOption => {
  const { id, name } = biasMetricConfig;
  return {
    id,
    name,
    toString: () => name,
    compareTo: (x) => x.id === id,
  };
};
const BiasMetricConfigSelector: React.FC = () => {
  const { biasMetricConfigs, loaded } = useExplainabilityModelData();

  // const [isDisabled, setIsDisabled] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<BiasMetricConfigOption[]>([]);

  const onSelect = (event, selection) => {
    if (selected.findIndex((x) => x.id === selection.id) < 0) {
      setSelected([...selected, selection]);
      // eslint-disable-next-line no-console
      console.log('New item selected: item: %O - selections: %O', selection, selected);
      // selected.find((x) => {});
      // if (selected.includes(selection)) {
      //   // eslint-disable-next-line no-console
      //   console.log('Already selected: selection: %O, selected: %O', selection, selected);
      // } else {
      //   //setSelected((prevState) => [...prevState, selection]);
      //   setSelected([...selected, selection]);
      //   // eslint-disable-next-line no-console
      //   console.log('New selection: %O, selected: %O', selection, selected);
    } else {
      // eslint-disable-next-line no-console
      console.log('Removing item: %O', selection);
      setSelected([...selected.filter((x) => x.id !== selection.id)]);
    }

    /*
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
     */
  };

  const titleId = 'bmcs';
  // const onSelect = _.noop;
  const onFilter = (x) => {
    // eslint-disable-next-line no-console
    console.log(x);
    return x;
  };

  return (
    <>
      <span id={titleId} hidden>
        Select something
      </span>
      <Select
        variant={SelectVariant.typeaheadMulti}
        typeAheadAriaLabel="Select a state"
        onToggle={() => setIsOpen(!isOpen)}
        onSelect={onSelect}
        onClear={() => {
          setSelected([]);
          setIsOpen(false);
        }}
        onFilter={onFilter}
        selections={selected}
        isOpen={isOpen}
        aria-labelledby={titleId}
        placeholderText="Select a state"
        isDisabled={!loaded}
        isGrouped={true}
      >
        <SelectGroup label="SPD" key="SPD">
          {biasMetricConfigs
            .filter((x) => x.metricType.toString() === 'SPD')
            .map((x) => (
              <SelectOption key={x.id} value={createOption(x)} />
            ))}
        </SelectGroup>
        <SelectGroup label="DIR" key="DIR">
          {biasMetricConfigs
            .filter((x) => x.metricType.toString() === 'DIR')
            .map((x) => (
              <SelectOption key={x.id} value={createOption(x)} />
            ))}
        </SelectGroup>
      </Select>
    </>
  );
};

// <SelectGroup label="SPD" key="SPD">
//   {biasMetricConfigs.filter((x) => x.metricType === MetricTypes.SPD).map()}
// </SelectGroup>
// <SelectGroup label="Status" key="group1">
//   <SelectOption key={0} value="Running" />
//   <SelectOption key={1} value="Stopped" />
//   <SelectOption key={2} value="Down" />
//   <SelectOption key={3} value="Degraded" />
//   <SelectOption key={4} value="Needs maintenance" />
// </SelectGroup>,

export default BiasMetricConfigSelector;

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
