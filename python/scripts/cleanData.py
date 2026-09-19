# imports
import pandas as pd
import math

# constants
years = [
    2011,
    2012,
    2013,
    2014,
    2015,
    2016,
    2017,
    2018,
    2019,
    2020,
    2021,
    2022,
    2023,
    2024,
    2025,
    2026,
]
normalizedColumns = [
    "fund_type",
    "fund_description",
    "department_description",
    "appropriation_authority_description",
    "appropriation_account_description",
]


# helper functions
def getRowAmount(row):
    if not pd.isna(row["_ordinance_amount_"]):
        return row["_ordinance_amount_"]
    elif not pd.isna(row["appropriation_ordinance"]):
        return row["appropriation_ordinance"]
    else:
        return row["amount"]


def fmtCode(code, length):
    return "0" * (length - len(str(code))) + str(code)


# import all ordinance files and combine into table
def cleanData():
    df = pd.DataFrame()
    for year in years:
        dfYear = pd.read_csv(f"./python/data/{year}-ordinance.csv")
        dfYear["year"] = year
        df = pd.concat([df, dfYear], ignore_index=True)

    functionalCategories = pd.read_csv(
        "./python/labels/categories.csv", header=None, index_col=0
    )[1]

    # clean rows and columns
    df["amount"] = df.apply(getRowAmount, axis=1)
    df["fund_code"] = df.apply(lambda row: fmtCode(row["fund_code"], 4), axis=1)
    df["department_number"] = df.apply(
        lambda row: fmtCode(row["department_number"], 2), axis=1
    )
    df["appropriation_account"] = df.apply(
        lambda row: fmtCode(row["appropriation_account"], 4), axis=1
    )
    df["appropriation_authority"] = df["appropriation_authority"].apply(
        lambda x: str(int(x)) if isinstance(x, float) and not math.isnan(x) else x
    )
    df["appropriation_authority"] = df.apply(
        lambda row: fmtCode(row["appropriation_authority"], 4), axis=1
    )
    df["functional_category"] = df.apply(
        lambda row: functionalCategories.loc[int(row["department_number"])], axis=1
    )

    df = df.drop(
        columns=["department", "_ordinance_amount_", "appropriation_ordinance"]
    )

    for colName in normalizedColumns:
        df[colName] = df[colName].str.upper()

    # trim dataframe
    trimmedDf = (
        df[
            [
                "year",
                "functional_category",
                "department_number",
                "appropriation_account",
                "fund_type",
                "fund_code",
                "amount",
            ]
        ]
        .sort_values(
            [
                "year",
                "department_number",
                "appropriation_account",
                "fund_type",
                "fund_code",
                "amount",
            ]
        )
        .reset_index(drop=True)
    )

    trimmedDf.to_csv("./python/data/ordinance.csv", index=False)
    trimmedDf.to_csv("./page/static/ordinance.csv", index=False)
