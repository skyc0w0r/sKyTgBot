import Audio from './Audio';
import Chat from './Chat';
import PhotoSize from './PhotoSize';
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
    public Text?: string;
    /**
     * Message is a photo, available sizes of the photo
     */
    public Photo: Array<PhotoSize> | null;
    /**
     * Message is an audio file, information about the file
     */
    public Audio: Audio | null;

    constructor(obj?: unknown) {
        this.Id = obj && obj['message_id'];
        this.From = obj && new User(obj['from']);
        this.Date = obj && new Date(obj['date'] * 1000);
        this.Chat = obj && new Chat(obj['chat']);
        this.Text = obj && obj['text'] || null;

        if (obj && obj['photo'] && Array.isArray(obj['photo'])) {
            this.Photo = new Array<PhotoSize>();
            for (const e of obj['photo']) {
                this.Photo.push(new PhotoSize(e));
            }
            this.Photo.sort((a, b) => b.Height * b.Width - a.Width * a.Height);
        } else {
            this.Photo = null;
        }
        
        this.Audio = obj && obj['audio'] && new Audio(obj['audio']) || null;
    }
}

export default Message;
