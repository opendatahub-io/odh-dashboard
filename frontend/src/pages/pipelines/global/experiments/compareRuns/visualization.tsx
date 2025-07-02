import React from 'react';
// TODO: Install react-plotly.js and @types/react-plotly.js dependencies
import Plot from 'react-plotly.js';

const mockdata = [
  {
    items: [
      {
        artifactType: 'parameter',
        createTimeSinceEpoch: '1751391079042',
        customProperties: {},
        id: '142',
        lastUpdateTimeSinceEpoch: '1751391079042',
        name: 'max_iter',
        parameterType: 'string',
        value: '1000',
      },
      {
        artifactType: 'parameter',
        createTimeSinceEpoch: '1751391079323',
        customProperties: {},
        id: '144',
        lastUpdateTimeSinceEpoch: '1751391079323',
        name: 'random_state',
        parameterType: 'string',
        value: '200',
      },
      {
        artifactType: 'metric',
        createTimeSinceEpoch: '1751391079595',
        customProperties: {},
        id: '145',
        lastUpdateTimeSinceEpoch: '1751391081781',
        name: 'accuracy',
        step: 0,
        timestamp: '1751391079463',
        value: 1,
      },
      {
        artifactType: 'metric',
        createTimeSinceEpoch: '1751391080012',
        customProperties: {},
        id: '147',
        lastUpdateTimeSinceEpoch: '1751391082006',
        name: 'precision',
        step: 0,
        timestamp: '1751391079869',
        value: 1,
      },
    ],
  },
  {
    items: [
      {
        artifactType: 'parameter',
        createTimeSinceEpoch: '1751391079042',
        customProperties: {},
        id: '142',
        lastUpdateTimeSinceEpoch: '1751391079042',
        name: 'max_iter',
        parameterType: 'string',
        value: '2000',
      },
      {
        artifactType: 'parameter',
        createTimeSinceEpoch: '1751391079323',
        customProperties: {},
        id: '144',
        lastUpdateTimeSinceEpoch: '1751391079323',
        name: 'random_state',
        parameterType: 'string',
        value: '300',
      },
      {
        artifactType: 'metric',
        createTimeSinceEpoch: '1751391079595',
        customProperties: {},
        id: '145',
        lastUpdateTimeSinceEpoch: '1751391081781',
        name: 'accuracy',
        step: 0,
        timestamp: '1751391079463',
        value: 1,
      },
      {
        artifactType: 'metric',
        createTimeSinceEpoch: '1751391080012',
        customProperties: {},
        id: '147',
        lastUpdateTimeSinceEpoch: '1751391082006',
        name: 'precision',
        step: 0,
        timestamp: '1751391079869',
        value: 1,
      },
    ],
  },
];

// Transform mockdata into dimensions format for parallel coordinates plot
const transformMockDataToDimensions = (data: typeof mockdata) => {
  // Get all unique parameter/metric names
  const uniqueNames = new Set<string>();
  data.forEach((run) => {
    run.items.forEach((item) => {
      uniqueNames.add(item.name);
    });
  });

  // Create dimensions array
  return Array.from(uniqueNames).map((name) => {
    const values: number[] = [];

    data.forEach((run) => {
      const item = run.items.find((i) => i.name === name);
      if (item) {
        // For parameters, convert string value to number
        if (item.artifactType === 'parameter' && 'value' in item) {
          values.push(parseFloat(String(item.value)) || 0);
        }
        // For metrics, use the value directly
        else if (item.artifactType === 'metric' && 'value' in item) {
          values.push(Number(item.value));
        }
      } else {
        // If this run doesn't have this parameter/metric, use 0 or handle as needed
        values.push(0);
      }
    });

    return {
      label: name,
      values,
    };
  });
};

export const Visualization: React.FunctionComponent = () => {
  const transformedData = transformMockDataToDimensions(mockdata);

  return (
    <div>
      <h3>Parallel Coordinates Plot Data</h3>
      <Plot
        data={[
          {
            type: 'parcoords',
            line: {
              showscale: true,
              reversescale: true,
              colorscale: 'Jet',
              cmin: -4000,
              cmax: -100,
              //color: ['red', 'blue'],
            },
            dimensions: transformedData,
          },
        ]}
        layout={{ width: 520, height: 540, title: { text: 'Parallel Coordinates Plot' } }}
      />
    </div>
  );
};

// Expected output format:
// dimensions: [
//   {
//     label: 'max_iter',
//     values: [1000, 2000],
//   },
//   {
//     label: 'random_state',
//     values: [200, 300],
//   },
//   {
//     label: 'accuracy',
//     values: [1, 1],
//   },
//   {
//     label: 'precision',
//     values: [1, 1],
//   },
// ]
