import pandas as pd
from sodapy import Socrata

# Unauthenticated client only works with public data sets. Note 'None'
# in place of application token, and no username or password:
client = Socrata("data.cityofchicago.org", None)

# Example authenticated client (needed for non-public datasets):
# client = Socrata(data.cityofchicago.org,
#                  MyAppToken,
#                  username="user@example.com",
#                  password="AFakePassword")

fileDatasets = {
    "drv3-jzqp": "2011-ordinance.csv",
    "8ix6-nb7q": "2012-ordinance.csv",
    "8dps-5d4x": "2012-recommendations.csv",
    "b24i-nwag": "2013-ordinance.csv",
    "d6tb-pwze": "2013-recommendations.csv",
    "ub6s-xy6e": "2014-ordinance.csv",
    "kpej-ig3k": "2014-recommendations.csv",
    "qnek-cfpp": "2015-ordinance.csv",
    "kzbi-spm5": "2015-recommendations.csv",
    "36y7-5nnf": "2016-ordinance.csv",
    "t9dq-rknh": "2016-recommendations.csv",
    "7jem-9wyw": "2017-ordinance.csv",
    "eyk2-dyuq": "2017-recommendations.csv",
    "6g7p-xnsy": "2018-ordinance.csv",
    "ukkz-mip9": "2018-recommendations.csv",
    "h9rt-tsn7": "2019-ordinance.csv",
    "mmee-zjgx": "2019-recommendations.csv",
    "fyin-2vyd": "2020-ordinance.csv",
    "3f6y-yfk8": "2020-recommendations.csv",
    "6tbx-h7y2": "2021-ordinance.csv",
    "385z-7dwt": "2021-recommendations.csv",
    "2cr6-8u6w": "2022-ordinance.csv",
    "ncj3-k47t": "2022-recommendations.csv",
    "xbjh-7zvh": "2023-ordinance.csv",
    "pn35-trku": "2023-recommendations.csv",
    "x394-e874": "2024-ordinance.csv",
    "rmi8-cugu": "2024-revenue.csv",
    "rrdf-6mjk": "2024-recommendations.csv",
    "t59y-fr3k": "2025-ordinance.csv",
    "e5cq-t86i": "2025-revenue.csv",
    "miyk-k49p": "2025-recommendations.csv",
    "6694-f78c": "2026-ordinance.csv",
    "axxr-vais": "2026-recommendations.csv",
    "nydj-5nax": "2026-revenue.csv",
}


def pullData():
    for datasetId, fileName in fileDatasets.items():
        print(f"Downloading {fileName}...")
        results = client.get(datasetId, limit=50_000)
        pd.DataFrame.from_records(results).to_csv(f"./python/data/{fileName}", index=False)
