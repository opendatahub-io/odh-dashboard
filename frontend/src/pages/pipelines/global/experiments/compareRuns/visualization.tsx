import React from 'react';
import Plot from 'react-plotly.js';

export const Visualization: React.FunctionComponent = () => (
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
          //color: unpack(rows, 'colorVal'),
        },

        dimensions: [
          {
            //constraintrange: [100000, 150000],
            //range: [32000, 227900],
            label: 'Block height',
            values: [3, 20, 10],
          },
          {
            //range: [0, 700000],
            label: 'Block width',
            values: [4, 7, 8],
          },
          {
            label: 'Cylinder material',
            values: [7, 8, 9],
          },
        ],
      },
    ]}
    layout={{ width: 520, height: 540, title: { text: 'A Fancy Plot' } }}
  />
);
