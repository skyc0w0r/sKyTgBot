class Chat {
    /**
     * Unique identifier for this chat.
     */
    public Id: string;
    /**
     * Type of chat, can be either “private”, “group”, “supergroup” or “channel”
     */
    public Type: 'private' | 'group' | 'supergroup' | 'channel';
    /**
     * Title, for supergroups, channels and group chats
     */
    public Title: string | null;
    /**
     * Username, for private chats, supergroups and channels if available
     */
    public Username: string | null;
    /**
     * First name of the other party in a private chat
     */
    public FirstName: string | null;
    /**
     * Last name of the other party in a private chat
     */
    public LastName: string | null;
    
    constructor(obj?: unknown) {
        this.Id = obj && obj['id'];
        this.Type = obj && obj['type'];
        this.Title = obj && obj['title'] || null;
        this.Username = obj && obj['username'] || null;
        this.FirstName = obj && obj['first_name'] || null;
        this.LastName = obj && obj['last_name'] || null;
    }
}

export default Chat;
