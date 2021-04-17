/* eslint-disable no-underscore-dangle */
/* eslint-disable max-classes-per-file */

import EventEmitter from './events.js';
/**
 * Base class
 */

class View extends EventEmitter {
  constructor(root) {
    super();
    this._prefix = root;
    this._viewDivId = `${root}-view`; // points to the encapsulating div
    this._menuDivId = `${root}-menu`;

    this.MARGINS = {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    };

    // contains the current status of the control.
    // the keys of the object reflects the HTML-elements id.
    this._controlStatus = {};
    this._width = -1;
    this._height = -1;
    this._rootSvg = -1;
    this._edgeLen = -1;
    this._colorScale = {
      cve: d3.scaleThreshold() /// / original nist color
        .domain([0.1, 4.0, 7.0, 9.0])
        .range(['darkgrey', '#ffe358', '#edb15c', '#d9534f', 'black']), // original nist color: f2cc0c

      goodall: d3.scaleThreshold()
        .domain([1, 2, 3, 4, 5, 6, 7, 8, 9])
        .range(['darkgrey', '#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#253494', '#081d58']),
    };
  }

  get prefix() {
    return this._prefix;
  }

  viewControlStatus(elem) {
    return this._controlStatus[elem];
  }

  getColorScale(name) {
    return this._colorScale[name];
  }

  /*
  bindClickedElem(handler) {

  }
*/
  _updateControlStatus(elem, newStatus) {
    this._controlStatus[elem] = newStatus;
  }

  initViewControlls() {
    const checkBoxId = `${this._menuDivId}-checkbox`;
    this._controlStatus[checkBoxId] = false;
    const textSearchId = `${this._menuDivId}-search`;

    const checkBoxDiv = d3.select(`#${this._menuDivId}`)
      .append('div')
      .attr('id', `${this._menuDivId}-div-checkbox`)
      .attr('class', 'form-check no-gutters my-form-check-modification');
      // .attr('style', 'display: true');

    checkBoxDiv
      .append('input')
      .attr('class', 'from-check-input')
      .attr('type', 'checkbox')
      .attr('id', checkBoxId)
      .on('click', () => {
        // We count the number of clicked elements inside each ArtifacView.
        let numbOfClickedElems = 0;

        /*
         * randomClickedElemsId contains the id of a clicked Artifact.
         * this id will triggering the redrawing of all selected elemets when
         * the checkbox is not checked anymore. (quick and dirty)
         *
         */
        // const randomClickedElemsId = null;
        const checkboxId = `${this._menuDivId}-checkbox`;
        const clickedElemIds = [];
        this._updateControlStatus(checkBoxId, d3.select(`#${checkboxId}`).property('checked')); // update the datastructure with the elements state.

        // if (this._controlStatus[checkBoxId]) {
        //   this.emit('checkboxClicked', this._prefix);
        // }
        d3.select(`#${this._viewDivId}-svg`)
          .selectAll('rect')

          // need anonym function to have the right scope! (arrow-func does not work)!
          .each(function (d) {
            if (d3.select(this).classed('clicked')) {
              numbOfClickedElems += 1;
              clickedElemIds.push(d.id);
            }
          });

        /*
         * _controlStatu knows if the checkbox is currently checked.
         *
         *
         *
         */
        if (this._controlStatus[checkboxId]) { // case: the checkbox is checked
          // TODO: implement Logic. Selected event must depend on the checkboxs 'check' property

          if (numbOfClickedElems >= 2) {
            console.log(`numb of clicked elems: ${numbOfClickedElems}`);
            this.emit('checkboxClicked', this._prefix);
            this.emit('displayIntersection', this._prefix);
          } else {
            alert(`please select at least two elements in this View. You selected just: ${numbOfClickedElems} elements.`);
            // reverse changes
            d3.select(`#${this._menuDivId}-checkbox`)
              .property('checked', false);
            this._updateControlStatus(checkBoxId, false);
          }
        } else { // case: the checkbox was un-checked.
          console.log('checkbox not checked anymore');
          if (clickedElemIds.length > 0) {
            this.emit('uncheckCheckbox');
            // this.emit('clickArtifact', [this._prefix, clickedElemIds.pop()]); // quick and dirty
          }
        }
      });

    checkBoxDiv
      .append('label')
      .attr('class', 'form-check-label')
      .text(' checkbox')
      .attr('for', checkBoxId);

    /* Init Search function */
    d3.select(`#${this._menuDivId}`)
      .append('div')
      .attr('class', 'input-group')
      .append('div')
      .attr('class', 'form-outline')
      .append('input')
      .attr('type', 'search')
      .attr('id', textSearchId)
      .attr('class', 'form-control');

    d3.select(`#${textSearchId}`)
    // .on('change', () => { console.log('change'); });
      .on('input onclick', () => { // views can filter on their own. Do not have to emit an event!
        // onclick - chrome event. little blue cross-icon
        const currentInputValue = d3.select(`#${this._menuDivId}-search`)
          .node()
          .value
          .toLowerCase(); // case of the input is 'ignored'

        // console.log(currentInputValue);
        // console.log(currentInputValue.length);
        // console.log(`.${this._viewDivId}-g`);

        const dynamicOpacity = 0.2;
        // If the search field is empty. we have an empty string, which machtes every artifact id.
        if (currentInputValue.length >= 1) {
          d3.selectAll(`.${this._viewDivId}-g`)
            .filter((d) => d.id.toLowerCase().includes(currentInputValue))
            .attr('style', 'opacity:1')
            .classed('foundBySearch', true);

          // TODO: if color-scale 'goodall' is active,
          // searching for '2010' in the vul view results in 3 visible results.
          // There are actually 5 results visible,but since the light colors are not distinguishable
          // from the lower-opacity rects, the result seems to be false.
          // Highlighting the border of matichng elements could help.
          // .selectAll('rect')
          // .attr('stroke', 'red');

          d3.selectAll(`.${this._viewDivId}-g`)
            .filter((d) => !(d.id.toLowerCase().includes(currentInputValue)))
            .classed('foundBySearch', false)
            .attr('style', `opacity: ${dynamicOpacity}`);
          // .selectAll('rect')
          // .attr('stroke', (d) => { console.log(d3.select(`${d.id}`)); });
        } else { // search field is empty.
          d3.selectAll(`.${this._viewDivId}-g`)
            .attr('style', 'opacity:1')
            .classed('foundBySearch', false);
        }
      });
  }

  uncheckCheckbox() {
    d3.select(`#${this._menuDivId}-checkbox`).property('checked', false);
    this._updateControlStatus(`${this._menuDivId}-checkbox`, false); // update the datastructure with the elements state.
  }

  hideCheckbox() {
    d3.select(`#${this._menuDivId}-div-checkbox`).selectAll('*').attr('style', 'visibility:hidden'); // selects all child nodes of the ...-div-checkbox div.
  }

  showCheckbox() {
    d3.select(`#${this._menuDivId}-div-checkbox`).selectAll('*').attr('style', 'visibility:true'); // selects all child nodes of the ...-div-checkbox div.
  }

  /**
     * Returns an HTML element that contains the rendered view
     * @returns {HTMLElement}
     */
  // render() { return this.undefined; }
}

class ArtifactView extends View {
  constructor(root) {
    super(root);
    this._dataSet = [];
    this._currentlyClickedElemsId = [];
    this.initView();
  }

  initView() {
    console.log(this._viewDivId);
    const viewDiv = d3.select(`#${this._viewDivId}`);
    this._width = viewDiv.node().offsetWidth;
    this._height = window.innerHeight - $('#nav-bar').outerHeight(true) - $('#above-vis').outerHeight(true) - $('.view-menu').outerHeight(true) - this.MARGINS.bottom;
    this._rootSvg = viewDiv
      .append('svg')
      .attr('id', () => `${this._viewDivId}-svg`) // svg that contains all g-Artifacts
      .attr('width', this._width)
      .attr('height', this._heigt)
      .attr('viewBox', `0,0 ${this._width} ${this._height}`); // viewBox for zooming (make the last two params larger tha those of the viewport to "zoom out") and panning
    // .attr('style', 'overflow: hidden');
    this.initViewControlls();
  }

  render() {
    console.log('render View');
    console.log(this._dataSet[1]);
    // this section defines two helper functions which are needed for the placement of the rects
    const artifactPerRow = Math.floor(this._width / this._edgeLen);
    let heightTracker = 0 - this._edgeLen;
    let rowTracker = 0;

    const gx = (d, i) => {
      if (i % artifactPerRow === 0) { rowTracker = this._edgeLen; }
      const xPos = rowTracker * (i % artifactPerRow);
      return xPos;
    };
    const gy = (d, i) => {
      if (i % artifactPerRow === 0) { heightTracker += this._edgeLen; }
      return heightTracker;
    };

    this._rootSvg
      .selectAll('g')
    // key function - return a unique id. Each array elem stays joined to the same DOM elem.
      .data(this._dataSet, (d) => d.id)
      .join(
        (enter) => {
          const gs = enter
            .append('g')
            .attr('class', `${this._viewDivId}-g`) // each artifact has its own group.
          // .transition()
            .attr('transform', (d, i) => `translate(${gx(d, i)}, ${gy(d, i)})`);

          gs
            .append('rect')
          // .attr('class', this._div.id)
            .attr('class', 'default')
            .attr('rx', '3px')
            // -1 because we use a <g> elem to translate rectangles,
            // that add a small padding of 1px between each elements. + 1px for the border.
            .attr('width', this._edgeLen - 2)
            .attr('height', this._edgeLen - 2)
            .attr('stroke', (d) => this.getColorScale('cve')(d.color))
            .attr('style', (d) => `fill:${this.getColorScale('cve')(d.color)}`);

          gs
          // if we chose to pass an argument, the first would be the clicked element.
            .on('click', (clickedElem, attachedData) => {
              const clicked = d3.select(clickedElem.target);

              if (clicked.classed('clicked')) { // check if the class string contains 'clicked'.
                // In ECMA6 remove elemId from array
                this._currentlyClickedElemsId = this._currentlyClickedElemsId
                  .filter((e) => e !== attachedData.id);
                clicked
                  .classed('clicked', false);
              } else {
                this._currentlyClickedElemsId.push(attachedData.id);

                clicked
                  .classed('clicked', true);
              }
              console.log(this._currentlyClickedElemsId);
              this.emit('clickArtifact', [this._prefix, attachedData.id]);
            })
            .on('mouseover mousemove', (event, attachedData) => {
              this._updateControlStatus('xPos', event.pageX);
              this._updateControlStatus('yPos', event.pageY);
              this.emit('updateTooltip', [this._prefix, attachedData.id]);
            })
            .on('mouseleave', () => {
              d3.select('#tooltip')
                .style('opacity', 0)
                // we move the tootip to the top left corner and shrik it to the minimum size.
                // this prevents an 0 opacity tooltip from overlapping artifacts.
                .style('left', '0px')
                .style('top', '0px')
                .html('');
            });
          /*
          gs
            .append('text')
            .attr('dy', (this._edgeLen) / 2 + 1)
          // .style('font-size', '5px')
            .style('font-size', () => `${Math.min(this._edgeLen, (this._edgeLen) / (2) - 1)}px`)
            .attr('dx', '1')
            .text((d) => {
              if (d.meta_vulas) { return d.meta_vulas; }
              return '';
            });
            */
        },
        (update) => {
          console.log('update');
        },
        (exit) => {
          console.log('we exit');
          exit
            .attr('fill', 'brown')
            // .call((exit) => exit.transition(t)
            //  .attr('y', this._height)
            .remove(); // );
        },

      );

    // This function is needed durign redrawing. it takes care of all clicked elements.
    // clicked elements should be clicked if redrawed
    d3.selectAll(`.${this._viewDivId}-g`)
      .filter((d) => this._currentlyClickedElemsId.includes(d.id))
      .filter((d) => { console.log(d.id); return true; })
      .selectAll('rect')
      // .attr('style', 'fill:green')
      .classed('clicked', true);
  }

  updateConnectedElems(updatedData) {
    // we first reset all rects classes
    this._rootSvg
      .selectAll('rect')
      .classed('connected', false);
    // the models current determines which artifacts are marked as connected.
    this._rootSvg
      .selectAll(`g[class *=${this._viewDivId}-g]`)
      .filter((d) => updatedData.includes(d.id))
      .selectAll('rect')
      .classed('connected', true);
  }

  updateTooltip(data) {
    // const appBlueprint = `<p>${data.name}</p>`;

    let dynamicHtml = `${data.name}`;
    // delete data.name;

    const [min, avg, max] = [data.min_cvssScore, data.avg_severity, data.max_cvssScore];
    if (min !== undefined) {
      dynamicHtml += `<p style="text-align: center; color: darkgrey"> min: ${min} / avg: ${avg.toFixed(2)} / max: ${max}</p>`;

      if (data.meta_numb_libs !== undefined) { // app view
        const [libsTotal, libsAffected, numbVulas] = [data.meta_numb_libs,
          data.meta_vul_libs,
          data.meta_vulas];
        dynamicHtml += '<table style="width:50%; align:center"><tr><th>number of</th><th>count</th></tr>';
        dynamicHtml += `<tr><td>libraries</td><td>${libsTotal}</td></tr>`;
        dynamicHtml += `<tr><td>vulnerable libraries</td><td>${libsAffected}</td></tr>`;
        dynamicHtml += `<tr><td>different CVEs:</td><td>${numbVulas}</td></tr>`;
      } else { // lib view
        const [numbVulas, appsAffected, description] = [data.meta_vulas,
          data.meta_affected_apps,
          data.description];
        dynamicHtml += '<table style="width:100%; align:left"><tr><th>number of       </th><th>count</th></tr>';
        dynamicHtml += `<tr><td>apps including this lib</td><td>${appsAffected}</td></tr>`;
        dynamicHtml += `<tr><td>different CVEs:</td><td>${numbVulas}</td></tr>`;
      }
    } else { // vul view
      const [vector, version, description] = [data.cvssVector,
        data.cvssVersion,
        data.description];
      dynamicHtml += '<table style="width:50%; align:center"><tr><th></th><th></th></tr>';
      dynamicHtml += `<tr><td>Vector</td><td>${vector}</td></tr>`;
      dynamicHtml += `<tr><td>version</td><td>${version}</td></tr>`;
      // dynamicHtml += `<tr><td>description</td><td>${description}</td></tr>`;
    }
    // if(data.meta_affected_apps === 'undefined'){ //we kn

    // }

    d3.select('#tooltip')
      .attr('style', 'opacity: 0.85')
      .html(dynamicHtml)
      .style('left', `${this._controlStatus.xPos + 50}px`)
      .style('top', `${this._controlStatus.yPos}px`);
  }

  filterCvssVersion(idArray) {
    const artifacSelection = d3.selectAll(`.${this._viewDivId}-g`);

    artifacSelection
      .filter((d) => !(idArray.includes(d.id))) // select all elements that are not included.
      .attr('style', 'opacity:0.2');

    artifacSelection
      .filter((d) => idArray.includes(d.id)) // select all elements that are not included.
      .attr('style', 'opactiy:1');
  }

  /**
   * returns current size of the views root svg element.
   * @returns {Object}
   */
  rootSvgDim() {
    const rootSvg = document.getElementById(`${this._viewDivId}-svg`);
    const dim = {};
    dim.width = rootSvg.clientWidth;
    dim.height = rootSvg.clientHeight;
    return dim;
  }

  removeAllArtifacts() {
    d3.select(`#${this._viewDivId}-svg`)
      .selectAll('*')
      .remove();
  }

  edgeLen(len) {
    console.log('new edgeLength is set.');
    if (len > 0) {
      this._edgeLen = len;
    } else {
      console.log('problem: edgelength is <= 0 --');
    }
  }

  set dataSet(newData) {
    this._dataSet = newData;
  }
}

// eslint-disable-next-line import/prefer-default-export
export { ArtifactView };
