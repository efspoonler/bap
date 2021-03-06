/* eslint-disable no-underscore-dangle */

import EventEmitter from './events.js';
import { colorscales } from './tools/helpers.js';

/**
 * The Class represents a view (app, lib, vul).
 * It contains three main parts.
 * The Top and the bottom parts are reserved for specific control elements.
 * The middle part is the actual artifact view which displays the data.
 * @extends EventEmitter
 */
class ArtifactView extends EventEmitter {
  /**
   *
   * @param {String} root - the name of the view. The name is prependend to every HTML-elemnts id.
   */
  constructor(root) {
    super(); // call the constructor of the EventEmitter class.
    this._prefix = root;
    this._viewDivId = `${root}-view`; // points to the encapsulating div
    this._menuDivId = `${root}-menu`;
    this._startTime = 0; // needed for time measurement.
    this._stopTime = 0;
    this._currentColorScale = '';

    this.MARGINS = {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    };

    /* contains the current status of the control.
    * the keys of the object reflects the HTML-elements id.
    */
    this._controlStatus = { showIntersection: false };
    this._width = -1;
    this._height = -1;
    this._rootSvg = -1;
    this._edgeLen = -1;
    this._dataSet = [];
    this._currentlyClickedElemsId = [];
    this.initView();
  }

  /**
   * retrievs and stores the width and height.
   * creates the artifact-views svg element which contains each artifact.
   */
  initView() {
    // All elements created by the view are children of the viewDiv.
    const viewDiv = d3.select(`#${this._viewDivId}`);
    this._width = viewDiv.node().offsetWidth;
    /*
    * when creating the first view, $('.view-menu').outerHeight(true) is 0.
    * therfore we use the constant 70 which is approx. 2* the height of a bootstrap dropdown menu
    */
    this._height = window.innerHeight - $('#nav-bar').outerHeight(true) - $('#above-vis').outerHeight(true) - 70 - this.MARGINS.bottom - 40;
    this._rootSvg = viewDiv
      .append('svg')
      .attr('id', () => `${this._viewDivId}-svg`) // svg that contains all g-Artifacts
      .attr('width', this._width)
      .attr('height', this._heigt)
      .attr('viewBox', `0,0 ${this._width} ${this._height}`); // viewBox for zooming and panning
    this.initViewControlls();
  }

  /**
   * The render function renders the data on the screen.
   * @param {String} scaleSelection - name of a scale.
   * @param {Number} tansitionTime - time in ms a  transition takes place.
   */
  render(scaleSelection = '', tansitionTime = 2500) {
    // this section defines two helper functions which are needed for the placement of the rects
    const artifactPerRow = Math.floor(this._width / this._edgeLen);
    let heightTracker = 0 - this._edgeLen;
    // -1 because we use a <g> elem to translate rectangles,
    // that add a small padding of 1px between each elements. - 1px for the border
    let artifactDimWidth = this._edgeLen - 2;
    let artifactDimHeight = this._edgeLen - 2;
    let rowTracker = 0;
    // this section defines two helper functions which are needed for the placement of the rects
    let gx;
    let gy;
    let flagListDisplay = false;

    // Here gx and gy defined so that each artifact (rect) is placed to each other
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
    * Idea:
    * Check if the number of datapoints visible in the respectiv view can be displayed as a list.
    */
    // each List entry needs 2x the height of an artifact.
    if (this._dataSet.length * (2 * this._edgeLen) <= this._height) {
      heightTracker = 0 - 2 * this._edgeLen;

      // Here gx and gy defined so that each artifact is placed in its own row
      // eslint-disable-next-line no-unused-vars
      gx = (d, i) => {
        const xPos = 0; // each artifact is placed left-justified.
        return xPos;
      };
      // eslint-disable-next-line no-unused-vars
      gy = (d, i) => {
        heightTracker += 2 * this._edgeLen; // each artifact in placed beneath its previous.
        return heightTracker;
      };
      // An artifact takes the whole width of the view, if represented as a list.
      artifactDimWidth = this._width;
      artifactDimHeight = 2 * this._edgeLen;
      flagListDisplay = true;
    }

    if (scaleSelection !== '') { // if we passed a new color-scale name.
      this._currentColorScale = colorscales[scaleSelection];
    }
    this._rootSvg
      .selectAll('g')
    // key function - return a unique id. Each array elem stays joined to the same DOM elem.
      .data(this._dataSet, (d) => d.id)
      .join(
        (enter) => {
          const gs = enter
            .append('g')
            .attr('class', `${this._viewDivId}-g`); // each artifact has its own group.
          gs
            .append('rect')
            .attr('class', 'default')
            .attr('rx', '3px')
            .attr('width', artifactDimWidth)
            .attr('height', artifactDimHeight)
            .attr('stroke', (d) => this._currentColorScale(d.color))
            .attr('stroke-opacity', 0.7)
            .attr('style', (d) => `fill:${this._currentColorScale(d.color)}`)
            .attr('fill-opacity', 0.35);

          /*
          * A <g> element has two working modes.
          * 1. element is clicked for less then 500ms. (normal)
          * 2. elmeent is clicked and the key is hold for more than 500ms.
          */
          gs
            .on('mousedown', () => {
              this._startTime = performance.now();
            })
            .on('mouseup', (clickedElem, attachedData) => {
              this._stopTime = performance.now();
              const timeElapsed = this._stopTime - this._startTime; // in ms
              if (timeElapsed <= 500) {
                /*
                * Important!
                * if the artifacts are presented as a List,
                * a user could also click on the corresponding text.
                * We always want to work on the 'rect element,
                * hence we select the enclosing 'g' first
                */
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
                // this additional funtionality is not yet implemented.
                this.emit('createDependencyGraph', [this._prefix, attachedData.id]);
              }
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
          return gs;
        },
        (update) => {
          update
            .selectAll('.clicked')
            .attr('fill-opacity', 1);

          update
            .selectAll('rect')
            .attr('width', artifactDimWidth)
            .attr('height', artifactDimHeight)
            .attr('stroke', (d) => this._currentColorScale(d.color))
            .attr('style', (d) => `fill:${this._currentColorScale(d.color)}`);

          return update;
        },
        (exit) => {
          exit
            .attr('class', 'exit')
            // eslint-disable-next-line no-shadow
            .call((exit) => exit.transition().duration(2000)
              // eslint-disable-next-line no-unused-vars
              .attr('transform', (d, i) => `translate(${Math.floor(Math.random() * this._width) + 1}, ${2 * this._height})`)
              .remove());
        },
      )
      .call((s) => {
        s.transition().duration(tansitionTime)
          .attr('transform', (d, i) => `translate(${gx(d, i)}, ${gy(d, i)})`);
      });

    /*
          * if we display the artifacts in a List, we want to use the extra space to
          * show more information in each artifact/List-Element.
          */
    if (flagListDisplay) {
      const idArray = [];
      d3.selectAll(`.${this._viewDivId}-g`)
        .selectAll('*:not(exit)')
        .each((d) => {
          idArray.push(d.id);
        });
      this.emit('getListsTextValues', [this._prefix, idArray]);
    } else {
      d3.select(`#${this._viewDivId}-svg`)
        .selectAll('.text.label')
        .remove();
    }

    // This function is needed durign redrawing. it takes care of all clicked elements.
    // clicked elements should be clicked if redrawed
    d3.selectAll(`.${this._viewDivId}-g`)
      .filter((d) => this._currentlyClickedElemsId.includes(d.id))
      .selectAll('rect')
      .classed('clicked', true)
      .attr('fill-opacity', 1);

    this._rootSvg
      .on('click', () => {
        this.clickIntersection();
      });
  }

  /**
   * The function appends <text> to the matching artifact.
   * @param {Object} data - contains the text for the respectiv key(id).
   */
  displayTextinList(data) {
    // the keys of the argument are ids.
    const idArray = Object.keys(data);

    // select all artifacts for which the data argument contains a matching id.
    d3.selectAll(`.${this._viewDivId}-g`)
      .filter((d) => idArray.includes(d.id))
      .append('text')
      .attr('dy', 2 * this._edgeLen - 2)
      .attr('class', 'text label')
      .attr('dx', '1')
      .text((d) => data[d.id].name);
  }

  resetIntersectionClass() {
    this._rootSvg
      .selectAll('rect')
      .classed('intersection', false);
  }

  /**
   * The function takes care of highlighting artifacts
   * which are contained in each selected artifact.
   * @param {Object} newIdData - Array of Ids
   */
  highlightIntersection(newIdData) {
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

  /**
   * The control elements are placed above and beneath the actural view.
   * above: search field
   * beneath: orderings and colorings
   */
  initViewControlls() {
    const textSearchId = `${this._menuDivId}-search`;

    // all template files are stored in apps.html.
    const templateOrderings = document.getElementById(`template-view-orderings-${this._prefix}`).innerHTML;
    const templateColor = document.getElementById(`template-view-color-${this._prefix}`).innerHTML;

    d3.select(`#${this._prefix}-menu`) // the div above the artifact view.
      .append('div')
      .attr('id', 'entry input-group col-xs-12');
    const bottomDiv = d3.select(`#${this._prefix}-bottom`).append('div'); // the div beneath the artifact view.
    bottomDiv
      .html(templateColor + templateOrderings); // append the temples html code to the bottom div.
    bottomDiv
      .select('div .dropdown-menu.orderings')
      .on('click', (event) => {
        // id has the form <viewprefix-ordering-o>. Example: app-cves-o
        const [, selectedOrdering] = event.target.id.split('-'); // ignoring the first eleme in the split array.
        const classes = d3.select(`#${event.target.id}`)
          .attr('class');
        const matches = classes.match(/\[(.*?)\]/)[1];
        d3.select(`#${this._prefix}-orderings`)
          .text(`Ordering:${matches}`);
        this.emit('newOrdering', [this._prefix, selectedOrdering]);
      });

    bottomDiv
      .select('div .dropdown-menu.color')
      .on('click', (event) => {
        // id has the form <viewprefix-ordering-o>. Example: app-cves-o
        const [, selectedColormapping] = event.target.id.split('-'); // ignoring the first eleme in the split array.
        this._controlStatus.color = selectedColormapping;
        const classes = d3.select(`#${event.target.id}`)
          .attr('class');
        const matches = classes.match(/\[(.*?)\]/)[1];
        d3.select(`#${this._prefix}-color`)
          .text(`Color:${matches}`);
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
      .on('input onclick', () => {
        // views can filter on their own. Do not have to emit an event!
        // onclick - chrome event. little blue cross-icon
        const dynamicOpacity = 0.35;
        const currentInputValue = d3.select(`#${this._menuDivId}-search`)
          .node()
          .value
          .toLowerCase(); // case of the input is 'ignored'.

        // If the search field is empty. we have an empty string, which machtes every artifact id.
        if (currentInputValue.length >= 1) {
          d3.selectAll(`.${this._viewDivId}-g`)
            .filter((d) => d.id.toLowerCase().includes(currentInputValue))
            .attr('style', 'opacity:1')
            .classed('foundBySearch', true);

          d3.selectAll(`.${this._viewDivId}-g`)
            .filter((d) => !(d.id.toLowerCase().includes(currentInputValue)))
            .classed('foundBySearch', false)
            .attr('style', `opacity: ${dynamicOpacity}`);
        } else { // search field is empty.
          d3.selectAll(`.${this._viewDivId}-g`)
            .attr('style', 'opacity:1')
            .classed('foundBySearch', false);
        }
      });
  }

  /**
   * each member of the updateData parameter is appended with a new class.
   * @param {Object} updatedData - Array of ids
   */
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

  /**
   * fills the tooltip with the parameters information.
   * @param {Object} data - all information about a single artifact.
   */
  updateTooltip(data) {
    let dynamicHtml = `${data.name}`;
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
        const [numbVulas, appsAffected] = [data.meta_vulas,
          data.meta_affected_apps,
          data.description];
        dynamicHtml += '<table style="width:100%; align:left"><tr><th>number of       </th><th>count</th></tr>';
        dynamicHtml += `<tr><td>Apps including this lib</td><td>${appsAffected}</td></tr>`;
        dynamicHtml += `<tr><td>Distinct CVEs:</td><td>${numbVulas}</td></tr>`;
      }
    } else { // vul view
      const [vector, version,, score, affectedApps] = [data.cvssVector,
        data.cvssVersion,
        data.description,
        data.cvssScore,
        data.meta_affected_apps];
      dynamicHtml += `<p style="text-align: center; color: darkgrey"> <b>score: ${score} </b></p>`;
      dynamicHtml += '<table style="width:100%; align:left"><tr><th></th><th></th></tr>';

      dynamicHtml += `<tr><td>Affected applications</td><td>${affectedApps}</td></tr>`;
      dynamicHtml += `<tr><td>Vector</td><td>${vector}</td></tr>`;
      dynamicHtml += `<tr><td>Version</td><td>${version}</td></tr>`;
    }
    d3.select('#tooltip')
      .attr('style', 'opacity: 0.85')
      .html(dynamicHtml)
      .style('left', `${this._controlStatus.xPos + 50}px`)
      .style('top', `${this._controlStatus.yPos}px`);
  }

  /**
   * @param {Object} idArray - array of ids
   */
  filterCvssVersion(idArray) {
    const artifacSelection = d3.selectAll(`.${this._viewDivId}-g`);

    artifacSelection
      .filter((d) => !(idArray.includes(d.id))) // select all elements that are not included.
      .attr('style', 'opacity:0.35');

    artifacSelection
      .filter((d) => idArray.includes(d.id)) // select all elements that are not included.
      .attr('style', 'opactiy:1');
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
    const clickedElemIds = [];
    d3.select(`#${this._viewDivId}-svg`)
      .selectAll('rect')
    // need anonym function to have the right scope! (arrow-func does not work)!
      // eslint-disable-next-line func-names
      .each(function (d) {
        if (d3.select(this).classed('clicked')) {
          numbOfClickedElems += 1;
          clickedElemIds.push(d.id);
        }
      });
    if (numbOfClickedElems <= 1) {
      this.emit('resetAllIntersectedElem');
    }
    // _controlStatu knows if the radiobutton is curently selected.
    if (this._controlStatus.showIntersection) { // case: the radiobutton for this view is checked
      if (numbOfClickedElems >= 2) {
        /* To get here - two or more elements are clicked
        *  +
        * we selected this view to show the intersection.
        */
        this.emit('displayIntersection', this._prefix);
      }
    }
  }

  /*
  *
  *
  * The following funcitons are small helper functions.
  *
  *
  */
  currentlySeletedColorMapping() {
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

  removeAllArtifacts() {
    d3.select(`#${this._viewDivId}-svg`)
      .selectAll('*')
      .remove();
  }

  edgeLen(len) {
    // update edgeLen property.
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

  get prefix() {
    return this._prefix;
  }

  viewControlStatus(elem) {
    return this._controlStatus[elem];
  }

  _updateControlStatus(elem, newStatus) {
    this._controlStatus[elem] = newStatus;
  }
}

// eslint-disable-next-line import/prefer-default-export
export { ArtifactView };
