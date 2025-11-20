# ChainScript Backend

Python FastAPI backend for the ChainScript storytelling blockchain platform.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure Firebase (optional):
   - Download your Firebase service account key
   - Place it in the backend directory
   - Update `.env` with the path to the credentials file

3. Run the server:
```bash
python main.py
```

Or with uvicorn:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

- `GET /` - API status
- `GET /api/stories` - Get all stories
- `GET /api/story/{story_id}` - Get a specific story's blockchain
- `POST /api/passage` - Create a new passage block
- `POST /api/mine` - Mine/verify a pending block
- `GET /api/pending` - Get pending blocks

## API Documentation

Visit `http://localhost:8000/docs` for interactive API documentation.

