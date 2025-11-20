import React, { useState } from 'react';
import { createPassage } from '../api/client';
import { auth } from '../firebase/config';
import './CreatePassage.css';

function CreatePassage({ storyId }) {
  const [passage, setPassage] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const wordCount = passage.trim().split(/\s+/).filter(word => word.length > 0).length;
  const isValidLength = wordCount >= 250 && wordCount <= 500;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isValidLength) {
      setError(`Word count must be between 250-500 words. Current: ${wordCount}`);
      return;
    }

    const author = auth.currentUser?.email || auth.currentUser?.displayName || 'Anonymous';

    try {
      setLoading(true);
      const result = await createPassage(passage, author, storyId);
      setMessage('Passage created successfully! It is now pending verification.');
      setPassage('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create passage. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-passage">
      <h2>✍️ Write a New Passage</h2>
      <p className="description">
        Contribute to the story by writing a passage between 250-500 words.
        Your passage will be added to the blockchain after verification by other users.
      </p>

      <form onSubmit={handleSubmit} className="passage-form">
        <div className="form-group">
          <label htmlFor="passage">Your Passage</label>
          <textarea
            id="passage"
            value={passage}
            onChange={(e) => setPassage(e.target.value)}
            rows={15}
            placeholder="Write your passage here... (250-500 words required)"
            required
          />
          <div className="word-count">
            <span className={isValidLength ? 'valid' : 'invalid'}>
              {wordCount} words
            </span>
            <span className="requirement">
              {wordCount < 250 
                ? `${250 - wordCount} more words needed`
                : wordCount > 500
                ? `${wordCount - 500} words over limit`
                : '✓ Valid length'}
            </span>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={loading || !isValidLength}
        >
          {loading ? 'Creating...' : 'Create Passage Block'}
        </button>
      </form>
    </div>
  );
}

export default CreatePassage;

