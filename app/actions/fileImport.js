// Redux action
export function uploadSuccess( { data } ) {
  return {
    type: 'UPLOAD_DOCUMENT_SUCCESS',
    data,
  };
}

export function uploadFail( error ) {
  return {
    type: 'UPLOAD_DOCUMENT_FAIL',
    error,
  };
}

