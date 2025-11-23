"""
ChainScript API Server
FastAPI backend for the ChainScript storytelling blockchain
"""
from fastapi import FastAPI, HTTPException, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import os
from dotenv import load_dotenv

from blockchain import ChainScript
from firebase_service import FirebaseService

load_dotenv()

app = FastAPI(title="ChainScript API", version="1.0.0")
 
# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase
firebase_service = FirebaseService()
firebase_cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
firebase_service.initialize(firebase_cred_path)

# In-memory storage (fallback if Firebase not configured)
blockchains: Dict[str, ChainScript] = {}
default_story_id = "default_story"

# Initialize default story
if default_story_id not in blockchains:
    blockchains[default_story_id] = ChainScript()
    # Try to load from Firebase
    saved_data = firebase_service.get_blockchain(default_story_id)
    if saved_data:
        blockchains[default_story_id] = ChainScript.from_dict(saved_data)


# Request/Response Models
class PassageRequest(BaseModel):
    passage: str = Field(..., min_length=1, description="The story passage (250-500 words)")
    author: str = Field(..., min_length=1, description="Author name")
    story_id: Optional[str] = Field(default="default_story", description="Story ID")
    branch_from_hash: Optional[str] = Field(default=None, description="Hash of block to branch from (for branching)")


class CreateStoryRequest(BaseModel):
    title: str = Field(..., min_length=1, description="Story title")
    parent_story_id: Optional[str] = Field(default=None, description="Parent story ID if branching")
    parent_block_hash: Optional[str] = Field(default=None, description="Block hash to branch from")


class MineRequest(BaseModel):
    block_index: int = Field(..., description="Index of the block to mine")
    story_id: Optional[str] = Field(default="default_story", description="Story ID")


class AddFriendRequest(BaseModel):
    friend_email: str = Field(..., description="Email of the friend to add")


class StoryResponse(BaseModel):
    story_id: str
    title: Optional[str] = None
    parent_story_id: Optional[str] = None
    parent_block_hash: Optional[str] = None
    chain: List[Dict]
    pending_blocks: List[Dict]
    story_text: str


async def get_current_user(request: Request) -> Optional[str]:
    """Extract user email from authorization header"""
    # Try multiple header name variations (case-insensitive)
    authorization = (
        request.headers.get("Authorization") or 
        request.headers.get("authorization") or
        request.headers.get("AUTHORIZATION")
    )
    
    if not authorization:
        print("DEBUG: No Authorization header received")
        print(f"DEBUG: Available headers: {list(request.headers.keys())}")
        return None
    
    print(f"DEBUG: Authorization header received: {authorization[:50]}...")
    
    # Handle both "Bearer token" and just "token" formats
    token = authorization.replace("Bearer ", "").replace("bearer ", "").strip()
    
    # Ensure token is a clean string (handle any encoding issues)
    token = str(token).strip()
    
    if not token:
        print("DEBUG: No token found in Authorization header")
        return None
    
    print(f"DEBUG: Extracted token (first 50 chars): {token[:50]}...")
    print(f"DEBUG: Token type: {type(token)}, length: {len(token)}")
    
    # Verify Firebase token and extract email
    decoded_token = firebase_service.verify_token(token)
    if decoded_token:
        print(f"DEBUG: Token verified successfully. Token keys: {list(decoded_token.keys())}")
        # Try to get email from various possible fields
        email = (
            decoded_token.get('email') or 
            decoded_token.get('user_id') or
            decoded_token.get('uid')
        )
        
        # If no email directly, try to look up user by uid
        if not email and decoded_token.get('uid'):
            try:
                from firebase_admin import auth
                user_record = auth.get_user(decoded_token['uid'])
                email = user_record.email
                print(f"DEBUG: Found email via user lookup: {email}")
            except Exception as e:
                print(f"DEBUG: Could not lookup user by uid: {e}")
        
        if email:
            print(f"DEBUG: Successfully authenticated user: {email}")
            return email
        else:
            print("DEBUG: Token verified but could not find email or user_id")
            print(f"DEBUG: Full decoded token: {decoded_token}")
    else:
        print("DEBUG: Token verification failed - firebase_service.verify_token returned None")
    
    # If Firebase not initialized or token verification fails, return None
    return None


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ChainScript API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/api/stories", response_model=List[Dict])
async def get_all_stories():
    """Get all available stories"""
    stories = firebase_service.get_all_stories()
    if stories:
        return stories
    
    # Fallback to in-memory stories
    result = []
    for story_id, blockchain in blockchains.items():
        story_data = blockchain.to_dict()
        story_data['id'] = story_id
        result.append(story_data)
    return result


@app.get("/api/story/{story_id}", response_model=StoryResponse)
async def get_story(story_id: str):
    """Get a specific story's blockchain"""
    # Try to load from Firebase first
    saved_data = firebase_service.get_blockchain(story_id)
    if saved_data:
        blockchain = ChainScript.from_dict(saved_data)
        blockchains[story_id] = blockchain
    elif story_id not in blockchains:
        raise HTTPException(status_code=404, detail="Story not found")
    else:
        blockchain = blockchains[story_id]
    
    return StoryResponse(
        story_id=story_id,
        title=blockchain.title,
        parent_story_id=blockchain.parent_story_id,
        parent_block_hash=blockchain.parent_block_hash,
        chain=blockchain.get_chain(),
        pending_blocks=blockchain.get_pending_blocks(),
        story_text=blockchain.get_story()
    )


@app.post("/api/passage")
async def create_passage(request: PassageRequest):
    """Create a new passage block"""
    story_id = request.story_id or default_story_id
    
    # Get or create blockchain
    if story_id not in blockchains:
        saved_data = firebase_service.get_blockchain(story_id)
        if saved_data:
            blockchains[story_id] = ChainScript.from_dict(saved_data)
        else:
            blockchains[story_id] = ChainScript()
    
    blockchain = blockchains[story_id]
    
    # Validate passage
    is_valid, message = blockchain.validate_passage(request.passage)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    # Create block (with optional branching)
    try:
        block = blockchain.add_block(request.passage, request.author, request.branch_from_hash)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Save to Firebase
    firebase_service.save_blockchain(story_id, blockchain.to_dict())
    
    return {
        "message": "Passage created and added to pending blocks",
        "block": block.to_dict(),
        "status": "pending_verification"
    }


@app.post("/api/mine")
async def mine_block(request: MineRequest, user: Optional[str] = Depends(get_current_user)):
    """Mine/verify a pending block"""
    story_id = request.story_id or default_story_id
    
    if story_id not in blockchains:
        raise HTTPException(status_code=404, detail="Story not found")
    
    blockchain = blockchains[story_id]
    
    # Get the block before mining to get the author
    if request.block_index >= len(blockchain.pending_blocks):
        raise HTTPException(status_code=404, detail="Block not found in pending blocks")
    
    pending_block = blockchain.pending_blocks[request.block_index]
    block_author = pending_block.author
    
    # Get number of blocks in chain before mining
    chain_length_before = len(blockchain.chain)
    
    # Mine the block
    success, message = blockchain.mine_block(request.block_index, user or "anonymous")
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    # Award 1 point to verifier/miner every time they verify a block
    if user:
        firebase_service.increment_user_points(user, 1)
        print(f"Awarded 1 point to {user} for verifying/mining a block")
    
    # Check if block was just verified and added to chain
    # If chain length increased, the block was successfully verified and added
    chain_length_after = len(blockchain.chain)
    if chain_length_after > chain_length_before:
        # Block was added to chain - award 5 points to the author
        # Get the author from the newly added block (it's now in the chain)
        newly_added_block = blockchain.chain[-1]
        author_email = newly_added_block.author
        
        if author_email:
            firebase_service.increment_user_points(author_email, 5)
            print(f"Awarded 5 points to {author_email} (author) for having their passage verified and added to chain")
    
    # Save to Firebase
    firebase_service.save_blockchain(story_id, blockchain.to_dict())
    
    return {
        "message": message,
        "blockchain": blockchain.to_dict()
    }


@app.get("/api/pending")
async def get_pending_blocks(story_id: str = default_story_id):
    """Get all pending blocks for a story"""
    if story_id not in blockchains:
        raise HTTPException(status_code=404, detail="Story not found")
    
    blockchain = blockchains[story_id]
    return {
        "pending_blocks": blockchain.get_pending_blocks(),
        "story_id": story_id
    }


@app.post("/api/story")
async def create_story(request: CreateStoryRequest):
    """Create a new story"""
    import uuid
    story_id = f"story_{uuid.uuid4().hex[:8]}"
    
    print(f"=== Creating story: {story_id} ===")
    print(f"Title: {request.title}")
    print(f"Parent story ID: {request.parent_story_id}")
    print(f"Parent block hash: {request.parent_block_hash}")
    
    # If branching, verify parent story and block exist
    if request.parent_story_id and request.parent_block_hash:
        print(f"Verifying parent story {request.parent_story_id} and block {request.parent_block_hash}")
        if request.parent_story_id not in blockchains:
            saved_data = firebase_service.get_blockchain(request.parent_story_id)
            if saved_data:
                blockchains[request.parent_story_id] = ChainScript.from_dict(saved_data)
            else:
                raise HTTPException(status_code=404, detail="Parent story not found")
        
        parent_blockchain = blockchains[request.parent_story_id]
        parent_block = parent_blockchain.get_block_by_hash(request.parent_block_hash)
        if not parent_block:
            raise HTTPException(status_code=404, detail="Parent block not found")
        print(f"Parent block verified: {parent_block.hash}")
    
    # Create new blockchain
    blockchain = ChainScript(
        title=request.title,
        parent_story_id=request.parent_story_id,
        parent_block_hash=request.parent_block_hash
    )
    
    print(f"Blockchain created with:")
    print(f"  title: {blockchain.title}")
    print(f"  parent_story_id: {blockchain.parent_story_id}")
    print(f"  parent_block_hash: {blockchain.parent_block_hash}")
    
    blockchains[story_id] = blockchain
    
    # Prepare data for Firebase
    blockchain_data = blockchain.to_dict()
    print(f"Data to save to Firebase: {blockchain_data}")
    
    # Save to Firebase
    save_result = firebase_service.save_blockchain(story_id, blockchain_data)
    print(f"Firebase save result: {save_result}")
    
    return {
        "message": "Story created successfully",
        "story_id": story_id,
        "story": blockchain_data
    }


@app.get("/api/story/{story_id}/blocks")
async def get_story_blocks(story_id: str):
    """Get all blocks from a story (for branching selection)"""
    if story_id not in blockchains:
        saved_data = firebase_service.get_blockchain(story_id)
        if saved_data:
            blockchain = ChainScript.from_dict(saved_data)
            blockchains[story_id] = blockchain
        else:
            raise HTTPException(status_code=404, detail="Story not found")
    else:
        blockchain = blockchains[story_id]
    
    return {
        "story_id": story_id,
        "title": blockchain.title,
        "blocks": blockchain.get_chain()
    }


@app.get("/api/leaderboard")
async def get_leaderboard(user: Optional[str] = Depends(get_current_user), limit: int = 100):
    """Get leaderboard of users sorted by points"""
    if user:
        # If authenticated, show friends leaderboard
        leaderboard = firebase_service.get_leaderboard(user, limit)
        return {
            "leaderboard": leaderboard,
            "total": len(leaderboard)
        }
    else:
        # If not authenticated, show global leaderboard
        leaderboard = firebase_service.get_global_leaderboard(limit)
        return {
            "leaderboard": leaderboard,
            "total": len(leaderboard)
        }

@app.post("/api/friends")
async def add_friend(request: AddFriendRequest, user: Optional[str] = Depends(get_current_user)):
    """Add a friend"""
    if not user:
        print("DEBUG: add_friend - No user authenticated")
        print("DEBUG: This means get_current_user returned None")
        raise HTTPException(status_code=401, detail="Authentication required. Please make sure you are logged in.")
    
    print(f"DEBUG: add_friend - User {user} attempting to add friend {request.friend_email}")
    
    if request.friend_email == user:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a friend")
    
    # Validate that the friend email exists in Firebase
    if not firebase_service.user_exists(request.friend_email):
        raise HTTPException(status_code=404, detail=f"User with email {request.friend_email} not found in the system")
    
    success = firebase_service.add_friend(user, request.friend_email)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add friend")
    
    return {
        "message": "Friend added successfully",
        "friend_email": request.friend_email
    }

@app.get("/api/friends")
async def get_friends(user: Optional[str] = Depends(get_current_user)):
    """Get user's friends list"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    friends = firebase_service.get_user_friends(user)
    return {
        "friends": friends
    }

@app.get("/api/users")
async def get_all_users(limit: int = 1000):
    """Get all users (for friend selection)"""
    users = firebase_service.get_all_users(limit)
    return {
        "users": users
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

