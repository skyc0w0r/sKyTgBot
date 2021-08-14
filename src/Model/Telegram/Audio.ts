import PhotoSize from './PhotoSize';

class Audio {
    public Id: string;
    public UniqueId: string;
    public Duration: number;
    
    public Performer?: string;
    public Title?: string;
    public FileName?: string;
    public MimeType?: string;
    public FileSize?: number;
    public Thumb?: PhotoSize;

    constructor(obj?: unknown) {
        this.Id = obj && obj['file_id'] || '';
        this.UniqueId = obj && obj['file_unique_id'] || '';
        this.Duration = obj && obj['duration'] || 0;
        this.Performer = obj && obj['performer'] || null;
        this.Title = obj && obj['title'] || null;
        this.FileName = obj && obj['file_name'] || null;
        this.MimeType = obj && obj['mime_type'] || null;
        this.FileSize = obj && obj['file_size'] || null;
        this.Thumb = obj && obj['thumb'] || null;
    }
}

export default Audio;
