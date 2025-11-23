import React, { useState, useEffect } from 'react';
import { createStory, getAllStories, getStoryBlocks } from '../api/client';
import './CreateStory.css';

function CreateStory({ onStoryCreated }) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isBranching, setIsBranching] = useState(false);
  const [stories, setStories] = useState([]);
  const [selectedParentStory, setSelectedParentStory] = useState('');
  const [selectedBlockHash, setSelectedBlockHash] = useState('');
  const [parentBlocks, setParentBlocks] = useState([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const data = await getAllStories();
      setStories(data);
    } catch (err) {
      console.error('Failed to load stories:', err);
    }
  };

  const handleParentStoryChange = async (storyId) => {
    setSelectedParentStory(storyId);
    setSelectedBlockHash('');
    setParentBlocks([]);
    
    if (storyId) {
      try {
        setLoadingBlocks(true);
        const data = await getStoryBlocks(storyId);
        setParentBlocks(data.blocks || []);
      } catch (err) {
        setError('Failed to load blocks from parent story');
        console.error(err);
      } finally {
        setLoadingBlocks(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!title.trim()) {
      setError('Please enter a story title');
      return;
    }

    try {
      setLoading(true);
      const result = await createStory(
        title,
        isBranching ? selectedParentStory : null,
        isBranching ? selectedBlockHash : null
      );
      setMessage(`Story "${result.story_id}" created successfully!`);
      setTitle('');
      setIsBranching(false);
      setSelectedParentStory('');
      setSelectedBlockHash('');
      setParentBlocks([]);
      
      // Reload stories and notify parent
      await loadStories();
      if (onStoryCreated) {
        onStoryCreated(result.story_id);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create story. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-story">
      <h2>Create New Story</h2>
      <p className="description">
        Start a new story or branch off from an existing one to create a story tree.
      </p>

      <form onSubmit={handleSubmit} className="story-form">
        <div className="form-group">
          <label htmlFor="title">Story Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter story title..."
            required
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={isBranching}
              onChange={(e) => {
                setIsBranching(e.target.checked);
                if (!e.target.checked) {
                  setSelectedParentStory('');
                  setSelectedBlockHash('');
                  setParentBlocks([]);
                }
              }}
            />
            Branch from an existing story
          </label>
        </div>

        {isBranching && (
          <div className="branching-options">
            <div className="form-group">
              <label htmlFor="parent-story">Select Parent Story</label>
              <select
                id="parent-story"
                value={selectedParentStory}
                onChange={(e) => handleParentStoryChange(e.target.value)}
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

            {selectedParentStory && parentBlocks.length > 0 && (
              <div className="form-group">
                <label htmlFor="parent-block">Select Block to Branch From</label>
                <select
                  id="parent-block"
                  value={selectedBlockHash}
                  onChange={(e) => setSelectedBlockHash(e.target.value)}
                  required={isBranching}
                >
                  <option value="">-- Select a block --</option>
                  {parentBlocks.map((block) => (
                    <option key={block.hash} value={block.hash}>
                      Block #{block.index} by {block.author} - {block.passage.substring(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedParentStory && parentBlocks.length === 0 && !loadingBlocks && (
              <div className="info">No blocks available in this story.</div>
            )}
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={loading || (isBranching && (!selectedParentStory || !selectedBlockHash))}
        >
          {loading ? 'Creating...' : 'Create Story'}
        </button>
      </form>
    </div>
  );
}

export default CreateStory;

