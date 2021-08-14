import RequestFile from './RequestFile';

interface RequestParams {
    [key: string]: string | number | RequestFile
}

export default RequestParams;
