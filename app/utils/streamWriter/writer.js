// const fs = require( 'fs' );
import findTargetPath from './findTargetPath';

const createWriter = ( {
  userName = 'Anonymous',
  maxSize = 1024 * 1024,
} = {} ) => ( {
  ret: () => 999,

  userName,
  maxSize,
  findTargetPath,

} );

export default createWriter;
