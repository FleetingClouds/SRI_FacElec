import findTargetPath from '../findTargetPath';

describe( 'findTargetPath', () => {
  it( 'should handle initial state', () => {
    console.log( '............... findTargetPath .................. ' );
    console.log( findTargetPath() );

    expect( 999 ).toEqual( 999 );
  } );
} );
