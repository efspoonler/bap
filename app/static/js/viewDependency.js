/*
* work in progress. This functionality is called when a user clicks and holds an artifact
* for more than 500ms.
*/
function removeDependencyGraph() {
  d3.select('#dependency-canvas')
    .remove();
}

export default function createDependencyGraph() {
  /*
  * at first we create the canvas (svg)
  */
  const canvas = document.getElementById('visRow');
  const canvasWidth = canvas.clientWidth;
  const canvasHeight = canvas.clientHeight;

  d3.select('#visRow')
    .append('svg')
    .attr('id', 'dependency-canvas')
    // .attr('viewBox', `0 0 ${canvasWidth} ${canvasHeight}`) // -30 padding
    .attr('width', canvasWidth)
    .attr('height', canvasHeight)
    .attr('style', 'position:absolute');

  d3.select('#dependency-canvas') // test
    .append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('style', 'fill:blue');
  // .append('g')
  // .attr('id', 'close-window')
  // .attr('translate')
  d3.select('#dependency-canvas') // test
    .append('circle')
    .attr('cx', `${canvasWidth - 13}`)
    .attr('cy', '13px')
    .attr('r', 13)
    .attr('fill', 'red')
    .on('click', removeDependencyGraph);

  // end of canvas creation
}
