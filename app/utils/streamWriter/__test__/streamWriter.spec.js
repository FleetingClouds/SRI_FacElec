import writer from '../writer';

describe( 'writer', () => {
  it( 'should handle initial state', () => {
    expect( writer().ret() ).toEqual( 999 );
  } );
  it( 'should set default values', () => {
    expect( writer().maxSize ).toEqual( 1024 * 1024 );
  } );
  it( 'should receive alternate values', () => {
    expect( writer( { maxSize: 2000000 } ).maxSize ).toEqual( 2000000 );
  } );
} );
