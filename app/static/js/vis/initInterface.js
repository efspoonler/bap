/* eslint-disable no-underscore-dangle */
import EventEmitter from '../events.js';

export default class ViewControlls extends EventEmitter {
  constructor(callingViewDiv) {
    super();
    this._rootDivId = `${callingViewDiv}-menu`;
    [this._prefix] = callingViewDiv.split('-');
    this._rootDiv = d3.select(`#${this._rootDivId}`);
  }

  initViewControlls() {
    const checkBoxId = `${this._rootDivId}-dynamicCheckbox`;
    console.log('init viewControlls');
    const checkBoxDiv = this._rootDiv
      .append('div')
      .attr('id', `${this._rootDivId}-div-dynamicCheckbox`)
      .attr('class', 'form-check')
      .attr('style', 'display: true');

    checkBoxDiv
      .append('input')
      .attr('class', 'from-check-input')
      .attr('type', 'checkbox')
      .attr('id', checkBoxId)
      .on('click', () => {
        // We count the number of clicked elements inside each ArtifacView.
        let numbOfClickedElems = 0;
        const clickedElemIds = [];
        d3.select(`#${this._prefix}-view-svg`) // not so nice.
          .selectAll('rect')
          .each(function (d) {
            if (d3.select(this).classed('clicked')) {
              numbOfClickedElems += 1;
              clickedElemIds.push(d.id);
            }
          });
        if (numbOfClickedElems >= 2) {
          console.log(`numb of clicked elems: ${numbOfClickedElems}`);
          console.log(clickedElemIds);

          // this.emit('displayIntersection', [this._prefix, attachedData.id]);
        } else {
          alert(`please select at least two elements. You selected just: ${numbOfClickedElems} elements.`);
        }
      });

    checkBoxDiv
      .append('label')
      .attr('class', 'form-check-label')
      .text(' checkbox')
      .attr('for', checkBoxId);
  }
}

/*
*
*
(function initButtons() {
  const normalizationOpt = ['tooltip', 'brushing'];
  const xyz = d3.select('#app-view-menu').append('div').attr('class', 'col-md-3');
  const appNormBtn = xyz
    .append('select')
    .attr('class', 'custom-select custom-select-sm mb-1');

  console.log('select1');
  appNormBtn
    .selectAll('optionDings')
    .data(normalizationOpt)
    .enter()
    .append('option')
    .text((d) => d)
    .attr('value', (d) => d);

  appNormBtn
    .on('change', function test(d) {
      const tool = d3.select(this).property('value');
      console.log(`change Detected : select tool => ${tool}`);
      console.log(views);
      Object.keys(views).forEach((key) => {
        views[key].updateTool(tool);
      });

      // ArtifactChart.updateTool(tool);
    });

  xyz
    .append('div')
    .on('change', console.log('change'))
    .attr('class', 'input-group')
    .append('div')
    .on('input', console.log('change'))
    .attr('class', 'form-outline')
    .append('input')
    .attr('type', 'search')
    .attr('id', 'textSearch')
    .attr('class', 'form-control');

  d3.select('#textSearch')
    // .on('change', () => { console.log('change'); });
    .on('keyup', () => searchText(d3.select('#textSearch').node().value));
}());
*
*
*/
