# WebSocket event type constants shared between manager, handler, and the frontend.


class ClientEvent:
    SEND_MESSAGE = "send_message"
    JOIN_CONVERSATION = "join_conversation"


class ServerEvent:
    NEW_MESSAGE = "new_message"
    MESSAGE_ACK = "message_ack"
    ERROR = "error"
