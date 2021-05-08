import Controller from './controller.js';
import { createTooltip } from './tools/helpers.js';

// Handler starts as soon as the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
  const views = ['app', 'lib', 'vul'];
  const models = [['app-model', 'vis/app'], ['lib-model', 'vis/lib'], ['vul-model', 'vis/vul']];
  const filterSectionRoot = 'filterSection';

  createTooltip();
  const controller = new Controller(models, views, filterSectionRoot);
});
