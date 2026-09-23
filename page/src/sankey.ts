import * as d3 from 'npm:d3';
// @deno-types="npm:@types/d3-sankey@^0.12.5"
import {
    sankey,
    sankeyJustify,
    sankeyLinkHorizontal,
    type SankeyLink,
    type SankeyNode,
} from 'npm:d3-sankey@0.12.3';
import { formatDollars, palette } from './donut.ts';

export type RevenueRow = {
    fundCode: string;
    groupType: string;
    category: string;
    source: string;
    amount: number;
};

export type AppropriationRow = {
    functionalCategory: string;
    appropriationAccount: string;
    fundType: string;
    fundCode: string;
    amount: number;
};

type Flow = { source: string; target: string; value: number };

// Left column. Order is also the color order.
const sourceGroups = [
    'Property taxes',
    'City taxes',
    'Sales tax & State shares',
    'Airport, water & sewer charges',
    'Fees, fines & other',
    'Federal & state grants',
    'Reimbursed by other City funds',
    'Borrowing & leftover cash',
];

const pensionFunds = new Set(['0681', '0682', '0683', '0684']);

// Accounts 9980-9987: payments from other City funds into the pension funds.
// The pension funds list the same dollars as "Pension Allocation" /
// "Advance Pension Payment" revenue, so they are drawn as one fund-to-fund
// link instead of being counted twice.
const isPensionTransfer = (account: string) => /^998[0-7]$/.test(account);
const isPensionTransferRevenue = (source: string) =>
    /Pension Allocation|Advance Pension Payment|Pension Residual/.test(source);

const fundGroup = (fundCode: string, fundType: string) => {
    if (fundType !== 'LOCAL') return 'Grant funds';
    if (fundCode === '0100') return 'Corporate Fund';
    if (fundCode === '0740' || fundCode === '0610') return 'Airport funds';
    if (fundCode === '0200' || fundCode === '0314') return 'Water & sewer funds';
    if (pensionFunds.has(fundCode)) return 'Pension funds';
    if (fundCode === '0510') return 'Bond Redemption Fund';
    return 'Other City funds';
};

const cityTaxSources = new Set([
    'Water and Sewer Utility Tax',
    'Telephone Surcharge',
    'Vehicle Tax',
    'Real Property Transfer',
    "Hotel Operators' Occupation Tax",
    'Hotel Tax Surcharge',
    'Social Media Amusement Tax',
    'Foreign Fire Insurance Tax',
    'Cannabis Tax',
    'Casino Public Safety Pension Fund',
]);

const revenueGroup = (row: RevenueRow) => {
    if (row.source === 'Proceeds of Debt') return 'Borrowing & leftover cash';
    if (/Property Tax Levy/.test(row.source)) return 'Property taxes';

    if (row.fundCode === '0100') {
        if (row.groupType === 'Local Tax') return 'City taxes';
        if (row.groupType === 'Intergovernmental Revenue')
            return 'Sales tax & State shares';
        if (row.source === 'Sales Tax Securitization Corporation Residual')
            return 'Sales tax & State shares';
        if (row.category === 'Internal Service Earnings')
            return 'Reimbursed by other City funds';
        return 'Fees, fines & other';
    }

    if (['Total From Rates and Charges', 'Water Rates', 'Sewer Rates'].includes(row.source))
        return 'Airport, water & sewer charges';
    if (cityTaxSources.has(row.source)) return 'City taxes';
    if (row.source === 'Distributive Share of State Motor Fuel Tax')
        return 'Sales tax & State shares';
    if (row.source === 'Corporate Fund Subsidy' || row.source === 'Transfers In')
        return 'Reimbursed by other City funds';
    return 'Fees, fines & other';
};

// Rows can be negative (credits such as account 9646), so sum first and
// drop non-positive totals only at the end.
const addFlow = (flows: Map<string, Flow>, source: string, target: string, value: number) => {
    const key = `${source}\u0000${target}`;
    const flow = flows.get(key) ?? { source, target, value: 0 };
    flow.value += value;
    flows.set(key, flow);
};

export const buildFlows = (revenue: RevenueRow[], appropriations: AppropriationRow[]) => {
    const flows = new Map<string, Flow>();

    // Money in: revenue source group -> fund group.
    for (const row of revenue) {
        if (isPensionTransferRevenue(row.source)) continue;
        addFlow(flows, revenueGroup(row), fundGroup(row.fundCode, 'LOCAL'), row.amount);
    }

    // A fund that plans to spend more than its new revenue is using money
    // left over from last year (the ordinance's "prior year fund balance").
    const revenueByFund = d3.rollup(revenue, (g) => d3.sum(g, (r) => r.amount), (r) => r.fundCode);
    const localSpendByFund = d3.rollup(
        appropriations.filter((row) => row.fundType === 'LOCAL'),
        (g) => d3.sum(g, (r) => r.amount),
        (r) => r.fundCode,
    );
    for (const [fundCode, spend] of localSpendByFund) {
        const leftover = spend - (revenueByFund.get(fundCode) ?? 0);
        if (leftover > 0) addFlow(flows, 'Borrowing & leftover cash', fundGroup(fundCode, 'LOCAL'), leftover);
    }

    // Money out: fund group -> spending category, except pension transfers,
    // which go fund group -> pension funds.
    for (const row of appropriations) {
        const from = fundGroup(row.fundCode, row.fundType);
        if (row.fundType !== 'LOCAL') addFlow(flows, 'Federal & state grants', from, row.amount);
        const to = isPensionTransfer(row.appropriationAccount) ? 'Pension funds' : row.functionalCategory;
        addFlow(flows, from, to, row.amount);
    }

    return [...flows.values()].filter((flow) => flow.value > 0);
};

type Node = { name: string };
type Link = { source: string; target: string; value: number };

export const createSankey = (flows: Flow[], year: number) => {
    const width = 1000;
    const height = 620;

    const names = [...new Set(flows.flatMap((f) => [f.source, f.target]))];
    const layout = sankey<Node, Link>()
        .nodeId((d) => d.name)
        .nodeAlign(sankeyJustify)
        .nodeWidth(14)
        .nodePadding(14)
        .extent([
            [1, 8],
            [width - 1, height - 8],
        ]);
    const { nodes, links } = layout({
        nodes: names.map((name) => ({ name })),
        links: flows.map((f) => ({ ...f })),
    });

    const total = d3.sum(nodes.filter((n) => n.depth === 0), (n) => n.value ?? 0);
    const sourceColor = (name: string) => {
        const i = sourceGroups.indexOf(name);
        return i >= 0 ? palette[i] : '#6f6e69';
    };
    // Every link keeps the color of the money's left-column source when
    // there is exactly one; mixed downstream links go neutral.
    const linkColor = (link: SankeyLink<Node, Link>) => {
        const source = link.source as SankeyNode<Node, Link>;
        return source.depth === 0 ? sourceColor(source.name) : '#a3a29c';
    };
    const describe = (label: string, value: number) =>
        `${label}\n${formatDollars(value)} (${d3.format('.1%')(value / total)} of ${formatDollars(total)})`;

    const figure = d3.create('figure').attr('class', 'card sankey-card');
    const caption = figure.append('figcaption');
    caption.append('h3').text(`Money in, money out: ${year}`);
    caption
        .append('p')
        .text(
            `Where the ${formatDollars(total)} comes from, which City fund it goes into, and what it's spent on. Pension money one fund pays another is drawn once, as a link into Pension funds. Hover a stream for amounts.`,
        );

    const scroller = figure.append('div').attr('class', 'sankey-scroll');
    const svg = scroller
        .append('svg')
        .attr('viewBox', [0, 0, width, height])
        .attr('class', 'sankey')
        .attr('role', 'img')
        .attr('aria-label', `Sankey diagram of the ${year} Chicago budget`);

    const linkPaths = svg
        .append('g')
        .attr('fill', 'none')
        .selectAll('path')
        .data(links)
        .join('path')
        .attr('d', sankeyLinkHorizontal())
        .attr('stroke', linkColor)
        .attr('stroke-opacity', 0.4)
        .attr('stroke-width', (d) => Math.max(1, d.width ?? 1));
    linkPaths
        .append('title')
        .text((d) =>
            describe(
                `${(d.source as SankeyNode<Node, Link>).name} → ${(d.target as SankeyNode<Node, Link>).name}`,
                d.value,
            ),
        );

    const nodeRects = svg
        .append('g')
        .selectAll('rect')
        .data(nodes)
        .join('rect')
        .attr('x', (d) => d.x0 ?? 0)
        .attr('y', (d) => d.y0 ?? 0)
        .attr('height', (d) => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
        .attr('width', (d) => (d.x1 ?? 0) - (d.x0 ?? 0))
        .attr('rx', 2)
        .attr('fill', (d) => sourceColor(d.name));
    nodeRects.append('title').text((d) => describe(d.name, d.value ?? 0));

    // Highlight every stream touching the hovered node.
    const highlight = (node?: SankeyNode<Node, Link>) =>
        linkPaths.attr('stroke-opacity', (l) =>
            !node || l.source === node || l.target === node ? 0.55 : 0.08,
        );
    nodeRects.on('mouseenter', (_, d) => highlight(d)).on('mouseleave', () => highlight());
    linkPaths
        .on('mouseenter', function () {
            d3.select(this).attr('stroke-opacity', 0.7);
        })
        .on('mouseleave', function () {
            d3.select(this).attr('stroke-opacity', 0.4);
        });

    const labels = svg
        .append('g')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .attr('class', 'sankey-label')
        .attr('x', (d) => ((d.x0 ?? 0) < width / 2 ? (d.x1 ?? 0) + 6 : (d.x0 ?? 0) - 6))
        .attr('y', (d) => ((d.y1 ?? 0) + (d.y0 ?? 0)) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', (d) => ((d.x0 ?? 0) < width / 2 ? 'start' : 'end'));
    labels.append('tspan').attr('font-weight', 600).text((d) => d.name);
    labels
        .append('tspan')
        .attr('fill', '#52514e')
        .text((d) => `  ${formatDollars(d.value ?? 0)}`);

    return figure.node();
};
