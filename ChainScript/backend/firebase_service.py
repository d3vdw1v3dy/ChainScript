"""
Firebase service for ChainScript
Handles database operations and authentication
"""
import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from typing import Optional, Dict, List
import json


class FirebaseService:
    """Service class for Firebase operations"""
    
    def __init__(self):
        self.db = None
        self.initialized = False
    
    def initialize(self, cred_path: Optional[str] = None):
        """Initialize Firebase Admin SDK"""
        if self.initialized:
            return
        
        try:
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                # Try to initialize with default credentials (for production)
                firebase_admin.initialize_app()
            
            self.db = firestore.client()
            self.initialized = True
        except Exception as e:
            print(f"Firebase initialization error: {e}")
            print("Running without Firebase - using in-memory storage")
            self.initialized = False
    
    def save_blockchain(self, story_id: str, blockchain_data: Dict):
        """Save blockchain data to Firestore"""
        if not self.initialized or not self.db:
            print(f"Firebase not initialized, cannot save story {story_id}")
            return False
        
        try:
            # Ensure None values are preserved (Firestore converts None to null)
            # Make a copy to avoid mutating the original
            data_to_save = blockchain_data.copy()
            
            # Explicitly set None values to ensure they're saved
            if 'parent_story_id' not in data_to_save:
                data_to_save['parent_story_id'] = None
            if 'parent_block_hash' not in data_to_save:
                data_to_save['parent_block_hash'] = None
            
            print(f"Saving story {story_id} to Firebase with:")
            print(f"  parent_story_id: {data_to_save.get('parent_story_id')}")
            print(f"  parent_block_hash: {data_to_save.get('parent_block_hash')}")
            
            doc_ref = self.db.collection('stories').document(story_id)
            doc_ref.set(data_to_save)
            print(f"Successfully saved story {story_id} to Firebase")
            return True
        except Exception as e:
            print(f"Error saving blockchain: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_blockchain(self, story_id: str) -> Optional[Dict]:
        """Retrieve blockchain data from Firestore"""
        if not self.initialized or not self.db:
            return None
        
        try:
            doc_ref = self.db.collection('stories').document(story_id)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            print(f"Error retrieving blockchain: {e}")
            return None
    
    def get_all_stories(self) -> List[Dict]:
        """Get all stories from Firestore"""
        if not self.initialized or not self.db:
            return []
        
        try:
            stories_ref = self.db.collection('stories')
            docs = stories_ref.stream()
            stories = []
            for doc in docs:
                story_data = doc.to_dict()
                story_data['id'] = doc.id
                stories.append(story_data)
            return stories
        except Exception as e:
            print(f"Error retrieving stories: {e}")
            return []
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify Firebase authentication token"""
        if not self.initialized:
            return None
        
        try:
            decoded_token = auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            print(f"Token verification error: {e}")
            return None

