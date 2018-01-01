// @flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import fs from 'fs';
import rm from 'rimraf';

import async from 'async';
import GoogleSpreadsheet from 'google-spreadsheet';
import o2x from 'object-to-xml';

import { Button } from 'react-bootstrap';

import { _jsonInvoice, dayInvoicing, fileSpecs } from '../../settings';
import styles from './Home.css';
import Names from '../utils/constants/attrNamesMap'
import pathFinder from '../utils/streamWriter/findTargetPath';

import streamWriter from '../utils/streamWriter';
import checkDigit11 from '../utils/checkDigit11';

import soap from '../utils/soap';

const LG = console.log;

const creds_path = pathFinder( `sri_FacElec`, ``, ``, `LogichemAutoInvoiceServiceAcct.json` );
const IMPUESTOS = `impuestos`;

const colDay = `infofactura.totalsinimpuestos`;
const colMonth = `internal.subTotal_IVA0`;
const colYear = `infoFactura.totalDescuento`;

const colUidInvoice = `infotributaria.secuencial`;
const colUidDetail = `codigoPrincipal`;

let creds_json = null;
try {
    creds_json = JSON.parse( fs.readFileSync( creds_path, 'utf8' ) );
} catch(e) {
    LG('Error: Unable to load Google Sheets access credentials', e.stack);
}

let dcmnt = null;
let jsonInvoice = null;

const getDetailsAttributes = (detail) => {
  let uid = detail[0].split('_');
  let rslt = {};
  rslt.idx = uid[1] ? uid[1] - 1 : 0;
  rslt.attr = Names[uid[0]] ? Names[uid[0]] : uid[0];
  rslt.value = detail[1];
  return rslt;
}

let cnt = 0;
let impuestos = new Array();
const appendAttribute = ( obj, aryNames, value ) => {
  let name = aryNames.shift();
  if( name ) {
    cnt++;
    name = Names[name] ? Names[name] : name;
    if ( name === IMPUESTOS ) {
      let twigs = {};
      twigs[aryNames[0]] = {};
      let leaves = aryNames[1].split('_');
      twigs[aryNames[0]][leaves[0]] = value;
      impuestos.push( twigs );
    } else {
      if( ! obj[name] ) obj[name] = {};
      // LG( obj );
      if ( aryNames.length > 0 ) {
        appendAttribute( obj[name], aryNames, value );
      } else {
        obj[name] = value;
        return;
      }
    }
  }
};
const processColumn = ( aryColNames, value ) => {
  appendAttribute( dcmnt, aryColNames, value );
};

const excludedAttributes = [ `_xml`, `save`, `del`, `_links`, `id`, `app:edited`, `save`];
const wkbk = new GoogleSpreadsheet('1mGmXRn4dgVRmXmeqDrZ-zy88q-8ihqhXQoiR6-PJLoI');
// const exportSheet = `sandBox`;
const exportSheet = `SRI Export`;
let dataSet = null;
let row = null;
let secuencial = null;
let claveAcceso = null;

let xmlHeader = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
let xmlResult = xmlHeader;

let fileInvoiceXML = null;

const prepareOutFile = ( _secuencial ) => {
  let stream = streamWriter;

  stream.appName = fileSpecs.appName;
  stream.fileNameSuffix = fileSpecs.fileNameSuffixXML;
  stream.streamConfig = { flags: 'w+' }

  stream.initStreamConfig( `${fileSpecs.fileNamePrefix}_${_secuencial}` );

  LG( `Stream prepared : "%s"`, stream.file );
  return stream;
};

const testSheetConnection = ( _numInvoice ) => {

  let prefix = `${fileSpecs.fileNamePrefix}_${String( _numInvoice ).padStart(9, `0`)}`;

  if ( ! fileInvoiceXML || prefix !== fileInvoiceXML.fileNamePrefix ) {
    fileInvoiceXML = prepareOutFile( String( _numInvoice ).padStart(9, `0`) );
    LG( `new outfile %s`, fileInvoiceXML.file );
  } else {
    LG( `existing outfile %s`, fileInvoiceXML.file );
  }

  soap ( fileInvoiceXML.file );

};

const buildXMLDoc = () => {

  let wksht = null;
  let wksht_id = null;
  async.series({

    authenticate: step => {
      wkbk.useServiceAccountAuth(creds_json, step);
    },

    getExportationSheet: step => {
      wkbk.getInfo(function(err, info) {
        // LG('Loaded wkbk: '+info.title+' by '+info.author.email);
        info.worksheets.forEach( ( key, val ) => {
          if ( key.title === exportSheet ) {
            wksht_id = key.id;
            wksht = info.worksheets[val];
            // LG(`array #`, wksht.id);
          };
        });
        step();
      });
    },

    setTheDate: step => {

      wkbk.getRows( wksht_id, {
        offset: 1,
        limit: 1
      }, function( err, rows ) {
        let ii = 0;
        // LG( rows[ii][colDay] );
        rows[ii][colDay]   = dayInvoicing.Day;
        rows[ii][colMonth] = dayInvoicing.Month;
        rows[ii][colYear]  = dayInvoicing.Year;
        rows[ii].save(function( err ) {
          if ( err ) LG( `Saved row!\n%s`, err);
        });
        step();
      });
    },

    resetInvoiceAttributes: step => {
      jsonInvoice = _jsonInvoice;
      jsonInvoice.factura['#'].detalles = {};
      dcmnt = jsonInvoice.factura['#'];

      step();
    },


    getTheDataSet: step => {
      LG( wksht );
      wkbk.getRows( wksht_id, {
        offset: 4,
        limit: 200
      }, function( err, rows ) {
        // LG( `Read %s rows`, rows.length);
        dataSet = rows;
        step();
      });
    },

    processAnInvoice: step => {
      let ii = 0;
      row = dataSet[ii];
      // LG('processAnInvoice() :', row[`infotributaria.secuencial`] );
      let entries = Object.entries(row);
      // LG( `Read %s entries`, entries.length);
      let attributes = entries.filter( (k, v) => {
        if ( ! excludedAttributes.includes(k[0]) ) return k;
      });
      attributes.forEach( k => {
        let col = k[0];
        let elem = k[1];
        // LG('Entry %s vs %s = %s', colUidInvoice, col, elem );

        if ( col === colUidInvoice ) {
          elem = String("00" + elem).padStart(9, `0`);
          secuencial = elem;
        }
        let parts = col.split(`.`);
        processColumn( parts, elem );
      });
      // LG( `dcmnt` );
      // LG( dcmnt );
      LG( `secuencial` );
      LG( secuencial );
      step();
    },

    processInvoiceDetails: step => {
      let details = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];
      // LG( IMPUESTOS );
      // LG( impuestos );

      Object.entries(dcmnt.detalles.detalle).forEach( detail => {
        let o = getDetailsAttributes(detail);
        if ( o.attr === colUidDetail ) {
          details[o.idx][IMPUESTOS] = impuestos[o.idx];
        }

        details[o.idx][o.attr] = o.value;
      });
      dcmnt.detalles.detalle = details.filter( detail =>
        detail.codigoPrincipal
      );

      impuestos = new Array();
      step();
    },

    prepareAccessKey: step => {

      LG( `prepareAccessKey` );
      LG( jsonInvoice );

      let periods = dcmnt.infoFactura.fechaEmision.split('/');
      let fecha = new Date(periods[2], periods[1], periods[0]);
      LG( `Invoicing date : %s`, fecha );
      jsonInvoice.factura['#'].infoTributaria.secuencial = secuencial;
      let codigoNumerico = String(dcmnt.internal.codcliente.padStart(8, `0`));

      let clave = String(``.concat(
        String(fecha.getDate()).padStart(2, `0`),
        String(fecha.getMonth()).padStart(2, `0`),
        fecha.getFullYear(),
        dcmnt.infoTributaria.codDoc,
        dcmnt.infoTributaria.ruc,
        dcmnt.infoTributaria.ambiente,
        dcmnt.infoTributaria.estab,
        dcmnt.infoTributaria.ptoEmi,
        secuencial,
        codigoNumerico,
        dcmnt.infoTributaria.tipoEmision
      ));
      jsonInvoice.factura['#'].infoTributaria.claveAcceso = clave + checkDigit11(clave);

      step();
    },

    prepareXMl: step => {
      LG( `Prepare XML` );
      LG( jsonInvoice );
      delete dcmnt.internal;

      xmlResult = xmlResult.concat(o2x(jsonInvoice));

      step();
    },

    prepareOutFile: step => {
      LG( `Prepare Output File for invoice #%s`, secuencial );

      fileInvoiceXML = prepareOutFile( secuencial );

      const targetFile = fileInvoiceXML.file;
      rm( targetFile, function (err) {
        // LG( `Trying to delete '${targetFile}'.` );
        if ( err ) {
          return console.error( `Unable to delete previous target file '${targetFile}' ::\n`, err);
        }
        // LG( `Did delete` );
        step();
      });
    },

    writeOutFile: step => {
      LG( `Writing to "%s"`, fileInvoiceXML.file );
      fileInvoiceXML( xmlResult );
      xmlResult = xmlHeader;
      step();
    },

    closeOutFile: step => {
      fileInvoiceXML.endStream();
      LG(  'Done'  );
      step();
    }

  }, function(err){
      if( err ) {
        LG('Error: '+err);
      }
  });

  return;
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

export default class Home extends React.Component {
  constructor(props, context) {
  super(props, context);

    this.state = {
      num_invoice: -1
    };


    this.numInvoice = this.numInvoice.bind(this);
  }

  numInvoice(e) {
    // LG( `e.target.value %s`, e.target.value )
    this.setState({
      num_invoice: e.target.value
    });
  }

  render() {
    return (
      <div>
        <br/>
        <div className="well">
          <h4>Dashboard</h4>
          <Button
              bsStyle="success"
              bsSize="small"
              onClick={() => buildXMLDoc()}>
            Get Invoicing Data
          </Button>
          <br/ >
          <input onChange={this.numInvoice}
            placeholder = "Enter an invoice number">
          </input>
          <br/ >
          <Button
              bsStyle="success"
              bsSize="small"
              onClick={() => testSheetConnection(this.state.num_invoice)}>
            Quick Test
          </Button>
        </div>
      </div>
    );
  }
}
