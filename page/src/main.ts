import { graphBudget } from './graphAnnualBudget.ts';
import { importData, getUnique } from './utils.ts';

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

    const timeSeries = document.getElementById('timeSeries');

    if (!timeSeries) return;

    const categories = getUnique(budgetData, 'functionalCategory');
    appendOption(categorySelector, 'All', 'All');
    categories.forEach((category) =>
        appendOption(categorySelector, category, category),
    );
    categorySelector.addEventListener('change', () => {
        graphBudget(timeSeries, budgetData, {
            category: categorySelector?.value,
            department: 'All',
        });
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
        graphBudget(timeSeries, budgetData, {
            category: 'All',
            department: deptSelector?.value,
        });
        categorySelector.value = 'All';
    });

    graphBudget(timeSeries, budgetData, { category: 'All', department: 'All' });
};

main();
