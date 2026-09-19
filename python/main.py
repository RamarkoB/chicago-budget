from scripts.pullData import pullData
from scripts.labelData import labelData
from scripts.cleanData import cleanData

pullData()

print("Labelling and Cleaning Data...")
labelData()
cleanData()

print("Done!")
