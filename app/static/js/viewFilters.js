/* eslint-disable no-underscore-dangle */
import EventEmitter from './events.js';

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
    this.updateWidthAndHeight();
    this.cvssVersionFilter();
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
      .attr('class', 'severityBarChart')
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
      .attr('fill', '#69b3a2')
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

        // collect the data of all selected Elements [[],[],[],..]
        const selectedData = d3.selectAll('.cvssScore-selected').data();
        // for each previously selected datapoint, we select its id.
        const selectedSeverities = selectedData.map((d) => d[2]); // id === cvssScore.
        this.emit('clickSeverityFilter', selectedSeverities);
      });
  }

  updateWidthAndHeight() {
    const rootDiv = d3.select(`#${this._filterDivId}`);
    this._width = $(`#${this._filterDivId}`)[0].clientWidth - this.MARGINS.left - this.MARGINS.right;
    this._height = window.innerHeight - $('#nav-bar').outerHeight(true) - $('#above-vis').outerHeight(true) - $('.view-menu').outerHeight(true) - this.MARGINS.bottom;

    // this._height = 500;
  }
}

export default ViewFilters;
