// @flow
import React, { Component } from 'react';

import Files from 'react-files';
import o2x from 'object-to-xml';
import ParseCSV from 'papaparse';

import streamWriter from '../utils/streamWriter';
import checkDigit11 from '../utils/checkDigit11';

const LG = console.log;

type XMLProto = { '@': { nombre: string }, '#': string };
type document = {
  internal: { codcliente: string },
  infoTributaria: {
    ambiente: string,
    tipoEmision: string,
    razonSocial: string,
    ruc: string,
    codDoc: string,
    estab: string,
    ptoEmi: string,
    dirMatriz: string,
    secuencial: string,
    claveAcceso: string
  },
  infoFactura: {
    fechaEmision: string,
     totalConImpuestos: {
      totalImpuesto: {
        codigo: 2,
        codigoPorcentaje: 2
      }
    }
  },
  detalles: { detalle: {} },
  infoAdicional: { campoAdicional: ( XMLProto )[] }
};

export default class FileImport extends Component {

  jsonFactura: {};
  theDocument: document;

  static onFilesError( error ) {
    LG( `error code ${error.code}: ${error.message}` );
  }

// $FlowFixMe
  onFilesChange( files ) {
    const csvFile = files[0];

    LG( 'xxxxxxxxxxxxxxxxxxx  csvFile xxxxxxxxxxxxxxxxxxxxxx' );
    LG( files );

    let rowNum = null;
    let started = null;
    let attributeNames = [];
    let rowOneFlag = null;
    let parts = [];

    const outFile = streamWriter;

    const config = {
      delimiter: ',',
      skipEmptyLines: true,

      complete: () => {
        outFile.endStream();
        LG( 'Done' );
      },

      beforeFirstChunk: () => {
        rowNum = 1;
        started = false;
        rowOneFlag = 'infoTributaria.secuencial';

        outFile.appName = 'sri_FacElec';
        outFile.fileNamePrefix = 'invoice';
        outFile.fileNameSuffix = 'xml';
        outFile.streamConfig = { flags: 'w' };

        const dcmnt: document = this.theDocument;

        this.jsonFactura = {};
        this.jsonFactura.factura = {
          '@': { version: '1.0.0', id: 'comprobante' },
          '#': dcmnt
        };

        if ( ! dcmnt.infoTributaria ) dcmnt.infoTributaria = {};
        dcmnt.infoTributaria.ambiente = '1';
        dcmnt.infoTributaria.tipoEmision = '1';
        dcmnt.infoTributaria.razonSocial = 'Logichem Solutions Sociedad Anonima';
        dcmnt.infoTributaria.ruc = '1792177758001';
        dcmnt.infoTributaria.codDoc = String( '01' );
        dcmnt.infoTributaria.estab = String( '001' );
        dcmnt.infoTributaria.ptoEmi = String( '001' );
        dcmnt.infoTributaria.dirMatriz = 'Av. Interoceanica S/N, Pichincha, Quito, Cumbaya';

        // dcmnt.infoFactura.tipoDeComprobante = 1;
        // const xml: ( ?XMLProto )[] = [null];
        const xml = [];
        dcmnt.infoAdicional.campoAdicional = xml;
        dcmnt.infoAdicional.campoAdicional.push( {
          '@': { nombre: 'Dirección' },
          '#': 'Av. Interoceanica S/N, Pichincha, Quito, Cumbaya'
        } );
        dcmnt.infoAdicional.campoAdicional.push( {
          '@': { nombre: 'Teléfono' },
          '#': '1-503-882-7179'
        } );
        dcmnt.infoAdicional.campoAdicional.push( {
          '@': { nombre: 'Email' },
          '#': 'logichemec@gmail.com'
        } );

        this.theDocument = dcmnt;
      },

      step: ( results ) => {
        const row = results.data[0];
        const dcmnt: document = this.theDocument;
        let numDetail = -1;
        LG( 'Factura #%s', row[0] );
        if ( row[0] === rowOneFlag ) {
          attributeNames = row;
          started = true;
          return;
        }
        if ( started ) {
          if ( ! dcmnt ) {
            throw new Error( 'Cannot work with null document' );
          }

          if ( rowNum === 11 ) {
            LG( 'Row #%s', rowNum );
            row.map( ( elem, idx ) => {
              if ( elem ) {
                parts = attributeNames[idx].split( '.' );
                switch ( parts.length ) {
                  case 0:
                    break;
                  case 1:
                    dcmnt[parts[0]] = elem;
                    break;
                  case 2:
                    dcmnt[parts[0]][parts[1]] = elem;
                    // LG( `|| dcmnt.%s.%s = %s`, parts[0], parts[1], elem );
                    break;
                  case 3:
                    // LG( `||| dcmnt.%s.%s.%s = %s`, parts[0], parts[1], parts[2], elem );
                    if ( numDetail < 0 && attributeNames[idx] === 'detalles.detalle.codigoPrincipal' ) {
                      dcmnt[parts[0]][parts[1]] = [];
                      numDetail = 0;
                    }
                    if ( numDetail > -1 && attributeNames[idx] === 'detalles.detalle.codigoPrincipal' ) {
                      dcmnt[parts[0]][parts[1]].push( { codigoPrincipal: elem } );
                      numDetail += 1;
                    } else if ( numDetail > -1 ) {
                      // LG( `C %s.%s[%s].%s`, parts[0], parts[1], numDetail-1, parts[2] );
                      // LG( dcmnt[parts[0]][parts[1]][numDetail-1] );
                      dcmnt[parts[0]][parts[1]][numDetail - 1][parts[2]] = elem;
                    } else {
                      dcmnt[parts[0]][parts[1]][parts[2]] = elem;
                    }
                    break;
                  case 4:
                    dcmnt[parts[0]][parts[1]][parts[2]][parts[3]] = elem;
                    // LG( `|||| dcmnt.%s.%s.%s.%s = %s`
                    //   , parts[0], parts[1], parts[2], parts[3], elem );
                    break;
                  case 5:
                    // LG( `|||| dcmnt.%s.%s.%s.%s.%s = %s`
                    //   , parts[0], parts[1], [numDetail-1], parts[2], parts[3], parts[4], elem );
                    dcmnt[parts[0]][parts[1]][numDetail - 1][parts[2]] = {};
                    dcmnt[parts[0]][parts[1]][numDetail - 1][parts[2]][parts[3]] = {};
                    dcmnt[parts[0]][parts[1]][numDetail - 1][parts[2]][parts[3]][parts[4]] = elem;
                    // LG( dcmnt[parts[0]][parts[1]][numDetail-1][parts[2]] );
                    break;
                  default:
                    throw new Error( 'Did not expect more than 5 levels of nesting.' );
                }
              }
              return dcmnt;
            } );

            const periods: Array<number> = dcmnt.infoFactura.fechaEmision
                                            .split( '/' )
                                            .map( x => Number.parseInt( x, 10 ) );
            const fecha: Date = new Date( periods[0], periods[1], periods[2] );
            LG( '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  fecha : %s', fecha );
            const secuencial = String( `00${dcmnt.infoTributaria.secuencial}` ).padStart( 9, '0' );
            dcmnt.infoTributaria.secuencial = secuencial;
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
            dcmnt.infoTributaria.claveAcceso = clave + checkDigit11( clave );
            delete dcmnt.internal;
            // 2017-10-23 1 1792177758001 1 001 001 000007557 00000296 1

            const xmlResult = '<?xml version="1.0" encoding="UTF-8" ?>\n'.concat( o2x( this.jsonFactura ) );
            // LG( `Document` );
            // LG( xmlResult );
            outFile.fileNamePrefix = `fac_${secuencial}`;
            outFile( xmlResult );


            // LG(JSON.stringify( dcmnt.infoAdicional ) );
            // LG(o2x(dcmnt.infoAdicional));

            // LG( dcmnt );
          }
        }
        rowNum += 1;
        this.theDocument = dcmnt;
      }

    };

    ParseCSV.parse( csvFile, config );
  }

  render() {
    LG( 'file browser ' );
    return (
      <div>
        <br />
        <div className="well">
          <h3>File Import</h3>
          <div className="files">
            <Files
              className="files-dropzone"
              onChange={this.onFilesChange}
              onError={error => LG( `error code ${error.code}: ${error.message}` )}
              maxFileSize={10000000}
              minFileSize={0}
              clickable
            >
              Choose a CSV file of sales document data.
            </Files>
          </div>
          <hr />
        </div>
      </div>
    );
  }
}
//               accepts={['text/csv']}

// ReactDOM.render(<FileImport />, document.getElementById('container'));
