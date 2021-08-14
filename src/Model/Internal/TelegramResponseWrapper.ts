class TelegramResponseWrapper<Type> {
    public Ok: boolean;
    public Description: string;
    public Inner: Type;

    constructor(TypeNew: new(obj?: unknown) => Type, obj?: unknown) {
        this.Ok = obj && obj['ok'] || false;
        this.Description = obj && obj['description'] || '';
                
        this.Inner = obj && obj['result'] && new TypeNew(obj['result']) || null;
    }
}

export default TelegramResponseWrapper;
