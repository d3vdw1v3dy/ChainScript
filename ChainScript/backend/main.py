"""
ChainScript API Server
FastAPI backend for the ChainScript storytelling blockchain
"""
from fastapi import FastAPI, HTTPException, Header, Depends
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


class StoryResponse(BaseModel):
    story_id: str
    title: Optional[str] = None
    parent_story_id: Optional[str] = None
    parent_block_hash: Optional[str] = None
    chain: List[Dict]
    pending_blocks: List[Dict]
    story_text: str


def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extract user from authorization header (simplified for now)"""
    if authorization:
        # In a real implementation, verify Firebase token here
        # For now, just return a placeholder
        return authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else None
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
    
    # Mine the block
    success, message = blockchain.mine_block(request.block_index, user or "anonymous")
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

