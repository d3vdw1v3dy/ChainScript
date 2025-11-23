import axios from 'axios';
import { auth } from '../firebase/config';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken(true); // Force refresh to get latest token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Auth token added to request:', config.url);
      } else {
        console.warn('No token received from Firebase');
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
  } else {
    console.warn('No current user, request will be unauthenticated:', config.url);
  }
  return config;
});

export const getStory = async (storyId = 'default_story') => {
  const response = await apiClient.get(`/api/story/${storyId}`);
  return response.data;
};

export const getAllStories = async () => {
  const response = await apiClient.get('/api/stories');
  return response.data;
};

export const createPassage = async (passage, author, storyId = 'default_story', branchFromHash = null) => {
  const response = await apiClient.post('/api/passage', {
    passage,
    author,
    story_id: storyId,
    branch_from_hash: branchFromHash,
  });
  return response.data;
};

export const mineBlock = async (blockIndex, storyId = 'default_story') => {
  const response = await apiClient.post('/api/mine', {
    block_index: blockIndex,
    story_id: storyId,
  });
  return response.data;
};

export const getPendingBlocks = async (storyId = 'default_story') => {
  const response = await apiClient.get(`/api/pending?story_id=${storyId}`);
  return response.data;
};

export const createStory = async (title, parentStoryId = null, parentBlockHash = null) => {
  const response = await apiClient.post('/api/story', {
    title,
    parent_story_id: parentStoryId,
    parent_block_hash: parentBlockHash,
  });
  return response.data;
};

export const getStoryBlocks = async (storyId) => {
  const response = await apiClient.get(`/api/story/${storyId}/blocks`);
  return response.data;
};

export const getLeaderboard = async (limit = 100) => {
  const response = await apiClient.get(`/api/leaderboard?limit=${limit}`);
  return response.data;
};

export const addFriend = async (friendEmail) => {
  const response = await apiClient.post('/api/friends', {
    friend_email: friendEmail,
  });
  return response.data;
};

export const getFriends = async () => {
  const response = await apiClient.get('/api/friends');
  return response.data;
};

export const getAllUsers = async (limit = 1000) => {
  const response = await apiClient.get(`/api/users?limit=${limit}`);
  return response.data;
};

export default apiClient;

