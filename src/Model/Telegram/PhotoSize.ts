class PhotoSize {
    /**
     * Identifier for this file, which can be used to download or reuse the file
     */
    public Id: string;
    /**
     * Unique identifier for this file, which is supposed to be the same over time and for different bots. Can't be used to download or reuse the file.
     * (what? what's the point of it then?)
     */
    public UniqueId: string;
    public Width: number;
    public Height: number;
    public Size?: number;

    constructor(obj?: unknown) {
        this.Id = obj && obj['file_id'] || '';
        this.UniqueId = obj && obj['file_unique_id'] || '';
        this.Width = obj && obj['width'] || 0;
        this.Height = obj && obj['height'] || 0;
        this.Size = obj && obj['file_size'] || 0;
    }
}

export default PhotoSize;
