// @flow
import React, { Component } from 'react';
import type { Children } from 'react';
import { Link } from 'react-router-dom';

export default class App extends Component {
  props: {
    children: Children
  };

  render() {
    return (
      <div>

        <nav className="navbar navbar-inverse visible-xs">
          <div className="container-fluid">
            <div className="navbar-header">
              <button type="button" className="navbar-toggle" data-toggle="collapse" data-target="#myNavbar">
                <span className="icon-bar" />
                <span className="icon-bar" />
                <span className="icon-bar" />
              </button>
              <Link className="navbar-brand" to="/">Logo</Link>
            </div>
            <div className="collapse navbar-collapse" id="myNavbar">
              <ul className="nav navbar-nav">
                <li><Link data-tid="lnk-Home" to="/">Home</Link></li>
                <li><Link data-tid="lnk-FileImport" to="/load">File Import</Link></li>
                <li><Link data-tid="lnk-Counter" to="/counter">Counter</Link></li>
              </ul>
            </div>
          </div>
        </nav>

        <div className="container-fluid">
          <div className="row content">
            <div className="col-sm-3 sidenav hidden-xs">
              <br />
              <h1>Iridium Blue</h1>
              <h2>Facturacion Electronica</h2>
              <ul className="nav nav-pills nav-stacked">
                <li><Link data-tid="link-Home" to="/">Home</Link></li>
                <li><Link data-tid="link-FileImport" to="/load">File Import</Link></li>
                <li><Link data-tid="link-Counter" to="/counter">Counter</Link></li>
              </ul>
            </div>

            <div className="clearfix visible-xs" />
            <div className="col-sm-9">
              {this.props.children}
            </div>
          </div>
        </div>

      </div>

    );
  }
}
