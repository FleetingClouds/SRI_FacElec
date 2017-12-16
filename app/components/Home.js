// @flow
import React, { Component } from 'react';
import styles from './Home.css';

import { Button } from 'react-bootstrap';

export default class Home extends Component {
  render() {
    return (
      <div>
        <br/>
        <div className="well">
          <h4>Dashboard</h4>
          <p>Some text..</p>
          <Button
              bsStyle="success"
              bsSize="small"
              onClick={() => console.log(' yay ')}>
            Some thing
          </Button>
          <p>Some text..</p>
          <p>Some text..</p>
          <p></p>
        </div>
      </div>
    );
  }
}
