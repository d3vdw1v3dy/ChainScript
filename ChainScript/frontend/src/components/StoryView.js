import React, { useState, useEffect } from 'react';
import { getStory, getAllStories } from '../api/client';
import StoryTree from './StoryTree';
import './StoryView.css';

function StoryView({ storyId, onStoryChange }) {
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'linear'
  const [selectedStoryId, setSelectedStoryId] = useState(storyId || 'default_story');
  const [selectedBlock, setSelectedBlock] = useState(null);

  useEffect(() => {
    if (selectedStoryId) {
      loadStory(selectedStoryId);
    }
  }, [selectedStoryId]);

  useEffect(() => {
    if (storyId) {
      setSelectedStoryId(storyId);
    }
  }, [storyId]);

  const loadStory = async (id) => {
    try {
      setLoading(true);
      const data = await getStory(id);
      setStory(data);
      setError('');
      if (onStoryChange) {
        onStoryChange(id);
      }
    } catch (err) {
      setError('Failed to load story. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTreeNodeClick = (nodeStoryId) => {
    setSelectedStoryId(nodeStoryId);
    setViewMode('linear');
  };

  const handleBlockClick = (block) => {
    setSelectedBlock(block);
  };

  if (viewMode === 'tree') {
    return (
      <div className="story-view">
        <div className="story-header">
          <h2>Story Tree</h2>
          <div className="view-controls">
            <button 
              className={viewMode === 'tree' ? 'active' : ''}
              onClick={() => setViewMode('tree')}
            >
              Tree View
            </button>
            <button 
              className={viewMode === 'linear' ? 'active' : ''}
              onClick={() => setViewMode('linear')}
            >
              Linear View
            </button>
          </div>
        </div>
        <StoryTree onNodeClick={handleTreeNodeClick} />
      </div>
    );
  }

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
        <h2>{story.title || 'The Story'}</h2>
        <div className="story-controls">
          <div className="story-stats">
            <span>Blocks: {story.chain.length}</span>
            <span>Pending: {story.pending_blocks.length}</span>
          </div>
          <div className="view-controls">
            <button 
              className={viewMode === 'tree' ? 'active' : ''}
              onClick={() => setViewMode('tree')}
            >
              Tree View
            </button>
            <button 
              className={viewMode === 'linear' ? 'active' : ''}
              onClick={() => setViewMode('linear')}
            >
              Linear View
            </button>
          </div>
        </div>
        {story.parent_story_id && (
          <div className="story-branch-info">
            Branched from: {story.parent_story_id}
          </div>
        )}
      </div>

      {selectedBlock ? (
        <div className="block-detail-view">
          <button className="btn-back" onClick={() => setSelectedBlock(null)}>
            ← Back to Story
          </button>
          <div className="story-block detail">
            <div className="block-header">
              <span className="block-number">Block #{selectedBlock.index}</span>
              <span className="block-author">by {selectedBlock.author}</span>
              <span className="block-hash">{selectedBlock.hash.substring(0, 16)}...</span>
            </div>
            <div className="block-passage">{selectedBlock.passage}</div>
            {selectedBlock.parent_block_hash && (
              <div className="block-branch-info">
                🌿 Branched from block: {selectedBlock.parent_block_hash.substring(0, 16)}...
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="story-content">
          {story.chain.map((block, index) => (
            <div 
              key={block.index} 
              className="story-block clickable"
              onClick={() => handleBlockClick(block)}
            >
              <div className="block-header">
                <span className="block-number">Block #{block.index}</span>
                <span className="block-author">by {block.author}</span>
                <span className="block-hash">{block.hash.substring(0, 16)}...</span>
              </div>
              <div className="block-passage-preview">
                {block.passage.substring(0, 200)}...
                <span className="click-hint">Click to read full passage</span>
              </div>
              {block.parent_block_hash && (
                <div className="block-branch-info">
                  🌿 Branched from block: {block.parent_block_hash.substring(0, 16)}...
                </div>
              )}
              {index > 0 && !block.parent_block_hash && (
                <div className="block-link">
                  <span className="link-arrow">↑</span>
                  <span className="link-text">Linked to: {block.previous_hash.substring(0, 16)}...</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {story.chain.length === 0 && (
        <div className="empty-story">
          <p>No blocks in the story yet. Be the first to contribute!</p>
        </div>
      )}
    </div>
  );
}

export default StoryView;

