import React, { useState, useEffect } from 'react';
import { getStory } from '../api/client';
import './StoryView.css';

function StoryView({ storyId }) {
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStory();
  }, [storyId]);

  const loadStory = async () => {
    try {
      setLoading(true);
      const data = await getStory(storyId);
      setStory(data);
      setError('');
    } catch (err) {
      setError('Failed to load story. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading story...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!story) {
    return <div className="error">Story not found</div>;
  }

  return (
    <div className="story-view">
      <div className="story-header">
        <h2>📖 The Story</h2>
        <div className="story-stats">
          <span>Blocks: {story.chain.length}</span>
          <span>Pending: {story.pending_blocks.length}</span>
        </div>
      </div>

      <div className="story-content">
        {story.chain.map((block, index) => (
          <div key={block.index} className="story-block">
            <div className="block-header">
              <span className="block-number">Block #{block.index}</span>
              <span className="block-author">by {block.author}</span>
              <span className="block-hash">{block.hash.substring(0, 16)}...</span>
            </div>
            <div className="block-passage">{block.passage}</div>
            {index > 0 && (
              <div className="block-link">
                <span className="link-arrow">⬆️</span>
                <span className="link-text">Linked to: {block.previous_hash.substring(0, 16)}...</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {story.chain.length === 0 && (
        <div className="empty-story">
          <p>No blocks in the story yet. Be the first to contribute!</p>
        </div>
      )}
    </div>
  );
}

export default StoryView;

