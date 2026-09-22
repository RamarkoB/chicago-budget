from scripts.pullData import pullData
from scripts.labelData import labelData
from scripts.cleanData import cleanData

# We have up-to-date data for chicago budget
# pullData()

print("Labelling and Cleaning Data...")
labelData()
cleanData()

print("Done!")
