#!/bin/bash

echo "Starting AI Model Trainer with Data Cleaning Pipeline..."
echo

echo "Starting Backend Server..."
cd backend
python app.py &
BACKEND_PID=$!
cd ..

echo
echo "Starting Frontend Server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo
echo "Services are starting..."
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:5173"
echo
echo "Press Ctrl+C to stop all services..."

# Function to cleanup processes on exit
cleanup() {
    echo
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
