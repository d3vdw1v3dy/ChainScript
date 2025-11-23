"""
Firebase service for ChainScript
Handles database operations and authentication
"""
import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from typing import Optional, Dict, List
import json
import base64


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
            print("DEBUG: Firebase not initialized, cannot verify token")
            return None
        
        # Ensure token is a clean string
        if not token:
            print("DEBUG: No token provided")
            return None
        
        # Convert to string and strip whitespace
        token_str = str(token).strip()
        
        if not token_str:
            print("DEBUG: Empty token after stripping")
            return None
        
        try:
            # Firebase Admin SDK verify_id_token expects a string token
            # Check if Firebase app is initialized
            if not firebase_admin._apps:
                print("DEBUG: Firebase app not initialized")
                return None
            
            # Create a completely fresh string object by encoding and decoding
            # This ensures we have a clean, serializable string
            token_bytes = token_str.encode('utf-8')
            token_str = token_bytes.decode('utf-8')
            
            # Validate it looks like a JWT (has 3 parts separated by dots)
            if token_str.count('.') != 2:
                print(f"DEBUG: Token doesn't look like a JWT (should have 3 parts separated by dots), got {token_str.count('.')} dots")
                return None
            
            print(f"DEBUG: Verifying token (length: {len(token_str)}, type: {type(token_str).__name__})")
            
            # Try to verify the token
            # The serialization error seems to be an internal Firebase SDK issue
            # Let's try to work around it by ensuring clean state
            import gc
            gc.collect()  # Clean up any potential memory issues
            
            # Verify the token - this returns a dict-like object
            # Use check_revoked=False to avoid additional network calls
            decoded_token = auth.verify_id_token(token_str, check_revoked=False)
            
            if decoded_token:
                # decoded_token is actually a dict, create a clean copy to avoid serialization issues
                result = {}
                
                # Extract essential fields - convert everything to plain Python types
                if 'uid' in decoded_token:
                    result['uid'] = str(decoded_token['uid'])
                if 'email' in decoded_token:
                    result['email'] = str(decoded_token['email'])
                if 'user_id' in decoded_token:
                    result['user_id'] = str(decoded_token['user_id'])
                
                # Try to get email from firebase.identities if not directly available
                if 'email' not in result and 'firebase' in decoded_token:
                    firebase_data = decoded_token.get('firebase', {})
                    if isinstance(firebase_data, dict) and 'identities' in firebase_data:
                        identities = firebase_data['identities']
                        if isinstance(identities, dict) and 'email' in identities:
                            email_list = identities['email']
                            if email_list and len(email_list) > 0:
                                result['email'] = str(email_list[0])
                
                # Get email from user lookup if we have a uid but no email
                if 'email' not in result and 'uid' in result:
                    try:
                        # Try to look up user by UID to get email
                        user_record = auth.get_user(result['uid'])
                        if user_record and user_record.email:
                            result['email'] = str(user_record.email)
                    except Exception as lookup_error:
                        print(f"DEBUG: Could not lookup user email: {lookup_error}")
                
                print(f"DEBUG: Token verified successfully. UID: {result.get('uid')}, Email: {result.get('email')}")
                return result
            
            return None
        except TypeError as te:
            # This is the serialization error - try alternative approach
            error_msg = str(te) if te else "Unknown TypeError"
            print(f"Token verification TypeError (serialization issue): {error_msg}")
            
            # Alternative: Try to decode JWT manually to at least get the UID
            # Then look up the user by UID
            try:
                # Decode JWT without verification (just to get claims)
                parts = token_str.split('.')
                if len(parts) >= 2:
                    # Decode the payload (second part)
                    payload = parts[1]
                    # Add padding if needed
                    padding = 4 - (len(payload) % 4)
                    if padding != 4:
                        payload += '=' * padding
                    
                    decoded_payload = base64.urlsafe_b64decode(payload)
                    claims = json.loads(decoded_payload)
                    
                    uid = claims.get('sub') or claims.get('user_id')
                    if uid:
                        print(f"DEBUG: Extracted UID from JWT claims: {uid}")
                        # Look up user by UID to get email
                        try:
                            user_record = auth.get_user(uid)
                            if user_record and user_record.email:
                                result = {
                                    'uid': str(uid),
                                    'email': str(user_record.email)
                                }
                                print(f"DEBUG: Successfully verified user via UID lookup: {result['email']}")
                                return result
                        except Exception as lookup_error:
                            print(f"DEBUG: Could not lookup user by UID: {lookup_error}")
            except Exception as decode_error:
                print(f"DEBUG: Could not decode JWT manually: {decode_error}")
            
            return None
        except ValueError as e:
            error_msg = str(e) if e else "Unknown ValueError"
            print(f"Token verification error (ValueError): {error_msg}")
            return None
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e) if e else "Unknown error"
            print(f"Token verification error: {error_type}: {error_msg}")
            import traceback
            traceback.print_exc()
            return None
    
    def increment_user_points(self, user_email: str, points: int = 1):
        """Increment user points (for verified blocks)"""
        if not self.initialized or not self.db:
            return False
        
        try:
            user_ref = self.db.collection('users').document(user_email)
            user_ref.set({
                'email': user_email,
                'points': firestore.Increment(points)
            }, merge=True)
            return True
        except Exception as e:
            print(f"Error incrementing user points: {e}")
            return False
    
    def get_leaderboard(self, user_email: str, limit: int = 100) -> List[Dict]:
        """Get leaderboard sorted by points (highest first) - only friends and current user"""
        if not self.initialized or not self.db:
            # If Firebase not initialized, return at least the current user
            return [{
                'email': user_email,
                'points': 0,
                'rank': 1,
                'is_current_user': True
            }]
        
        try:
            # Get user's friends list
            friends = self.get_user_friends(user_email)
            print(f"DEBUG: get_leaderboard - User {user_email} has {len(friends)} friends: {friends}")
            # Include current user in the list
            friend_emails = set(friends)
            friend_emails.add(user_email)
            print(f"DEBUG: get_leaderboard - Fetching data for {len(friend_emails)} users: {friend_emails}")
            
            # Get all users that are friends or the current user
            users_ref = self.db.collection('users')
            all_users = []
            
            # Fetch users in batches (Firestore has query limits)
            for email in friend_emails:
                try:
                    user_doc = users_ref.document(email).get()
                    if user_doc.exists:
                        user_data = user_doc.to_dict()
                        all_users.append({
                            'email': user_data.get('email', email),
                            'points': user_data.get('points', 0)
                        })
                    else:
                        # User doesn't exist in users collection yet, add with 0 points
                        # Include both current user and friends
                        all_users.append({
                            'email': email,
                            'points': 0
                        })
                        print(f"DEBUG: Added {email} to leaderboard with 0 points (no document in users collection)")
                except Exception as e:
                    print(f"Error fetching user {email}: {e}")
                    # If error, still add the user with 0 points
                    all_users.append({
                        'email': email,
                        'points': 0
                    })
            
            # Sort by points descending
            all_users.sort(key=lambda x: x['points'], reverse=True)
            
            # Add rank
            leaderboard = []
            for rank, user in enumerate(all_users, start=1):
                leaderboard.append({
                    'email': user['email'],
                    'points': user['points'],
                    'rank': rank,
                    'is_current_user': user['email'] == user_email
                })
            
            # Ensure current user is always in the leaderboard
            if not any(u['email'] == user_email for u in leaderboard):
                # Add current user if not found
                current_user_points = 0
                # Try to get current user's points
                try:
                    user_doc = users_ref.document(user_email).get()
                    if user_doc.exists:
                        user_data = user_doc.to_dict()
                        current_user_points = user_data.get('points', 0)
                except:
                    pass
                
                leaderboard.append({
                    'email': user_email,
                    'points': current_user_points,
                    'rank': len(leaderboard) + 1,
                    'is_current_user': True
                })
                # Re-sort after adding
                leaderboard.sort(key=lambda x: x['points'], reverse=True)
                # Re-assign ranks
                for rank, user in enumerate(leaderboard, start=1):
                    user['rank'] = rank
            
            return leaderboard
        except Exception as e:
            print(f"Error getting leaderboard: {e}")
            import traceback
            traceback.print_exc()
            # Return at least the current user on error
            return [{
                'email': user_email,
                'points': 0,
                'rank': 1,
                'is_current_user': True
            }]
    
    def add_friend(self, user_email: str, friend_email: str) -> bool:
        """Add a friend relationship"""
        if not self.initialized or not self.db:
            return False
        
        try:
            # Add friend relationship
            user_ref = self.db.collection('users').document(user_email)
            user_ref.set({
                'email': user_email,
                'friends': firestore.ArrayUnion([friend_email])
            }, merge=True)
            
            # Verify the friend was added
            user_doc = user_ref.get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                friends = user_data.get('friends', [])
                print(f"DEBUG: add_friend - Successfully added {friend_email} to {user_email}. Friends list now: {friends}")
            
            return True
        except Exception as e:
            print(f"Error adding friend: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_user_friends(self, user_email: str) -> List[str]:
        """Get list of user's friends"""
        if not self.initialized or not self.db:
            return []
        
        try:
            user_doc = self.db.collection('users').document(user_email).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                friends = user_data.get('friends', [])
                print(f"DEBUG: get_user_friends - Retrieved {len(friends)} friends for {user_email}: {friends}")
                return friends
            print(f"DEBUG: get_user_friends - User document {user_email} does not exist")
            return []
        except Exception as e:
            print(f"Error getting user friends: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def user_exists(self, user_email: str) -> bool:
        """Check if a user exists in Firebase (either in users collection or as a Firebase Auth user)"""
        if not self.initialized:
            return False
        
        try:
            # Check if user exists in Firestore users collection
            user_ref = self.db.collection('users').document(user_email)
            if user_ref.get().exists:
                return True
            
            # Also check if it's a valid Firebase Auth user
            try:
                from firebase_admin import auth
                auth_user = auth.get_user_by_email(user_email)
                return auth_user is not None
            except:
                # User doesn't exist in Firebase Auth either
                return False
        except Exception as e:
            print(f"Error checking if user exists: {e}")
            return False
    
    def get_all_users(self, limit: int = 1000) -> List[Dict]:
        """Get all users (for friend selection)"""
        if not self.initialized or not self.db:
            return []
        
        try:
            users_ref = self.db.collection('users')
            docs = users_ref.limit(limit).stream()
            
            users = []
            for doc in docs:
                user_data = doc.to_dict()
                users.append({
                    'email': user_data.get('email', doc.id),
                    'points': user_data.get('points', 0)
                })
            return users
        except Exception as e:
            print(f"Error getting all users: {e}")
            return []
    
    def get_global_leaderboard(self, limit: int = 100) -> List[Dict]:
        """Get global leaderboard sorted by points (highest first) - all users"""
        if not self.initialized or not self.db:
            return []
        
        try:
            users_ref = self.db.collection('users')
            # Get all users (or up to a reasonable limit for sorting)
            query_limit = max(limit * 2, 500)  # Get more than needed for accurate sorting
            docs = users_ref.limit(query_limit).stream()
            
            users = []
            for doc in docs:
                user_data = doc.to_dict()
                users.append({
                    'email': user_data.get('email', doc.id),
                    'points': user_data.get('points', 0)
                })
            
            # Sort by points descending
            users.sort(key=lambda x: x['points'], reverse=True)
            
            # Take only the requested limit and add rank
            leaderboard = []
            for rank, user in enumerate(users[:limit], start=1):
                leaderboard.append({
                    'email': user['email'],
                    'points': user['points'],
                    'rank': rank,
                    'is_current_user': False  # Can't determine without user_email
                })
            
            return leaderboard
        except Exception as e:
            print(f"Error getting global leaderboard: {e}")
            import traceback
            traceback.print_exc()
            return []

