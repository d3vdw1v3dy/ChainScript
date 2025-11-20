# ChainScript 📚

A collaborative storytelling platform inspired by blockchain technology. Users create story passages (blocks) that are verified by the community before being added to an immutable story chain.

## Features

- **Blockchain-inspired Storytelling**: Each passage is a "block" linked cryptographically to previous blocks
- **Community Verification**: Passages require verification from other users before being added
- **Immutable Order**: Once added, the story order cannot be changed
- **Real-time Updates**: See new passages and pending blocks in real-time
- **User Authentication**: Secure authentication via Firebase
- **Modern UI**: Beautiful, responsive interface built with React

## Project Structure

```
ChainScript/
├── backend/          # Python FastAPI backend
│   ├── blockchain.py # Blockchain implementation
│   ├── main.py       # API server
│   ├── firebase_service.py # Firebase integration
│   └── requirements.txt
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── api/       # API client
│   │   └── firebase/  # Firebase config
│   └── package.json
└── README.md
```

## Prerequisites

- Python 3.8+
- Node.js 16+
- Firebase account (for authentication and database)
- npm or yarn

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

#### Configure Firebase (Optional)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Authentication (Email/Password)
4. Create a service account:
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Save the JSON file as `firebase-credentials.json` in the `backend/` directory
5. Copy `.env.example` to `.env` and update the path:
   ```
   FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
   ```

#### Run the Backend

```bash
python main.py
```

Or with uvicorn:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend
npm install
```

#### Configure Firebase

1. In Firebase Console, go to Project Settings
2. Under "Your apps", add a web app
3. Copy the Firebase configuration
4. Create a `.env` file in the `frontend/` directory:
   ```env
   REACT_APP_API_URL=http://localhost:8000
   REACT_APP_FIREBASE_API_KEY=your-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
   REACT_APP_FIREBASE_APP_ID=your-app-id
   ```

#### Run the Frontend

```bash
npm start
```

The app will open at `http://localhost:3000`

## How It Works

### Creating a Passage

1. Sign up or sign in to the platform
2. Navigate to "Write Passage"
3. Write a passage between 250-500 words
4. Submit your passage - it will be added to pending blocks

### Mining/Verifying Blocks

1. Navigate to "Mine Blocks"
2. Review pending passages
3. Click "Mine This Block" to verify a passage
4. Once a block receives 2 verifications, it's automatically added to the chain

### Reading the Story

1. Navigate to "Read Story"
2. View all verified blocks in chronological order
3. See the cryptographic links between blocks

## API Endpoints

- `GET /api/stories` - Get all stories
- `GET /api/story/{story_id}` - Get a specific story's blockchain
- `POST /api/passage` - Create a new passage block
- `POST /api/mine` - Mine/verify a pending block
- `GET /api/pending` - Get pending blocks

## Technology Stack

- **Backend**: Python, FastAPI
- **Frontend**: React, JavaScript
- **Database & Auth**: Firebase (Firestore, Authentication)
- **Styling**: CSS3 with modern gradients and animations

## Development

### Backend Development

The backend uses FastAPI with automatic API documentation. Visit `/docs` for interactive API testing.

### Frontend Development

The frontend uses Create React App. Hot reloading is enabled in development mode.

## License

This project is created for educational purposes.

## Contributing

This is a collaborative storytelling platform - contribute by writing passages and verifying blocks!

---

Built with ❤️ for collaborative storytelling

