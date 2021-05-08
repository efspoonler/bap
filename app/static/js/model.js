/* eslint-disable no-underscore-dangle */
import EventEmitter from './events.js';

/**
 * The DataWareHouse contains each views data.
 * It is responsible to get and store needed data from the backend.
 * @extends EventEmitter
 */
class DataWareHouse extends EventEmitter {
  /**
   * @param {String} name - prefix coresponds to the view prefix
   * @param {String} url - path structure for the respective model.
   */
  constructor(name, url) {
    super();
    // array of change event listeners
    this._listerners = [];

    this._name = name;
    // array destructing. First elem of the array is assigned to the variable <this._prefix>.
    [this._prefix] = name.split('-');
    // datastrucutre for storing data dynamically.
    this._data = {
      init: [],
      visibleData: [], // contains all information about artifact currently visible.
      tooltip: {}, // contains the tooltip information
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

  /**
   *
   * @returns {Promise}
   */
  static async initFilterSectionSeverityChart() {
    return (async () => {
      const path = '/vis/filter/severityfilterinit'; // filter url.
      const response = await fetch(path);
      if (response.status !== 200) { // error handling with status code
        console.log(`Problem in model.js::loading initial data. Status code: ${response.status}`);
        return { error: `${response.status}` };
      }
      return response.json();
    })();
  }

  /**
   * Each filter is specified by its name and its parameters.
   * @param {Object} filterObj - contains filters name as well as parameters
   * @returns {Promise}
   */
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

  /**
   *
   * @param {Number} min
   * @param {Number} max
   */
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

  /**
   *
   * @param {String} connectedTo - Id of an element
   * @param {Object} elemIdArray - [String,..] all artifact ids to which connectedTo is connected.
   * @param {String} viewPrefix - calling View.
   */
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

  /**
   * get all elements that are connected to each selected artifact.
   * @param {String} viewPrefix
   */
  getIntersection(viewPrefix) {
    /*
     befor returning, we need to update the intersection property.
     all keys of clicked elems in the respective view.
    */
    const connectedKeys = Object.keys(this._data.connected[viewPrefix]);
    const path = this._data.connected[viewPrefix];

    /*
     elements which are connected to every clicked element in viewPrefix
     are collected in the 'intersection' array.
    */
    let intersection = [];
    if (connectedKeys.length >= 2) {
      // deep copy of one clicked Elemnts connected elements. (pop removes last elem and returns it)
      intersection = JSON.parse(JSON.stringify(path[connectedKeys.pop()]));
      /*
     Idea: If an element occures in each connection,
     it needs to occure in any two arrays - hence it will never be filtered out.
    */
      while (connectedKeys.length >= 1) {
        const currentKey = connectedKeys.pop();
        // update the intersection array,
        // by removing any property that does not occure in both arrays
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

  get initializationData() {
    return this._data.init;
  }

  /**
   * get the initialization data.
   * the flag this.dataSetLoaded is needed by the controller.
   * at the beginning we wait until all DataWareHouses have loaded their data.
   */
  async asyncInitData() {
    // fetch returns a promise
    // await expression waits until Promise is fulfilled. returns the fulfilled value.
    this.genericRequest(`${this._url}/init`)
      .then((jsonData) => {
        this._data.init = jsonData.data;
        this._data.visibleData = this._data.init;
        this._data.tooltip = jsonData.tooltip;
        this.dataSetLoaded = true;
      });
  }

  async getConnectedEntities(id) {
    const url = `${this._url}/clicked?id=${id}`;
    return this.genericRequest(url); // path + arguments
  }

  // async getCvssVersionData(v2, v3) {
  //   const url = `${this._url}/filter/cvssversion?v2=${v2}&v3=${v3}`;
  //   return this.genericRequest(url); // is this a promise??? is this real life?
  // }

  // async filterArtifactsBySeverity(cvssScore) {
  //   const url = `/vis/filter/byseverity?callingView=${this._prefix}&cvssScore=${cvssScore}`;
  //   this.genericRequest(url)
  //     .then((data) => {
  //       this.emit('severityFilterDataIsLoaded', [this._prefix, data]);
  //     });
  //   return [this._prefix, this.genericRequest(url)];
  // }

  /**
   *
   * @param {String} path - url for a request
   * @returns {Object} - requested data
   */
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

  // numbOfDatapoints() {
  //   // TODO loop ever all keys and count elems?!
  //   return this._data.length;
  // }

  // get allData() {
  //   return this._data;
  // }

  /**
   * This function is called if the artifacts
   * are displayed as a list. It retrievs the coressponding names for each artifact visible.
   * @param {Object} arrayOfArtifactIds
   */
  getTextValues(arrayOfArtifactIds) {
    const artifactText = {};
    arrayOfArtifactIds.forEach((id) => {
      let fullName = this._data.tooltip[id].name;
      // No processing is needed for the CVE name.
      if (!(fullName.startsWith('CVE') || fullName.startsWith('null'))) {
        // just take the artifact name.
        const [, artifact, version] = fullName.split(':');
        // maybe modify it to "artifact-version.jar"
        if (this._prefix === 'lib') {
          fullName = `${artifact}-${version}.jar`;
        } else {
          fullName = artifact;
        }
      }
      artifactText[id] = {
        name: fullName,
      };
    });

    this.emit('updateListWithText', [this._prefix, artifactText]);
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

  get name() {
    return this._name;
  }

  get prefix() {
    return this._prefix;
  }
}

// eslint-disable-next-line import/prefer-default-export
export { DataWareHouse };
