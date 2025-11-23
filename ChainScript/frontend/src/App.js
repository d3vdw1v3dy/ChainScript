import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import StoryView from './components/StoryView';
import CreatePassage from './components/CreatePassage';
import CreateStory from './components/CreateStory';
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

  // Scroll animation observer
  useEffect(() => {
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.scroll-fade-in');
    elements.forEach(el => observer.observe(el));

    return () => {
      elements.forEach(el => observer.unobserve(el));
    };
  }, []);

  // Tree node tooltip functionality
  useEffect(() => {
    if (!user) {
      const nodeGroups = document.querySelectorAll('.node-group');
      const tooltip = document.createElement('div');
      tooltip.className = 'tree-tooltip';
      tooltip.style.display = 'none';
      document.body.appendChild(tooltip);

      nodeGroups.forEach(node => {
        const circle = node.querySelector('.tree-node');
        if (circle) {
          node.addEventListener('mouseenter', (e) => {
            const tooltipText = node.getAttribute('data-tooltip');
            if (tooltipText) {
              tooltip.textContent = tooltipText;
              tooltip.style.display = 'block';
            }
          });

          node.addEventListener('mousemove', (e) => {
            tooltip.style.left = e.pageX + 10 + 'px';
            tooltip.style.top = e.pageY + 10 + 'px';
          });

          node.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
          });
        }
      });

      return () => {
        tooltip.remove();
      };
    }
  }, [user]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="logo-container">
            <svg className="logo-icon" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Chain links */}
              <circle cx="8" cy="12" r="3" fill="#667eea" stroke="#764ba2" strokeWidth="1.5"/>
              <circle cx="16" cy="12" r="3" fill="#667eea" stroke="#764ba2" strokeWidth="1.5"/>
              <circle cx="24" cy="12" r="3" fill="#667eea" stroke="#764ba2" strokeWidth="1.5"/>
              <path d="M 11 12 L 13 12" stroke="#764ba2" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M 19 12 L 21 12" stroke="#764ba2" strokeWidth="1.5" strokeLinecap="round"/>
              
              {/* Tree trunk */}
              <rect x="15" y="18" width="2" height="6" fill="#8b4513"/>
              
              {/* Tree branches/leaves */}
              <circle cx="12" cy="20" r="3" fill="#2ecc71"/>
              <circle cx="20" cy="20" r="3" fill="#2ecc71"/>
              <circle cx="16" cy="18" r="3" fill="#2ecc71"/>
              <circle cx="14" cy="22" r="2.5" fill="#27ae60"/>
              <circle cx="18" cy="22" r="2.5" fill="#27ae60"/>
            </svg>
            <h1>ChainScript</h1>
          </div>
          <div className="header-actions">
            {user ? (
          <div className="user-info">
            <span>Welcome, {user.email || user.displayName || 'User'}</span>
            <button onClick={() => auth.signOut()} className="btn-secondary">
              Sign Out
            </button>
          </div>
            ) : (
              <div className="auth-buttons">
                <button 
                  className="btn-auth" 
                  onClick={() => {
                    setAuthMode('signin');
                    setShowAuthModal(true);
                  }}
                >
                  Sign In
                </button>
                <button 
                  className="btn-auth btn-auth-primary" 
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuthModal(true);
                  }}
                >
                  Sign Up
            </button>
          </div>
        )}
          </div>
        </div>
      </header>

      {!user ? (
        <div className="landing-page">
          <div className="landing-content">
            <div className="landing-text">
              <h1 className="hero-heading">
                Collaborative storytelling with blockchain-backed permanence
              </h1>
              <p className="hero-subheading">
                Write branching stories where each passage is a permanent block in an immutable chain. 
                Build story trees that grow with every choice.
              </p>
              <ul className="hero-features">
                <li>Each passage is a verified block in an immutable chain</li>
                <li>Branch from any point to create multiple story paths</li>
                <li>Community-verified content ensures quality</li>
                <li>Transparent authorship and contribution history</li>
              </ul>
              <div className="hero-ctas">
                <button 
                  className="btn-hero-primary"
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuthModal(true);
                  }}
                  aria-label="Start creating your first story"
                >
                  Start a Story
                </button>
                <button 
                  className="btn-hero-secondary"
                  onClick={() => {
                    setAuthMode('signin');
                    setShowAuthModal(true);
                  }}
                  aria-label="Explore existing stories"
                >
                  Explore Stories
                </button>
              </div>
            </div>
            <div className="landing-visual">
              <div className="story-tree-visual">
                <svg viewBox="0 0 500 350" className="tree-svg">
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
                      <polygon points="0 0, 10 3, 0 6" fill="#95a5a6" />
                    </marker>
                  </defs>
                  
                  {/* Labels */}
                  <text x="250" y="15" textAnchor="middle" fill="white" fontSize="12" fontWeight="600" opacity="0.9">Story Root</text>
                  <text x="120" y="85" textAnchor="middle" fill="white" fontSize="11" fontWeight="500" opacity="0.8">Choices</text>
                  <text x="380" y="85" textAnchor="middle" fill="white" fontSize="11" fontWeight="500" opacity="0.8">Choices</text>
                  <text x="250" y="320" textAnchor="middle" fill="white" fontSize="11" fontWeight="500" opacity="0.8">Branches</text>
                  
                  {/* Root node with tooltip area */}
                  <g className="node-group" data-tooltip="Story beginning - the first passage">
                    <circle cx="250" cy="40" r="18" fill="white" className="tree-node" />
                  </g>
                  
                  {/* Level 1 nodes - spaced out more */}
                  <path d="M 250 58 L 120 110" stroke="#95a5a6" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                  <path d="M 250 58 L 250 110" stroke="#95a5a6" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                  <path d="M 250 58 L 380 110" stroke="#95a5a6" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                  
                  <g className="node-group" data-tooltip="Passage 2 - First branching choice">
                    <circle cx="120" cy="110" r="16" fill="white" className="tree-node" />
                  </g>
                  <g className="node-group" data-tooltip="Passage 3 - Continuation path">
                    <circle cx="250" cy="110" r="16" fill="white" className="tree-node" />
                  </g>
                  <g className="node-group" data-tooltip="Passage 4 - Alternative path">
                    <circle cx="380" cy="110" r="16" fill="white" className="tree-node" />
                  </g>
                  
                  {/* Level 2 nodes - better spacing */}
                  <path d="M 120 126 L 60 180" stroke="#95a5a6" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                  <path d="M 120 126 L 180 180" stroke="#95a5a6" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                  <path d="M 250 126 L 210 180" stroke="#95a5a6" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                  <path d="M 250 126 L 290 180" stroke="#95a5a6" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                  <path d="M 380 126 L 340 180" stroke="#95a5a6" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                  <path d="M 380 126 L 440 180" stroke="#95a5a6" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                  
                  <g className="node-group" data-tooltip="Passage 5 - Branch continuation">
                    <circle cx="60" cy="180" r="14" fill="white" className="tree-node" />
                  </g>
                  <g className="node-group" data-tooltip="Passage 6 - Branch continuation">
                    <circle cx="180" cy="180" r="14" fill="white" className="tree-node" />
                  </g>
                  <g className="node-group" data-tooltip="Passage 7 - Branch continuation">
                    <circle cx="210" cy="180" r="14" fill="white" className="tree-node" />
                  </g>
                  <g className="node-group" data-tooltip="Passage 8 - Branch continuation">
                    <circle cx="290" cy="180" r="14" fill="white" className="tree-node" />
                  </g>
                  <g className="node-group" data-tooltip="Passage 9 - Branch continuation">
                    <circle cx="340" cy="180" r="14" fill="white" className="tree-node" />
                  </g>
                  <g className="node-group" data-tooltip="Passage 10 - Branch continuation">
                    <circle cx="440" cy="180" r="14" fill="white" className="tree-node" />
                  </g>
                  
                  {/* Level 3 nodes - better spacing */}
                  <path d="M 60 194 L 30 250" stroke="#95a5a6" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                  <path d="M 60 194 L 90 250" stroke="#95a5a6" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                  <path d="M 290 194 L 270 250" stroke="#95a5a6" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                  <path d="M 290 194 L 310 250" stroke="#95a5a6" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                  
                  <g className="node-group" data-tooltip="Passage 11 - Further branching">
                    <circle cx="30" cy="250" r="12" fill="white" className="tree-node" />
                  </g>
                  <g className="node-group" data-tooltip="Passage 12 - Further branching">
                    <circle cx="90" cy="250" r="12" fill="white" className="tree-node" />
                  </g>
                  <g className="node-group" data-tooltip="Passage 13 - Further branching">
                    <circle cx="270" cy="250" r="12" fill="white" className="tree-node" />
                  </g>
                  <g className="node-group" data-tooltip="Passage 14 - Further branching">
                    <circle cx="310" cy="250" r="12" fill="white" className="tree-node" />
                  </g>
                </svg>
                <p className="tree-caption">Each node is a passage. Branches show the story paths.</p>
              </div>
            </div>
          </div>
          
          {showAuthModal && (
            <div className="auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
              <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-modal" onClick={() => setShowAuthModal(false)}>×</button>
                <Auth 
                  initialMode={authMode} 
                  onSuccess={() => setShowAuthModal(false)}
                />
              </div>
            </div>
          )}
          
          {/* How It Works Section */}
          <div className="how-it-works-section">
            <div className="how-it-works-card scroll-fade-in">
              <h3>How ChainScript Works</h3>
              <div className="steps-container">
                <div className="step-item">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Start a Story</h4>
                    <p>Create a new story or choose an existing one to contribute to</p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>Write a Passage (Block)</h4>
                    <p>Compose a passage between 250-500 words that continues the narrative</p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>Branch from Any Node</h4>
                    <p>Create new story paths by branching from any existing passage</p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h4>Collaborate with Others</h4>
                    <p>Community members verify passages before they're added to the chain</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="why-blockchain-card scroll-fade-in">
              <h3>Why Blockchain?</h3>
              <ul className="blockchain-benefits">
                <li><strong>Tamper-proof authorship</strong> - Every passage is cryptographically linked and cannot be altered</li>
                <li><strong>Transparent contribution history</strong> - See who wrote what and when</li>
                <li><strong>Persistent story record</strong> - Stories are permanently stored and accessible</li>
              </ul>
            </div>
          </div>
          
          {/* Project Info Section */}
          <div className="project-info-section">
            <div className="info-card scroll-fade-in">
              <h3>Built With Modern Technologies</h3>
              <div className="tech-grid">
                <div className="tech-item">
                  <div className="tech-icon"></div>
                  <h4>React</h4>
                  <p>Frontend framework for building interactive user interfaces</p>
                </div>
                <div className="tech-item">
                  <div className="tech-icon"></div>
                  <h4>Python</h4>
                  <p>Backend language powering the blockchain logic</p>
                </div>
                <div className="tech-item">
                  <div className="tech-icon"></div>
                  <h4>FastAPI</h4>
                  <p>High-performance API framework for the backend</p>
                </div>
                <div className="tech-item">
                  <div className="tech-icon"></div>
                  <h4>Firebase</h4>
                  <p>Authentication and Firestore database for data persistence</p>
                </div>
                <div className="tech-item">
                  <div className="tech-icon"></div>
                  <h4>Blockchain</h4>
                  <p>Custom blockchain implementation for immutable story chains</p>
                </div>
                <div className="tech-item">
                  <div className="tech-icon"></div>
                  <h4>CSS3</h4>
                  <p>Modern styling with gradients and animations</p>
                </div>
              </div>
            </div>
            
            <div className="info-card scroll-fade-in">
              <h3>Key Features</h3>
              <ul className="features-list">
                <li><strong>Secure Authentication</strong> - Firebase-powered user management</li>
                <li><strong>Collaborative Writing</strong> - Multiple authors contribute to stories</li>
                <li><strong>Branching Narratives</strong> - Create complex story trees</li>
                <li><strong>Community Verification</strong> - Passages verified before being added</li>
                <li><strong>Immutable Chain</strong> - Once added, story order cannot be changed</li>
                <li><strong>Visual Story Map</strong> - Interactive tree visualization</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="main-container">
          <nav className="tab-nav">
            <button
              className={activeTab === 'story' ? 'active' : ''}
              onClick={() => setActiveTab('story')}
            >
              Read Story
            </button>
            <button
              className={activeTab === 'new-story' ? 'active' : ''}
              onClick={() => setActiveTab('new-story')}
            >
              New Story
            </button>
            <button
              className={activeTab === 'create' ? 'active' : ''}
              onClick={() => setActiveTab('create')}
            >
              Write Passage
            </button>
            <button
              className={activeTab === 'mine' ? 'active' : ''}
              onClick={() => setActiveTab('mine')}
            >
              Mine Blocks
            </button>
          </nav>

          <div className="content-area">
            {activeTab === 'story' && (
              <StoryView 
                storyId={storyId} 
                onStoryChange={(id) => setStoryId(id)}
              />
            )}
            {activeTab === 'new-story' && (
              <CreateStory 
                onStoryCreated={(id) => {
                  setStoryId(id);
                  setActiveTab('story');
                }}
              />
            )}
            {activeTab === 'create' && (
              <CreatePassage 
                storyId={storyId}
                onStoryChange={(id) => setStoryId(id)}
              />
            )}
            {activeTab === 'mine' && <PendingBlocks storyId={storyId} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

