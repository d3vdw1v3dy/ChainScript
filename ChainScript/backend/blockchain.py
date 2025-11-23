"""
ChainScript Blockchain Implementation
Handles block creation, validation, and blockchain management
"""
import hashlib
import json
import time
from typing import List, Optional, Dict
from datetime import datetime


class Block:
    """Represents a single block in the ChainScript blockchain"""
    
    def __init__(self, index: int, passage: str, author: str, previous_hash: str, 
                 timestamp: Optional[float] = None, parent_block_hash: Optional[str] = None):
        self.index = index
        self.passage = passage
        self.author = author
        self.previous_hash = previous_hash
        self.parent_block_hash = parent_block_hash  # For branching from other stories
        self.timestamp = timestamp or time.time()
        self.hash = self.calculate_hash()
        self.verified = False
        self.verification_count = 0
    
    def calculate_hash(self) -> str:
        """Calculate the hash of the block"""
        block_string = json.dumps({
            'index': self.index,
            'passage': self.passage,
            'author': self.author,
            'previous_hash': self.previous_hash,
            'parent_block_hash': self.parent_block_hash,
            'timestamp': self.timestamp
        }, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    def to_dict(self) -> Dict:
        """Convert block to dictionary for JSON serialization"""
        return {
            'index': self.index,
            'passage': self.passage,
            'author': self.author,
            'previous_hash': self.previous_hash,
            'parent_block_hash': self.parent_block_hash,
            'hash': self.hash,
            'timestamp': self.timestamp,
            'verified': self.verified,
            'verification_count': self.verification_count
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'Block':
        """Create block from dictionary"""
        block = cls(
            index=data['index'],
            passage=data['passage'],
            author=data['author'],
            previous_hash=data['previous_hash'],
            timestamp=data.get('timestamp', time.time()),
            parent_block_hash=data.get('parent_block_hash')
        )
        block.hash = data.get('hash', block.hash)
        block.verified = data.get('verified', False)
        block.verification_count = data.get('verification_count', 0)
        return block


class ChainScript:
    """Main blockchain class for ChainScript"""
    
    def __init__(self, title: Optional[str] = None, parent_story_id: Optional[str] = None, 
                 parent_block_hash: Optional[str] = None):
        self.chain: List[Block] = []
        self.pending_blocks: List[Block] = []
        self.title = title or "Untitled Story"
        self.parent_story_id = parent_story_id
        self.parent_block_hash = parent_block_hash
        self.create_genesis_block()
    
    def create_genesis_block(self):
        """Create the first block in the blockchain"""
        genesis = Block(
            index=0,
            passage="Welcome to ChainScript. This is the beginning of our collaborative story.",
            author="System",
            previous_hash="0"
        )
        genesis.verified = True
        genesis.verification_count = 1
        self.chain.append(genesis)
    
    def get_latest_block(self) -> Block:
        """Get the most recent block in the chain"""
        return self.chain[-1]
    
    def add_block(self, passage: str, author: str, branch_from_hash: Optional[str] = None) -> Block:
        """Create a new block and add it to pending blocks
        
        Args:
            passage: The story passage
            author: Author name
            branch_from_hash: Optional hash of a block to branch from (for branching stories)
        """
        # Always link to the latest block in the chain
        latest_block = self.get_latest_block()
        
        if branch_from_hash:
            # Check if the branch block exists in this story's chain
            parent_block = self.get_block_by_hash(branch_from_hash)
            
            # Note: We allow cross-story references (parent_block can be None)
            # This allows tracking branching relationships across stories
            
            # Create block that references the branch point but links to latest
            # This allows tracking the branching relationship
            new_block = Block(
                index=len(self.chain),
                passage=passage,
                author=author,
                previous_hash=latest_block.hash,  # Still link to latest for chain integrity
                parent_block_hash=branch_from_hash  # Track the branch origin (can be from another story)
            )
        else:
            # Normal sequential block
            new_block = Block(
                index=len(self.chain),
                passage=passage,
                author=author,
                previous_hash=latest_block.hash
            )
        
        self.pending_blocks.append(new_block)
        return new_block
    
    def validate_passage(self, passage: str) -> tuple:
        """
        Validate that a passage meets requirements:
        - Length: 250-500 words
        - Appropriate content (basic check)
        - Contributes value (basic check)
        """
        word_count = len(passage.split())
        
        if word_count < 250:
            return False, f"Passage too short. Minimum 250 words required, got {word_count}."
        
        if word_count > 500:
            return False, f"Passage too long. Maximum 500 words allowed, got {word_count}."
        
        # Basic content validation
        if len(passage.strip()) == 0:
            return False, "Passage cannot be empty."
        
        # Check for minimum meaningful content
        if len(passage.strip()) < 100:
            return False, "Passage appears to be too short or contain insufficient content."
        
        return True, "Passage is valid."
    
    def mine_block(self, block_index: int, verifier: str) -> tuple:
        """
        Mine/verify a pending block
        Returns (success, message)
        """
        if block_index >= len(self.pending_blocks):
            return False, "Block not found in pending blocks."
        
        block = self.pending_blocks[block_index]
        
        # Validate the passage
        is_valid, message = self.validate_passage(block.passage)
        if not is_valid:
            return False, f"Validation failed: {message}"
        
        # Increment verification count
        block.verification_count += 1
        
        # Require at least 2 verifications before adding to chain
        if block.verification_count >= 2:
            # Verify hash integrity
            if block.hash != block.calculate_hash():
                return False, "Block hash is invalid."
            
            # Verify previous hash matches latest block (chain integrity)
            if block.previous_hash != self.get_latest_block().hash:
                return False, "Previous hash does not match latest block."
            
            # Note: parent_block_hash can reference blocks from other stories
            # We don't validate it exists here - it's just for tracking relationships
            
            # Add to chain
            block.verified = True
            self.chain.append(block)
            self.pending_blocks.pop(block_index)
            return True, "Block successfully mined and added to chain."
        
        return True, f"Block verified. {block.verification_count}/2 verifications received."
    
    def get_chain(self) -> List[Dict]:
        """Get the entire blockchain as a list of dictionaries"""
        return [block.to_dict() for block in self.chain]
    
    def get_pending_blocks(self) -> List[Dict]:
        """Get all pending blocks"""
        return [block.to_dict() for block in self.pending_blocks]
    
    def get_story(self) -> str:
        """Get the complete story by concatenating all passages"""
        return "\n\n".join([block.passage for block in self.chain])
    
    def to_dict(self) -> Dict:
        """Convert blockchain to dictionary"""
        return {
            'title': self.title,
            'parent_story_id': self.parent_story_id,
            'parent_block_hash': self.parent_block_hash,
            'chain': self.get_chain(),
            'pending_blocks': self.get_pending_blocks()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'ChainScript':
        """Create blockchain from dictionary"""
        blockchain = cls(
            title=data.get('title'),
            parent_story_id=data.get('parent_story_id'),
            parent_block_hash=data.get('parent_block_hash')
        )
        blockchain.chain = [Block.from_dict(block_data) for block_data in data.get('chain', [])]
        blockchain.pending_blocks = [Block.from_dict(block_data) for block_data in data.get('pending_blocks', [])]
        return blockchain
    
    def get_block_by_hash(self, block_hash: str) -> Optional[Block]:
        """Get a block by its hash"""
        for block in self.chain:
            if block.hash == block_hash:
                return block
        return None

