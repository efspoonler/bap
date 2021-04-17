import { ArtifactView } from './view.js';
import { DataWareHouse } from './model.js';
import ViewFilters from './viewFilters.js';
import { calcEdgeLen, getUniquePart } from './tools/helpers.js';

export default class Controller {
  constructor(modelList, viewList, filterSectionRoot) {
    console.log('controller');
    this.models = [];
    this.views = [];
    this.filtersection = new ViewFilters(filterSectionRoot);

    // create the models - for each view, we have one model.
    modelList.forEach((model) => {
      this.models.push(new DataWareHouse(model[0], model[1])); // name, url
    });

    // create the view instances.
    viewList.forEach((viewDivId) => {
      this.views.push(new ArtifactView(viewDivId));
    });

    this.views.forEach((view) => {
      view.onEvent('clickArtifact', (elem) => {
        const viewPrefix = elem[0];
        const artifactId = elem[1];
        const changeView = this.getView(viewPrefix);
        // workaround. we uncheck the checkBox so no additional logic is needed.
        changeView.uncheckCheckbox();
        // each Views checkBox is made visible again.
        this.views.forEach((v) => { v.showCheckbox(); });

        // checkbox is unchecked. we just want to add the new connected elems to the views.
        this.models.forEach((model) => {
          if (model.prefix === viewPrefix) {
            this.handleClickedSingleArtifact(viewPrefix, artifactId);
          }
        });
      });
    });

    this.views.forEach((view) => {
      view.onEvent('displayIntersection', (paramViewPrefix) => {
        this.models.forEach((model) => {
          if (model.prefix !== paramViewPrefix) {
            this.handleGetIntersectedElemes(paramViewPrefix);
          }
        });
      });
      view.onEvent('uncheckCheckbox', (paramViewPrefix) => {
        this.views.forEach((v) => {
          v.showCheckbox();
        });
        this.models.forEach((model) => {
          if (model.prefix !== paramViewPrefix) {
            model.redrawConnectedArtifacts();
          }
        });
      });

      view.onEvent('checkboxClicked', (paramViewPrefix) => {
        this.views.forEach((v) => {
          if (v.prefix !== paramViewPrefix) {
            v.hideCheckbox();
          }
        });
      });

      view.onEvent('updateTooltip', (params) => {
        const viewPrefix = params[0];
        const artifactId = params[1];

        const model = this.getModel(viewPrefix);
        const callingView = this.getView(viewPrefix);

        callingView.updateTooltip(model.getTooltipDataForArtifact(artifactId));
      });
    });

    this.models.forEach((model) => {
      model.onEvent('conectedElemsChanged', (data) => {
        const modelPrefix = data[0];
        const newData = data[1];
        console.log('Model has new data - controller has control.');
        this.views.forEach((view) => {
          if (view.prefix === modelPrefix) {
            view.updateConnectedElems(newData);
          }
        });
      });

      model.onEvent('severityFilterDataIsLoaded', (dataObject) => {
        const modelId = dataObject[0];
        const data = dataObject[1];

        const view = this.getView(modelId);
        console.log(data);
        view.filterCvssVersion(data);
      });

      model.onEvent('dataUpdate', (dataObject) => {
        const modelId = dataObject[0];
        const data = dataObject[1];
        const view = this.getView(modelId);
        console.log(modelId);
        view.dataSet = data;
        view.removeAllArtifacts();
        view.render();
        // model.getintersection();
      });
    });

    /*
      v2 = cvssVersion 2 and v3 = cvssVerison 3
      checkboxes v2 and v3 decide which CVEs are highlighted.
    */
    this.filtersection
      .onEvent('filterCvssVersion', (checkboxStatus) => {
        const [version2, version3] = [checkboxStatus[0], checkboxStatus[1]]; // bool values.

        // filter is the filter-name in the backend.
        const params = { filter: 'cvssVersion', v2: version2, v3: version3 };
        DataWareHouse.applyNewFilter(params)
          .then((filteredData) => {
            this.models.forEach((model) => {
              model.updateData(filteredData[model.prefix]);
              model.redrawConnectedArtifacts();
            });
          });

        // const vulModel = this.getModel('vul');
        // const vulView = this.getView('vul');
        // vulModel.getCvssVersionData(version2, version3)
        //   .then((data) => {
        //     vulView.filterCvssVersion(data); // data is an array of ids
        //   });
      })
      .onEvent('clickSeverityFilter', (cvssScoresArray) => {
        const params = { filter: 'severity' };

        cvssScoresArray.forEach((score) => {
          params[score] = true;
        });

        console.log(params);
        DataWareHouse.applyNewFilter(params)
          .then((filteredData) => {
            this.models.forEach((model) => {
              model.updateData(filteredData[model.prefix]);
            });
          });
      });
    this.initVis();
  }

  getView(viewName) {
    let retView = null;
    this.views.forEach((view) => {
      if (view.prefix === viewName) {
        retView = view;
      }
    });
    if (retView !== null) return retView; // standard case

    console.log(`View with Prefix (name): ${viewName} not found`); // error case
    return {};
  }

  getModel(modelPrefix) {
    let retModel = null;
    this.models.forEach((model) => {
      if (model.prefix === modelPrefix) {
        retModel = model;
      }
    });
    if (retModel !== null) return retModel;

    console.log(`model with Prefix (name): ${modelPrefix} not found`);
    return {};
  }

  // eslint-disable-next-line class-methods-use-this
  initVis() {
    let viewsMaxEdgeLen = [];
    const findMinEdgeLen = [];

    /**
     * Dirty workaround. The problem is, that we need to wait for all models to be loaded.
     * Since models do not know each other,
     * there is no mechanismn that is able to detected the latter problem.
     * The workaround uses an async function that waits in a loop until all models are ready.
     */
    (async () => {
      // eslint-disable-next-line no-restricted-syntax
      let allDatasetsAreLoaded = false;
      while (!allDatasetsAreLoaded) {
        // eslint-disable-next-line no-await-in-loop
        const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
        // eslint-disable-next-line no-await-in-loop
        await sleep(525);
        console.log('waited 525ms for the inital requests to finish.');
        allDatasetsAreLoaded = true;
        // eslint-disable-next-line no-loop-func
        this.models.forEach((model) => {
          // if there exist one model that isn't loaded yet, the loop continious
          if (model.initializationData.length <= 0) {
            allDatasetsAreLoaded = false;
          }
        });
      }

      /* We want all rectangles to be of equal size.
       * So we have to take the current size of each view, as well as
       * the number of data points each view is currently displaying,
       * into account.
       */
      for (let i = 0; i < this.models.length; i += 1) {
        this.views[i].dataSet = this.models[i].initializationData;
        const numbDatapoints = this.models[i].initializationData.length;
        const svgDim = this.views[i].rootSvgDim();
        findMinEdgeLen.push(calcEdgeLen(numbDatapoints, svgDim));
      }
      // take the smalles edge length, such that it fits in each view.
      viewsMaxEdgeLen = Math.min(...findMinEdgeLen);
      this.views.forEach((v) => {
        v.edgeLen(viewsMaxEdgeLen);
        console.log('Ärender Artifacts');
        v.render();
      });

      DataWareHouse.initFilterSectionSeverityChart()
        .then((data) => {
          console.log(data);
          this.filtersection.severityFilter(data);
        });
    })();
  }

  async handleClickedSingleArtifact(viewPrefix, artifactId) {
    this.models.forEach((model) => {
      const modelPrefix = model.prefix;
      if (viewPrefix === modelPrefix) {
        model.getConnectedEntities(artifactId)
          .then((retObj) => {
            this.models.forEach((currModel) => {
              if (currModel.prefix in retObj) {
                currModel.setConnected(artifactId, retObj[currModel.prefix], viewPrefix);
              }
            });
          });
      }
    });
  }

  // viewPrefix - where the event happened
  async handleGetIntersectedElemes(viewPrefix) {
    this.models.forEach((model) => {
      const modelPrefix = model.prefix;
      if (viewPrefix !== modelPrefix) {
        model.getIntersection(viewPrefix);
      }
    });
  }
}
