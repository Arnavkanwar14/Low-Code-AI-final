# AI Model Trainer with Data Cleaning Pipeline

A modern, low-code AI model training platform with integrated data cleaning capabilities. This project combines a React frontend with a Python Flask backend to provide a comprehensive data science workflow.

## Features

### Frontend (React)
- 🎨 Modern, responsive UI with dark theme and neon accents
- 📊 Drag-and-drop dataset management
- 🔧 Integrated data cleaning panel
- 📈 Real-time data analysis and statistics
- 🎯 Feature selection and model configuration
- 📋 Workspace for organizing ML workflows

### Backend (Python Flask)
- 🧹 Advanced data cleaning operations
- 📈 Statistical analysis of datasets
- 🔍 Missing value detection and handling
- 🗑️ Duplicate removal
- 📊 Outlier detection using IQR method
- 📏 Data normalization (Z-score)
- 💾 File upload/download management

### Data Cleaning Capabilities
- **Missing Value Handling**: Remove rows with missing values
- **Duplicate Detection**: Identify and remove duplicate rows
- **Outlier Detection**: Use IQR method to detect and handle outliers
- **Data Normalization**: Z-score normalization for numeric columns
- **Multi-format Support**: CSV, Excel, and JSON files
- **Real-time Analysis**: Instant statistics and data preview

## Project Structure

```
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── DataCleaningPanel.jsx  # Data cleaning interface
│   │   │   ├── DatasetPanel.jsx       # Dataset management
│   │   │   ├── FeaturesPanel.jsx      # Feature selection
│   │   │   ├── Header.jsx             # Application header
│   │   │   ├── Sidebar.jsx            # Navigation sidebar
│   │   │   └── Workspace.jsx          # Main workspace
│   │   ├── App.jsx                    # Main application component
│   │   └── main.jsx                   # Application entry point
│   ├── package.json                   # Frontend dependencies
│   └── vite.config.js                 # Vite configuration
├── backend/                  # Python Flask backend
│   ├── app.py                        # Main Flask application
│   ├── requirements.txt              # Python dependencies
│   └── uploads/                      # Uploaded files storage
└── Data_Cleaning_Pipeline.ipynb      # Original Jupyter notebook
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- Python (v3.8 or higher)
- npm or yarn package manager

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Start the Flask server:
```bash
python app.py
```

The backend API will be available at `http://localhost:5000`

## Usage

### 1. Upload Datasets
- Use the sidebar to import CSV, Excel, or JSON files
- Drag and drop files directly into the dataset panel
- View file statistics and preview data

### 2. Data Cleaning
- Select a tabular dataset from the dataset panel
- Choose cleaning options:
  - Remove missing values
  - Remove duplicates
  - Handle outliers
  - Normalize data
- Click "Clean Data" to process
- Monitor cleaning progress in real-time
- Export cleaned data when complete

### 3. Model Training
- Drag cleaned datasets to the workspace
- Configure features and algorithms
- Monitor training progress
- View model performance metrics

## API Endpoints

### Data Analysis
- `POST /api/analyze-data` - Analyze uploaded data file
- `POST /api/clean-data` - Clean data based on options
- `GET /api/download/<filename>` - Download cleaned data file
- `POST /api/export-data` - Export data in specified format
- `GET /api/health` - Health check endpoint

## Data Cleaning Pipeline

The data cleaning pipeline implements the following steps:

1. **Data Analysis**: Analyze file structure, detect data types, and calculate statistics
2. **Missing Value Removal**: Remove rows with missing values (optional)
3. **Duplicate Removal**: Remove duplicate rows (optional)
4. **Outlier Detection**: Use IQR method to detect and handle outliers (optional)
5. **Data Normalization**: Apply Z-score normalization to numeric columns (optional)

## Technologies Used

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **Framer Motion** - Animation library
- **React Beautiful DnD** - Drag and drop functionality
- **Lucide React** - Icon library

### Backend
- **Flask** - Web framework
- **Pandas** - Data manipulation and analysis
- **NumPy** - Numerical computing
- **Flask-CORS** - Cross-origin resource sharing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on the GitHub repository.
