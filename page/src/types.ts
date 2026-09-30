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

export type { DataFileName, DataOfFile, BudgetData, DeptData };
