class User {
    public Id: number;
    public IsBot: boolean;
    public FirstName: string;
    public LastName: string | null;
    public Username: string | null;
    public LangCode: string | null;

    constructor(obj?: unknown) {
        this.Id = obj && obj['id'];
        this.IsBot = obj && obj['is_bot'];
        this.FirstName = obj && obj['first_name'];
        this.LastName = obj && obj['last_name'] || null;
        this.Username = obj && obj['username'] || null;
        this.LangCode = obj && obj['language_code'] || null;
    }
}

export default User;
