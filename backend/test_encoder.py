import numpy as np
from preprocessing.categorical import OneHotEncoder

# Test the OneHotEncoder with string data
print("Testing OneHotEncoder...")

# Create test data with categorical strings
X_train = np.array([
    ['Male', 'Month-to-month'],
    ['Female', 'One year'],
    ['Male', 'Two year'],
    ['Female', 'Month-to-month']
])

print(f"\nTraining data:\n{X_train}")

# Create and fit encoder
encoder = OneHotEncoder()
encoder.fit(X_train)

print(f"\nLearned mappings:")
for i, mapping in enumerate(encoder.maps):
    print(f"  Column {i}: {mapping}")

# Transform the data
X_encoded = encoder.transform(X_train)
print(f"\nEncoded shape: {X_encoded.shape}")
print(f"Encoded data:\n{X_encoded}")

# Test with new data (prediction scenario)
X_test = np.array([
    ['Male', 'Month-to-month']
])

print(f"\nTest data:\n{X_test}")

X_test_encoded = encoder.transform(X_test)
print(f"Test encoded:\n{X_test_encoded}")

print("\n✅ OneHotEncoder test completed successfully!")
