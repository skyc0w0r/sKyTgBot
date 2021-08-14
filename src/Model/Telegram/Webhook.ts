
class Webhook {
    public Url: string | null;
    public HasCustomCert: boolean;
    public PendingUpdateCount: number;
    public LastErrorDate: Date | null;
    public LastErrorMsg: string | null;
    public MaxConnections: number | null;
    public AllowedUpdates: Array<string>;

    constructor(obj?: unknown) {        
        this.Url = obj && obj['url'] || null;
        this.HasCustomCert = obj && obj['has_custom_certificate'] || false;
        this.PendingUpdateCount = obj && obj['pending_update_count'] || 0;
        this.LastErrorDate = obj && obj['last_error_date'] && new Date(obj['last_error_date'] * 1000) || null;
        this.LastErrorMsg = obj && obj['last_error_message'] || null;
        this.MaxConnections = obj && obj['max_connections'] || null;
        this.AllowedUpdates = obj && obj['allowed_updates'] || new Array<string>();
    }
}

export default Webhook;
