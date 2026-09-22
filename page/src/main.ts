import * as d3 from 'npm:d3';

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

    const budgetNode = createBudgetGraph(data);
    if (!budgetNode) return;

    container.replaceChildren(budgetNode);
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
    const budgetData = await importData('ordinance');
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
    });

    graphBudget(container, budgetData, { category: 'All', department: 'All' });
};

main();
