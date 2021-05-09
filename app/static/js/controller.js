/* eslint-disable no-underscore-dangle */
import { ArtifactView } from './view.js';
import { DataWareHouse } from './model.js';
import ViewFilters from './viewFilters.js';
import { calcEdgeLen } from './tools/helpers.js';
import createDependecyGraph from './viewDependency.js';

/**
 * The controller handles the communication between the views and the models.
 * It is the heart of our MVC application.
 * communication is triggerd by events. And mostly async.
 */
export default class Controller {
  constructor(modelList, viewList, filterSectionRoot) {
    this.models = []; // list containing all models
    this.views = []; // list containing all views
    this.filtersection = new ViewFilters(filterSectionRoot);
    this.filtersectionRootNode = filterSectionRoot;

    // // safe in which view the user selected an artifact first.
    // // is used as a stack.
    // this.firstSelectedView = [];

    // flag - we need to redraw all views artifacts if a user selected a new coloring.
    this._rmAllArtifact = false;

    // create the models - for each view, we have one model.
    modelList.forEach((model) => {
      this.models.push(new DataWareHouse(model[0], model[1])); // name, url
    });

    // create the view instances.
    viewList.forEach((viewDivId) => {
      this.views.push(new ArtifactView(viewDivId)); // encapsulating div
    });

    /*
    * Add event Listeners to the views.
    */
    this.views.forEach((view) => {
      view.onEvent('clickArtifact', (elem) => {
        const viewPrefix = elem[0];
        const artifactId = elem[1];
        this.views.forEach((v) => {
          v.fireClick();
        });
        // add the new connected elems to the views.
        this.models.forEach((model) => {
          if (model.prefix === viewPrefix) {
            this.handleClickedSingleArtifact(viewPrefix, artifactId);
          }
        });
      });
      view.onEvent('resetAllIntersectedElem', () => {
        this.views.forEach((v) => {
          v.resetIntersectionClass();
        });
      });
      view.onEvent('createDependencyGraph', (args) => {
        const callingView = args[0];
        // const elemId = args[1];
        if (callingView === 'app') {
          createDependecyGraph();
        }
      });
      view.onEvent('newOrdering', (args) => {
        const callingView = args[0];
        const selectedOrdering = args[1];
        const model = this.getModel(callingView);
        const params = {
          model: callingView,
          filter: 'ordering',
          value: selectedOrdering,
        };
        // static method
        DataWareHouse.applyNewFilter(params)
          .then((filteredData) => {
            model.updateData(filteredData[model.prefix]);
            model.redrawConnectedArtifacts();
          });
      });
      view.onEvent('newColorMapping', (args) => {
        const callingView = args[0];
        const selectedColorMapping = args[1];
        const model = this.getModel(callingView);
        const params = {
          model: callingView,
          filter: 'color',
          value: selectedColorMapping,
        };
        this._rmAllArtifact = true;
        DataWareHouse.applyNewFilter(params)
          .then((filteredData) => {
            model.updateData(filteredData[model.prefix]);
            model.redrawConnectedArtifacts();
          });
      });
      view.onEvent('getListsTextValues', (args) => {
        const callingView = args[0];
        const arrayOfArtifactIds = args[1];
        const model = this.getModel(callingView);
        model.getTextValues(arrayOfArtifactIds);
      });

      view.onEvent('displayIntersection', (paramViewPrefix) => {
        /*
        * we wait until all new data is loaded by sleeping.
        * by sleeping we prevent false calculations.
        * we first sleep/wait until the models have updated there data
        * otherwise we'd calculate the intersection on the old data, since retreiving data
        * is async an takes some Time. The intersection calculation is done by the models!
        * */
        (async () => {
          // eslint-disable-next-line no-restricted-syntax
          // eslint-disable-next-line no-await-in-loop
          // eslint-disable-next-line max-len
          const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)); // Do not rewrite this function!
          // eslint-disable-next-line no-await-in-loop
          await sleep(525);
          this.models.forEach((model) => {
            if (model.prefix !== paramViewPrefix) {
              this.handleGetIntersectedElemes(paramViewPrefix);
            }
          });
          // }
        })();
      });
      view.onEvent('updateTooltip', (params) => {
        const viewPrefix = params[0];
        const artifactId = params[1];
        const model = this.getModel(viewPrefix);
        const callingView = this.getView(viewPrefix);

        callingView.updateTooltip(model.getTooltipDataForArtifact(artifactId));
      });
    });

    /*
    * Add event Listeners to the models.
    */
    this.models.forEach((model) => {
      model.onEvent('conectedElemsChanged', (data) => {
        const modelPrefix = data[0];
        const newData = data[1];
        this.views.forEach((view) => {
          if (view.prefix === modelPrefix) {
            view.updateConnectedElems(newData);
          }
        });
      });

      model.onEvent('intersectionDataChanged', (data) => {
        const modelPrefix = data[0];
        const newData = data[1];
        this.views.forEach((view) => {
          if (view.prefix === modelPrefix) {
            view.highlightIntersection(newData);
          }
        });
      });

      model.onEvent('severityFilterDataIsLoaded', (dataObject) => {
        const modelId = dataObject[0];
        const data = dataObject[1];
        const view = this.getView(modelId);
        view.filterCvssVersion(data);
      });

      model.onEvent('dataUpdate', (dataObject) => {
        const modelId = dataObject[0];
        const data = dataObject[1];
        const view = this.getView(modelId);
        view.dataSet = data;

        if (this._rmAllArtifact) {
          view.removeAllArtifacts();
          if (modelId === 'vul') {
            let newColorScale = 'cve';
            if (view.currentlySeletedColorMapping() === 'meta_affected_apps') {
              newColorScale = 'linear';
            }
            this._rmAllArtifact = false;
            view.render(newColorScale);
          } else {
            this._rmAllArtifact = false;
            view.render();
          }
        } else {
          view.render();
        }
      });

      model.onEvent('updateListWithText', (dataObject) => {
        const modelId = dataObject[0];
        const textDataObj = dataObject[1];
        const view = this.getView(modelId);

        view.displayTextinList(textDataObj);
      });
    });

    /*
      * add event listener to the filtersection
      */
    this.filtersection
      .onEvent('filterCvssVersion', (checkboxStatus) => {
        const [version2, version3, none] = checkboxStatus; // bool values.

        // filter is the filter-name in the backend.
        const params = {
          filter: 'cvssVersion', v2: version2, v3: version3, none,
        };
        DataWareHouse.applyNewFilter(params)
          .then((filteredData) => {
            this.models.forEach((model) => {
              model.updateData(filteredData[model.prefix]);
              model.redrawConnectedArtifacts();
            });
          });
      })
      .onEvent('clickSeverityFilter', (cvssScoresArray) => {
        const params = { filter: 'severity' };

        cvssScoresArray.forEach((score) => {
          params[score] = true;
        });

        DataWareHouse.applyNewFilter(params)
          .then((filteredData) => {
            this.models.forEach((model) => {
              model.updateData(filteredData[model.prefix]);
              model.redrawConnectedArtifacts();
            });
          });
      })
      .onEvent('applyBaseVectorFilter', (activeFilters) => {
        const param = activeFilters;
        param.filter = 'baseVector';
        DataWareHouse.applyNewFilter(param)
          .then((filteredData) => {
            this.models.forEach((model) => {
              model.updateData(filteredData[model.prefix]);
              model.redrawConnectedArtifacts();
            });
          });
      })
      .onEvent('rangeSliderChanged', (callingViewAndMinMax) => {
        const [min, max] = callingViewAndMinMax;
        const params = {
          filter: 'rangeSlider',
          min,
          max,
        };

        DataWareHouse.applyNewFilter(params)
          .then((filteredData) => {
            this.models.forEach((model) => {
              model.updateData(filteredData[model.prefix]);
              model.redrawConnectedArtifacts();
            });
          });
      })

      .onEvent('intersectionTargetChanged', (newTargetView) => {
        this.views.forEach((v) => {
          let newBool = false;
          if (v.prefix === newTargetView) {
            newBool = true;
          }
          // eslint-disable-next-line no-underscore-dangle
          v._updateControlStatus('showIntersection', newBool);
        });
      })

      .onEvent('resetAllIntersectedElem', () => {
        this.views.forEach((v) => {
          v.resetIntersectionClass();
          v.fireClick();
        });
      })

      .onEvent('redrawWholeFilterMenu', () => {
        this.filtersection = new ViewFilters(this.filtersectionRootNode);
        DataWareHouse.initFilterSectionSeverityChart()
          .then((data) => {
            this.filtersection.severityFilter(data);
          });
      });

    this.initVis();
  }

  /**
   * Helper function.
   * Returns a view by its prefix name.
   * @param {String} viewName - name of the view
   * @returns {View}
   */
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

  /**
   * Helper Function.
   * Returns a model by its prefix name.
   * @param {String} modelPrefix
   * @returns {Model}
   */
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
    const templateSpinner = document.getElementById('template-spinner').innerHTML;
    const visRow = document.getElementById('viscontainer');
    const visRowWidth = visRow.clientWidth;
    const visRowHeight = visRow.clientHeight;

    /**
     * Dirty workaround. The problem is, that we need to wait for all models to be loaded.
     * Since models do not know each other,
     * there is no mechanismn that is able to detected the latter problem.
     * The workaround uses an async function that waits in a loop until all models are ready.
     */
    (async () => {
      /* Loading Spinner + Div overlapping the whole application */
      const spinnerContainer = d3.select('#visRow')
        .append('div')
        .attr('id', 'deleteAfterDataIsLoaded')
        .attr('style', `z-index: 1; display:flex; position: absolute; height:${visRowHeight}px; width:${visRowWidth}px; background-color: gray; opacity:0.75`)
        .append('div')
        .attr('style', `display:flex; position: absolute; margin-left:${visRowWidth / 1.75}px; margin-top:${visRowHeight / 2 - 70}px;`);
      spinnerContainer
        .html(templateSpinner);

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
        v.render('cve', 0); // init color-sclae => cve +
      });

      DataWareHouse.initFilterSectionSeverityChart()
        .then((data) => {
          this.filtersection.severityFilter(data);
        });
    })()
    // animation of the loading spinner
      .then(() => {
        d3.select('#deleteAfterDataIsLoaded')
          .transition()
          .style('opacity', 0)
          .duration(3000)
          .remove(); // remove the element
      });
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

  /**
   * Instruct a model to calculate the insection.
   * @param {String} viewPrefix - determines in which view the event happend.
   */
  async handleGetIntersectedElemes(viewPrefix) {
    this.models.forEach((model) => {
      const modelPrefix = model.prefix;
      if (viewPrefix !== modelPrefix) {
        model.getIntersection(viewPrefix);
      }
    });
  }
}
