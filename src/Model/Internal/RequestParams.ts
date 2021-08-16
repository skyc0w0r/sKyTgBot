import RequestFile from './RequestFile';

interface RequestParams {
    [key: string]: string | number | RequestFile | RequestParams | Array<RequestParams>
}

export default RequestParams;
