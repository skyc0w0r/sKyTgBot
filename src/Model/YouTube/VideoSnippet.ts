import Thumbnnail from './Thumbnnail';

class VideoSnippet {
    public PublishedAt?: Date;
    public Title: string;
    public Description: string;
    public Thumbnails: { [key: string]: Thumbnnail };
    public ChannelTitle: string;

    constructor(obj?: unknown) {
        this.PublishedAt = obj && obj['publishedAt'] && new Date(obj['publishedAt']) || null;
        this.Title = obj && obj['title'] || '';
        this.Description = obj && obj['description'] || '';
        this.Thumbnails = {};
        if (obj && obj['thumbnails']) {
            for (const key in obj['thumbnails']) {
                this.Thumbnails[key] = new Thumbnnail(obj['thumbnails'][key]);
            }
        }
        this.ChannelTitle = obj && obj['channelTitle'] || '';
    }
}

export default VideoSnippet;
