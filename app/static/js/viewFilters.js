/* eslint-disable no-underscore-dangle */
import EventEmitter from './events.js';
import {
  colorscales, dynamicDropdowns,
} from './tools/helpers.js';

class ViewFilters extends EventEmitter {
  constructor(root) {
    super();
    this._filterDivId = root; // filter sections encapsulating div.
    this._width = -1;
    this._height = -1;
    this.MARGINS = {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    };
    this._baseMetric = ['Access Vector', 'Access Complexity', 'Authentication', 'Confidentiality', 'Integrity', 'Availability'];
    this._metrics = {
      av2: [ // Acces Vector
        {
          value: 'Local',
          id: 'L',
        },
        {
          value: 'Adjacent Network',
          id: 'A',
        },
        {
          value: 'Network',
          id: 'N',
        },
      ],
      ac2: [ // Access Complexity in v3 Attack Complexity
        {
          value: 'High',
          id: 'H',
        },
        {
          value: 'Medium',
          id: 'M',
        },
        {
          value: 'Low',
          id: 'L',
        },
      ],
      au2: [ // Authentication
        {
          value: 'Multiple',
          id: 'M',
        },
        {
          value: 'Single',
          id: 'S',
        },
        {
          value: 'None',
          id: 'N',
        },
      ],
      c2: [ // Confidentiality
        {
          value: 'None',
          id: 'N',
        },
        {
          value: 'Partial',
          id: 'P',
        },
        {
          value: 'Complete',
          id: 'C',
        },
      ],
      i2: [ // Integrity
        {
          value: 'None',
          id: 'N',
        },
        {
          value: 'Partial',
          id: 'P',
        },
        {
          value: 'Complete',
          id: 'C',
        },
      ],
      a2: [ // Availability
        {
          value: 'None',
          id: 'N',
        },
        {
          value: 'Partial',
          id: 'P',
        },
        {
          value: 'Complete',
          id: 'C',
        },
      ],
      av3: [ // Attack Vector v3
        {
          value: 'Network',
          id: 'N',
        },
        {
          value: 'Adjacent Network',
          id: 'A',
        },
        {
          value: 'Local',
          id: 'L',
        },
        {
          value: 'Physical',
          id: 'P',
        },
      ],
      ac3: [ // Attack Complexity v3
        {
          value: 'Low',
          id: 'L',
        },
        {
          value: 'High',
          id: 'H',
        },
      ],
      pr3: [ // Privileges Required v3
        {
          value: 'None',
          id: 'N',
        },
        {
          value: 'Low',
          id: 'L',
        },
        {
          value: 'High',
          id: 'H',
        },
      ],
      ui3: [ // User Interaction v3
        {
          value: 'None',
          id: 'N',
        },
        {
          value: 'Required',
          id: 'R',
        },
      ],
      c3: [ // Confidentiality v3
        {
          value: 'None',
          id: 'N',
        },
        {
          value: 'Low',
          id: 'L',
        },
        {
          value: 'High',
          id: 'H',
        },
      ],
      i3: [ // Integrity v3
        {
          value: 'None',
          id: 'N',
        },
        {
          value: 'Low',
          id: 'L',
        },
        {
          value: 'High',
          id: 'H',
        },
      ],
      a3: [ // Availability v3
        {
          value: 'None',
          id: 'N',
        },
        {
          value: 'Low',
          id: 'L',
        },
        {
          value: 'High',
          id: 'H',
        },
      ],
      s3: [ // Scope v3
        {
          value: 'None',
          id: 'N',
        },
        {
          value: 'Low',
          id: 'L',
        },
        {
          value: 'High',
          id: 'H',
        },
      ],
    };

    this._dynamicBaseVector = {};

    this.updateWidthAndHeight();
    this.cvssVersionFilter();
    this.initBaseMetricFilter();
    this.addDropdownMetric();
    this.addDropdownList();
    this.addRangeSlider();
  }

  // eslint-disable-next-line class-methods-use-this
  addRangeSlider() {
    const rangFilterDivRow = d3.select('#filterSection')
      .append('div')
      .attr('class', 'row');

    rangFilterDivRow
      .append('div')
      .attr('id', 'value-range')
      .attr('class', 'col-sm-2');

    rangFilterDivRow
      .append('div')
      .attr('id', 'slider-range')
      .attr('class', 'col-sm');
    // Range
    const sliderRange = d3
      .sliderBottom()
      .min(0)
      .max(10)
      .width(this._width - this.MARGINS.left)
      .tickFormat(d3.format('.2'))
      .ticks(5)
      .default([0, 10])
      .fill('#2196f3')
      .on('end', (rangeArray) => {
        d3.select('p#value-range').text(rangeArray.map(d3.format('.2')).join('-'));
        console.log(rangeArray);
        this.emit('rangeSliderChanged', rangeArray);
      });

    const gRange = d3
      .select('div#slider-range')
      .append('svg')
      .attr('width', 500)
      .attr('height', 100)
      .append('g')
      .attr('transform', `translate(${this.MARGINS.left - 5},${this.MARGINS.top})`);

    gRange.call(sliderRange);

    d3.select('p#value-range').text(
      sliderRange
        .value()
        .map(d3.format('.2%'))
        .join('-'),
    );
  }

  cvssVersionFilter() {
    const filterDiv = d3.select(`#${this._filterDivId}`);
    filterDiv
      .append('div')
      .attr('class', 'form-check form-check-inline')
      .append('input')
      .attr('class', 'form-check-input') // this class has a margin-left of -1,25rem!
      .attr('type', 'checkbox')
      .property('checked', true)
      .attr('id', 'cvssversiontwo');
    filterDiv.select('div')
      .append('label')
      .attr('class', 'form-check-label')
      .text('v2')
      .attr('for', 'cvssversiontwo');

    filterDiv
      .append('div')
      .attr('class', 'form-check form-check-inline')
      .attr('id', 'divVtwo')
      .append('input')
      .attr('class', 'form-check-input') // this class has a margin-left of -1,25rem!
      .attr('type', 'checkbox')
      .property('checked', true)
      .attr('id', 'cvssversionthree');

    filterDiv.select('#divVtwo')
      .append('label')
      .attr('class', 'form-check-label')
      .text('v3')
      .attr('for', 'cvssversionthree');

    filterDiv.selectAll('input')
      .on('click', () => {
        const v2 = d3.select('#cvssversiontwo').property('checked');
        const v3 = d3.select('#cvssversionthree').property('checked');
        console.log(`checkboxstatus: v2 is ${v2} v3 is:${v3}`);
        this.emit('filterCvssVersion', [v2, v3]);
      });
  }

  severityFilter(data) {
    // const test = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

    // the intervalls look like this (0,1] (1,2] (2,3] .... (10,10]
    // - bins contains the total number of found vulberabilities that fall into each bin.
    const bins = [];
    data.forEach((d, i) => {
      // eslint-disable-next-line prefer-destructuring
      bins[i] = d[0];
    });
    const filterDiv = d3.select(`#${this._filterDivId}`);
    const severityChartHeight = this._height * 0.15;
    console.log('add severity filter');
    const severitySvg = filterDiv
      .append('div')
      .attr('class', 'row')
      .append('div')
      .attr('class', 'severityBarChart d-flex align-items-end')
      // .attr('style', 'position:absolute; bottom:0; padding-bottom: 20px;')
      .append('svg')
      .attr('id', `${this._filterDivId}-severity`) // svg that contains all g-Artifacts
      .attr('width', this._width + this.MARGINS.left + this.MARGINS.right)
      .attr('height', severityChartHeight + this.MARGINS.top + this.MARGINS.bottom)
      .append('g')
      .attr('transform', `translate(${this.MARGINS.left},${this.MARGINS.top})`);

    const xAxis = d3.scaleBand()
      .range([0, this._width])
      .domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      .padding(0.2);

    severitySvg
      .append('g')
      .attr('transform', `translate(0,${severityChartHeight})`)
      .call(d3.axisBottom(xAxis));

    const yAxis = d3.scaleLinear()
      .domain([d3.min(bins), d3.max(bins)])
      /*
      * we subtract -1 in the range, because we always want to see a bar.
      * since our data does not contain any int value < 1 (this means we always have a bar)
      * we force the visualizaiton to always return a bar of height at min 1.
      */
      .range([severityChartHeight - 1, 0]);
    severitySvg
      .append('g')
      .call(d3.axisLeft(yAxis).ticks(4).tickFormat(d3.format('.1s')));
    severitySvg
      .selectAll('mybar')
      // data has the form: [[...], {...}]
      // the array contains the bins, the object contains more detailed information.
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d, i) => xAxis(i))
      .attr('y', (d) => yAxis(d[0]))
      .attr('width', xAxis.bandwidth())
      .attr('height', (d) => severityChartHeight - yAxis(d[0]))
      .attr('fill', (d) => colorscales.cve(d[2]))
      .attr('fill-opacity', 0.5)
      .on('mouseover mousemove', (event, attachedData) => {
        // at pos 1 of the data we have our detailed information
        const keys = Object.keys(attachedData[1]);
        let dynamicHtml = `<p>Total number of detected vulnerabilitites with a cvssScore of ${attachedData[2]}: ${attachedData[0]}</p>`;
        dynamicHtml += '<table style="width:100%; align:left"><tr><th>cvssScore       </th><th>number</th><th>in %</th></tr>';
        keys.forEach((k) => {
          let percentage = (attachedData[1][k] / attachedData[0]) * 100;
          percentage = percentage.toFixed(1);
          dynamicHtml += `<tr><td>${k}</td><td>${attachedData[1][k]}</td><td>${percentage}</tr>`;
        });
        d3.select('#tooltip')
          .attr('style', 'opacity: 0.85')
          .html(dynamicHtml)
          .style('left', `${event.pageX - 100}px`)
          .style('top', `${event.pageY + 20}px`);
      })
      .on('mouseleave', () => {
        d3.select('#tooltip')
          .style('opacity', 0)
          // we move the tootip to the top left corner and shrik it to the minimum size.
          // this prevents an 0 opacity tooltip from overlapping artifacts.
          .style('left', '0px')
          .style('top', '0px')
          .html('');
      })
      .on('click', (event) => {
        // toggle between the class.
        console.log(this);
        const that = event.target;
        d3.select(that).classed('cvssScore-selected', !d3.select(that).classed('cvssScore-selected'));
        d3.select(that).attr('fill-opacity', d3.select(that).attr('fill-opacity') < 1 ? 1 : 0.5);
        // collect the data of all selected Elements [[],[],[],..]
        const selectedData = d3.selectAll('.cvssScore-selected').data();
        // for each previously selected datapoint, we select its id.
        const selectedSeverities = selectedData.map((d) => d[2]); // id === cvssScore.
        this.emit('clickSeverityFilter', selectedSeverities);
      });
  }

  initBaseMetricFilter() {
    const filterDiv = d3.select(`#${this._filterDivId}`)
      .append('div')
      .attr('id', 'baseVectorFilter')
      .attr('class', 'row')
      .attr('style', 'display:block'); // border:1px solid black');
    const apply = d3.select(`#${this._filterDivId}`)
      .append('div')
      .attr('id', 'baseVectorFilter-apply')
      .attr('class', 'row');
    /*
    * Exploitablity Metrics:
    *  - Access Vector (AV)
    *  - Access Complexity (AC)
    *  -- v3 specific --
    *    - Privileges Required (PR)
    *    - User Interaction (UI)
    *
    * Impact Metrics
    *   - Compability impact
    *   - Integrity Impact
    *   - Availability Impact
    *
    * Scope
    */
    filterDiv // html skelleton
      .html(`
      <label class="control-label">CVE Base Vector Filter</label>
      <div class="controls"> 
        <div class="form" id="baseVectorDiv">
        </div>

      </div>
      
      </button>`);
    apply
      .html(
        `<button id="apply-vector-filter" class="btn btn-outline-primary btn-block" type="submit">apply</button>
    `,
      );

    d3.select('#apply-vector-filter')
      .on('click', () => {
        this.addBaseVectorFilterApply();
      });
  }

  addDropdownMetric() { //
    const templateHtmlMetrics = document.getElementById('template-metrics-v2').innerHTML;
    const templateHtmlRadioBtn = document.getElementById('template-radio-btn').innerHTML;
    const newMenu = d3.select('#baseVectorDiv')
      // .append('div')
      // .attr('class', 'row')
      .append('div')
      .attr('class', 'entry input-group col-xs-12');

    newMenu
      .html(templateHtmlRadioBtn);
    newMenu
      .append('div')
      .classed('dropdown', true)
      .html(templateHtmlMetrics);

    console.log(newMenu.select('#radio-btn-group'));
    newMenu
      .select('#radio-btn-group')
      .selectAll('label')
      .on('mouseup', (evnt) => {
        // strange behaviour. It seems like the element is toggled after the event was fired.
        // Hence we have to select the element which was previously not selected
        // to work on the selected element.
        // This is done by Use the CSS3 :not pseudo-class.
        /*
        *d3.select(that)
        *  .select('label:not(.active)')
        *  .attr('id');
        */
        const clickedElem = evnt.target;
        const encDiv = d3.select(clickedElem.closest('.entry'));
        console.log(clickedElem);
        const clickedElemId = d3.select(clickedElem).select('input').attr('id');
        console.log(clickedElemId);
        const versionId = encDiv
          .select('div.dropdown')
          .remove();
        encDiv
          .select('div.dropdown-values')
          .remove();
        encDiv
          .select('.input-group-btn')
          .remove();

        const container = encDiv;
        this.redrawMetrics(clickedElemId, container);
        console.log();
      });
    this.disableAlreadySelectedMetrics();
    this.addDropdownList();
  }

  // eslint-disable-next-line class-methods-use-this
  redrawMetrics(version, divContainer) {
    const templateHtmlMetrics = document.getElementById(`template-metrics-${version}`).innerHTML;
    const currentHTML = divContainer.html();
    console.log(divContainer);
    divContainer
      .append('div')
      .classed('dropdown', true)
      .html(templateHtmlMetrics);
    this.addDropdownList();
  }

  // eslint-disable-next-line class-methods-use-this
  disableAlreadySelectedMetrics() {
    const alreadySelectedMetricsIds = [];
    d3.selectAll('.entry')
      .each(function getSelectedMetrics() {
        alreadySelectedMetricsIds.push(d3.select(this)
          .select('.select-metric')
          .attr('id'));
      });

    d3.selectAll('.entry')
      .each(() => {
        d3.selectAll('.dropdown-item')
          .each(function selectItemsToDisable() {
          // check if the Metric was already selected by a user.
            if (alreadySelectedMetricsIds.includes(d3.select(this).attr('id'))) {
              d3.select(this)
                .property('disabled', true);
            } else {
              d3.select(this)
                .property('disabled', false);
            }
          });
      });
  }

  addDropdownList() {
    console.log(this);
    d3.selectAll('.dropdown-item')
      .on('click', (e) => {
        const templateAddNewDropdown = document.getElementById('template-metrics-values').innerHTML;
        const templateList = document.getElementById('template-dynamic-list-item').innerHTML;
        const selectedElem = e.target.id;
        let selectedText = e.target.innerHTML;

        let dynamicList = '';

        // we select the values which coresponds to the metric selected by the user.
        this._metrics[selectedElem].forEach((option) => {
          // we use a regex to replace the %id% and %name% placeholders.
          dynamicList += templateList.replace(/%id%/g, option.id)
            .replace(/%name%/g, option.value);
        });

        // The closest() method traverses the Element and its parents
        // (heading toward the document root)
        const encapsulationDiv = d3.select(e.target.closest('.entry'));

        // removes an existing 'values' Dropdown, if it exists.
        const valueSelectionDropdown = encapsulationDiv.select('div .dropdown-values');
        console.log(valueSelectionDropdown.empty());
        let addorDelete = `
        <button class="btn btn-outline-success btn-add add-or-del btn-sm" type="button">
          <span class="glyphicon glyphicon-plus"></span> +
        </button>`;
        if (!(valueSelectionDropdown.empty())) {
          valueSelectionDropdown.remove();

          // save the current 'state', such that we can recover it.
          addorDelete = d3.select('.input-group-btn').node().innerHTML;

          encapsulationDiv.select('div .dropdown-values').remove();
          encapsulationDiv.select('.input-group-btn').remove();
        }

        // display the name of the selected metric inside the dropdown
        selectedText = selectedText.match(/(?<=\().*?(?=\))/);
        if (selectedText.length === 1) {
          selectedText += ' : ';
        } else {
          selectedText += ' : ';
        }
        encapsulationDiv
          .select('.select-metric')
          .text(selectedText)
          // the id dynamically changes. It represents the currently selected metric.
          .attr('id', selectedElem);

        // we create a new dropdown menu which allows a user to select the specific values.
        encapsulationDiv
          .append('div')
          .attr('class', 'dropdown-values', true)
          .html(templateAddNewDropdown);

        // fill the newly created dropdown with the checkbox list.
        encapsulationDiv
        // the class of the (added) 'Select Value'. Dropdown menue as specified in the template.
          .select('.addedDropdown')
          .html(dynamicList);

        // create the add/remove button
        // if a user just selected a new metric, we restore the value (see above)
        encapsulationDiv
          .append('span')
          .attr('class', 'input-group-btn')
          .html(addorDelete);

        // keep track of the checkbox states in the value dropdown menue.
        encapsulationDiv
          .select('.addedDropdown')
          .selectAll('input') // contains our checkboxes
          .on('click', function () {
            d3.select(this)
              .classed('active', !d3.select(this).classed('active'));

            const collectActiveIds = [];
            encapsulationDiv
              .selectAll('.value-checkbox.active')
              .each(function () {
                collectActiveIds.push(d3.select(this).attr('id'));
              });

            encapsulationDiv
              .select('.dropdown-values:not(.select-metric)')
              .select('button')
              .text(`[ ${collectActiveIds.toString()} ]`);
          });

        encapsulationDiv
          .select('.add-or-del')
          .on('click', (evnt) => {
            if (d3.select(evnt.target)
              .classed('btn-add')) {
              // the button changes its appearance -> remove button.
              d3.select(evnt.target)
                .classed('btn-add', false)
                .classed('btn-remove', true)
                .classed('btn-outline-sucess', false)
                .classed('btn-outline-danger', true)
                .html('<span class="glyphicon glyphicon-minus" aria-hidden="true"></span> -   ');

              // since the usere clicked on the add button, we create a new filter.
              this.addDropdownMetric();
              this.addDropdownList();
            } else {
              // remove the whole filter -> [metric][Value][add/remove]
              encapsulationDiv.remove();
            }
            this.disableAlreadySelectedMetrics();
          });
        this.disableAlreadySelectedMetrics();
      });
    // this.addBaseVectorFilterApply();
  }

  // eslint-disable-next-line class-methods-use-this
  addBaseVectorFilterApply() {
    let activeFilterObj = {
      v2: [],
      v3: [],
    };
    d3.select('#baseVectorDiv')
    // each filter row ([metric][Value][add/remove]) is contained in this div
      .selectAll('.entry')
      // we collect infromation on each .entry (container div) seperatly.
      .each(function onEachEntryElement(_, i) {
        // the metric selection button changes its id to the currently selected metric.

        const selectVersion = d3.select(this).select('label.version-toggle.active').select('input').attr('id');
        console.log(selectVersion);
        // TODO collect everything sort by version.
        let selectedMetric = d3.select(this)
          .select('button')
          .attr('id');
        // Ids have the form Metric+Version: av2 or av3 the regex removes the version.
        selectedMetric = selectedMetric.toUpperCase();
        // selectedMetric.replace(/(2|3)/, '').toUpperCase();
        // ignore all dropdown which weren't modified by the user. (contain default id)
        if (selectedMetric.length <= 3 && d3.select(this).selectAll('input.value-checkbox.active').size() > 0) {
          activeFilterObj[selectedMetric] = [];
          activeFilterObj[selectVersion].push(selectedMetric);
          d3.select(this)
          // select all <inputs> which have a checked checkbox.
            .selectAll('input.value-checkbox.active')
            .each(function getIdOfSelectedOptions() {
              activeFilterObj[selectedMetric].push(d3.select(this).attr('id'));
            });
        }
      });
    console.log(activeFilterObj);
    if (activeFilterObj.v2.length === 0 && activeFilterObj.v3.length === 0) {
      activeFilterObj = {};
    }
    this.emit('applyBaseVectorFilter', activeFilterObj);
  }

  updateWidthAndHeight() {
    const rootDiv = d3.select(`#${this._filterDivId}`);
    this._width = $(`#${this._filterDivId}`)[0].clientWidth - this.MARGINS.left - this.MARGINS.right;
    this._height = window.innerHeight - $('#nav-bar').outerHeight(true) - $('#above-vis').outerHeight(true) - $('.view-menu').outerHeight(true) - this.MARGINS.bottom;

    // this._height = 500;
  }
}

export default ViewFilters;
