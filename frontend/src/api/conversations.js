import api from './client'

export const createConversation = (data) => api.post('/conversations', data)
export const listConversations = () => api.get('/conversations')
export const getConversation = (id) => api.get(`/conversations/${id}`)
export const updateConversation = (id, data) => api.patch(`/conversations/${id}`, data)
export const addParticipant = (conversationId, userId) =>
  api.post(`/conversations/${conversationId}/participants`, { user_id: userId })
export const removeParticipant = (conversationId, userId) =>
  api.delete(`/conversations/${conversationId}/participants/${userId}`)
