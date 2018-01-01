import async from 'async';
import fs from 'fs';

import pathFinder from '../streamWriter/findTargetPath';

import header from './header';
import footer from './footer';


const LG = console.log;

export default file => {

  let xml_as_base64 = null;
  async.series({

    getXMLdoc: step => {

      LG( `getXMLdoc :: %s`, file );
      try {
        xml_as_base64 = fs.readFileSync( file ).toString('base64');
        // LG( `got XML :: ` );
        // LG( xml_as_base64 );
        step();

      } catch (e) {
        if ( e.message.includes('ENOENT') ) {
          LG( `Unable to read invoice XML file '${file}'.` );
        } else {
          throw e;
        }
      }

    },

    writeSOAP: step => {

      LG( `genBase64 :: %s`, xml_as_base64 );
      step();

    },

  }, function(err){
    if( err ) {
      LG('Error: '+err);
    }
  });

  return;

}
