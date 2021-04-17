function createTooltip() {
  d3.select('#visRow')
    .append('div')
    .style('opacity', 0)
    .attr('id', 'tooltip')
    .style('background-color', 'white')
    .style('border', 'solid')
    .style('border-width', '2px')
    .style('border-radius', '5px')
    .style('padding', '5px');
}

function searchText(inputValue) {
  if (inputValue.length >= 3) {
    // d3.selectAll('.artifactContainer')
    // .

    d3.selectAll('g')
    // since the brush adds several g elements we do not want to select, we need to filter them.
      .filter(function () { return d3.select(this).attr('class').indexOf('-view') !== -1; })
      .filter((d) => {
        if (d.id.includes(inputValue)) {
          return true;
        }
        return false;
      })
      .style('opacity', 1);
    // .select('rect')
    // .style('fill', 'yellow');

    d3.selectAll('g')
    // since the brush adds several g elements we do not want to select, we need to filter them.
      .filter(function () { return d3.select(this).attr('class').indexOf('-view') !== -1; })
      .filter((d) => {
        if (d.id.includes(inputValue)) {
          return false;
        }
        return true;
      })
      // .select('rect')
      .style('opacity', 0.1);
    console.log(inputValue);
  } else {
    d3.selectAll('g')
      .style('opacity', 1);
  }
}

export { createTooltip, searchText };
