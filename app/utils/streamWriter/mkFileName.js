export default ( _prefix, _suffix ) => {
  const dt = new Date();
  const y = dt.getFullYear().toString();
  const m = ( dt.getMonth() + 1 ).toString().padStart( 2, '0' );
  const d = dt.getDate().toString().padStart( 2, '0' );

  return `${_prefix}_${y}${m}${d}.${_suffix}`;
};
