import pandas as pd
import requests

# 1. Make a single GET request to the API
url = "https://data.cityofchicago.org/api/v3/views/ub6s-xy6e/query.json?query=SELECT%20fund_type%2C%20fund_code%2C%20fund_description%2C%20department_number%2C%20department_description%2C%20appropriation_authority%2C%20appropriation_authority_description%2C%20appropriation_account%2C%20appropriation_account_description%2C%20_ordinance_amount_%20SEARCH%20%220200%22"
response = requests.get(url)
data = response.json()

# 2. Load the data into a Pandas DataFrame
df = pd.DataFrame(data)

# 3. Iterate over the rows using iterrows()
print(df.shape)
