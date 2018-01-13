// @flow
import fs from 'fs';
import path from 'path';
import os from 'os';
import getAppName from './getAppName';
import mkFileName from './mkFileName';

// const LG = console.log;
let fileName = '';
/**
 * Try to determine a platform-specific path where can write logs
 * @param {string} [appName] Used to determine the last part of a log path
 * @return {string|boolean}
 */

// export const findTargetPath = ( q: number ): string | null => {
//   if ( q === 0 ) return 'asdfasdf';
//   return null;
// };

export default ( (
  _appName: string,
  fileNamePrefix: string | null,
  fileNameSuffix: string | null,
  _fileName: string | null
): string | null => {
  let appName = _appName;
  appName = appName || getAppName();
  if ( ! appName ) {
    return null;
  }

  fileName = _fileName || mkFileName( fileNamePrefix, fileNameSuffix );


  const homeDir = os.homedir ? os.homedir() : process.env.HOME;

  let dir;
  switch ( process.platform ) {
    case 'linux': {
      // $FlowFixMe
      dir = prepareDir( process.env.XDG_CONFIG_HOME, appName )
        .or( homeDir, '.config', appName )
        .or( process.env.XDG_DATA_HOME, appName )
        .or( homeDir, '.local', 'share', appName )
        .result;
      break;
    }

    case 'darwin': {
      // $FlowFixMe
      dir = prepareDir( homeDir, 'Library', 'Logs', appName )
        .or( homeDir, 'Library', 'Application Support', appName )
        .result;
      break;
    }

    case 'win32': {
      // $FlowFixMe
      dir = prepareDir( process.env.APPDATA, appName )
        .or( homeDir, 'AppData', 'Roaming', appName )
        .result;
      break;
    }

    default: {
      throw new Error( 'Unknown Electron platform type!' );
    }
  }

  if ( dir ) {
    const target = path.join( dir, fileName );
    return target;
  }
  return null;
} );

function prepareDir( _dirPath: ?string, ...args ) {
  let dirPath: ?string = _dirPath;
  if ( ! this || this.or !== prepareDir || ! this.result ) {
    if ( ! dirPath ) {
      return { or: prepareDir };
    }

    dirPath = path.join( dirPath, ...args );
    mkDir( dirPath );

    try {
      fs.accessSync( dirPath, fs.W_OK );
    } catch ( e ) {
      return { or: prepareDir };
    }
  }

  // $FlowFixMe
  const rslt = ( this ? this.result : false ) || dirPath;
  return {
    or: prepareDir,
    result: rslt
  };
}

function mkDir( dirPath, _root ) {
  let root = _root;
  const dirs = dirPath.split( path.sep );
  const dir = dirs.shift();
  root = ( root || '' ) + dir + path.sep;

  try {
    fs.mkdirSync( root );
  } catch ( e ) {
    if ( ! fs.statSync( root ).isDirectory() ) {
      throw new Error( e );
    }
  }

  return ! dirs.length || mkDir( dirs.join( path.sep ), root );
}
