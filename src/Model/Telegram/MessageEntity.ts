class MessageEntity {
    public Type: 'mention' | 'hashtag' | 'cashtag' | 'bot_command' | 'url'; // (https://telegram.org), “email” (do-not-reply@telegram.org), “phone_number” (+1-212-555-0123), “bold” (bold text), “italic” (italic text), “underline” (underlined text), “strikethrough” (strikethrough text), “code” (monowidth string), “pre” (monowidth block), “text_link” (for clickable text URLs), “text_mention” (for users without usernames)
    public Offset: number;
    public Length: number;

    constructor(obj?: unknown) {
        this.Type = obj && obj['type'] || '';
        this.Offset = obj && obj['offset'] || 0;
        this.Length = obj && obj['length'] || 0;
    }

    static create(t: 'bot_command', o: number, l: number): MessageEntity {
        const res = new MessageEntity();
        res.Type = t;
        res.Offset = o;
        res.Length = l;
        return res;
    }

    toJson(): {[key: string]: string | number} {
        return {
            type: this.Type,
            offset: this.Offset,
            length: this.Length
        };
    }
}

export default MessageEntity;
