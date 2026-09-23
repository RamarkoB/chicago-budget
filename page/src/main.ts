import * as d3 from 'npm:d3';
import {
    colorScale,
    createDonut,
    createShareBar,
    groupSmallSlices,
    sumSlices,
} from './donut.ts';
import { buildFlows, createSankey, type RevenueRow } from './sankey.ts';

type DataFileName = 'ordinance' | 'depts';
// | 'accounts'
// | 'categories'
// | 'fundCodes';

type DataOfFile<T extends DataFileName> =
    T extends 'ordinance' ? BudgetData : DeptData;

type BudgetData = {
    year: number;
    functionalCategory: string;
    departmentNumber: string;
    appropriationAccount: string;
    fundType: string;
    fundCode: string;
    amount: number;
};

type DeptData = {
    deptNumber: string;
    deptName: string;
};

const parseBudgetData =
    <T extends DataFileName>(fileName: T) =>
    (row: string): DataOfFile<T> => {
        const split = row.split(',');

        switch (fileName) {
            case 'ordinance':
                return {
                    year: Number(split[0]),
                    functionalCategory: split[1],
                    departmentNumber: split[2],
                    appropriationAccount: split[3],
                    fundType: split[4],
                    fundCode: split[5],
                    amount: Number(split[6]),
                } as DataOfFile<T>;

            case 'depts':
                return {
                    deptNumber: split[0],
                    deptName: split[1],
                } as DataOfFile<T>;
        }
    };

const importData = async <T extends DataFileName>(fileName: T) => {
    const response = await fetch(`./data/${fileName}.csv`);
    const textData = await response.text();
    return textData.split('\n').slice(1, -1).map(parseBudgetData(fileName));
};

const getUnique = <T extends keyof U, U extends DataOfFile<DataFileName>>(
    data: U[],
    key: T,
) => {
    const budgetYearSet = data.reduce<Set<U[typeof key]>>((acc, row) => {
        acc.add(row[key]);
        return acc;
    }, new Set());

    return [...budgetYearSet];
};

const createBudgetGraph = (budgetData: BudgetData[], years: number[]) => {
    // Declare the chart dimensions and margins.
    const width = 640;
    const height = 400;
    const marginTop = 20;
    const marginRight = 20;
    const marginBottom = 30;
    const marginLeft = 40;

    const budgets = years.flatMap((year) => {
        const { local, grants } = budgetData
            .filter((row) => row.year === year)
            .reduce(
                (acc, row) => {
                    if (row.fundType === 'LOCAL')
                        acc.local = acc.local + row.amount;
                    else acc.grants = acc.grants + row.amount;

                    return acc;
                },
                { local: 0, grants: 0 },
            );

        return { year, local, grants, total: local + grants };
    });

    const budgetsTidy = years.flatMap((year) => {
        const yearBudget = budgets.find((budgetRow) => budgetRow.year === year);
        return [
            { year, type: 'local', value: yearBudget?.local ?? 0 },
            { year, type: 'grants', value: yearBudget?.grants ?? 0 },
        ];
    });
    console.log(budgetsTidy);

    // Declare the x (horizontal position) scale.
    const x = d3
        .scaleLinear()
        .domain(d3.extent(years) as [number, number])
        .range([marginLeft, width - marginRight]);

    // Declare the y (vertical position) scale.
    const y = d3
        .scaleLinear()
        .domain([0, d3.max(budgets, (d) => d.total)] as [number, number])
        .range([height - marginBottom, marginTop]);

    const series = d3
        .stack()
        .keys(['local', 'grants'])
        .value(([, group], key) => group.get(key).value)(
        d3.index(
            budgetsTidy,
            (d) => d.year,
            (d) => d.type,
        ),
    );

    const color = d3
        .scaleOrdinal()
        .domain(series.map((d) => d.key))
        .range(d3.schemeTableau10);

    // Construct an area shape.
    const area = d3
        .area()
        .x((d) => x(d.data[0]))
        .y0((d) => y(d[0]))
        .y1((d) => y(d[1]));

    // Create the SVG container.
    const svg = d3.create('svg').attr('width', width).attr('height', height);

    // Add the x-axis.
    svg.append('g')
        .attr('transform', `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')));

    // Add the y-axis.
    svg.append('g')
        .attr('transform', `translate(${marginLeft},0)`)
        .call(
            d3
                .axisLeft(y)
                .tickFormat((s) => d3.format('.2s')(s).replace('G', 'B')),
        );

    svg.append('g')
        .selectAll()
        .data(series)
        .join('path')
        .attr('fill', (d) => color(d.key))
        .attr('d', area)
        .append('title')
        .text((d) => d.key);

    // Append the SVG element.
    return svg.node();
};

const graphBudget = (
    container: HTMLElement,
    budgetData: BudgetData[],
    options: { category: string; department: string },
) => {
    const data =
        options.category === 'All' && options.department === 'All' ? budgetData
        : options.category !== 'All' ?
            budgetData.filter(
                (row) => row.functionalCategory === options.category,
            )
        :   budgetData.filter(
                (row) => row.departmentNumber === options.department,
            );

    const years = getUnique(budgetData, 'year');
    const budgetNode = createBudgetGraph(data, years);
    if (!budgetNode) return;

    container.replaceChildren(budgetNode);
};

const fundTypeLabels: Record<string, string> = {
    LOCAL: 'Local funds',
    GRANTS: 'Grants',
    CDBG: 'Community Development Block Grant',
};

const graphDonuts = (
    container: HTMLElement,
    budgetData: BudgetData[],
    deptsData: DeptData[],
    options: { year: number; category?: string },
) => {
    const amount = (row: BudgetData) => row.amount;
    const deptNames = new Map(
        deptsData.map((dept) => [dept.deptNumber, dept.deptName]),
    );
    const deptName = (row: BudgetData) =>
        deptNames.get(row.departmentNumber) ?? `Dept ${row.departmentNumber}`;
    const fundTypeName = (row: BudgetData) =>
        fundTypeLabels[row.fundType] ?? row.fundType;

    // Colors are assigned from all-years totals so they stay put when the
    // year changes.
    const categoryColor = colorScale(
        sumSlices(budgetData, (row) => row.functionalCategory, amount).map(
            (slice) => slice.label,
        ),
    );
    const fundTypeColor = colorScale(Object.values(fundTypeLabels));

    const yearData = budgetData.filter((row) => row.year === options.year);
    const byCategory = sumSlices(yearData, (row) => row.functionalCategory, amount);
    const byFundType = sumSlices(yearData, fundTypeName, amount);
    if (byCategory.length === 0) return;

    // Open on the largest category that splits into more than one
    // department; General Financing is a single 100% ring.
    const departmentCount = (label: string) =>
        new Set(
            yearData
                .filter((row) => row.functionalCategory === label)
                .map((row) => row.departmentNumber),
        ).size;
    const category =
        options.category ??
        (byCategory.find((slice) => departmentCount(slice.label) > 1) ?? byCategory[0])
            .label;

    const inCategory = (row: BudgetData) => row.functionalCategory === category;
    const departmentColor = colorScale(
        sumSlices(budgetData.filter(inCategory), deptName, amount).map(
            (slice) => slice.label,
        ),
    );
    const byDepartment = groupSmallSlices(
        sumSlices(yearData.filter(inCategory), deptName, amount),
        6,
    );

    const categoryDonut = createDonut(byCategory, {
        title: 'Where the money goes',
        subtitle: `${options.year} budget by category. Click one to see its departments.`,
        colorOf: categoryColor,
        selected: category,
        onSelect: (label) =>
            graphDonuts(container, budgetData, deptsData, {
                year: options.year,
                category: label,
            }),
    });
    const departmentDonut = createDonut(byDepartment, {
        title: category,
        subtitle: `${options.year} budget by department.`,
        colorOf: departmentColor,
    });
    const fundTypeBar = createShareBar(byFundType, {
        title: 'What kind of money',
        subtitle: `${options.year} budget by fund type.`,
        colorOf: fundTypeColor,
    });
    if (!categoryDonut || !departmentDonut || !fundTypeBar) return;

    container.replaceChildren(categoryDonut, departmentDonut, fundTypeBar);
};

// Accounts 9980-9987 are the Corporate, O'Hare, Midway, Water, Sewer,
// Emergency Communication and Library funds paying into the City's four
// pension funds, which then appropriate the same dollars again. In 2026 they
// total $1,220,866,110, matching the "Pension Allocation" / "Advance Pension
// Payment" revenue lines of funds 0681-0684 in the FY2026 Annual
// Appropriation Ordinance. Part of its $1,700,089,446 "Transfers between
// Funds" deduction.
const pensionTransferAccounts = new Set([
    '9980',
    '9981',
    '9982',
    '9983',
    '9984',
    '9985',
    '9986',
    '9987',
]);

const withoutPensionTransfers = (budgetData: BudgetData[], exclude: boolean) =>
    exclude ?
        budgetData.filter(
            (row) => !pensionTransferAccounts.has(row.appropriationAccount),
        )
    :   budgetData;

// Budget Ordinance - Revenue on the Data Portal: 2024 rmi8-cugu,
// 2025 e5cq-t86i, 2026 nydj-5nax.
const revenueYears = [2026, 2025, 2024];

const importRevenue = async (year: number): Promise<RevenueRow[]> => {
    const response = await fetch(`./data/revenue-${year}.csv`);
    return d3.csvParse(await response.text(), (row) => ({
        fundCode: row.fund_code ?? '',
        groupType: row.revenue_group_type ?? '',
        category: row.revenue_category ?? '',
        source: row.revenue_source ?? '',
        amount: Number(row.estimated_revenue),
    }));
};

const graphSankey = async (
    container: HTMLElement,
    budgetData: BudgetData[],
    year: number,
) => {
    const revenue = await importRevenue(year);
    const appropriations = budgetData.filter((row) => row.year === year);
    const node = createSankey(buildFlows(revenue, appropriations), year);
    if (node) container.replaceChildren(node);
};

const appendOption = (
    categorySelector: HTMLElement,
    text: string,
    value: string,
) => {
    const option = document.createElement('option');
    option.innerText = text;
    option.value = value;
    categorySelector.append(option);
    return option;
};

const main = async () => {
    const allBudgetData = await importData('ordinance');
    const transferToggle = document.getElementById(
        'exclude-transfers',
    ) as HTMLInputElement | null;
    let budgetData = withoutPensionTransfers(
        allBudgetData,
        transferToggle?.checked ?? true,
    );
    const deptsData = await importData('depts');

    const categorySelector = document
        .getElementsByTagName('select')
        .namedItem('categories');
    const deptSelector = document
        .getElementsByTagName('select')
        .namedItem('departments');
    if (!categorySelector || !deptSelector) return;

    const container = document.getElementById('container');
    if (!container) return;

    const categories = getUnique(budgetData, 'functionalCategory');
    appendOption(categorySelector, 'All', 'All');
    categories.forEach((category) =>
        appendOption(categorySelector, category, category),
    );
    categorySelector.addEventListener('change', () => {
        const category = categorySelector?.value;
        graphBudget(container, budgetData, { category, department: 'All' });
        deptSelector.value = 'All';
    });

    appendOption(deptSelector, 'All', 'All');
    deptsData.forEach((dept) =>
        appendOption(
            deptSelector,
            `${dept.deptNumber} - ${dept.deptName}`,
            dept.deptNumber,
        ),
    );
    deptSelector.addEventListener('change', () => {
        const department = deptSelector?.value;
        graphBudget(container, budgetData, { category: 'All', department });
        categorySelector.value = 'All';
    });

    graphBudget(container, budgetData, { category: 'All', department: 'All' });

    const yearSelector = document
        .getElementsByTagName('select')
        .namedItem('years');
    const donutContainer = document.getElementById('donuts');
    if (!yearSelector || !donutContainer) return;

    const years = getUnique(budgetData, 'year').sort((a, b) => b - a);
    years.forEach((year) => appendOption(yearSelector, `${year}`, `${year}`));
    yearSelector.addEventListener('change', () =>
        graphDonuts(donutContainer, budgetData, deptsData, {
            year: Number(yearSelector.value),
        }),
    );

    graphDonuts(donutContainer, budgetData, deptsData, { year: years[0] });

    // Uses every row: the Sankey draws pension transfers as their own link.
    const sankeyContainer = document.getElementById('sankey');
    const sankeyYearSelector = document
        .getElementsByTagName('select')
        .namedItem('sankey-years');
    if (sankeyContainer && sankeyYearSelector) {
        revenueYears.forEach((year) =>
            appendOption(sankeyYearSelector, `${year}`, `${year}`),
        );
        sankeyYearSelector.addEventListener('change', () =>
            graphSankey(sankeyContainer, allBudgetData, Number(sankeyYearSelector.value)),
        );
        graphSankey(sankeyContainer, allBudgetData, revenueYears[0]);
    }

    transferToggle?.addEventListener('change', () => {
        budgetData = withoutPensionTransfers(allBudgetData, transferToggle.checked);
        graphBudget(container, budgetData, {
            category: categorySelector.value,
            department: deptSelector.value,
        });
        graphDonuts(donutContainer, budgetData, deptsData, {
            year: Number(yearSelector.value),
        });
    });
};

main();
