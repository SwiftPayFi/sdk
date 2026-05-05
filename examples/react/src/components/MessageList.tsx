import './MessageList.css'

type MessageType = 'info' | 'success' | 'error'

interface Message {
  id: string
  text: string
  type: MessageType
}

interface MessageListProps {
  messages: Message[]
  onRemove: (id: string) => void
}

export default function MessageList({ messages, onRemove }: MessageListProps) {
  return (
    <div className="message-list">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`message message-${msg.type}`}
          onClick={() => onRemove(msg.id)}
        >
          {msg.text}
        </div>
      ))}
    </div>
  )
}
