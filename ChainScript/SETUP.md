# ChainScript Setup Guide

## Quick Start

### Step 1: Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. (Optional) Configure Firebase:
   - Download your Firebase service account key
   - Place it in the `backend/` directory
   - Create a `.env` file with:
     ```
     FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
     ```

6. Start the backend server:
   ```bash
   python main.py
   ```
   
   Or with auto-reload:
   ```bash
   uvicorn main:app --reload
   ```

   The API will be running at `http://localhost:8000`

### Step 2: Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select an existing one
   - Enable Authentication (Email/Password method)
   - Add a web app and copy the configuration
   - Create a `.env` file in `frontend/` with your Firebase config:
     ```env
     REACT_APP_API_URL=http://localhost:8000
     REACT_APP_FIREBASE_API_KEY=your-api-key-here
     REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     REACT_APP_FIREBASE_PROJECT_ID=your-project-id
     REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
     REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
     REACT_APP_FIREBASE_APP_ID=your-app-id
     ```

4. Start the frontend:
   ```bash
   npm start
   ```

   The app will open at `http://localhost:3000`

## Firebase Setup Details

### Backend Firebase Setup

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `firebase-credentials.json` in the `backend/` directory
4. Update your `.env` file with the path to this file

### Frontend Firebase Setup

1. In Firebase Console, go to Project Settings
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Register your app (you can skip hosting for now)
5. Copy the `firebaseConfig` object values
6. Paste them into your `frontend/.env` file

### Enable Authentication

1. In Firebase Console, go to Authentication
2. Click "Get started"
3. Enable "Email/Password" sign-in method
4. Click "Save"

## Testing the Application

1. **Start both servers** (backend on port 8000, frontend on port 3000)

2. **Sign up**:
   - Open `http://localhost:3000`
   - Click "Sign Up"
   - Create an account with email and password

3. **Create a passage**:
   - Navigate to "Write Passage"
   - Write a passage between 250-500 words
   - Submit it

4. **Mine a block**:
   - Navigate to "Mine Blocks"
   - Review pending passages
   - Click "Mine This Block" to verify
   - After 2 verifications, the block is added to the chain

5. **Read the story**:
   - Navigate to "Read Story"
   - See all verified blocks in order

## Troubleshooting

### Backend Issues

- **Port already in use**: Change the port in `main.py` or kill the process using port 8000
- **Firebase errors**: The app will work without Firebase, but data won't persist between restarts
- **Import errors**: Make sure all dependencies are installed: `pip install -r requirements.txt`

### Frontend Issues

- **API connection errors**: Make sure the backend is running on port 8000
- **Firebase auth errors**: Check that your `.env` file has the correct Firebase configuration
- **Build errors**: Try deleting `node_modules` and running `npm install` again

### Common Issues

- **CORS errors**: The backend is configured to allow requests from `localhost:3000` and `localhost:5173`
- **Environment variables not loading**: Make sure `.env` files are in the correct directories and restart the servers

## Next Steps

- Customize the story requirements (word count, verification threshold)
- Add more story validation rules
- Implement user profiles
- Add story categories or tags
- Enhance the UI with more features

Happy storytelling! 📚

