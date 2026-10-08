import { graphBudget } from './graphAnnualBudget.ts';
import { importData, getUnique, getDict } from './utils.ts';

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
    const fundsData = await importData('funds');

    const categorySelector = document
        .getElementsByTagName('select')
        .namedItem('categories');
    const deptSelector = document
        .getElementsByTagName('select')
        .namedItem('departments');
    if (!categorySelector || !deptSelector) return;

    const timeSeries = document.getElementById('timeSeries');
    if (!timeSeries) return;

    const deptsDict = getDict(deptsData);
    const fundsDict = getDict(fundsData);
    const categories = getUnique(deptsData, 'category');

    appendOption(categorySelector, 'All', 'All');
    categories.forEach((category) =>
        appendOption(categorySelector, category, category),
    );
    categorySelector.addEventListener('change', () => {
        graphBudget(timeSeries, budgetData, deptsDict, fundsDict, {
            category: categorySelector?.value,
            department: 'All',
        });
        deptSelector.value = 'All';
    });

    appendOption(deptSelector, 'All', 'All');
    deptsData.forEach((dept) =>
        appendOption(deptSelector, `${dept.id} - ${dept.name}`, dept.id),
    );

    deptSelector.addEventListener('change', () => {
        graphBudget(timeSeries, budgetData, deptsDict, fundsDict, {
            category: 'All',
            department: deptSelector?.value,
        });
        categorySelector.value = 'All';
    });

    graphBudget(timeSeries, budgetData, deptsDict, fundsDict, {
        category: 'All',
        department: 'All',
    });
};

main();
