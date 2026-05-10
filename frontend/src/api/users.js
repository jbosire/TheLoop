import api from './client'

export const getMe = () => api.get('/users/me')
export const updateMe = (data) => api.patch('/users/me', data)
export const searchUsers = (q) => api.get('/users/search', { params: { q } })
export const getUser = (id) => api.get(`/users/${id}`)
