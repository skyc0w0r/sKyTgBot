import VideoContentDetails from './VideoContentDetails';
import VideoSnippet from './VideoSnippet';

class Video {
    public Snippet?: VideoSnippet;
    public ContentDetails?: VideoContentDetails;

    constructor(obj?: unknown) {
        this.Snippet = obj && obj['snippet'] && new VideoSnippet(obj['snippet']) || null;
        this.ContentDetails = obj && obj['contentDetails'] && new VideoContentDetails(obj['contentDetails']) || null;
    }
}

export default Video;
