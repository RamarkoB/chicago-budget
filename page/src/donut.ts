import * as d3 from 'npm:d3';

export type Slice = { label: string; value: number };

type DonutOptions = {
    title: string;
    selected?: string;
    onSelect?: (label: string) => void;
};

const formatDollars = (value: number) =>
    '$' + d3.format('.3s')(value).replace('G', 'B');
const formatPercent = d3.format('.1%');

// Sums rows into one slice per key, largest first.
export const sumSlices = <T>(
    rows: T[],
    key: (row: T) => string,
    value: (row: T) => number,
): Slice[] =>
    d3
        .rollups(rows, (group) => d3.sum(group, value), key)
        .map(([label, total]) => ({ label, value: total }))
        .filter((slice) => slice.value > 0)
        .sort((a, b) => b.value - a.value);

// A ring with dozens of thin slivers is unreadable, so keep the largest
// slices and fold the rest into a single "Other" slice.
export const groupSmallSlices = (slices: Slice[], maxSlices: number) => {
    if (slices.length <= maxSlices) return slices;

    const kept = slices.slice(0, maxSlices - 1);
    const rest = slices.slice(maxSlices - 1);
    return [
        ...kept,
        { label: `Other (${rest.length})`, value: d3.sum(rest, (s) => s.value) },
    ];
};

export const createDonut = (slices: Slice[], options: DonutOptions) => {
    const size = 280;
    const radius = size / 2;
    const thickness = 56;

    const total = d3.sum(slices, (d) => d.value);
    const isDimmed = (label: string) =>
        options.selected !== undefined && options.selected !== label;

    const color = d3
        .scaleOrdinal<string, string>()
        .domain(slices.map((d) => d.label))
        .range(d3.schemeTableau10);

    // sort(null) keeps the slices in the order given (largest first).
    const pie = d3
        .pie<Slice>()
        .value((d) => d.value)
        .sort(null);

    const arc = d3
        .arc<d3.PieArcDatum<Slice>>()
        .innerRadius(radius - thickness)
        .outerRadius(radius - 4)
        .padAngle(0.008);

    const figure = d3.create('figure').attr('class', 'donut');
    figure.append('figcaption').text(options.title);

    const svg = figure
        .append('svg')
        .attr('width', size)
        .attr('height', size)
        .attr('viewBox', [-radius, -radius, size, size]);

    const paths = svg
        .append('g')
        .selectAll('path')
        .data(pie(slices))
        .join('path')
        .attr('fill', (d) => color(d.data.label))
        .attr('opacity', (d) => (isDimmed(d.data.label) ? 0.3 : 1))
        .attr('d', arc);

    paths
        .append('title')
        .text(
            (d) =>
                `${d.data.label}\n${formatDollars(d.data.value)} (${formatPercent(d.data.value / total)})`,
        );

    // Total in the hole of the donut.
    const center = svg.append('text').attr('text-anchor', 'middle');
    center
        .append('tspan')
        .attr('x', 0)
        .attr('dy', '-0.1em')
        .attr('font-size', 24)
        .attr('font-weight', 'bold')
        .text(formatDollars(total));
    center
        .append('tspan')
        .attr('x', 0)
        .attr('dy', '1.5em')
        .attr('font-size', 12)
        .attr('fill', '#666')
        .text('total');

    const items = figure
        .append('ul')
        .attr('class', 'legend')
        .selectAll('li')
        .data(slices)
        .join('li')
        .classed('dimmed', (d) => isDimmed(d.label));
    items
        .append('span')
        .attr('class', 'swatch')
        .style('background', (d) => color(d.label));
    items.append('span').attr('class', 'label').text((d) => d.label);
    items
        .append('span')
        .attr('class', 'amount')
        .text((d) => `${formatDollars(d.value)} · ${formatPercent(d.value / total)}`);

    if (options.onSelect) {
        const select = (_: Event, d: { label: string } | d3.PieArcDatum<Slice>) =>
            options.onSelect?.('data' in d ? d.data.label : d.label);
        paths.style('cursor', 'pointer').on('click', select);
        items.style('cursor', 'pointer').on('click', select);
    }

    return figure.node();
};
