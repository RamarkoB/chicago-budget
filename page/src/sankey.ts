// import * as d3Sankey from 'npm:d3-sankey';

// const nodes = [{ id: 'Alice' }, { id: 'Bob' }, { id: 'Carol' }];
// const links = [
//     { source: 0, target: 1 }, // Alice → Bob
//     { source: 1, target: 2 }, // Bob → Carol
// ];

const graphSankey = () => {
    // const sankeyContainer = document.getElementById('sankey');
    // if (!sankeyContainer) return;
    // const sankey = d3Sankey
    //     .sankey()
    //     .nodeId((d) => d.id) // Unique identifier for each node
    //     .nodeWidth(15) // Width of the node rectangles
    //     .nodePadding(10); // Space between nodes in a column
    // // .size([width, height]); // Total dimensions [width, height]
    // sankeyContainer
    //     .append('g')
    //     .selectAll('path')
    //     .data(links)
    //     .join('path')
    //     .attr('d', d3Sankey.sankeyLinkHorizontal())
    //     .attr('stroke-width', (d) => Math.max(1, d.width));
    // // Draw nodes
    // sankeyContainer
    //     .append('g')
    //     .selectAll('rect')
    //     .data(nodes)
    //     .join('rect')
    //     .attr('x', (d) => d.x0)
    //     .attr('y', (d) => d.y0)
    //     .attr('width', (d) => d.x1 - d.x0)
    //     .attr('height', (d) => d.y1 - d.y0);
};

export { graphSankey };
