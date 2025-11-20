import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getStory = async (storyId = 'default_story') => {
  const response = await apiClient.get(`/api/story/${storyId}`);
  return response.data;
};

export const getAllStories = async () => {
  const response = await apiClient.get('/api/stories');
  return response.data;
};

export const createPassage = async (passage, author, storyId = 'default_story') => {
  const response = await apiClient.post('/api/passage', {
    passage,
    author,
    story_id: storyId,
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

export default apiClient;

