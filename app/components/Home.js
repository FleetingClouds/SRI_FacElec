// @flow
import React from 'react';
// import { Link } from 'react-router-dom';
import fs from 'fs';
import rm from 'rimraf';

import async from 'async';
import GoogleSpreadsheet from 'google-spreadsheet';
import o2x from 'object-to-xml';

import { Button } from 'react-bootstrap';

import { JsonInvoice, dayInvoicing, fileSpecs } from '../../settings';
// import styles from './Home.css';
import Names from '../utils/constants/attrNamesMap';
import pathFinder from '../utils/streamWriter/findTargetPath';

import streamWriter from '../utils/streamWriter';
import checkDigit11 from '../utils/checkDigit11';

import soap from '../utils/soap';

const LG = console.log;

const IMPUESTOS = 'impuestos';

const colDay = 'infofactura.totalsinimpuestos';
const colMonth = 'internal.subTotal_IVA0';
const colYear = 'infoFactura.totalDescuento';

const colUidInvoice = 'infotributaria.secuencial';
const colUidDetail = 'codigoPrincipal';

const credsPath: string | null = pathFinder( 'sri_FacElec', '', '', 'LogichemAutoInvoiceServiceAcct.json' );
if ( ! credsPath ) throw new Error( 'Could not prepare a path for finding credentials.' );
let credsJson = null;
// LG( `fileName : ${credsPath}` );
// LG( credsPath.toString() );
try {
  credsJson = JSON.parse( fs.readFileSync( credsPath, 'utf8' ) );
} catch ( e ) {
  LG( 'Error: Unable to load Google Sheets access credentials', e.stack );
}

let dcmnt = {};
let jsonInvoice = null;

const getDetailsAttributes = ( detail ) => {
  const uid: string[] = detail[0].split( '_' );
  const rslt = {};
  rslt.idx = uid[1] ? Number.parseInt( uid[1], 10 ) - 1 : 0;
  rslt.attr = Names[uid[0]] ? Names[uid[0]] : uid[0];
  rslt.value = detail[1]; // eslint-disable-line prefer-destructuring
  return rslt;
};

let impuestos: Array<mixed> = [];
const appendAttribute = ( _obj, aryNames, value ) => {
  const obj = _obj;
  let name = aryNames.shift();
  if ( name ) {
    name = Names[name] ? Names[name] : name;
    if ( name === IMPUESTOS ) {
      const twigs = {};
      twigs[aryNames[0]] = {};
      const leaves = aryNames[1].split( '_' );
      twigs[aryNames[0]][leaves[0]] = value;
      impuestos.push( twigs );
    } else {
      if ( ! obj[name] ) obj[name] = {};
      if ( aryNames.length > 0 ) {
        appendAttribute( obj[name], aryNames, value );
      } else {
        obj[name] = value;
      }
    }
  }
};
const processColumn = ( aryColNames, value ) => {
  if ( ! dcmnt ) return new Error();
  appendAttribute( dcmnt, aryColNames, value );
};

const excludedAttributes = ['_xml', 'save', 'del', '_links', 'id', 'app:edited', 'save'];
const wkbk = new GoogleSpreadsheet( '1mGmXRn4dgVRmXmeqDrZ-zy88q-8ihqhXQoiR6-PJLoI' );
// const exportSheet = `sandBox`;
const exportSheet = 'SRI Export';
let dataSet = null;
let row = null;
let secuencial = '';
// const claveAcceso = null;

const xmlHeader = '<?xml version="1.0" encoding="UTF-8" ?>\n';
let xmlResult = xmlHeader;

let fileInvoiceXML = null;

const prepareOutFile = ( _secuencial ) => {
  const stream = streamWriter;

  stream.appName = fileSpecs.appName;
  stream.fileNameSuffix = fileSpecs.fileNameSuffixXML;
  stream.streamConfig = { flags: 'w+' };

  stream.initStreamConfig( `${fileSpecs.fileNamePrefix}_${_secuencial}` );

  LG( 'Stream prepared : "%s"', stream.file );
  return stream;
};

const testSheetConnection = ( _numInvoice ) => {
  const prefix = `${fileSpecs.fileNamePrefix}_${String( _numInvoice ).padStart( 9, '0' )}`;

  if ( ! fileInvoiceXML || prefix !== fileInvoiceXML.fileNamePrefix ) {
    fileInvoiceXML = prepareOutFile( String( _numInvoice ).padStart( 9, '0' ) );
    LG( 'new outfile %s', fileInvoiceXML.file );
  } else {
    LG( 'existing outfile %s', fileInvoiceXML.file );
  }

  soap( fileInvoiceXML.file );
};

const buildXMLDoc = () => {
  let wksht = null;
  let wkshtIdentifier = null;
  async.series( {

    authenticate: step => {
      wkbk.useServiceAccountAuth( credsJson, step );
    },

    getExportationSheet: step => {
      wkbk.getInfo( ( err, info ) => {
        // LG('Loaded wkbk: '+info.title+' by '+info.author.email);
        info.worksheets.forEach( ( key, val ) => {
          if ( key.title === exportSheet ) {
            wkshtIdentifier = key.id;
            wksht = info.worksheets[val];
            // LG(`array #`, wksht.id);
          }
        } );
        step();
      } );
    },

    setTheDate: step => {
      wkbk.getRows( wkshtIdentifier, {
        offset: 1,
        limit: 1
      }, ( _, _rows ) => {
        const rows = _rows;
        const ii = 0;
        // LG( rows[ii][colDay] );
        rows[ii][colDay] = dayInvoicing.Day;
        rows[ii][colMonth] = dayInvoicing.Month;
        rows[ii][colYear] = dayInvoicing.Year;
        rows[ii].save( err => {
          if ( err ) LG( 'Saved row!\n%s', err );
        } );
        step();
      } );
    },

    resetInvoiceAttributes: step => {
      jsonInvoice = JsonInvoice;
      jsonInvoice.factura['#'].detalles = {};
      dcmnt = jsonInvoice.factura['#'];

      step();
    },


    getTheDataSet: step => {
      LG( wksht );
      wkbk.getRows( wkshtIdentifier, {
        offset: 4,
        limit: 200
      }, ( err, rows ) => {
        // LG( `Read %s rows`, rows.length);
        dataSet = rows;
        step();
      } );
    },

    processAnInvoice: step => {
      if ( ! dataSet ) throw new Error( 'Cannot process empty data set.' );
      const ii = 0;
      row = dataSet[ii];
      // LG('processAnInvoice() :', row[`infotributaria.secuencial`] );
      const entries = Object.entries( row );
      // LG( `Read %s entries`, entries.length);
      const attributes = entries.filter( k => ! excludedAttributes.includes( k[0] ) );
      attributes.forEach( k => {
        const col = k[0];
        let elem = String( k[1] );

        // LG('Entry %s vs %s = %s', colUidInvoice, col, elem );

        if ( col === colUidInvoice ) {
          elem = String( `00${elem}` ).padStart( 9, '0' );
          secuencial = elem;
        }
        const parts = col.split( '.' );
        processColumn( parts, elem );
      } );
      // LG( `dcmnt` );
      // LG( dcmnt );
      LG( 'secuencial' );
      LG( secuencial );
      step();
    },

    processInvoiceDetails: step => {
      if ( ! dcmnt ) throw new Error( 'Cannot work with null document' );
      const details = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];
      // LG( IMPUESTOS );
      // LG( impuestos );

      Object.entries( dcmnt.detalles.detalle ).forEach( detail => {
        const o = getDetailsAttributes( detail );
        if ( o.attr === colUidDetail ) {
          details[o.idx][IMPUESTOS] = impuestos[o.idx];
        }

        details[o.idx][o.attr] = o.value;
      } );
      dcmnt.detalles.detalle = details.filter( detail =>
        detail.codigoPrincipal );

      impuestos = [];
      step();
    },

    prepareAccessKey: step => {
      if ( ! dcmnt ) throw new Error( 'Cannot work with null document : dcmnt' );
      if ( ! jsonInvoice ) throw new Error( 'Cannot work with null document : jsonInvoice' );

      LG( 'prepareAccessKey' );
      LG( jsonInvoice );

      const periods = dcmnt.infoFactura.fechaEmision.split( '/' );
      const fecha = new Date( periods[2], periods[1], periods[0] );
      LG( 'Invoicing date : %s', fecha );
      jsonInvoice.factura['#'].infoTributaria.secuencial = secuencial;
      const codigoNumerico = String( dcmnt.internal.codcliente.padStart( 8, '0' ) );

      const clave = String( ''.concat(
        String( fecha.getDate() ).padStart( 2, '0' ),
        String( fecha.getMonth() ).padStart( 2, '0' ),
        String( fecha.getFullYear() ),
        dcmnt.infoTributaria.codDoc,
        dcmnt.infoTributaria.ruc,
        dcmnt.infoTributaria.ambiente,
        dcmnt.infoTributaria.estab,
        dcmnt.infoTributaria.ptoEmi,
        secuencial,
        codigoNumerico,
        dcmnt.infoTributaria.tipoEmision
      ) );
      jsonInvoice.factura['#'].infoTributaria.claveAcceso = clave + checkDigit11( clave );

      step();
    },

    prepareXMl: step => {
      LG( 'Prepare XML' );
      LG( jsonInvoice );
      if ( dcmnt && dcmnt.internal ) {
        delete dcmnt.internal;
      }

      xmlResult = xmlResult.concat( o2x( jsonInvoice ) );

      step();
    },

    prepareTargetFile: step => {
      LG( 'Prepare Output File for invoice #%s', secuencial );

      fileInvoiceXML = prepareOutFile( secuencial );

      const targetFile = fileInvoiceXML.file;
      rm( targetFile, ( err ) => {
        // LG( `Trying to delete '${targetFile}'.` );
        if ( err ) {
          return console.error( `Unable to delete previous target file '${targetFile}' ::\n`, err );
        }
        // LG( `Did delete` );
        step();
      } );
    },

    writeOutFile: step => {
      if ( fileInvoiceXML && fileInvoiceXML.file ) {
        LG( 'Writing to "%s"', fileInvoiceXML.file );
        fileInvoiceXML( xmlResult );
        xmlResult = xmlHeader;
        step();
      } else {
        throw new Error( 'Found no file to write' );
      }
    },

    closeOutFile: step => {
      if ( fileInvoiceXML ) {
        fileInvoiceXML.endStream();
        LG( 'Done' );
        step();
      } else {
        throw new Error( 'Found no file stream to terminate' );
      }
    }

  }, ( err ) => {
    if ( err ) {
      LG( `Error: ${err}` );
    }
  } );
};

// export default class Home extends Component {
//   render() {
//     return (
//       <div>
//         <div className={styles.container} data-tid="container">
//           <h2>Home</h2>
//           <input
//             placeholder = "Try">
//           </input>
//           <Link to="/counter">to Counter</Link>
//         </div>
//       </div>
//     );
//   }
// }

// ==============
// type State = {
//   numInvoice: number
// };

// export default class Home extends React.Component<void, void, State> {
export default class Home extends React.Component {
  state: { numInvoice: number };
  constructor( ) {
    super( );
    this.state = {
      numInvoice: -1
    };
  }

  handleInvoiceNumber( e: SyntheticInputEvent & { currentTarget: HTMLInputElement } ) {
    // LG( `e.target.value %s`, e.target.value )
    this.setState( {
      numInvoice: Number.parseInt( e.currentTarget.value, 10 )
    } );
  }

  render() {
    return (
      <div>
        <br />
        <div className="well">
          <h4>Dashboard</h4>
          <Button
            bsStyle="success"
            bsSize="small"
            onClick={() => buildXMLDoc()}
          >
            Get Invoicing Data
          </Button>
          <br />
          <input
            onChange={this.handleInvoiceNumber.bind( this )}
            placeholder="Enter an invoice number"
          />
          <br />
          <Button
            bsStyle="success"
            bsSize="small"
            onClick={() => testSheetConnection( this.state.numInvoice )}
          >
            Quick Test
          </Button>
        </div>
      </div>
    );
  }
}
