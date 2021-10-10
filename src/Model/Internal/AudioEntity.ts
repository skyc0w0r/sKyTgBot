interface AudioEntity {
    thumbId: string
    fileId: string
    title: string
    channel: string
    duration: number
    size: number
    available: 'yes' | 'no' | 'probably'
}

export default AudioEntity;
