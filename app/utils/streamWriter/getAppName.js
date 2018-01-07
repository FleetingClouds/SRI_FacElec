// @flow

import fs from 'fs';
import path from 'path';

function find( _root: string ) {
  if ( ! _root ) throw new Error( 'No path root was provided.' );
  let root = _root ? String( _root ) : String( '' );
  let file;

  while ( ! file ) {
    let parent;
// $FlowFixMe
    file = path.join( root, 'package.json' );

    try {
      fs.statSync( file );
    } catch ( e ) {
// $FlowFixMe
      parent = path.resolve( root, '..' );
      file = null;
    }

    if ( root === parent ) {
      break;
    }

    root = parent;
  }

  return file;
}

/**
 * Try to load main app package
 * @throws {Error}
 * @return {Object|null}
 */
function loadPackageName() {
  let packageFile;

  if ( require.main.filename ) {
    packageFile = find( path.dirname( require.main.filename ) );
  }

  if ( ! packageFile && process.resourcesPath ) {
// $FlowFixMe
    packageFile = find( path.join( process.resourcesPath, 'app.asar' ) );
    const electronModule = path.join( 'node_modules', 'electron', 'package.json' );
    if ( packageFile && packageFile.indexOf( electronModule ) !== -1 ) {
      packageFile = null;
    }
  }

  if ( ! packageFile ) {
    packageFile = find( process.cwd() );
  }

  if ( ! packageFile ) {
    return null;
  }

  const content = fs.readFileSync( packageFile, 'utf-8' );
  const packageData = JSON.parse( content );

  // noinspection JSUnresolvedVariable
  return packageData ? packageData.productName || packageData.name : false;
}

function getAppName() {
  try {
    const name = loadPackageName();
    if ( name ) {
      return name;
    }
    return console.log( 'electron-log: unable to load the app name from package.json' );
  } catch ( e ) {
    return console.log( `electron-log: ${e.message}` );
  }
}

module.exports = getAppName;

