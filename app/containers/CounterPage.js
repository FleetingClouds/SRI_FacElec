// @flow
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Counter from '../components/Counter';
import * as CounterActions from '../actions/counter';

function mapStateToProps( state ) {
  if ( ! state ) throw new Error( 'No state parameter was received.' );
  return {
    counter: state.counter
  };
}

function mapDispatchToProps( dispatch ) {
  if ( ! dispatch ) throw new Error( 'No dispatch parameter was received.' );
  return bindActionCreators( CounterActions, dispatch );
}

// $FlowFixMe
export default connect( mapStateToProps, mapDispatchToProps )( Counter );
