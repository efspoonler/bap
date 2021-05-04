/* eslint-disable no-underscore-dangle */
/* eslint-disable max-classes-per-file */
import EventEmitter from './events.js';
/**
 * Base class for all models
 */
class Model extends EventEmitter {
  constructor() {
    super();
    // array of change event listeners
    this._listerners = [];
  }

  /**
     * Add a listener function that will be called when the model changes
     * @param {function} listener
     * @returns {Model}
     */
  // addChangeListener(listener) {
  //   // push the new listener function into the array
  //   this._listerners.push(listener);
  //   return this;
  // }

  /**
     * Removes a change listener function
     * @param {function} listener
     * @returns {Model}
     */
  // removeChangeListener(listener) {
  //   this._listerners = this._listerners.filter((l) => l !== listener);
  //   return this;
  // }

  /**
     * Raises an change event
     * @returns {Model}
     */
  // raisChange() {
  //   console.log('dingensBumens');
  //   this._listerners.forEach((listener) => listener());
  //   return this;
  // }

  /**
     *
     * @param {Model} model
     * @returns {Model}
     */
  // bubbleChange(model) {
  //   model.addChangeListener(() => this.raisChange());
  //   return this;
  // }
}

class DataWareHouse extends Model {
  constructor(name, url) {
    super();

    this._name = name;
    [this._prefix] = name.split('-'); // array destructing. Takes the first elem of the array and assigns it to the variable this._prefix.
    this._data = {
      init: [],
      visibleData: [],
      tooltip: {}, // conta ints the tooltip information
      connected: {
        app: {},
        lib: {},
        vul: {},
      }, // contains a dict which tracks to which view the elems are connected.
      intersection: [], // array of elements that occure in every connection.
    };
    this._url = url;
    this.dataSetLoaded = false;

    this.asyncInitData();
  }

  static async initFilterSectionSeverityChart() {
    return (async () => {
      const path = '/vis/filter/severityfilterinit'; // create the url dynamically.
      const response = await fetch(path);
      if (response.status !== 200) { // error handling with status code
        console.log(`Problem in model.js::loading initial data. Status code: ${response.status}`);
        return { error: `${response.status}` };
      }
      return response.json();
    })();
  }

  static async applyNewFilter(filterObj) {
    return (async () => {
      const query = new URLSearchParams(filterObj);
      const queryString = query.toString();
      const path = `/vis/filter/add?${queryString}`;

      const response = await fetch(path);
      if (response.status !== 200) { // error handling with status code
        console.log(`Problem in model.js::loading initial data. Status code: ${response.status}`);
        return { error: `${response.status}` };
      }
      return response.json();
    })();
  }

  // static numbOfLoadedDataSets = 0;

  get name() {
    return this._name;
  }

  get prefix() {
    return this._prefix;
  }

  // this._data.visible contains the current data visible in the front-end.
  applyRangeFilterToData(min, max) {
    const selectedData = [];

    let dMin = 'min_cvssScore';
    let dMax = 'max_cvssScore';
    if (this._prefix === 'vul') {
      dMin = 'cvssScore';
      dMax = 'cvssScore';
    }
    this._data.visibleData.forEach((d) => {
      const dataMin = this._data.tooltip[d.id][dMin];
      const dataMax = this._data.tooltip[d.id][dMax];

      if (dataMin >= min && dataMax <= max) {
        selectedData.push(d);
      }
    });
    this.updateData(selectedData);
  }

  setConnected(connectedTo, elemIdArray, viewPrefix) {
    // 1st update Model.
    const path = this._data.connected[viewPrefix];
    if (!(connectedTo in path)) { //
      path[connectedTo] = elemIdArray;
    } else {
      delete path[connectedTo]; // we delete the record, this represents
    }

    this.redrawConnectedArtifacts();
  }

  redrawConnectedArtifacts() {
    // 2nd redraw views
    // carful. We take all connected elems into account! Therfore we need two loops.
    const views = Object.keys(this._data.connected);
    let updateArtifacts = [];

    views.forEach((view) => {
      const connectedElems = Object.keys(this._data.connected[view]);
      connectedElems.forEach((key) => {
        updateArtifacts = updateArtifacts.concat(this._data.connected[view][key]);
      });
    });
    this.emit('conectedElemsChanged', [this._prefix, updateArtifacts]);
  }

  getIntersection(viewPrefix) {
    console.log('\ngetIntersection');
    /*
     befor returning, we need to update the intersection property.
     all keys of clicked elems in the respective view.
    */
    const connectedKeys = Object.keys(this._data.connected[viewPrefix]);
    console.log(connectedKeys);
    const path = this._data.connected[viewPrefix];

    /*
     elements which are connected to every clicked element in viewPrefix
     are collected in the 'intersection' array.
    */
    let intersection = [];
    console.log(path);
    console.log('\n');
    if (connectedKeys.length >= 2) {
      // deep copy of one clicked Elemnts connected elements. (pop removes last elem and returns it)
      intersection = JSON.parse(JSON.stringify(path[connectedKeys.pop()]));
      console.log(connectedKeys);
      // TODO: who is resposible for the case: just one element is selected?
      // - The loop will never start! return value would be false.

      /*
     Idea: If an element occures in each connection,
     it needs to occure in any two arrays - hence it will never be filtered out.
    */

      while (connectedKeys.length >= 1) {
        const currentKey = connectedKeys.pop();
        // update the intersection array,
        // by removing any property that does not occure in both arrays
        console.log('\ncurrentKey ');
        console.log(path[currentKey]);

        intersection = intersection.filter((value) => path[currentKey].includes(value));
      }
    }

    this._data.intersection = intersection;
    this.emit('intersectionDataChanged', [this._prefix, intersection]);
  }

  /**
     * setter functions are always calledwhen code tries to change the property 'url'.
     * We do not allow any changes to the value.
     */
  set url(newUrl) {
    console.log('changes to the url property are not allowed.');
    return this._url;
  }

  /*
  getJSON() {
    return {
      name: this._name,
      data: this._data,
    };
  }
  */

  get initializationData() {
    return this._data.init;
  }

  async asyncInitData() {
    // fetch returns a promise
    // await expression waits until Promise is fulfilled. returns fthe fulfilled value.
    console.log('start request');
    this.genericRequest(`${this._url}/init`)
      .then((jsonData) => {
        this._data.init = jsonData.data;
        this._data.visibleData = this._data.init;
        this._data.tooltip = jsonData.tooltip;
        this.dataSetLoaded = true;
        // DataWareHouse.numbOfLoadedDataSets += 1;
      });
  }

  async getConnectedEntities(id) {
    const url = `${this._url}/clicked?id=${id}`;
    return this.genericRequest(url); // path + arguments
  }

  // could also be assigned to the vul views property?!
  async getCvssVersionData(v2, v3) {
    const url = `${this._url}/filter/cvssversion?v2=${v2}&v3=${v3}`;
    return this.genericRequest(url); // is this a promise??? is this real life?
  }

  async filterArtifactsBySeverity(cvssScore) {
    const url = `/vis/filter/byseverity?callingView=${this._prefix}&cvssScore=${cvssScore}`;
    this.genericRequest(url)
      .then((data) => {
        this.emit('severityFilterDataIsLoaded', [this._prefix, data]);
      });
    return [this._prefix, this.genericRequest(url)];
  }

  // eslint-disable-next-line class-methods-use-this
  async genericRequest(path) {
    const genericUrl = path; // create the url dynamically.
    const response = await fetch(genericUrl);
    if (response.status !== 200) { // error handling with status code
      console.log(`Problem in model.js::loading initial data. Status code: ${response.status}`);
      return { error: `${response.status}` };
    }
    return response.json();
  }

  numbOfDatapoints() {
    // TODO loop ever all keys and count elems?!
    return this._data.length;
  }

  get allData() {
    return this._data;
  }

  getintersection() {
    this.emit('conectedElemsChanged', [this._prefix, this._data.intersection]);
    return this._data.intersection;
  }

  getTooltipDataForArtifact(id) {
    return this._data.tooltip[id];
  }

  updateData(data) {
    this._data.visibleData = data;
    this.emit('dataUpdate', [this._prefix, this._data.visibleData]);
  }
}

// eslint-disable-next-line import/prefer-default-export
export { DataWareHouse };
