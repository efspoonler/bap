// Module talking to the api of flask.

const DataModel = (function () {
  let modelInstance;

  function createInstance() {
    const obj = {};
    return obj;
  }

  // create a singleton.
  return {
    getInstance() {
      if (!modelInstance) {
        modelInstance = createInstance();
      }
      return modelInstance;
    },
  };
}());

DataModel.prototype.initVis = async function initVis() {
  // fetch returns a promise
  const response = await fetch('vis/init');
  if (response.status !== 200) { // error handling with status code
    console.log(`Problem in data-manager.js::loading initial data. Status code: ${response.status}`);
  }
  return response.json();
};

export default DataModel;
/*
async function initVis() {
  // fetch returns a promise
  const response = await fetch('vis/init');
  if (response.status !== 200) { // error handling with status code
   console.log(`Problem in data-manager.js-loading initial data. Status code: ${response.status}`);
  }
  return response.json();
}

function pickle() {
  // fetch returns a promise
  return fetch('/data/pickle')
    .then((response) => {
      if (response.status !== 200) { // error handling with status code
        console.log(`Problem in data-manager.js - pickle(). Status code: ${response.status}`);
        return;
      }
      response.json();
    });
}

async function allApps() {
  // fetch returns a promise
  const response = await fetch('/data/apps');
  if (response.status !== 200) { // error handling with status code
    console.log(`Looks like there was a problem. Status code: ${response.status}`);
  }
  return response.json();
}

async function reorderEntities(viewId, param) {
  const urlDict = {
    app: '/vis/app',
    lib: null,
    vula: null,
  };
  // eslint-disable-next-line no-useless-escape
  const url = `${urlDict[viewId]}?orderig\=${param}`;
  console.log(url);
  const response = await fetch(url, {
    method: 'GET',
  });
  return response.json();
}

async function getClickedElemInfromation(url) {
  const response = await fetch(url);
  if (response.status !== 200) {
    console.log('problem in fetClickedElemInformation');
  }
  return response.json();
}

export {
  initVis, pickle, allApps, reorderEntities, getClickedElemInfromation,
};

*/
/*
returns an array where each entry has the form:
<space-name> (<space-token>) <separator><group><separator><artifact><separator><version>
it is the appID (don't get confused with ID and appID. That are two different things)

function allAppsShort(){
   //fetch returns a promise
   return fetch('/data/apps/short')
           .then(response => {
               if (response.status !== 200) { //error handling with status code
                   console.log(`Looks like there was a problem. Status code: ${response.status}`);
                   return;
               }
               return response.json()
           })
}

//returns all vulnerable dependencies for the given application

function vulnerableDependencies(mvnGrp, artifact, version){
    let urlConcat = mvnGrp + '/' + artifact + '/' + version
    //console.log(urlConcat)
    return fetch('/data/apps/vulndeps/' + urlConcat)
           .then(response => {
               if (response.status !== 200) { //error handling with status code
                   console.log(`Looks like there was a problem. Status code: ${response.status}`);
                   return;
               }
               return response.json()
           })
}

function vulDeps(appID){
    return fetch('/data/apps/short/vulndeps/' + appID)
           .then(response => {
               if (response.status !== 200) { //error handling with status code
                   console.log(`Looks like there was a problem. Status code: ${response.status}`);
                   return;
               }
               return response.json()
           })
}

function vulList(mvnGrp, artifact, version){
    let urlConcat = mvnGrp + '/' + artifact + '/' + version
    //console.log(urlConcat)
    return fetch('/data/apps/vulnerabilites/' + urlConcat)
           .then(response => {
               if (response.status !== 200) { //error handling with status code
                   console.log(`Looks like there was a problem. Status code: ${response.status}`);
                   return;
               }
               return response.json()
           })
}

function bugsPerApp(mvnGrp, artifact, version){
    let urlConcat = mvnGrp + '/' + artifact + '/' + version
    //console.log(urlConcat)
    return fetch('/data/libids/bugs/' + urlConcat)
           .then(response => {
               if (response.status !== 200) { //error handling with status code
                   console.log(`Looks like there was a problem. Status code: ${response.status}`);
                   return;
               }
               return response.json()
           })
}

function getAllLibs(){
    return fetch('/data/libs')
           .then(response => {
               if (response.status !== 200) { //error handling with status code
                   console.log(`Looks like there was a problem. Status code: ${response.status}`);
                   return;
               }
               return response.json()
           })
}

export function dependencyCount(data){
    let depCount = []
    console.log(data)
    console.log(data[0])
    console.log(data[0]['dependencies'])
    console.log(data[0].dependencies)
    for (var i = 0; i < data.length; i++) {

        depCount[i] =  data[i]['dependencies'].length //maybe just append?

        //console.log(i)
        //console.log(depCount[i])
    }
    return depCount
}
*/
