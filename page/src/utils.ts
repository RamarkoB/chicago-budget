// internal imports
import {
    DataFileName,
    DataOfFile,
    BudgetData,
    FundsData,
    DeptData,
} from './types.ts';

const years = [
    2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022,
    2023, 2024, 2025, 2026,
] as const;

const parseFileData =
    <T extends DataFileName>(fileName: T) =>
    (row: string): DataOfFile<T> => {
        const split = row.split(',');

        switch (fileName) {
            case 'ordinance':
                return {
                    departmentNumber: split[0],
                    fundCode: split[1],
                    appropriationAccount: split[2],
                    appropriationAuthority: split[3],
                    2011: Number(split[4]),
                    2012: Number(split[5]),
                    2013: Number(split[6]),
                    2014: Number(split[7]),
                    2015: Number(split[8]),
                    2016: Number(split[9]),
                    2017: Number(split[10]),
                    2018: Number(split[11]),
                    2019: Number(split[12]),
                    2020: Number(split[13]),
                    2021: Number(split[14]),
                    2022: Number(split[15]),
                    2023: Number(split[16]),
                    2024: Number(split[17]),
                    2025: Number(split[18]),
                    2026: Number(split[19]),
                } as BudgetData as DataOfFile<T>;

            case 'depts':
                return {
                    id: split[0],
                    name: split[1],
                    category: split[2],
                } as DeptData as DataOfFile<T>;

            case 'funds':
                return {
                    id: split[0],
                    name: split[1],
                    type: split[2],
                } as FundsData as DataOfFile<T>;
        }
    };

const importData = async <T extends DataFileName>(fileName: T) => {
    const response = await fetch(`./data/${fileName}.csv`);
    const textData = await response.text();
    return textData.split('\n').slice(1, -1).map(parseFileData(fileName));
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

const getDict = <T extends DeptData | FundsData>(data: T[]) =>
    data.reduce<Record<string, Omit<T, 'id'>>>(
        (acc, { id, ...row }) => ({ ...acc, [id]: { ...row } }),
        {},
    );

export { years, importData, getUnique, getDict };
