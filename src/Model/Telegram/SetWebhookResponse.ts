class SetWebhookResponse {
    public Ok: boolean;
    public Result: boolean;
    public Description: string;

    constructor(obj?: unknown) {
        this.Ok = obj && obj['ok'] || false;
        this.Result = obj && obj['result'] || false;
        this.Description = obj && obj['description'] || '';
    }
}

export default SetWebhookResponse;
