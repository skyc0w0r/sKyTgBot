import Message from './Message.js';

class Update {
    public Id: number;
    public Message: Message | null;
    public EditedMessage: Message | null;
    public ChannelPost: Message | null;
    public EditedChannelPost: Message | null;
    // public InlineQuery: null;
    // public ChosenInlineResult:  null;
    // public CallbackQuery: null;
    // public ShippingQuery: null;
    // public PreCheckoutQuery: null;

    constructor(obj?: unknown) {
        this.Id = obj && obj['update_id'];
        this.Message = obj &&  obj['message'] && new Message(obj['message']) || null;
        this.EditedMessage = obj && obj['edited_message'] && new Message(obj['edited_message']) || null;
        this.ChannelPost = obj && obj['channel_post'] && new Message(obj['channel_post']) || null;
        this.EditedChannelPost = obj && obj['edited_channel_post'] && new Message(obj['edited_channel_post']) || null;
    }
}

export default Update;
