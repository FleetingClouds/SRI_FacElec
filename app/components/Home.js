// @flow
import React, { Component } from 'react';
import styles from './Home.css';

import async from 'async';
import GoogleSpreadsheet from 'google-spreadsheet';
import fs from 'fs';

import { Button } from 'react-bootstrap';

import pathFinder from '../utils/streamWriter/findTargetPath';
const creds_path = pathFinder( `sri_FacElec`, ``, ``, `LogichemAutoInvoiceServiceAcct.json` );

let creds_json = null;
try {
    creds_json = JSON.parse( fs.readFileSync( creds_path, 'utf8' ) );
} catch(e) {
    console.log('Error: Unable to load Google Sheets access credentials', e.stack);
}

// spreadsheet key is the long id in the sheets URL
/*
https://docs.google.com/spreadsheets/d/e/
2PACX-1vRlibjn9tCv-8YaaTMxUuWvKdo8uSFxLNcdcAH6xdMYWtBTSRsAmPYjKs8Gl47hi5PriWlQozQA3fFy
/pub?gid=1836965000&single=true&output=csv
*/

const testSheetConnectionxx = () => {
  console.log(' Creds email is : ', creds_json.client_email);
};



const wkbk = new GoogleSpreadsheet('1mGmXRn4dgVRmXmeqDrZ-zy88q-8ihqhXQoiR6-PJLoI');
// const exportSheet = `sandBox`;
const exportSheet = `SRI Export`;
const testSheetConnection = () => {

  let wksht = null;
  let wksht_id = null;
  async.series({

    authenticate: (step) => {
      wkbk.useServiceAccountAuth(creds_json, step);
    },

    getExportationSheet: (step) => {
      wkbk.getInfo(function(err, info) {
        console.log('Loaded wkbk: '+info.title+' by '+info.author.email);
        info.worksheets.forEach( ( key, val ) => {
          if ( key.title === exportSheet ) {
            wksht_id = key.id;
            wksht = info.worksheets[val];
            console.log(`array #`, wksht.id);
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
        rows[ii][colDay] = 10;
        rows[ii][colMonth] = 10;
        rows[ii][colYear] = 2017;
        rows[ii].save(function( err ) {
          if ( err ) console.log( `Saved row!\n%s`, err);
        });
        step();
      });
    },

    // waitForTheCorrectDate: (step) => {
    //   wkbk.getCells( wksht_id, {
    //     'min-row': 5,
    //     'min-col': 3,
    //     'max-col': 3,
    //     'return-empty': true
    //   }, function(err, cells) {
    //     cells.forEach( ( cell, err ) => {
    //       try {
    //         console.log('Cell R%sC%s = %s', cell.row, cell.col, cell.value);
    //       } catch(e) {
    //         console.log('Oh dear! \n%s', e);
    //       }
    //     });
    //     console.log('Passed end');
    //     step();
    //   });
    // },

    getTheInvoices: (step) => {
      console.log('wksht.getRows() :', wksht);
      wkbk.getRows( wksht_id, {
        offset: 4,
        limit: 200
      }, function( err, rows ) {
        console.log( `Read %s rows`, rows.length);
        let ii = 0;
        rows.forEach( ( row, err ) => {
          console.log('Row #%s has :', ii++);
          console.log( row[`infotributaria.secuencial`] );
        });
        step();
      });
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
