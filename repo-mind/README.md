# RepoMind

## Requirements
- Python 3.11+
- Node.js 18+
- npm

## Installation

### Backend
```bash
cd backend
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

## Run App Locally

### Terminal 1 (Backend)
```bash
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2 (Frontend)
```bash
cd frontend
npm run dev -- -p 3000
```

Open:
- http://localhost:3000
