import Controller from './controller.js';
import { createTooltip } from './tools/helpers.js';
// import { DataWareHouse } from './model.js';
// import { ArtifactView } from './view.js';

// import './vis/initInterface.js';
// import { createTooltip } from './vis/tooltip.js';
// import { Barchart } from "./vis/barchart.js";
// const viewNames = ['app-view', 'lib-view', 'vul-view'];

// Handler when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const views = ['app', 'lib', 'vul'];
  const models = [['app-model', 'vis/app'], ['lib-model', 'vis/lib'], ['vul-model', 'vis/vul']];
  const filterSectionRoot = 'filterSection';

  console.log('Main');
  createTooltip();
  // eslint-disable-next-line no-unused-vars
  const controller = new Controller(models, views, filterSectionRoot);
});
