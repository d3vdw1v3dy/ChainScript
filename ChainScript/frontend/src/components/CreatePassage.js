import React, { useState, useEffect } from 'react';
import { createPassage, getAllStories, getStoryBlocks } from '../api/client';
import { auth } from '../firebase/config';
import './CreatePassage.css';

function CreatePassage({ storyId, onStoryChange }) {
  const [passage, setPassage] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedStoryId, setSelectedStoryId] = useState(storyId || 'default_story');
  const [stories, setStories] = useState([]);
  const [isBranching, setIsBranching] = useState(false);
  const [branchFromStory, setBranchFromStory] = useState('');
  const [branchFromBlock, setBranchFromBlock] = useState('');
  const [branchBlocks, setBranchBlocks] = useState([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  useEffect(() => {
    loadStories();
  }, []);

  useEffect(() => {
    if (storyId) {
      setSelectedStoryId(storyId);
    }
  }, [storyId]);

  const loadStories = async () => {
    try {
      const data = await getAllStories();
      setStories(data);
    } catch (err) {
      console.error('Failed to load stories:', err);
    }
  };

  const handleBranchStoryChange = async (storyId) => {
    setBranchFromStory(storyId);
    setBranchFromBlock('');
    setBranchBlocks([]);
    
    if (storyId) {
      try {
        setLoadingBlocks(true);
        const data = await getStoryBlocks(storyId);
        setBranchBlocks(data.blocks || []);
      } catch (err) {
        setError('Failed to load blocks from story');
        console.error(err);
      } finally {
        setLoadingBlocks(false);
      }
    }
  };

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
      const branchHash = isBranching && branchFromBlock ? branchFromBlock : null;
      const result = await createPassage(passage, author, selectedStoryId, branchHash);
      setMessage('Passage created successfully! It is now pending verification.');
      setPassage('');
      setIsBranching(false);
      setBranchFromStory('');
      setBranchFromBlock('');
      setBranchBlocks([]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create passage. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-passage">
      <h2>Write a New Passage</h2>
      <p className="description">
        Contribute to the story by writing a passage between 250-500 words.
        Your passage will be added to the blockchain after verification by other users.
      </p>

      <form onSubmit={handleSubmit} className="passage-form">
        <div className="form-group">
          <label htmlFor="story-select">Select Story</label>
          <select
            id="story-select"
            value={selectedStoryId}
            onChange={(e) => {
              setSelectedStoryId(e.target.value);
              if (onStoryChange) {
                onStoryChange(e.target.value);
              }
            }}
          >
            {stories.map((story) => (
              <option key={story.id} value={story.id}>
                {story.title || story.id} ({story.chain?.length || 0} blocks)
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={isBranching}
              onChange={(e) => {
                setIsBranching(e.target.checked);
                if (!e.target.checked) {
                  setBranchFromStory('');
                  setBranchFromBlock('');
                  setBranchBlocks([]);
                }
              }}
            />
            Branch from a specific block in this story
          </label>
        </div>

        {isBranching && (
          <div className="branching-options">
            <div className="form-group">
              <label htmlFor="branch-story">Select Story to Branch From</label>
              <select
                id="branch-story"
                value={branchFromStory}
                onChange={(e) => handleBranchStoryChange(e.target.value)}
                required={isBranching}
              >
                <option value="">-- Select a story --</option>
                {stories.map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.title || story.id} ({story.chain?.length || 0} blocks)
                  </option>
                ))}
              </select>
            </div>

            {loadingBlocks && <div className="loading">Loading blocks...</div>}

            {branchFromStory && branchBlocks.length > 0 && (
              <div className="form-group">
                <label htmlFor="branch-block">Select Block to Branch From</label>
                <select
                  id="branch-block"
                  value={branchFromBlock}
                  onChange={(e) => setBranchFromBlock(e.target.value)}
                  required={isBranching}
                >
                  <option value="">-- Select a block --</option>
                  {branchBlocks.map((block) => (
                    <option key={block.hash} value={block.hash}>
                      Block #{block.index} by {block.author} - {block.passage.substring(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            {branchFromStory && branchBlocks.length === 0 && !loadingBlocks && (
              <div className="info">No blocks available in this story.</div>
            )}
          </div>
        )}
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
          disabled={loading || !isValidLength || (isBranching && (!branchFromStory || !branchFromBlock))}
        >
          {loading ? 'Creating...' : 'Create Passage Block'}
        </button>
      </form>
    </div>
  );
}

export default CreatePassage;

