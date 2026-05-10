import api from './client'

export const register = (data) => api.post('/auth/register', data)
export const login = (data) => api.post('/auth/login', data)
export const refresh = (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken })
export const logout = () => api.post('/auth/logout')
