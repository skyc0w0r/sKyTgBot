import RequestFile from './RequestFile.js';

interface RequestParams {
    [key: string]: string | number | RequestFile | RequestParams | Array<RequestParams>
}

export default RequestParams;
