/* eslint-disable max-len */
// // the passed array gets sorted by attr. attr needs to be a String.
// /**
//  *
//  * @param {Array} arr
//  * @param {string} attr
//  */
// function sortWrapper(arr, attr) {
//   // just for testing
//   let nullCounter = 0;
//   // just for testing
//   arr.forEach((lib) => {
//     if (lib[attr] == null) {
//       nullCounter += 1;
//     }
//   });
//   // just for testing
//   console.log('nullCounter');
//   console.log(nullCounter);

//   // descending order.
//   arr.sort((a, b) => b[attr] - a[attr]);
// }

// /**
//  * atrOnePath and atrTwoPath contain the path to the elements of interest.
//  *   i.e. the path [user, adress, city] would give us THIS VALUE
//  *   {
//  *     id:
//  *     user: {
//  *        name:
//  *        tele:
//  *        adress: {
//  *           city: THIS VALUE!
//  *           ...
//  *
//  * @param {Object[]} data
//  * @param {Array.<string>} atrOnePath
//  * @param {Array.<string>} atrTwoPath
//  */
// function getTwoAttributesNested(data, atrOnePath, atrTwoPath, objId) {
//   const ret = [];
//   data.forEach((d) => {
//     const xVal = atrOnePath.reduce((obj, key) => ((obj && obj[key] !== 'undefined') ? obj[key] : undefined), d);
//     const yVal = atrTwoPath.reduce((obj, key) => ((obj && obj[key] !== 'undefined') ? obj[key] : undefined), d);
//     const iD = objId.reduce((obj, key) => ((obj && obj[key] !== 'undefined') ? obj[key] : undefined), d);
//     ret.push({ x: xVal, y: yVal, id: iD });
//   });
//   return ret;
// }

/**
 * Calculates the max edgeLengt for artifact
 * such that all artifacts fit into the screenspace for the given svgDim.
 * @param {Number} numberOfArtifact - number of datapoints we want to display.
 * @param {Object} svgDim - width: and height:
 * @returns {Number} - max edge length.
 */
function calcEdgeLen(numberOfArtifact, svgDim) {
  const { width } = svgDim;
  const { height } = svgDim;

  const pixelTotal = width * height;
  const pixelPerArtifact = pixelTotal / numberOfArtifact;
  const edgeLength = Math.floor(Math.sqrt(pixelPerArtifact));
  return edgeLength;
}

function getUniquePart(id) {
  // elem ids have the form app-view-svg or app-view. We are interested in the first part.
  return id.split('-')[0];
}

function createTooltip() {
  d3.select('#viscontainer')
    .insert('div')
    .attr('id', 'tooltip')
    .style('opacity', 0);
}

const colorscales = {
  cve: d3.scaleThreshold() /// / original nist color
    .domain([0.1, 4.0, 7.0, 9.0])
    .range(['darkgrey', '#ffe358', '#edb15c', '#d9534f', 'black']), // original nist color: f2cc0c

  goodall: d3.scaleThreshold() // paper goodall et al.
    .domain([1, 2, 3, 4, 5, 6, 7, 8, 9])
    .range(['darkgrey', '#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#253494', '#081d58']),

  linear: d3.scaleLinear()
    .domain([1, 739])
    .range(['#deebf7', '#3182bd']),

  log: d3.scaleLog()
    .domain([1, 739]) // domain cannot start at 0!! log.
    .range(['#deebf7', '#3182bd']),
};

export {
  // eslint-disable-next-line max-len
  calcEdgeLen, getUniquePart, createTooltip, colorscales,
};
