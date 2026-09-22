import * as d3 from 'npm:d3';

type BudgetData = {
    year: number;
    functionalCategory: string;
    departmentNumber: string;
    appropriationAccount: string;
    fundType: string;
    fundCode: string;
    amount: number;
};

const importData = async () => {
    const response = await fetch('./ordinance.csv');
    const textData = await response.text();

    return textData
        .split('\n')
        .slice(1, -1)
        .map<BudgetData>((row) => {
            const split = row.split(',');
            return {
                year: Number(split[0]),
                functionalCategory: split[1],
                departmentNumber: split[2],
                appropriationAccount: split[3],
                fundType: split[4],
                fundCode: split[5],
                amount: Number(split[6]),
            };
        });
};

const getUnique = <T extends keyof BudgetData>(data: BudgetData[], key: T) => {
    const budgetYearSet = data.reduce<Set<BudgetData[typeof key]>>(
        (acc, row) => {
            acc.add(row[key]);
            return acc;
        },
        new Set(),
    );

    return [...budgetYearSet];
};

const createBudgetGraph = (budgetData: BudgetData[]) => {
    // Declare the chart dimensions and margins.
    const width = 640;
    const height = 400;
    const marginTop = 20;
    const marginRight = 20;
    const marginBottom = 30;
    const marginLeft = 40;

    const years = getUnique(budgetData, 'year');

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

    const budgetsTidy = budgets.flatMap(({ year, local, grants }) => [
        { year, type: 'local', value: local },
        { year, type: 'grants', value: grants },
    ]);

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
    category: string,
) => {
    const data =
        category === 'All' ? budgetData : (
            budgetData.filter((row) => row.functionalCategory === category)
        );

    const budgetNode = createBudgetGraph(data);
    if (!budgetNode) return;

    container.replaceChildren(budgetNode);
};

const appendOption = (categorySelector: HTMLElement, category: string) => {
    const option = document.createElement('option');
    option.innerText = category;
    categorySelector.append(option);
};

const main = async () => {
    const budgetData = await importData();

    const categorySelector = document.getElementsByTagName('select')[0];
    if (!categorySelector) return;

    const container = document.getElementById('container');
    if (!container) return;

    const categories = getUnique(budgetData, 'functionalCategory');
    console.log(categories);

    appendOption(categorySelector, 'All');
    categories.forEach((category) => appendOption(categorySelector, category));

    categorySelector.addEventListener('change', () => {
        const category = categorySelector?.value;
        graphBudget(container, budgetData, category);
    });

    graphBudget(container, budgetData, 'All');
};

main();
