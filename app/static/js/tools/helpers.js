// the passed array gets sorted by attr. attr needs to be a String.
/**
 *
 * @param {Array} arr
 * @param {string} attr
 */
function sortWrapper(arr, attr) {
  // just for testing
  let nullCounter = 0;
  // just for testing
  arr.forEach((lib) => {
    if (lib[attr] == null) {
      nullCounter += 1;
    }
  });
  // just for testing
  console.log('nullCounter');
  console.log(nullCounter);

  // descending order.
  arr.sort((a, b) => b[attr] - a[attr]);
}

/**
 * atrOnePath and atrTwoPath contain the path to the elements of interest.
 *   i.e. the path [user, adress, city] would give us THIS VALUE
 *   {
 *     id:
 *     user: {
 *        name:
 *        tele:
 *        adress: {
 *           city: THIS VALUE!
 *           ...
 *
 * @param {Object[]} data
 * @param {Array.<string>} atrOnePath
 * @param {Array.<string>} atrTwoPath
 */
function getTwoAttributesNested(data, atrOnePath, atrTwoPath, objId) {
  const ret = [];
  data.forEach((d) => {
    const xVal = atrOnePath.reduce((obj, key) => ((obj && obj[key] !== 'undefined') ? obj[key] : undefined), d);
    const yVal = atrTwoPath.reduce((obj, key) => ((obj && obj[key] !== 'undefined') ? obj[key] : undefined), d);
    const iD = objId.reduce((obj, key) => ((obj && obj[key] !== 'undefined') ? obj[key] : undefined), d);
    ret.push({ x: xVal, y: yVal, id: iD });
  });
  return ret;
}

function calcEdgeLen(numberOfArtifact, svgDim) {
  const { width } = svgDim;
  const { height } = svgDim;

  const pixelTotal = width * height;
  const pixelPerArtifact = pixelTotal / numberOfArtifact;
  const edgeLength = Math.floor(Math.sqrt(pixelPerArtifact));
  return edgeLength;
}

function getUniquePart(id) {
  return id.split('-')[0]; // elem ids have the form app-view-svg or app-view. We are interested in the first part.
}

function createTooltip() {
  d3.select('#viscontainer')
    .insert('div')
    .attr('id', 'tooltip')
    .style('opacity', 0);
}

export {
  sortWrapper, getTwoAttributesNested, calcEdgeLen, getUniquePart, createTooltip,
};
