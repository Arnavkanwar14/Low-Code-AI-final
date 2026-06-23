# Testing Guide - Sample Dataset

## Sample Dataset Information

**File:** `sample_customer_churn.csv`

**Target Column:** `churn` (Classification problem - "Yes" or "No")

**Dataset Description:**
- **100 rows** of customer data
- **9 columns** total (8 features + 1 target)
- **Classification task** - Predict customer churn

### Column Details:

1. **age** (Numerical) - Customer age
2. **gender** (Categorical) - Male/Female
3. **tenure** (Numerical) - Number of months as customer
4. **monthly_charges** (Numerical) - Monthly service charges
5. **total_charges** (Numerical) - Total charges paid
6. **contract_type** (Categorical) - Month-to-month/One year/Two year
7. **internet_service** (Categorical) - DSL/Fiber optic
8. **payment_method** (Categorical) - Electronic check/Credit card/Bank transfer/Mailed check
9. **churn** (Target) - Yes/No (This is what we want to predict)

## Step-by-Step Testing Instructions

### 1. Start the Application

**Terminal 1 - Backend:**
```powershell
cd "c:\Users\Admin\Desktop\Low-Code-AI (1)\Low-Code-AI\backend"
python app.py
```

**Terminal 2 - Frontend:**
```powershell
cd "c:\Users\Admin\Desktop\Low-Code-AI (1)\Low-Code-AI\frontend"
npm run dev
```

### 2. Upload the Dataset

1. Open `http://localhost:5173` in your browser
2. Click **"Import Data"** button in the sidebar
3. Select `sample_customer_churn.csv` from the project root
4. Click **"Import Files"**

### 3. Analyze the Data (Optional)

1. The dataset will appear in the **Dataset Panel**
2. Click on it to see statistics (if analysis feature is available)

### 4. Clean the Data (Optional)

1. Select the dataset in **Data Cleaning Panel**
2. Choose cleaning options:
   - Remove duplicates (recommended)
   - Handle outliers (optional)
3. Click **"Clean Data"**
4. Wait for cleaning to complete
5. The cleaned dataset will be added automatically

### 5. Train the Model

1. **Drag the dataset** from Dataset Panel to **Workspace**
2. In the **Model Config** panel:
   - Select **Task Type:** `classification`
   - Select **Algorithm:** `random_forest` (recommended for this dataset)
3. Click **"Train"** button in the Workspace
4. When prompted, enter: **`churn`** (this is the target column name)
5. Optionally enter a model name (e.g., "Customer Churn Predictor")
6. Wait for training to complete (progress bar will show)

### 6. View Results

1. After training, you'll automatically be redirected to **Results** tab
2. View:
   - Model accuracy
   - Confusion matrix
   - Feature importance
   - Training metrics

### 7. Deploy the Model

1. Click **"Models"** tab in the sidebar
2. You'll see your trained model listed
3. Click **"Deploy"** button on your model
4. Model status will change to "Deployed" ✅

### 8. Make Predictions

1. In the **Models** tab, select your deployed model
2. In the **Prediction Input** area, enter sample data in JSON format:

**Example 1 - Single prediction:**
```json
{
  "age": 30,
  "gender": "Male",
  "tenure": 5,
  "monthly_charges": 70.70,
  "total_charges": 353.50,
  "contract_type": "Month-to-month",
  "internet_service": "Fiber optic",
  "payment_method": "Electronic check"
}
```

**Example 2 - Another prediction:**
```json
{
  "age": 55,
  "gender": "Female",
  "tenure": 60,
  "monthly_charges": 89.10,
  "total_charges": 5346.00,
  "contract_type": "Two year",
  "internet_service": "DSL",
  "payment_method": "Credit card"
}
```

3. Click **"Predict"** button
4. View the prediction result (will show "Yes" or "No" for churn)

## Expected Results

### Training Results:
- **Accuracy:** Should be around **75-85%** (varies based on algorithm)
- **Model Type:** Classification
- **Algorithm:** Random Forest (or your selected algorithm)

### Prediction Results:
- **Input:** Customer data
- **Output:** "Yes" (likely to churn) or "No" (likely to stay)

## Testing Checklist

- [ ] Backend server starts successfully
- [ ] Frontend server starts successfully
- [ ] Dataset uploads without errors
- [ ] Data cleaning works (if used)
- [ ] Model training completes successfully
- [ ] Model appears in Models tab
- [ ] Model can be deployed
- [ ] Predictions work correctly
- [ ] Results are displayed properly

## Troubleshooting

### If training fails:
- Check that target column name is exactly: **`churn`** (case-sensitive)
- Ensure all required features are present in the input data

### If predictions fail:
- Make sure model is **deployed** first
- Check that input JSON includes all 8 feature columns
- Verify JSON format is correct (proper quotes, commas)

### If deployment fails:
- Check backend logs for errors
- Ensure model was trained successfully first

## Sample Prediction API Call (Direct)

You can also test the prediction API directly:

```powershell
$body = @{
    data = @{
        age = 30
        gender = "Male"
        tenure = 5
        monthly_charges = 70.70
        total_charges = 353.50
        contract_type = "Month-to-month"
        internet_service = "Fiber optic"
        payment_method = "Electronic check"
    }
    return_proba = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/models/<MODEL_ID>/predict" -Method POST -Body $body -ContentType "application/json"
```

Replace `<MODEL_ID>` with the actual model ID from the Models tab.

## Next Steps

After successful testing:
1. Try different algorithms (SVM, KNN, Decision Tree)
2. Experiment with different cleaning options
3. Test with your own datasets
4. Explore batch predictions for multiple records
