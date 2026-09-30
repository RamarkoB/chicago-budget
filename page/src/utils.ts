// internal imports
import { DataFileName, DataOfFile } from './types.ts';

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

export { importData, getUnique };
