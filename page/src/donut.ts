import * as d3 from 'npm:d3';

export type Slice = { label: string; value: number };

// Colorblind-checked categorical palette, used in this fixed order.
export const palette = [
    '#2a78d6',
    '#eb6834',
    '#1baf7a',
    '#eda100',
    '#e87ba4',
    '#008300',
    '#4a3aa7',
    '#e34948',
];
export const otherColor = '#a3a29c';

// Colors follow the entity, not its rank, so a category keeps its color
// when the year changes.
export const colorScale = (labels: string[]) => {
    const scale = d3.scaleOrdinal<string, string>().domain(labels).range(palette);
    return (label: string) =>
        label.startsWith('Other') ? otherColor : scale(label);
};

type ChartOptions = {
    title: string;
    subtitle?: string;
    colorOf: (label: string) => string;
};

type DonutOptions = ChartOptions & {
    selected?: string;
    onSelect?: (label: string) => void;
};

export const formatDollars = (value: number) =>
    '$' + d3.format('.3s')(value).replace('G', 'B');
const formatPercent = (value: number) =>
    value < 0.001 ? '<0.1%' : d3.format('.1%')(value);

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

const createCard = (options: ChartOptions) => {
    const card = d3.create('figure').attr('class', 'card');
    const caption = card.append('figcaption');
    caption.append('h3').text(options.title);
    if (options.subtitle) caption.append('p').text(options.subtitle);
    return card;
};

const appendLegend = (
    card: d3.Selection<HTMLElement, undefined, null, undefined>,
    slices: Slice[],
    total: number,
    options: DonutOptions,
) => {
    const items = card
        .append('ul')
        .attr('class', 'legend')
        .selectAll('li')
        .data(slices)
        .join('li')
        .classed('selected', (d) => d.label === options.selected);
    items
        .append('span')
        .attr('class', 'swatch')
        .style('background', (d) => options.colorOf(d.label));
    items.append('span').attr('class', 'label').text((d) => d.label);
    items.append('span').attr('class', 'amount').text((d) => formatDollars(d.value));
    items
        .append('span')
        .attr('class', 'percent')
        .text((d) => formatPercent(d.value / total));
    return items;
};

export const createDonut = (slices: Slice[], options: DonutOptions) => {
    const size = 260;
    const radius = size / 2;
    const pop = 8;
    const outer = radius - pop;
    const inner = outer - 44;

    const total = d3.sum(slices, (d) => d.value);
    const isSelected = (label: string) => label === options.selected;

    // sort(null) keeps the slices in the order given (largest first).
    const pie = d3
        .pie<Slice>()
        .value((d) => d.value)
        .sort(null);
    const arc = d3
        .arc<d3.PieArcDatum<Slice>>()
        .innerRadius(inner)
        .outerRadius((d) => (isSelected(d.data.label) ? outer + pop : outer))
        .cornerRadius(3)
        .padAngle(0.012);

    const card = createCard(options);
    const svg = card
        .append('svg')
        .attr('class', 'donut')
        .attr('viewBox', [-radius, -radius, size, size])
        .attr('role', 'img')
        .attr('aria-label', options.title);

    const paths = svg
        .append('g')
        .selectAll('path')
        .data(pie(slices))
        .join('path')
        .attr('fill', (d) => options.colorOf(d.data.label))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .attr('d', arc);

    // The hole shows the total, or whichever slice is being pointed at.
    const center = svg.append('text').attr('text-anchor', 'middle');
    const centerLabel = center
        .append('tspan')
        .attr('class', 'center-label')
        .attr('x', 0)
        .attr('dy', '-1.3em');
    const centerValue = center
        .append('tspan')
        .attr('class', 'center-value')
        .attr('x', 0)
        .attr('dy', '1.25em');
    const centerPercent = center
        .append('tspan')
        .attr('class', 'center-label')
        .attr('x', 0)
        .attr('dy', '1.6em');

    const showCenter = (slice?: Slice) => {
        const label = slice?.label ?? 'Total';
        centerLabel.text(label.length > 24 ? label.slice(0, 23) + '…' : label);
        centerValue.text(formatDollars(slice?.value ?? total));
        centerPercent.text(slice ? `${formatPercent(slice.value / total)} of total` : '');
    };
    showCenter();

    const items = appendLegend(card, slices, total, options);

    const highlight = (label?: string) => {
        paths.attr('opacity', (d) => (!label || d.data.label === label ? 1 : 0.35));
        items.classed('hovered', (d) => d.label === label);
        showCenter(slices.find((s) => s.label === label));
    };
    paths
        .on('mouseenter focus', (_, d) => highlight(d.data.label))
        .on('mouseleave blur', () => highlight());
    items
        .on('mouseenter', (_, d) => highlight(d.label))
        .on('mouseleave', () => highlight());

    const onSelect = options.onSelect;
    if (onSelect) {
        card.classed('clickable', true);
        paths
            .attr('tabindex', 0)
            .attr('role', 'button')
            .attr('aria-label', (d) => `${d.data.label}, ${formatDollars(d.data.value)}`)
            .on('click', (_, d) => onSelect(d.data.label))
            .on('keydown', (event: KeyboardEvent, d) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(d.data.label);
                }
            });
        items.on('click', (_, d) => onSelect(d.label));
    }

    return card.node();
};

// A 2-3 way split reads better as one bar than as a donut.
export const createShareBar = (slices: Slice[], options: ChartOptions) => {
    const total = d3.sum(slices, (d) => d.value);
    const card = createCard(options);

    const bar = card.append('div').attr('class', 'share-bar');
    bar.selectAll('div')
        .data(slices)
        .join('div')
        .attr('class', 'share-segment')
        .style('flex-grow', (d) => d.value)
        .style('background', (d) => options.colorOf(d.label))
        .attr('title', (d) => `${d.label}: ${formatDollars(d.value)} (${formatPercent(d.value / total)})`);

    appendLegend(card, slices, total, options);
    return card.node();
};
