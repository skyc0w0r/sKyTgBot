import Chat from './Chat';
import User from './User';

class Message {
    /**
     * Unique message identifier inside this chat
     */
    public Id: number;
    /**
     * Sender, empty for messages sent to channels
     */
    public From: User | null;
    /**
     * Date the message was sent in Unix time
     */
    public Date: Date;
    /**
     * Conversation the message belongs to
     */
    public Chat: Chat;
    /**
     * For text messages, the actual UTF-8 text of the message, 0-4096 characters
     */
    public Text: string;

    constructor(obj?: unknown) {
        this.Id = obj && obj['message_id'];
        this.From = obj && new User(obj['from']);
        this.Date = obj && new Date(obj['date'] * 1000);
        this.Chat = obj && new Chat(obj['chat']);
        this.Text = obj && obj['text'] || null;
    }
}

export default Message;
