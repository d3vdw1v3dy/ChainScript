import React, { useState, useEffect } from 'react';
import { getPendingBlocks, mineBlock, getStory } from '../api/client';
import './PendingBlocks.css';

function PendingBlocks({ storyId }) {
  const [pendingBlocks, setPendingBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mining, setMining] = useState({});

  useEffect(() => {
    loadPendingBlocks();
    const interval = setInterval(loadPendingBlocks, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [storyId]);

  const loadPendingBlocks = async () => {
    try {
      const data = await getPendingBlocks(storyId);
      setPendingBlocks(data.pending_blocks || []);
      setError('');
    } catch (err) {
      setError('Failed to load pending blocks.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMine = async (blockIndex) => {
    try {
      setMining({ ...mining, [blockIndex]: true });
      const result = await mineBlock(blockIndex, storyId);
      
      // Reload pending blocks
      await loadPendingBlocks();
      
      // Show success message
      alert(result.message || 'Block mined successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to mine block. Please try again.');
      console.error(err);
    } finally {
      setMining({ ...mining, [blockIndex]: false });
    }
  };

  if (loading) {
    return <div className="loading">Loading pending blocks...</div>;
  }

  return (
    <div className="pending-blocks">
      <div className="pending-header">
        <h2>⛏️ Mine Pending Blocks</h2>
        <p className="description">
          Verify and mine pending passages. Each block needs 2 verifications before being added to the chain.
        </p>
      </div>

      {error && <div className="error">{error}</div>}

      {pendingBlocks.length === 0 ? (
        <div className="no-pending">
          <p>✨ No pending blocks! All passages have been verified.</p>
        </div>
      ) : (
        <div className="blocks-list">
          {pendingBlocks.map((block, index) => (
            <div key={block.index} className="pending-block">
              <div className="block-info">
                <div className="block-meta">
                  <span className="block-number">Block #{block.index}</span>
                  <span className="block-author">by {block.author}</span>
                  <span className="verification-count">
                    Verifications: {block.verification_count || 0}/2
                  </span>
                </div>
                <div className="block-hash">
                  Hash: {block.hash.substring(0, 32)}...
                </div>
              </div>
              
              <div className="block-passage">
                <h4>Passage:</h4>
                <p>{block.passage}</p>
                <div className="word-count-badge">
                  {block.passage.split(/\s+/).filter(w => w.length > 0).length} words
                </div>
              </div>

              <button
                className="btn-mine"
                onClick={() => handleMine(index)}
                disabled={mining[index]}
              >
                {mining[index] ? 'Mining...' : '⛏️ Mine This Block'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PendingBlocks;

