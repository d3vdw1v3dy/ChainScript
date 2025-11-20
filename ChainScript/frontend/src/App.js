import React, { useState, useEffect } from 'react';
import './App.css';
import StoryView from './components/StoryView';
import CreatePassage from './components/CreatePassage';
import PendingBlocks from './components/PendingBlocks';
import Auth from './components/Auth';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('story');
  const [storyId, setStoryId] = useState('default_story');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>📚 ChainScript</h1>
        <p className="subtitle">Collaborative Storytelling on the Blockchain</p>
        {user && (
          <div className="user-info">
            <span>Welcome, {user.email || user.displayName || 'User'}</span>
            <button onClick={() => auth.signOut()} className="btn-secondary">
              Sign Out
            </button>
          </div>
        )}
      </header>

      {!user ? (
        <div className="auth-container">
          <Auth />
        </div>
      ) : (
        <div className="main-container">
          <nav className="tab-nav">
            <button
              className={activeTab === 'story' ? 'active' : ''}
              onClick={() => setActiveTab('story')}
            >
              📖 Read Story
            </button>
            <button
              className={activeTab === 'create' ? 'active' : ''}
              onClick={() => setActiveTab('create')}
            >
              ✍️ Write Passage
            </button>
            <button
              className={activeTab === 'mine' ? 'active' : ''}
              onClick={() => setActiveTab('mine')}
            >
              ⛏️ Mine Blocks
            </button>
          </nav>

          <div className="content-area">
            {activeTab === 'story' && <StoryView storyId={storyId} />}
            {activeTab === 'create' && <CreatePassage storyId={storyId} />}
            {activeTab === 'mine' && <PendingBlocks storyId={storyId} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

