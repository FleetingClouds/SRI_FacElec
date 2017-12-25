// @flow
import React, { Component } from 'react';
import styles from './Home.css';

import streamWriter from '../utils/streamWriter';

import ReactDOM from 'react-dom';
import Files from 'react-files';
import o2x from 'object-to-xml';
import { Button } from 'react-bootstrap';
import ParseCSV from 'papaparse';

let dcmnt = null;
let jsonFactura = null;

export default class FileImport extends Component {

  onFilesChange(files) {
    const csvFile = files[0];

    let row_num = null;
    let started = null;
    let attributeNames = null;
    let rowOneFlag = null;
    let parts = [];
    let outFile = streamWriter;
    let doingDetails = false;

    const config = {
      delimiter: "," ,
      skipEmptyLines: true ,

      complete: () => {
        outFile.endStream();
        console.log(  'Done'  );
      },

      beforeFirstChunk: () => {
        row_num = 1;
        started = false;
        rowOneFlag = `infoTributaria.secuencial`;

        outFile.appName = `sri_FacElec`;
        outFile.fileNamePrefix = `invoice`;
        outFile.fileNameSuffix = `xml`;
        outFile.streamConfig = { flags: 'w' }

        dcmnt = {
          internal: {},
          infoTributaria: {},
          infoFactura: { totalConImpuestos: { totalImpuesto: { codigo: 2, codigoPorcentaje: 2 } } },
          detalles: { detalle: {} },
          infoAdicional: { campoAdicional: {} }
        }

        jsonFactura = {};
        jsonFactura.factura = {
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
      },
      step: ( results, parser ) => {
        const row = results.data[0];
        let doingDetails = false;
        let numDetail = -1;
        console.log( 'Factura #%s', row[0] );
        if ( row[0] === rowOneFlag ) {
          attributeNames = row;
          started = true;
          return;
        };
        if ( started ) {
          if ( row_num === 11 ) {
            console.log( 'Row #%s', row_num );
            row.map( ( elem, idx ) => {
              if ( elem ) {
                parts = attributeNames[idx].split(`.`);
                switch ( parts.length ) {
                  case 0:
                    break;
                  case 1:
                    dcmnt[parts[0]] = elem;
                    break;
                  case 2:
                    dcmnt[parts[0]][parts[1]] = elem;
                    // console.log( `|| dcmnt.%s.%s = %s`, parts[0], parts[1], elem );
                    break;
                  case 3:
                    // console.log( `||| dcmnt.%s.%s.%s = %s`, parts[0], parts[1], parts[2], elem );
                    if ( numDetail < 0 && attributeNames[idx] === `detalles.detalle.codigoPrincipal` ) {
                      dcmnt[parts[0]][parts[1]] = [];
                      numDetail = 0;
                    }
                    if ( numDetail > -1 && attributeNames[idx] === `detalles.detalle.codigoPrincipal`) {
                      dcmnt[parts[0]][parts[1]].push( { codigoPrincipal: elem } );
                      numDetail++;
                    } else if ( numDetail > -1 ) {
                      // console.log( `C %s.%s[%s].%s`, parts[0], parts[1], numDetail-1, parts[2] );
                      // console.log( dcmnt[parts[0]][parts[1]][numDetail-1] );
                      dcmnt[parts[0]][parts[1]][numDetail-1][parts[2]] = elem;
                    } else {
                      dcmnt[parts[0]][parts[1]][parts[2]] = elem;
                    }
                    break;
                  case 4:
                    dcmnt[parts[0]][parts[1]][parts[2]][parts[3]] = elem;
                    // console.log( `|||| dcmnt.%s.%s.%s.%s = %s`, parts[0], parts[1], parts[2], parts[3], elem );
                    break;
                  case 5:
                    // console.log( `|||| dcmnt.%s.%s.%s.%s.%s = %s`, parts[0], parts[1], [numDetail-1], parts[2], parts[3], parts[4], elem );
                    dcmnt[parts[0]][parts[1]][numDetail-1][parts[2]] = {};
                    dcmnt[parts[0]][parts[1]][numDetail-1][parts[2]][parts[3]] = {};
                    dcmnt[parts[0]][parts[1]][numDetail-1][parts[2]][parts[3]][parts[4]] = elem;
                    // console.log( dcmnt[parts[0]][parts[1]][numDetail-1][parts[2]] );
                    break;
                }
              }
            });

            let periods = dcmnt.infoFactura.fechaEmision.split('/');
            let fecha = new Date(periods[2], periods[1], periods[0]);
            console.log( `fecha : %s`, fecha );
            let secuencial = String("00" + dcmnt.infoTributaria.secuencial).padStart(9, `0`);
            dcmnt.infoTributaria.secuencial = secuencial;
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
            dcmnt.infoTributaria.claveAcceso = clave + checkDigit11(clave);
            delete dcmnt.internal;
            // 2017-10-23 1 1792177758001 1 001 001 000007557 00000296 1

            const xmlResult = `<?xml version="1.0" encoding="UTF-8" ?>\n`.concat(o2x(jsonFactura));
            // console.log( `Document` );
            // console.log( xmlResult );
            outFile.fileNamePrefix = `fac_${secuencial}`;
            outFile( xmlResult );



            // console.log(JSON.stringify( dcmnt.infoAdicional ) );
            // console.log(o2x(dcmnt.infoAdicional));

            // console.log( dcmnt );
          }
        };
        row_num++;
      }

    };

    ParseCSV.parse( csvFile, config );

  };

  onFilesError(error, file) {
    console.log('error code ' + error.code + ': ' + error.message)
  };

  render() {
    console.log('file browser ');
    return (
      <div>
        <br/>
        <div className="well">
          <h3>File Import</h3>
          <div className="files">
            <Files
              className='files-dropzone'
              onChange={this.onFilesChange}
              onError={this.onFilesError}
              accepts={['text/csv']}
              maxFileSize={10000000}
              minFileSize={0}
              clickable
            >
              <a>Choose a CSV file of sales document data</a>
            </Files>
          </div>
          <hr/>
        </div>
      </div>
    );
  }
}

// ReactDOM.render(<FileImport />, document.getElementById('container'));

