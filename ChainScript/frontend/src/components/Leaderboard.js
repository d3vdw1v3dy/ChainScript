import React, { useState, useEffect } from 'react';
import { getLeaderboard, addFriend, getAllUsers, getFriends } from '../api/client';
import { auth } from '../firebase/config';
import './Leaderboard.css';

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendEmail, setFriendEmail] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user.email);
        setError('');
        // Wait for auth token to be ready before making requests
        try {
          const token = await user.getIdToken(true); // Force refresh
          if (token) {
            console.log('User authenticated, loading leaderboard...');
            await loadLeaderboard();
            await loadFriends();
            await loadAllUsers();
          } else {
            // Even without token, try to load global leaderboard
            console.log('No token, loading global leaderboard...');
            await loadLeaderboard();
          }
        } catch (err) {
          console.error('Error getting token:', err);
          // Still try to load global leaderboard on error
          await loadLeaderboard();
        }
      } else {
        // Not logged in - load global leaderboard
        setCurrentUser(null);
        setError('');
        setFriends([]);
        setAllUsers([]);
        await loadLeaderboard();
      }
    });
    return () => unsubscribe();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getLeaderboard();
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load leaderboard. Please try again.';
      // Only show error if it's not an authentication error and user is logged in
      // For unauthenticated users, authentication errors are expected
      if (currentUser || (!errorMessage.includes('Authentication') && !errorMessage.includes('401'))) {
        setError(errorMessage);
      }
      console.error('Leaderboard load error:', err);
      // Set empty leaderboard on error
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const data = await getFriends();
      setFriends(data.friends || []);
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  };

  const loadAllUsers = async () => {
    try {
      const data = await getAllUsers();
      setAllUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleAddFriend = async () => {
    if (!friendEmail || friendEmail.trim() === '') {
      setError('Please enter an email address');
      return;
    }

    if (!currentUser) {
      setError('Please log in to add friends');
      return;
    }

    if (friendEmail === currentUser) {
      setError('Cannot add yourself as a friend');
      return;
    }

    if (friends.includes(friendEmail)) {
      setError('This user is already your friend');
      return;
    }

    try {
      setAddingFriend(true);
      setError('');
      
      // Ensure user is authenticated and token is fresh
      const user = auth.currentUser;
      if (!user) {
        setError('You are not logged in. Please refresh the page and log in again.');
        return;
      }
      
      // Force token refresh before making request
      const token = await user.getIdToken(true);
      console.log('Adding friend with token:', token ? 'Token obtained' : 'No token');
      
      await addFriend(friendEmail);
      setFriendEmail('');
      setShowAddFriend(false);
      await loadFriends();
      await loadLeaderboard();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to add friend. Please try again.';
      setError(errorMessage);
      console.error('Add friend error:', err);
      console.error('Error response:', err.response);
      console.error('Current user:', auth.currentUser?.email);
    } finally {
      setAddingFriend(false);
    }
  };

  const getRankDisplay = (rank) => {
    return `#${rank}`;
  };

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h2>{currentUser ? 'Friends Leaderboard' : 'Global Leaderboard'}</h2>
        <p className="leaderboard-description">
          Points are earned by verifying blocks. Each verified block = 1 point.
        </p>
        <div className="leaderboard-actions">
          {currentUser && (
            <button className="add-friend-btn" onClick={() => setShowAddFriend(true)}>
              Add Friends
            </button>
          )}
          <button className="refresh-btn" onClick={loadLeaderboard}>
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="leaderboard-loading">Loading leaderboard...</div>
      )}

      {error && !loading && (
        <div className="leaderboard-error">{error}</div>
      )}

      {showAddFriend && (
        <div className="add-friend-modal">
          <div className="add-friend-content">
            <button className="close-modal-btn" onClick={() => {
              setShowAddFriend(false);
              setFriendEmail('');
              setError('');
            }}>×</button>
            <h3>Add Friend</h3>
            <p>Enter the email address of the user you want to add as a friend:</p>
            <input
              type="email"
              className="friend-email-input"
              placeholder="friend@example.com"
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddFriend();
                }
              }}
            />
            {error && <div className="error-message">{error}</div>}
            <button 
              className="submit-friend-btn"
              onClick={handleAddFriend}
              disabled={addingFriend}
            >
              {addingFriend ? 'Adding...' : 'Add Friend'}
            </button>
            {allUsers.length > 0 && (
              <div className="suggested-users">
                <p>Suggested users:</p>
                <div className="user-suggestions">
                  {allUsers
                    .filter(user => user.email !== currentUser && !friends.includes(user.email))
                    .slice(0, 10)
                    .map(user => (
                      <button
                        key={user.email}
                        className="suggested-user-btn"
                        onClick={() => {
                          setFriendEmail(user.email);
                        }}
                      >
                        {user.email} ({user.points} pts)
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {leaderboard.length === 0 ? (
        <div className="leaderboard-empty">
          <p>{currentUser ? 'No friends added yet. Click "Add Friends" to start comparing your progress!' : 'No users found yet.'}</p>
        </div>
      ) : (
        <div className="leaderboard-list">
          <div className="leaderboard-header-row">
            <div className="rank-col">Rank</div>
            <div className="email-col">Email</div>
            <div className="points-col">Points</div>
          </div>
          {leaderboard.map((user) => (
            <div 
              key={user.email} 
              className={`leaderboard-item ${user.is_current_user ? 'current-user' : ''}`}
            >
              <div className="rank-col">
                <span className="rank-number">{getRankDisplay(user.rank)}</span>
              </div>
              <div className="email-col">
                {user.email}
                {user.is_current_user && <span className="you-badge">(You)</span>}
              </div>
              <div className="points-col">
                <span className="points-badge">{user.points}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Leaderboard;

