export const WS_EVENTS = {
  // Client → Server
  SEND_MESSAGE: 'send_message',
  JOIN_CONVERSATION: 'join_conversation',
  // Server → Client
  NEW_MESSAGE: 'new_message',
  MESSAGE_ACK: 'message_ack',
  ERROR: 'error',
  // Internal lifecycle
  CONNECTED: '__connected',
  DISCONNECTED: '__disconnected',
}
