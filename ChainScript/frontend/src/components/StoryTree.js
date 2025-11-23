import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getAllStories } from '../api/client';
import './StoryTree.css';

function StoryTree({ onNodeClick }) {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 800 });
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Define calculateLayoutForNodes first to avoid initialization errors
  const calculateLayoutForNodes = (nodesToLayout) => {
    if (!nodesToLayout || nodesToLayout.length === 0) return [];

    // Create a copy of nodes to avoid mutating state directly
    const nodesWithPositions = nodesToLayout.map(node => ({ ...node }));

    // Group nodes by level
    const levels = new Map();
    nodesWithPositions.forEach(node => {
      const level = node.level !== undefined ? node.level : 0;
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level).push(node);
    });

    console.log('Layout calculation - nodes by level:', Array.from(levels.entries()).map(([l, ns]) => `Level ${l}: ${ns.length} nodes`));

    // Calculate positions using hierarchical layout
    const nodeSpacing = 250;
    const levelSpacing = 180;
    const padding = 150;

    // Position nodes level by level
    let maxLevelWidth = 0;
    levels.forEach((levelNodes) => {
      const levelWidth = levelNodes.length * nodeSpacing;
      maxLevelWidth = Math.max(maxLevelWidth, levelWidth);
    });

    const startX = padding;
    const startY = padding;

    // Sort levels to ensure proper ordering
    const sortedLevels = Array.from(levels.entries()).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    
    sortedLevels.forEach(([level, levelNodes]) => {
      const levelWidth = levelNodes.length * nodeSpacing;
      const startXLevel = startX + (maxLevelWidth - levelWidth) / 2;

      levelNodes.forEach((node, index) => {
        node.x = startXLevel + index * nodeSpacing;
        node.y = startY + parseInt(level) * levelSpacing;
        console.log(`Positioned node ${node.id} at (${node.x}, ${node.y})`);
      });
    });

    // Update viewBox to fit all nodes with padding
    const maxX = Math.max(...nodesWithPositions.map(n => n.x || 0)) + padding;
    const maxY = Math.max(...nodesWithPositions.map(n => n.y || 0)) + padding;
    const totalWidth = Math.max(1200, maxX);
    const totalHeight = Math.max(900, maxY);
    
    setViewBox({ 
      x: 0, 
      y: 0, 
      width: totalWidth, 
      height: totalHeight 
    });

    console.log(`ViewBox set to: ${totalWidth}x${totalHeight}`);
    console.log(`Total nodes to render: ${nodesWithPositions.length}`);

    return nodesWithPositions;
  };

  const buildTreeData = useCallback((stories) => {
    if (!stories || stories.length === 0) {
      console.log('No stories to build tree from');
      setNodes([]);
      setConnections([]);
      return;
    }

    // Create a map of story_id -> story
    const storyMap = new Map();
    stories.forEach(story => {
      if (story && story.id) {
        storyMap.set(story.id, story);
      }
    });

    console.log('Building tree from', storyMap.size, 'stories');

    // Build node data with relationships
    const nodeMap = new Map();
    const rootNodes = [];

    // First pass: create all nodes and build a block hash to story map
    const blockHashToStory = new Map();
    
    storyMap.forEach((story, id) => {
      // Build map of block hashes to story IDs
      const blocks = story.chain || [];
      blocks.forEach(block => {
        if (block.hash) {
          blockHashToStory.set(block.hash, id);
        }
      });
    });
    
    console.log('Block hash to story map:', Array.from(blockHashToStory.entries()).slice(0, 5), '... (showing first 5)');
    
    storyMap.forEach((story, id) => {
      // Debug: log the full story object to see its structure
      console.log(`Processing story ${id}:`, {
        id: id,
        title: story.title,
        parent_story_id: story.parent_story_id,
        parent_block_hash: story.parent_block_hash,
        chain_length: (story.chain || []).length
      });
      
      // Try multiple possible field names for parent_story_id
      let parentId = story.parent_story_id || story.parentStoryId || story.parent_story || null;
      
      // If parent_story_id is null but parent_block_hash exists, find the parent story
      if (!parentId && story.parent_block_hash) {
        const parentStoryId = blockHashToStory.get(story.parent_block_hash);
        if (parentStoryId && parentStoryId !== id) { // Don't set self as parent
          parentId = parentStoryId;
          console.log(`  ✓ Found parent via parent_block_hash: ${story.parent_block_hash.substring(0, 16)}... -> ${parentId}`);
        } else {
          console.log(`  ✗ Parent block hash ${story.parent_block_hash?.substring(0, 16)}... not found in any story`);
        }
      }
      
      // Also check if any blocks in this story reference blocks from other stories
      // If a block in this story has parent_block_hash pointing to a block in another story,
      // then this story is a child of that other story
      const blocks = story.chain || [];
      if (!parentId && blocks.length > 0) {
        console.log(`  Checking ${blocks.length} blocks in story ${id} for cross-story references...`);
        // Check all blocks for cross-story references
        for (const block of blocks) {
          if (block.parent_block_hash) {
            console.log(`    Block ${block.hash?.substring(0, 16)}... has parent_block_hash: ${block.parent_block_hash.substring(0, 16)}...`);
            const referencedStoryId = blockHashToStory.get(block.parent_block_hash);
            if (referencedStoryId && referencedStoryId !== id) {
              parentId = referencedStoryId;
              console.log(`  ✓✓✓ Found parent via block's parent_block_hash: story ${id} block references story ${referencedStoryId}`);
              break; // Use the first found relationship
            } else if (referencedStoryId === id) {
              console.log(`    Block references same story (${id}), skipping`);
            } else {
              console.log(`    Block hash ${block.parent_block_hash.substring(0, 16)}... not found in any story`);
            }
          } else {
            console.log(`    Block ${block.hash?.substring(0, 16)}... has no parent_block_hash`);
          }
        }
      }
      
      const node = {
        id: id,
        title: story.title || story.id || 'Untitled',
        story: story,
        blocks: story.chain || [],
        parentId: parentId, // This is now set from parent_story_id, story.parent_block_hash, or block references
        children: [],
        x: 0,
        y: 0,
        level: 0
      };
      nodeMap.set(id, node);
      
      if (parentId) {
        console.log(`✓✓✓ FINAL: Node ${id} has parent: ${parentId}`);
      } else {
        console.log(`  FINAL: Node ${id} has NO parent (will be root)`);
      }
    });

    console.log('Node map created with', nodeMap.size, 'nodes');

    // Build parent-child relationships
    console.log('=== BUILDING PARENT-CHILD RELATIONSHIPS ===');
    console.log('Available node IDs:', Array.from(nodeMap.keys()));
    
    nodeMap.forEach((node, id) => {
      if (node.parentId) {
        console.log(`Checking node ${node.id} with parentId: ${node.parentId}`);
        if (nodeMap.has(node.parentId)) {
          const parent = nodeMap.get(node.parentId);
          parent.children.push(node);
          console.log(`✓ Node ${node.id} is child of ${parent.id} (parent now has ${parent.children.length} children)`);
        } else {
          // Parent not found in map
          console.warn(`✗ Node ${node.id} has parent ${node.parentId} but parent NOT FOUND in nodeMap. Available IDs: ${Array.from(nodeMap.keys()).join(', ')}`);
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
        console.log(`  Node ${node.id} is a root node (no parent)`);
      }
    });
    
    console.log('=== RELATIONSHIPS BUILT ===');
    nodeMap.forEach((node, id) => {
      if (node.children.length > 0) {
        console.log(`Node ${node.id} has ${node.children.length} children:`, node.children.map(c => c.id));
      }
    });

    console.log('Root nodes:', rootNodes.length, rootNodes.map(n => n.id));

    // Calculate levels recursively starting from all root nodes
    const calculateLevel = (node, level = 0) => {
      node.level = level;
      console.log(`Node ${node.id} at level ${level} with ${node.children.length} children`);
      node.children.forEach(child => calculateLevel(child, level + 1));
    };
    rootNodes.forEach(root => calculateLevel(root));

    // Convert to arrays for rendering - ensure ALL nodes are included
    const allNodes = Array.from(nodeMap.values());
    const allConnections = [];
    
    nodeMap.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        allConnections.push({
          from: nodeMap.get(node.parentId),
          to: node
        });
      }
    });

    console.log('=== TREE SUMMARY ===');
    console.log('Total nodes:', allNodes.length);
    console.log('Total connections:', allConnections.length);
    console.log('Root nodes:', rootNodes.map(n => n.id));
    console.log('Nodes by level:');
    const nodesByLevel = {};
    allNodes.forEach(n => {
      const level = n.level !== undefined ? n.level : 0;
      if (!nodesByLevel[level]) nodesByLevel[level] = [];
      nodesByLevel[level].push({ id: n.id, title: n.title, parent: n.parentId });
    });
    Object.keys(nodesByLevel).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
      console.log(`  Level ${level} (${nodesByLevel[level].length} nodes):`, nodesByLevel[level]);
    });
    console.log('Full node details:', allNodes.map(n => ({ 
      id: n.id, 
      title: n.title,
      parent: n.parentId, 
      level: n.level,
      childrenCount: n.children.length,
      childrenIds: n.children.map(c => c.id)
    })));

    // Calculate layout first, then set nodes and connections together
    if (allNodes.length > 0) {
      // Calculate positions for all nodes
      const nodesWithPositions = calculateLayoutForNodes(allNodes);
      
      console.log('=== AFTER LAYOUT CALCULATION ===');
      console.log('Nodes with positions:', nodesWithPositions.length);
      console.log('Node positions:', nodesWithPositions.map(n => ({
        id: n.id,
        title: n.title,
        x: n.x,
        y: n.y,
        level: n.level,
        parent: n.parentId
      })));
      
      // Update connections to reference the positioned nodes
      const updatedConnections = allConnections.map(conn => {
        const fromNode = nodesWithPositions.find(n => n.id === conn.from.id);
        const toNode = nodesWithPositions.find(n => n.id === conn.to.id);
        if (!fromNode || !toNode) {
          console.warn(`Connection missing node: from=${fromNode?.id || 'missing'}, to=${toNode?.id || 'missing'}`);
        }
        return {
          from: fromNode || conn.from,
          to: toNode || conn.to
        };
      });
      
      console.log('Setting nodes and connections in state...');
      setNodes(nodesWithPositions);
      setConnections(updatedConnections);
      console.log('State updated with', nodesWithPositions.length, 'nodes');
    } else {
      setNodes([]);
      setConnections([]);
    }
  }, []);

  const loadTree = useCallback(async () => {
    try {
      setLoading(true);
      const allStories = await getAllStories();
      console.log('=== LOADING STORIES ===');
      console.log('Total stories loaded:', allStories.length);
      console.log('Stories data:', allStories.map(s => ({
        id: s.id,
        title: s.title,
        parent_story_id: s.parent_story_id,
        chain_length: s.chain?.length || 0
      })));
      buildTreeData(allStories);
    } catch (err) {
      console.error('Failed to load story tree:', err);
    } finally {
      setLoading(false);
    }
  }, [buildTreeData]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);


  const handleNodeClick = useCallback((node) => {
    setSelectedNodeId(node.id);
    if (onNodeClick) {
      onNodeClick(node.id);
    }
  }, [onNodeClick]);


  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.1 : 0.9;
    const newWidth = viewBox.width * delta;
    const newHeight = viewBox.height * delta;
    
    if (newWidth > 500 && newWidth < 5000 && newHeight > 400 && newHeight < 4000) {
      setViewBox({
        ...viewBox,
        width: newWidth,
        height: newHeight
      });
    }
  };

  const getNodeColor = useCallback((node) => {
    if (selectedNodeId === node.id) return '#3498db';
    if (hoveredNodeId === node.id) return '#2980b9';
    if (node.blocks.length === 0) return '#95a5a6';
    return '#2ecc71';
  }, [selectedNodeId, hoveredNodeId]);

  const getNodeSize = useCallback((node) => {
    const baseSize = 40;
    const blockCount = node.blocks.length;
    return baseSize + Math.min(blockCount * 3, 30);
  }, []);

  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const hoveredNode = useMemo(() => {
    return nodes.find(n => n.id === hoveredNodeId) || null;
  }, [nodes, hoveredNodeId]);

  if (loading) {
    return <div className="loading">Loading story map...</div>;
  }

  if (nodes.length === 0) {
    return <div className="empty-tree">No stories found. Create a story to get started!</div>;
  }

  return (
    <div className="story-tree-map" ref={containerRef}>
      <div className="map-header">
        <h3>Story Map</h3>
        <div className="map-stats">
          <span>Nodes: {nodes.length}</span>
          <span>Connections: {connections.length}</span>
        </div>
        <div className="map-controls">
          <button 
            className="control-btn"
            onClick={async () => {
              await loadTree();
            }}
            title="Refresh stories"
          >
            🔄 Refresh
          </button>
          <button 
            className="control-btn"
            onClick={() => {
              if (nodes.length > 0) {
                calculateLayoutForNodes(nodes);
              }
            }}
            title="Reset view"
          >
            📐 Reset View
          </button>
        </div>
        <div className="map-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#2ecc71' }}></div>
            <span>Story with blocks</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#95a5a6' }}></div>
            <span>Empty story</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#3498db' }}></div>
            <span>Selected</span>
          </div>
        </div>
      </div>
      
      <div className="map-container">
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          className="story-map-svg"
          preserveAspectRatio="xMidYMid meet"
          onWheel={handleWheel}
        >
          {/* Render connections first (behind nodes) */}
          <g className="connections">
            {connections.map((conn, index) => {
              const fromX = conn.from.x;
              const fromY = conn.from.y;
              const toX = conn.to.x;
              const toY = conn.to.y;
              
              // Calculate control points for curved line
              const midX = (fromX + toX) / 2;
              const controlX = midX;
              const controlY = fromY - 30;

              return (
                <path
                  key={`conn-${conn.from.id}-${conn.to.id}`}
                  d={`M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`}
                  stroke="#bdc3c7"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
          </g>

          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#bdc3c7" />
            </marker>
          </defs>

          {/* Render nodes */}
          <g className="nodes">
            {nodes.length === 0 && (
              <text x="100" y="100" fill="#999" fontSize="16">
                No nodes to display. Check console for debugging info.
              </text>
            )}
            {nodes.map((node, index) => {
              // Ensure node has valid position
              if (node.x === undefined || node.y === undefined || isNaN(node.x) || isNaN(node.y)) {
                console.warn(`Node ${node.id} (index ${index}) missing or invalid position:`, { x: node.x, y: node.y, node });
                return null;
              }
              
              const size = getNodeSize(node);
              const color = getNodeColor(node);
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;

              return (
                <g
                  key={node.id}
                  className={`node-group ${isSelected ? 'selected' : ''}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => handleNodeClick(node)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Node circle */}
                  <circle
                    cx="0"
                    cy="0"
                    r={size}
                    fill={color}
                    stroke={isSelected ? '#2980b9' : '#34495e'}
                    strokeWidth={isSelected ? 3 : 2}
                    opacity={isHovered ? 0.9 : 1}
                  />
                  
                  {/* Node label background */}
                  <rect
                    x={-size - 10}
                    y={size + 5}
                    width={size * 2 + 20}
                    height="20"
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="#34495e"
                    strokeWidth="1"
                    rx="4"
                  />
                  
                  {/* Node title */}
                  <text
                    x="0"
                    y={size + 18}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="#2c3e50"
                    className="node-title-text"
                  >
                    {node.title.length > 15 ? node.title.substring(0, 15) + '...' : node.title}
                  </text>
                  
                  {/* Block count badge */}
                  {node.blocks.length > 0 && (
                    <circle
                      cx={size - 8}
                      cy={-size + 8}
                      r="12"
                      fill="#e74c3c"
                      stroke="white"
                      strokeWidth="2"
                    />
                  )}
                  {node.blocks.length > 0 && (
                    <text
                      x={size - 8}
                      y={-size + 12}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="white"
                    >
                      {node.blocks.length}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Hover tooltip */}
          {hoveredNode && !selectedNode && (
            <g transform={`translate(${hoveredNode.x}, ${hoveredNode.y})`}>
              <foreignObject 
                x="60" 
                y="-30" 
                width="180" 
                height="50"
              >
                <div className="node-tooltip">
                  <strong>{hoveredNode.title}</strong>
                  <div>{hoveredNode.blocks.length} block{hoveredNode.blocks.length !== 1 ? 's' : ''}</div>
                </div>
              </foreignObject>
            </g>
          )}
        </svg>
      </div>

      {/* Node details panel */}
      {selectedNode && (
        <div className="node-details-panel">
          <button className="close-btn" onClick={() => setSelectedNodeId(null)}>×</button>
          <h4>{selectedNode.title}</h4>
          <div className="detail-item">
            <strong>Story ID:</strong> <span className="mono">{selectedNode.id}</span>
          </div>
          <div className="detail-item">
            <strong>Blocks:</strong> {selectedNode.blocks.length}
          </div>
          {selectedNode.story.parent_story_id && (
            <div className="detail-item">
              <strong>Branched from:</strong> {selectedNode.story.parent_story_id}
            </div>
          )}
          {selectedNode.blocks.length > 0 && (
            <div className="detail-item">
              <strong>Latest block:</strong>
              <div className="block-preview">
                Block #{selectedNode.blocks[selectedNode.blocks.length - 1].index} by{' '}
                {selectedNode.blocks[selectedNode.blocks.length - 1].author}
              </div>
            </div>
          )}
          <button 
            className="view-story-btn"
            onClick={() => {
              if (onNodeClick) {
                onNodeClick(selectedNode.id);
              }
            }}
          >
            View Story →
          </button>
        </div>
      )}

    </div>
  );
}

export default StoryTree;
