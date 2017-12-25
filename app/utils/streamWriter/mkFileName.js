export default ( _prefix, _suffix ) => {
  let dt = new Date();
  let y = dt.getFullYear().toString();
  let m = ( dt.getMonth() + 1 ).toString();
  let d = dt.getDate().toString();

  return `${_prefix}_${y}${m}${d}.${_suffix}`;
}
