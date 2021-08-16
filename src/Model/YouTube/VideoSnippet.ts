import Thumbnnail from './Thumbnnail';

const THUMB_QUALITY = [ 'maxres', 'standard', 'high', 'medium', 'default' ];

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

    get bestThumbnail(): Thumbnnail {
        return this.limitedThumbnail(10_000);
    }

    limitedThumbnail(maxLength: number): Thumbnnail {
        for (const key of THUMB_QUALITY) {
            const thumb = this.Thumbnails[key];
            if (thumb && thumb.Height <= maxLength && thumb.Width <= maxLength) {
                return thumb;
            }
        }
        return null;
    }
}

export default VideoSnippet;
