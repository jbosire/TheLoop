import api from './client'

export const getMessages = (conversationId, { cursor, limit = 50 } = {}) =>
  api.get(`/conversations/${conversationId}/messages`, {
    params: { ...(cursor && { cursor }), limit },
  })
