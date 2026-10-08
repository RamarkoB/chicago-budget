type DataFileName = 'ordinance' | 'depts' | 'funds';

type DataOfFile<T extends DataFileName> =
    T extends 'ordinance' ? BudgetData
    : T extends 'depts' ? DeptData
    : FundsData;

type BudgetData = {
    departmentNumber: string;
    fundCode: string;
    appropriationAccount: string;
    appropriationAuthority: string;
    2011: number;
    2012: number;
    2013: number;
    2014: number;
    2015: number;
    2016: number;
    2017: number;
    2018: number;
    2019: number;
    2020: number;
    2021: number;
    2022: number;
    2023: number;
    2024: number;
    2025: number;
    2026: number;
};

type DeptData = { id: string; name: string; category: string };
type FundsData = { id: string; name: string; type: string };

export type { DataFileName, DataOfFile, BudgetData, DeptData, FundsData };
