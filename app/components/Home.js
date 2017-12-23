// @flow
import React, { Component } from 'react';
import fs from 'fs';

import async from 'async';
import GoogleSpreadsheet from 'google-spreadsheet';
import o2x from 'object-to-xml';

import { Button } from 'react-bootstrap';

import styles from './Home.css';
import Names from '../utils/constants/attrNamesMap'
import pathFinder from '../utils/streamWriter/findTargetPath';

const creds_path = pathFinder( `sri_FacElec`, ``, ``, `LogichemAutoInvoiceServiceAcct.json` );

let creds_json = null;
try {
    creds_json = JSON.parse( fs.readFileSync( creds_path, 'utf8' ) );
} catch(e) {
    console.log('Error: Unable to load Google Sheets access credentials', e.stack);
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
// let impuestos = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];
let impuestos = [];
const appendAttribute = ( obj, aryNames, value ) => {
  let name = aryNames.shift();
  if( name ) {
    cnt++;
    name = Names[name] ? Names[name] : name;
    if ( name === "impuestos" ) {
      // if ( ! obj[name] ) obj[name] = {};
      // if ( ! obj[name][aryNames[0]] ) obj[name][aryNames[0]] = {};
      // obj[name][aryNames[0]] = {};

      // console.log( `Special treatment at %s Name = %s Value = %s`, cnt, name, value );
      // console.log( aryNames );
      // console.log( obj );
      let twig = {};
      twig[aryNames[0]] = {};
      let x = aryNames[1].split('_');
      twig[aryNames[0]][x[0]] = value;
      // console.log( twig );
      impuestos.push( twig );
    } else {
      if( ! obj[name] ) obj[name] = {};
      // console.log( obj );
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
const testSheetConnection = () => {

  let wksht = null;
  let wksht_id = null;
  async.series({

    authenticate: (step) => {
      wkbk.useServiceAccountAuth(creds_json, step);
    },

    getExportationSheet: (step) => {
      wkbk.getInfo(function(err, info) {
        // console.log('Loaded wkbk: '+info.title+' by '+info.author.email);
        info.worksheets.forEach( ( key, val ) => {
          if ( key.title === exportSheet ) {
            wksht_id = key.id;
            wksht = info.worksheets[val];
            // console.log(`array #`, wksht.id);
          };
        });
        step();
      });
    },

    setTheDate: (step) => {
      // console.log('wksht.getRows() :', wksht);
      const colDay = `infofactura.totalsinimpuestos`;
      const colMonth = `internal.subTotal_IVA0`;
      const colYear = `infoFactura.totalDescuento`;

      wkbk.getRows( wksht_id, {
        offset: 1,
        limit: 1
      }, function( err, rows ) {
        let ii = 0;
        // console.log( rows[ii][colDay] );
        rows[ii][colDay] = 28;
        rows[ii][colMonth] = 11;
        rows[ii][colYear] = 2017;
        rows[ii].save(function( err ) {
          if ( err ) console.log( `Saved row!\n%s`, err);
        });
        step();
      });
    },

    resetInvoiceAttributes: (step) => {
      dcmnt = {
        infoTributaria: {},
        infoAdicional: { campoAdicional: {} }
        // internal: { codCliente: {} },
        // infoFactura: { totalConImpuestos: { totalImpuesto: { codigo: 2, codigoPorcentaje: 2 } } },
        // detalles: { detalle: {} },
      }

      jsonInvoice = {};
      jsonInvoice.factura = {
        '@' : { version : `1.0.0`, id: `comprobante` },
        '#' : dcmnt
      };

      dcmnt.infoTributaria.ambiente = 1;
      dcmnt.infoTributaria.tipoEmision = 1;
      dcmnt.infoTributaria.razonSocial = `Logichem Solutions Sociedad Anonima`;
      dcmnt.infoTributaria.ruc = `1792177758001`;
      dcmnt.infoTributaria.codDoc = String(`01`);
      dcmnt.infoTributaria.estab = String(`001`);
      dcmnt.infoTributaria.ptoEmi = String(`001`);
      dcmnt.infoTributaria.dirMatriz = `Av. Interoceanica S/N, Pichincha, Quito, Cumbaya`;

      // dcmnt.infoFactura.tipoDeComprobante = 1;

      dcmnt.infoAdicional.campoAdicional = [];
      dcmnt.infoAdicional.campoAdicional.push({
         '@': { nombre: "Dirección" },
         '#': `Av. Interoceanica S/N, Pichincha, Quito, Cumbaya`
      });
      dcmnt.infoAdicional.campoAdicional.push({
         '@': { nombre: "Teléfono" },
         '#': `1-503-882-7179`
      });
      dcmnt.infoAdicional.campoAdicional.push({
         '@': { nombre: "Email" },
         '#': `logichemec@gmail.com`
      });
      step();
    },


    getTheDataSet: (step) => {
      console.log( wksht );
      wkbk.getRows( wksht_id, {
        offset: 4,
        limit: 200
      }, function( err, rows ) {
        // console.log( `Read %s rows`, rows.length);
        dataSet = rows;
        step();
      });
    },

    processAnInvoice: (step) => {
      let ii = 0;
      row = dataSet[ii];
      // console.log('processAnInvoice() :', row[`infotributaria.secuencial`] );
      let entries = Object.entries(row);
      // console.log( `Read %s entries`, entries.length);
      let attributes = entries.filter( (k, v) => {
        if ( ! excludedAttributes.includes(k[0]) ) return k;
      });
      attributes.forEach( k => {
        let col = k[0];
        let elem = k[1];
        // console.log('Entry %s = %s', col, elem );
        let parts = col.split(`.`);
        processColumn( parts, elem );
      });
      // console.log( `dcmnt` );
      // console.log( dcmnt );
      step();
    },

    processInvoiceDetails: (step) => {
      let details = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];
      console.log( `impuestos` );
      console.log( impuestos );
      Object.entries(dcmnt.detalles.detalle).forEach( detail => {
        let o = getDetailsAttributes(detail);
        if ( o.attr === `codigoPrincipal` ) {
          details[o.idx][`impuestos`] = impuestos[o.idx];
          // console.log( `Index %s`, o.idx );
          // console.log( impuestos[o.idx] );
        // } else {
        }

        // console.log( `At details[%s][%s] = %s;`, o.idx, o.attr, o.value );
        details[o.idx][o.attr] = o.value;
      });
      dcmnt.detalles.detalle = details.filter( detail =>
        detail.codigoPrincipal
      );
      // console.log( `Details!` );
      // console.log( dcmnt.detalles );
      step();
    },

    prepareXMl: (step) => {
      console.log( `Prepare XML` );
      delete dcmnt.internal;
      const xmlResult = `<?xml version="1.0" encoding="UTF-8" ?>\n`
                        .concat(o2x(dcmnt));
      // console.log( `Document` );
      console.log( xmlResult );
      // outFile.fileNamePrefix = `fac${secuencial}`;
      // outFile( xmlResult );
      step();
    }



  }, function(err){
      if( err ) {
        console.log('Error: '+err);
      }
  });

  return;
};

export default class Home extends Component {

  render() {
    return (
      <div>
        <br/>
        <div className="well">
          <h4>Dashboard</h4>
          <Button
              bsStyle="success"
              bsSize="small"
              onClick={() => testSheetConnection()}>
            Get Invoicing Data
          </Button>
          <div id="result">Some text..</div>
          <p></p>
        </div>
      </div>
    );
  }
}
