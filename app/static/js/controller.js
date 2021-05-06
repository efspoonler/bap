/* eslint-disable no-underscore-dangle */
import { ArtifactView } from './view.js';
import { DataWareHouse } from './model.js';
import ViewFilters from './viewFilters.js';
import { calcEdgeLen, getUniquePart } from './tools/helpers.js';
import createDependecyGraph from './viewDependency.js';

export default class Controller {
  constructor(modelList, viewList, filterSectionRoot) {
    console.log('controller');
    this.models = [];
    this.views = [];
    this.filtersection = new ViewFilters(filterSectionRoot);

    // track in which view the user selected an artifact first.
    // is used as a stack.
    this.firstSelectedView = [];
    // flag - we need to redraw all views artifacts if a user selected a new coloring.
    this._rmAllArtifact = false;

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
        // const changeView = this.getView(viewPrefix);
        // workaround. we uncheck the checkBox so no additional logic is needed.
        // changeView.uncheckCheckbox();
        // each Views checkBox is made visible again.
        // this.views.forEach((v) => { v.showCheckbox(); });
        this.views.forEach((v) => {
          v.fireClick();
        });
        // checkbox is unchecked. we just want to add the new connected elems to the views.
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
        const elemId = args[1];
        console.log('createDepGraph caled');
        console.log(args);
        if (callingView === 'app') {
          createDependecyGraph();
        }
      });
      view.onEvent('newOrdering', (args) => {
        const callingView = args[0];
        const selectedOrdering = args[1];
        console.log(selectedOrdering);
        const model = this.getModel(callingView);
        const params = {
          model: callingView,
          filter: 'ordering',
          value: selectedOrdering,
        };
        DataWareHouse.applyNewFilter(params)
          .then((filteredData) => {
            model.updateData(filteredData[model.prefix]);
            model.redrawConnectedArtifacts();
          });
      });
      view.onEvent('newColorMapping', (args) => {
        const callingView = args[0];
        const selectedColorMapping = args[1];
        console.log(selectedColorMapping);
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
        const retValue = model.getTextValues(arrayOfArtifactIds);
      });
    });

    this.views.forEach((view) => {
      view.onEvent('displayIntersection', (paramViewPrefix) => {
        (async () => {
          // eslint-disable-next-line no-restricted-syntax
          // const allDatasetsAreLoaded = false;
          // while (!allDatasetsAreLoaded) {
          // eslint-disable-next-line no-await-in-loop
          const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
          // eslint-disable-next-line no-await-in-loop
          await sleep(525);
          console.log('waited 525ms for the inital requests to finish.');
          this.models.forEach((model) => {
            console.log(`model: ${model.prefix}`);
            if (model.prefix !== paramViewPrefix) {
              this.handleGetIntersectedElemes(paramViewPrefix);
            }
          });
          // }
        })();
      });
      // view.onEvent('uncheckCheckbox', (paramViewPrefix) => {
      //   this.views.forEach((v) => {
      //     v.showCheckbox();
      //   });
      //   this.models.forEach((model) => {
      //     if (model.prefix !== paramViewPrefix) {
      //       model.redrawConnectedArtifacts();
      //     }
      //   });
      // });

      // view.onEvent('checkboxClicked', (paramViewPrefix) => {
      //   this.views.forEach((v) => {
      //     if (v.prefix !== paramViewPrefix) {
      //       v.hideCheckbox();
      //     }
      //   });
      // });

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

      model.onEvent('intersectionDataChanged', (data) => {
        const modelPrefix = data[0];
        const newData = data[1];
        console.log('Model has new data - controller has control.');
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
        console.log(data);
        view.filterCvssVersion(data);
      });

      model.onEvent('dataUpdate', (dataObject) => {
        const modelId = dataObject[0];
        const data = dataObject[1];
        const view = this.getView(modelId);
        view.dataSet = data;

        if (this._rmAllArtifact) {
          view.removeAllArtifacts();
          /* use a new colorscale. */
          // const newColorScale = 'goodall';
          // this._rmAllArtifact = false;
          // view.render(newColorScale);
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

        // model.getintersection();
      });

      model.onEvent('updateListWithText', (dataObject) => {
        const modelId = dataObject[0];
        const textDataObj = dataObject[1];
        const view = this.getView(modelId);

        view.displayTextinList(textDataObj);
      });
    });

    /*
      v2 = cvssVersion 2 and v3 = cvssVerison 3
      checkboxes v2 and v3 decide which CVEs are highlighted.
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

        // const vulModel = this.getModel('vul');
        // const vulView = this.getView('vul');
        // vulModel.getCvssVersionData(version2, version3)
        //   .then((data) => {
        //     vulView.filterCvssVersion(data); // data is an array of ids
        //   });
      })

      // TODO: one click event function
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
        // this.models.forEach((m) => {
        //   m.applyRangeFilterToData(min, max);
        // });

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

          console.log(v.prefix);
          console.log(newTargetView);
          if (v.prefix === newTargetView) {
            newBool = true;
          }
          // eslint-disable-next-line no-underscore-dangle
          v._updateControlStatus('showIntersection', newBool);
          // v.resetIntersectionClass();
        });
      })
      .onEvent('resetAllIntersectedElem', () => {
        this.views.forEach((v) => {
          v.resetIntersectionClass();
          v.fireClick();
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
        console.log('Ärender Artifacts');
        v.render('cve', 0); // init color-sclae => cve +
      });

      DataWareHouse.initFilterSectionSeverityChart()
        .then((data) => {
          console.log(data);
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

  // viewPrefix - where the event happened
  async handleGetIntersectedElemes(viewPrefix) {
    console.log('handleGetIntersecedElemets');
    this.models.forEach((model) => {
      const modelPrefix = model.prefix;
      if (viewPrefix !== modelPrefix) {
        model.getIntersection(viewPrefix);
      }
    });
  }
}
