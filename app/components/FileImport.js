// @flow
import React, { Component } from 'react';
import styles from './Home.css';

import ReactDOM from 'react-dom';
import Files from 'react-files';
import ParseCSV from 'papaparse';


export default class FileImport extends Component {

  onFileRead( a, b ) {
    console.log( '  got  ');
    console.log(  a  );
    console.log(  b  );

  };

  onFilesChange(files) {
    const csvFile = files[0];
    console.log( csvFile );
    const val = `Column 1,Column 2,Column 3,Column 4
1-1,1-2,1-3,1-4
2-1,2-2,2-3,2-4
3-1,3-2,3-3,3-4
4,5,6,7`;

    let idx = null;
    let started = null;
    let attributeNames = null;
    const config = {
      delimiter: "," ,
      skipEmptyLines: true ,
      complete: () => { console.log(  'Done'  ); },
      beforeFirstChunk: () => {
        idx = 1;
        started = false;
      },

      step: ( results, parser ) => {
        const row = results.data[0];
        const obj = {};
        if ( row[0] === `# de Factura` ) {
          attributeNames = row;
          started = true;
          return;
        };
        if ( started ) {
          if ( true ) {
          // if ( row[0] > 0 ) {
            console.log( 'Row #%s', idx );
            // console.log( ` Col #3 %s = %s`, attributeNames[3], row[3] );
            row.map( ( elem, idx ) => obj[attributeNames[idx]] = elem );
            console.log( ` razonSocialComprador = %s`, obj.razonSocialComprador );
          };
        };
        idx++;
      }

    };
    // ParseCSV.parse(files[0], config)
    ParseCSV.parse( csvFile, config );

    // let res = ParseCSV.parse(files[0], { delimiter: "," }, (e) => {
    //   console.log( 'parsed ', e );
    // })


    // const csv = StreamCSV();
    // let reader = new FileReader();
    // reader.onload = (event) => {
    //   console.log( '  got  ');
    //   let the_data = event.target.result
    //   console.log(  the_data  );
    //   // $('#some_container_div').html("<img src='" + the_url + "' />")
    // }
    // reader.readAsText( files[0] );

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
        </div>
      </div>
    );
  }
}

// ReactDOM.render(<FileImport />, document.getElementById('container'));

