
export default (src) => {
  let res = src.toString().split('').reverse()
             .map( (elem, idx) => elem * (idx%6 + 2) )
             .reduce( (acc, val) => acc + val )%11;
  return res === 0 ? 0 : 11 - res;
}
