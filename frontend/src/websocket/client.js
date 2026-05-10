import { WS_EVENTS } from './events'
import {
  WS_RECONNECT_BASE_DELAY,
  WS_RECONNECT_MAX_DELAY,
  WS_HEARTBEAT_INTERVAL,
  WS_HEARTBEAT_TIMEOUT,
} from '../utils/constants'

class WebSocketClient {
  #socket = null
  #listeners = new Map()
  #reconnectTimer = null
  #heartbeatTimer = null
  #heartbeatTimeoutTimer = null
  #reconnectAttempts = 0
  #shouldConnect = false
  #getToken = null

  connect(getToken) {
    this.#getToken = getToken
    this.#shouldConnect = true
    this.#reconnectAttempts = 0
    this.#doConnect()
  }

  disconnect() {
    this.#shouldConnect = false
    this.#clearTimers()
    if (this.#socket) {
      this.#socket.onclose = null
      this.#socket.close(1000, 'Client disconnecting')
      this.#socket = null
    }
  }

  send(type, payload) {
    if (this.#socket?.readyState === WebSocket.OPEN) {
      this.#socket.send(JSON.stringify({ type, payload }))
      return true
    }
    return false
  }

  on(eventType, callback) {
    if (!this.#listeners.has(eventType)) {
      this.#listeners.set(eventType, new Set())
    }
    this.#listeners.get(eventType).add(callback)
    return () => this.off(eventType, callback)
  }

  off(eventType, callback) {
    this.#listeners.get(eventType)?.delete(callback)
  }

  get readyState() {
    return this.#socket?.readyState ?? WebSocket.CLOSED
  }

  #doConnect() {
    const token = this.#getToken?.()
    if (!token || !this.#shouldConnect) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`

    try {
      this.#socket = new WebSocket(url)
    } catch {
      this.#scheduleReconnect()
      return
    }

    this.#socket.onopen = () => {
      this.#reconnectAttempts = 0
      this.#startHeartbeat()
      this.#emit(WS_EVENTS.CONNECTED)
    }

    this.#socket.onmessage = (event) => {
      this.#resetHeartbeatTimeout()
      try {
        const { type, payload } = JSON.parse(event.data)
        this.#emit(type, payload)
      } catch {
        // ignore malformed frames
      }
    }

    this.#socket.onerror = () => {
      // onclose fires after onerror — reconnect logic lives there
    }

    this.#socket.onclose = (event) => {
      this.#stopHeartbeat()
      this.#emit(WS_EVENTS.DISCONNECTED, { code: event.code, reason: event.reason })
      if (this.#shouldConnect && event.code !== 1000) {
        this.#scheduleReconnect()
      }
    }
  }

  #emit(type, payload) {
    this.#listeners.get(type)?.forEach((cb) => {
      try { cb(payload) } catch { /* ignore listener errors */ }
    })
  }

  #scheduleReconnect() {
    if (!this.#shouldConnect) return
    const jitter = Math.random() * 1000
    const delay = Math.min(
      WS_RECONNECT_BASE_DELAY * 2 ** this.#reconnectAttempts + jitter,
      WS_RECONNECT_MAX_DELAY,
    )
    this.#reconnectAttempts++
    this.#reconnectTimer = setTimeout(() => this.#doConnect(), delay)
  }

  #startHeartbeat() {
    this.#heartbeatTimer = setInterval(() => {
      if (this.#socket?.readyState === WebSocket.OPEN) {
        this.#socket.send(JSON.stringify({ type: 'ping' }))
        this.#heartbeatTimeoutTimer = setTimeout(() => {
          this.#socket?.close(4000, 'Heartbeat timeout')
        }, WS_HEARTBEAT_TIMEOUT)
      }
    }, WS_HEARTBEAT_INTERVAL)
  }

  #stopHeartbeat() {
    clearInterval(this.#heartbeatTimer)
    clearTimeout(this.#heartbeatTimeoutTimer)
    this.#heartbeatTimer = null
    this.#heartbeatTimeoutTimer = null
  }

  #resetHeartbeatTimeout() {
    clearTimeout(this.#heartbeatTimeoutTimer)
    this.#heartbeatTimeoutTimer = null
  }

  #clearTimers() {
    clearTimeout(this.#reconnectTimer)
    this.#stopHeartbeat()
    this.#reconnectTimer = null
  }
}

export const wsClient = new WebSocketClient()
