/* eslint-disable no-underscore-dangle */
/* eslint-disable max-classes-per-file */

import EventEmitter from './events.js';
import { colorscales } from './tools/helpers.js';
/**
 * Base class
 */

class View extends EventEmitter {
  constructor(root) {
    super();
    this._prefix = root;
    this._viewDivId = `${root}-view`; // points to the encapsulating div
    this._menuDivId = `${root}-menu`;
    this._startTime = 0;
    this._stopTime = 0;
    this._currentColorScale = '';

    this.MARGINS = {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    };

    // contains the current status of the control.
    // the keys of the object reflects the HTML-elements id.
    this._controlStatus = { showIntersection: false };
    this._width = -1;
    this._height = -1;
    this._rootSvg = -1;
    this._edgeLen = -1;
  }

  get prefix() {
    return this._prefix;
  }

  viewControlStatus(elem) {
    return this._controlStatus[elem];
  }

  // getColorScale(name) {
  //   return this._colorScale[name];
  // }

  /*
  bindClickedElem(handler) {

  }
*/
  _updateControlStatus(elem, newStatus) {
    this._controlStatus[elem] = newStatus;
  }

  initViewControlls() {
    const checkBoxId = `${this._menuDivId}-orderings`;
    // this._controlStatus[checkBoxId] = false;
    const textSearchId = `${this._menuDivId}-search`;
    const templateOrderings = document.getElementById(`template-view-orderings-${this._prefix}`).innerHTML;
    const templateColor = document.getElementById(`template-view-color-${this._prefix}`).innerHTML;
    const orderingsDiv = d3.select(`#${this._prefix}-menu`)
      .append('div')
      .attr('id', 'entry input-group col-xs-12');
    const bottomDiv = d3.select(`#${this._prefix}-bottom`).append('div'); // .attr('class', 'btn-group');
    bottomDiv
      .html(templateColor + templateOrderings);
    bottomDiv
      .select('div .dropdown-menu.orderings')
      .on('click', (event) => {
        // id has the form viewprefix-ordering-o. Example: app-cves-o
        const [, selectedOrdering] = event.target.id.split('-'); // ignoring the first eleme in the split array.
        this.emit('newOrdering', [this._prefix, selectedOrdering]);
      });

    bottomDiv
      .select('div .dropdown-menu.color')
      .on('click', (event) => {
      // id has the form viewprefix-ordering-o. Example: app-cves-o
        const [, selectedColormapping] = event.target.id.split('-'); // ignoring the first eleme in the split array.
        console.log(selectedColormapping);
        this._controlStatus.color = selectedColormapping;
        this.emit('newColorMapping', [this._prefix, selectedColormapping]);
      });

    /* Init Search function */
    d3.select(`#${this._menuDivId}`)
      .append('div')
      .attr('class', 'input-group')
      .append('div')
      .attr('class', 'form-outline')
      .append('input')
      .attr('type', 'search')
      .attr('id', textSearchId)
      .attr('placeholder', `${this._prefix} view`)
      .attr('class', 'form-control');

    d3.select(`#${textSearchId}`)
      .on('input onclick', () => { // views can filter on their own. Do not have to emit an event!
        // onclick - chrome event. little blue cross-icon
        const currentInputValue = d3.select(`#${this._menuDivId}-search`)
          .node()
          .value
          .toLowerCase(); // case of the input is 'ignored'

        const dynamicOpacity = 0.35;
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
        } else { // search field is empty.
          d3.selectAll(`.${this._viewDivId}-g`)
            .attr('style', 'opacity:1')
            .classed('foundBySearch', false);
        }
      });
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
    const viewDiv = d3.select(`#${this._viewDivId}`);
    this._width = viewDiv.node().offsetWidth;
    // when creating the first view, $('.view-menu').outerHeight(true) is 0
    this._height = window.innerHeight - $('#nav-bar').outerHeight(true) - $('#above-vis').outerHeight(true) - 70 - this.MARGINS.bottom - 40;
    this._rootSvg = viewDiv
      .append('svg')
      .attr('id', () => `${this._viewDivId}-svg`) // svg that contains all g-Artifacts
      .attr('width', this._width)
      .attr('height', this._heigt)
      .attr('viewBox', `0,0 ${this._width} ${this._height}`); // viewBox for zooming (make the last two params larger tha those of the viewport to "zoom out") and panning
    // .attr('style', 'overflow: hidden');
    this.initViewControlls();
  }

  render(scaleSelection = '', tansitionTime = 2500) {
    // this section defines two helper functions which are needed for the placement of the rects
    const artifactPerRow = Math.floor(this._width / this._edgeLen);
    let heightTracker = 0 - this._edgeLen;
    let artifactDimWidth = this._edgeLen - 2;
    let artifactDimHeight = this._edgeLen - 2;
    let rowTracker = 0;
    let gx;
    let gy;
    let flagListDisplay = false;
    gx = (d, i) => {
      if (i % artifactPerRow === 0) { rowTracker = this._edgeLen; }
      const xPos = rowTracker * (i % artifactPerRow);
      return xPos;
    };
    gy = (d, i) => {
      if (i % artifactPerRow === 0) { heightTracker += this._edgeLen; }
      return heightTracker;
    };

    /* Artifacts as List.
    * Idea: Check if the number of datapoints visible in the respectiv view can be displayed as a list.
    *
    *
    */
    // each List entry needs 2x the height of an artifact.
    if (this._dataSet.length * (2 * this._edgeLen) <= this._height) {
      heightTracker = 0 - 2 * this._edgeLen;
      gx = (d, i) => {
        // if (i % artifactPerRow === 0) { rowTracker = this._edgeLen; }
        // const xPos = rowTracker * (i % artifactPerRow);
        const xPos = 0;
        return xPos;
      };
      gy = (d, i) => {
        // if (i % artifactPerRow === 0) { heightTracker += this._edgeLen; }
        heightTracker += 2 * this._edgeLen;
        return heightTracker;
      };
      artifactDimWidth = this._width;
      artifactDimHeight = 2 * this._edgeLen;

      flagListDisplay = true;
    }

    if (scaleSelection !== '') {
      this._currentColorScale = colorscales[scaleSelection];
    }
    this._rootSvg
      .selectAll('g')
    // key function - return a unique id. Each array elem stays joined to the same DOM elem.
      .data(this._dataSet, (d) => d.id)
      .join(
        (enter) => {
          console.log(enter);
          const gs = enter
            .append('g')
            .attr('class', `${this._viewDivId}-g`); // each artifact has its own group.
          // .transition()

          gs
            .append('rect')
          // .attr('class', this._div.id)
            .attr('class', 'default')
            .attr('rx', '3px')
            // -1 because we use a <g> elem to translate rectangles,
            // that add a small padding of 1px between each elements. + 1px for the border.
            .attr('width', artifactDimWidth)
            .attr('height', artifactDimHeight)
            .attr('stroke', (d) => this._currentColorScale(d.color))
            .attr('stroke-opacity', 0.7)
            .attr('style', (d) => `fill:${this._currentColorScale(d.color)}`)
            .attr('fill-opacity', 0.35);

          gs

            .on('mousedown', () => {
              this._startTime = performance.now();
            })
            .on('mouseup', (clickedElem, attachedData) => {
              this._stopTime = performance.now();
              const timeElapsed = this._stopTime - this._startTime; // in ms

              console.log('\n Start and Stop Time:');
              console.log(this._startTime);
              console.log(this._stopTime);

              if (timeElapsed <= 500) {
                // if the artifacts are presented as a List, a user could also click on the corresponding text.
                // We always want to work on the 'rect element, hence we select the enclosing 'g' first
                const clicked = d3.select(clickedElem.target.parentElement).select('rect');

                if (clicked.classed('clicked')) { // check if the class string contains 'clicked'.
                  // In ECMA6 remove elemId from array
                  this._currentlyClickedElemsId = this._currentlyClickedElemsId
                    .filter((e) => e !== attachedData.id);
                  clicked
                    .classed('clicked', false)
                    .attr('fill-opacity', 0.35)
                    .attr('stroke-opacity', 0.7);
                } else {
                  this._currentlyClickedElemsId.push(attachedData.id);

                  clicked
                    .classed('clicked', true)
                    .attr('fill-opacity', 1)
                    .attr('stroke-opacity', 1);
                }
                this.emit('clickArtifact', [this._prefix, attachedData.id]);
              } else {
                console.log('other Functionality');
                this.emit('createDependencyGraph', [this._prefix, attachedData.id]);
              }
            })
          // // if we chose to pass an argument, the first would be the clicked element.
          //   .on('click', (clickedElem, attachedData) => {
          //     const clicked = d3.select(clickedElem.target);

          //     if (clicked.classed('clicked')) { // check if the class string contains 'clicked'.
          //       // In ECMA6 remove elemId from array
          //       this._currentlyClickedElemsId = this._currentlyClickedElemsId
          //         .filter((e) => e !== attachedData.id);
          //       clicked
          //         .classed('clicked', false)
          //         .attr('fill-opacity', 0.5)
          //         .attr('stroke-opacity', 0.7);
          //     } else {
          //       this._currentlyClickedElemsId.push(attachedData.id);

          //       clicked
          //         .classed('clicked', true)
          //         .attr('fill-opacity', 1)
          //         .attr('stroke-opacity', 1);
          //     }
          //     this.emit('clickArtifact', [this._prefix, attachedData.id]);
          //   })
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
          return gs;
        },
        (update) => {
          console.log(update);
          update
            .selectAll('.clicked')
            .attr('fill-opacity', 1);

          update
            .selectAll('rect')
            .attr('width', artifactDimWidth)
            .attr('height', artifactDimHeight)
            .attr('stroke', (d) => this._currentColorScale(d.color))
            .attr('style', (d) => `fill:${this._currentColorScale(d.color)}`);

          if (flagListDisplay) {
            // update
            //   .append('text')
            //   .attr('dy', 2 * this._edgeLen - 2)
            //   .attr('class', 'text label')
            // // .style('font-size', '5px')
            //   // .style('font-size', () => `${Math.min(this.edgeLen, (this.edgeLen) / (2) - 1)}px`)
            //   .attr('dx', '1');
            const idArray = [];
            update
              .each((d) => {
                idArray.push(d.id);
              });

            this.emit('getListsTextValues', [this._prefix, idArray]);
          } else {
            d3.selectAll('.text.label')
              .remove();
          }

          return update;
        }, // console.log(update);

        (exit) => {
          console.log('we exit');

          // TODO: ANIMATE removal of items.
          exit
            .call((exit) => exit.transition().duration(2000)
              .attr('transform', (d, i) => `translate(${Math.floor(Math.random() * this._width) + 1}, ${2 * this._height})`)
              .remove());
        },

      )

      .call((s) => {
        s.transition().duration(tansitionTime)
          .attr('transform', (d, i) => `translate(${gx(d, i)}, ${gy(d, i)})`);
      });

    // This function is needed durign redrawing. it takes care of all clicked elements.
    // clicked elements should be clicked if redrawed
    d3.selectAll(`.${this._viewDivId}-g`)
      .filter((d) => this._currentlyClickedElemsId.includes(d.id))
      .selectAll('rect')
      // .attr('style', 'fill:green')
      .classed('clicked', true)
      .attr('fill-opacity', 1);

    this._rootSvg
      .on('click', () => {
        this.clickIntersection();
      });
  }

  displayTextinList(data) {
    const idArray = Object.keys(data);

    d3.selectAll(`.${this._viewDivId}-g`)
      .filter((d) => idArray.includes(d.id))
      .append('text')
      .attr('dy', 2 * this._edgeLen - 2)
      .attr('class', 'text label')
    // .style('font-size', '5px')
    // .style('font-size', () => `${Math.min(this.edgeLen, (this.edgeLen) / (2) - 1)}px`)
      .attr('dx', '1')
      .text((d) => data[d.id].name);
  }

  resetIntersectionClass() {
    this._rootSvg
      .selectAll('rect')
      .classed('intersection', false);
  }

  highlightIntersection(newIdData) {
    console.log(`\nview: ${this._prefix} with data`);
    console.log(newIdData);
    console.log('\n');
    d3
      .selectAll(`.${this._viewDivId}-g`)
      .filter((d) => newIdData.includes(d.id))
      .selectAll('rect')
      .classed('intersection', true);

    d3
      .selectAll(`.${this._viewDivId}-g`)
      .filter((d) => !newIdData.includes(d.id))
      .selectAll('rect')
      .classed('intersection', false);
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
        dynamicHtml += `<tr><td>Libraries</td><td>${libsTotal}</td></tr>`;
        dynamicHtml += `<tr><td>Vulnerable libraries</td><td>${libsAffected}</td></tr>`;
        dynamicHtml += `<tr><td>Distinct CVEs:</td><td>${numbVulas}</td></tr>`;
      } else { // lib view
        const [numbVulas, appsAffected, description] = [data.meta_vulas,
          data.meta_affected_apps,
          data.description];
        dynamicHtml += '<table style="width:100%; align:left"><tr><th>number of       </th><th>count</th></tr>';
        dynamicHtml += `<tr><td>Apps including this lib</td><td>${appsAffected}</td></tr>`;
        dynamicHtml += `<tr><td>Distinct CVEs:</td><td>${numbVulas}</td></tr>`;
      }
    } else { // vul view
      const [vector, version, description, score, affectedApps] = [data.cvssVector,
        data.cvssVersion,
        data.description,
        data.cvssScore,
        data.meta_affected_apps];
      dynamicHtml += `<p style="text-align: center; color: darkgrey"> <b>score: ${score} </b></p>`;
      dynamicHtml += '<table style="width:100%; align:left"><tr><th></th><th></th></tr>';

      dynamicHtml += `<tr><td>Affected applications</td><td>${affectedApps}</td></tr>`;
      dynamicHtml += `<tr><td>Vector</td><td>${vector}</td></tr>`;
      dynamicHtml += `<tr><td>Version</td><td>${version}</td></tr>`;
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
      .attr('style', 'opacity:0.35');

    artifacSelection
      .filter((d) => idArray.includes(d.id)) // select all elements that are not included.
      .attr('style', 'opactiy:1');
  }

  currentlySeletedColorMapping(currentlySelectedMapping) {
    return this._controlStatus.color;
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

  // eslint-disable-next-line class-methods-use-this
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

  fireClick() {
    this.clickIntersection();
  }

  clickIntersection() {
    // We count the number of clicked elements inside each ArtifacView.
    let numbOfClickedElems = 0;

    /*
      * randomClickedElemsId contains the id of a clicked Artifact.
      * this id will triggering the redrawing of all selected elemets when
      * the checkbox is not checked anymore. (quick and dirty)
      *
      */
    // const randomClickedElemsId = null;
    // const checkboxId = `${this._menuDivId}-checkbox`;
    const clickedElemIds = [];

    // update the datastructure with the elements state.
    // this._updateControlStatus(checkBoxId, d3.select(`#${checkboxId}`).property('checked'));

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
    console.log(`lickedElemenets: ${numbOfClickedElems}`);

    if (numbOfClickedElems <= 1) {
      // console.log(this);
      this.emit('resetAllIntersectedElem');
    }
    /*
      * _controlStatu knows if the checkbox is currently checked.
      *
      *
      *
      */
    if (this._controlStatus.showIntersection) { // case: the checkbox is checked
      if (numbOfClickedElems >= 2) {
        // this.emit('checkboxClicked', this._prefix);
        console.log('two or more elements are clicked + we selected this view to show the intersection.');
        this.emit('displayIntersection', this._prefix);
      }
    }
  }
}

// eslint-disable-next-line import/prefer-default-export
export { ArtifactView };
