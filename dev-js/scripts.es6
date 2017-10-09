(function(){
"use strict";

var carbonLineCharts = [];
const priceSelector = d3.select('#price-selector')
    .on('change', updateGate)
    .node();
const rateSelector = d3.select('#rate-selector')
    .on('change', updateGate)
    .node(); 

var globalPrice,
    globalRate;

function clearTooltips(){
    carbonLineCharts.forEach(function(each){

        each.trendPoints.dispatch('mouseout');
        each.baselinePoints.dispatch('mouseout');
    });
}
 
function updateTotals(price, rate){
    globalPrice = price;
    globalRate = rate;

    /* EMISSIONS */ 
    let emissionsData = carbonLineCharts[0].data[price][rate][0].trend,
        emissionsBaseline = carbonLineCharts[0].data[0][0][0].trend,
        totalEmissionsSavings = emissionsData.reduce(function(acc,cur, i){
            return acc + ( ( +emissionsBaseline[i].value ) - ( +cur.value ) );
        },0);

    /* REVENUE ( emissions * price ) */
    let revenueData = carbonLineCharts[1].data[price][rate][0].trend,
        totalRevenue = revenueData.reduce(function(acc, cur, i){
            
           if ( i > 9 ) { // calculate first ten years only, index 0 – 9 inclusive
                return acc;
           } else {
               return acc + ( +cur.value );
           }
        },0);

    d3.select('#summary-stats .bind-text')
        .classed('attention', false)
        .text(', $' + price + ' per ton at ' + rate * 100 + '% growth rate');

    d3.select('#summary-emissions .bind-total')
        .style('opacity',0)
        .text(d3.format(",.3r")(totalEmissionsSavings) + ' billion metric tons')
        .transition().duration(500)
        .style('opacity', 1);
    d3.select('#summary-revenue .bind-total')
        .style('opacity',0)
        .text('$' + d3.format(",.4r")(totalRevenue) + ' billion ($2018)')
        .transition().duration(500)
        .style('opacity', 1);
    d3.select('#summary-stats')
        .classed('not-calculated', false);
}

function updateGate(){
    if ( priceSelector.options[priceSelector.selectedIndex].value ){
        d3.select('#price-label')
            .classed('attention', false);
    }
    if ( rateSelector.options[rateSelector.selectedIndex].value ){
        d3.select('#rate-label')
            .classed('attention', false);
    }
    if ( priceSelector.options[priceSelector.selectedIndex].value && rateSelector.options[rateSelector.selectedIndex].value ) {
        carbonLineCharts.forEach(function(each){
            each.updateChart(priceSelector.options[priceSelector.selectedIndex].value, rateSelector.options[rateSelector.selectedIndex].value);
        });
        updateTotals(priceSelector.options[priceSelector.selectedIndex].value, rateSelector.options[rateSelector.selectedIndex].value);
    }
}  

var CarbonLineChart = function(configObject){ // marginsrgin {}, height #, width #, containerID, dataPath
    this.setup(configObject);
};

CarbonLineChart.prototype = {

    setup(configObject){
        var viewBox = '0 0 100 ' + Math.round(configObject.heightToWidth * 100);
        this.margin = configObject.margin;
        this.width = 100 - this.margin.left - this.margin.right;
        this.height = configObject.heightToWidth * 100 - this.margin.top - this.margin.bottom;
        this.labelOffset = configObject.trendLabelPosition === 'below' ? 4 : -3;
        this.yAxisCount = configObject.yAxisCount;
        this.hasBeenUpdated = false;

        this.svg = d3.select(configObject.container)
            .append('svg')
            .attr('width', '100%')
            .attr('xmlns','http://www.w3.org/2000/svg')
            .attr('version','1.1')
            .attr('viewBox', viewBox)
            .append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

        this.parseTime = d3.timeParse('%Y');

        // set the ranges
        this.x = d3.scaleTime().range([0, this.width]);
        this.y = d3.scaleLinear().range([this.height, 0]);

        // define the line
        this.valueline =  d3.line()
            .x((d) => { return this.x(d.date); })
            .y((d) => { return this.y(d.value); });
       
        this.getData(configObject); 

    },

    getData(configObject){ 
        this.range = [];
        d3.csv(configObject.dataPath, (d) => {
            var values = [];
            for ( var i = 2018; i < 2031; i++ ){
                this.range.push( +d[i.toString()] );
                values.push({date: this.parseTime(i), value: +d[i.toString()], price: d.price, growth_rate: d.growth_rate, units: d.units});
            }
            if ( configObject.yMax ) {
                this.range.push(configObject.yMax);
            }
            return {
                growth_rate: ( +d.growth_rate ),
                initial_price: ( +d.price ),
                units: d.units,
                trend: values
            };
        }, (error, data) => {
            if ( error ) {throw error;}
            
            this.baselineData = data.slice(0,1);
            this.data = d3.nest()
                .key(function(d){
                    return d.initial_price;
                })
                .key(function(d){
                    return d.growth_rate;
                })
                .object(data);
            
            this.x.domain([this.parseTime(2018),this.parseTime(2030)]); 
            this.y.domain([d3.min(this.range), d3.max(this.range)]);

            this.setupTooltips(configObject);
            this.renderTrendline(); // trendline is rendered and then hidden by baseline
            this.renderTrendPoints();
            this.renderTrendlineLabel();
            this.renderBaseline(); 
            this.renderBaselinePoints();
            this.renderBaselineLabel();
            this.renderAxes();

        });
    }, 
    setupTooltips(configObject){
         this.tooltip = d3.tip()
            .attr("class", "d3-tip trendline")
            .direction('n')
            .offset([-8, 0])
            .html( (d) => {
                return configObject.trendlineTooltip(d); 
            });

        this.baselineTooltip = d3.tip()
            .attr("class", "d3-tip")
            .direction('n')
            .offset([-8, 0])
            .html( (d) => {
                return configObject.baselineTooltip(d); 
            });   

    },
    renderTrendline(){
        
        this.trendline = this.svg.append('path')
            .attr('class', 'line')
            .attr('d',  () => {
               return this.valueline(this.baselineData[0].trend);
            });
    },
    renderTrendPoints(){
        var _this = this;
        this.trendPoints = this.svg.selectAll('trend-point')
            .data( () => {
                return this.baselineData[0].trend;
            })
            .enter().append('circle')
            .attr('class', 'data-point')
            .attr('r', '1')
            .attr('cx', (d) => {
                return this.x(d.date);
            })
            .attr('cy', (d) => {
                return this.y(d.value);
            })
            .on('mouseover', function(e) {
                clearTooltips();
                _this.tooltip.show(e);
            })
            .on('mouseout', this.tooltip.hide) 
            .call(this.tooltip);
    },
    renderTrendlineLabel(){
         
         this.trendlineLabel = this.svg.append('g')
        .attr('class','line-label trendline-label no-display')        
        .attr('transform',  () => {
            
            return 'translate(' + this.x(this.baselineData[0].trend[7].date) + ',' + ( this.y(this.baselineData[0].trend[7].value) + this.labelOffset ) + ')';
        });

        this.trendlineLabel
            .append('text')
            .attr('text-anchor', 'end')
            .text('With carbon tax');
    },
    renderBaseline(){
        
        this.baselineGroup = this.svg.selectAll('base-line-group')
            .data(this.baselineData)
            .enter().append('g')
            .attr('class','base-line-group');


        this.baseline = this.baselineGroup.selectAll('baseline')
            .data(this.baselineData)
            .enter().append('path')
            .attr('class', 'line baseline')
            .attr('d',  (d) => {
               return this.valueline(d.trend);
            });

    },
    renderBaselinePoints(){
        var _this = this;
        this.baselinePoints  = this.baselineGroup.selectAll('baseline-point')
            .data( (d) => {
                return d.trend;
            })
            .enter().append('circle')
            .attr('class', 'data-point baseline-point')
            .attr('r',1)
            .attr('cx',  (d) => {
                return this.x(d.date);
            })
            .attr('cy',  (d) => {
                return this.y(d.value);
            })
            .on('mouseover', function(e){
                clearTooltips();
                _this.baselineTooltip.show(e);
            })
            .on('mouseout', this.baselineTooltip.hide) 
            .call(this.baselineTooltip);
    },
    renderBaselineLabel(){
        
        this.baselineLabel = this.baselineGroup.selectAll('baseline-label')
        .data( (d) => {
            
            return [d.trend[12]];
        })
        .enter().append('g')
        .attr('transform',  (d) => {
            
            return 'translate(' + this.x(d.date) + ',' + ( this.y(d.value) - 1.5) + ')';
        })
        .attr('class','line-label')
        .attr('text-anchor', 'end')
        .append('text')
        .text('Without carbon tax');

    },
    renderAxes(){
        
        this.xAxis = this.svg.append('g')
          .attr('transform', 'translate(0,' + ( this.height + 2 ) + ')')
          .attr('class', 'axis x-axis')
          .call(d3.axisBottom(this.x).tickSizeInner(1).tickSizeOuter(1).tickPadding(1).ticks(d3.timeYear.every(2)));

      
        this.yAxis = this.svg.append('g')
          .attr('class', 'axis y-axis');

        this.yAxis.append('text')
            .attr('class', 'axis-label')
            .attr('text-anchor','start')
            .attr('transform', 'translate(-' + ( this.margin.left - 2 )+ ', -3)')
            .text( () => {
                
                return this.data[0][0][0].units;
            }); 

        this.yAxis.call(d3.axisLeft(this.y).tickSizeInner(1).tickSizeOuter(1).tickPadding(1).ticks(this.yAxisCount));
    },
    updateChart(userPrice,userRate){
        this.updateTrendPoints(userPrice,userRate);
        this.updateTrendline(userPrice,userRate);
        this.updateTrendlineLabel(userPrice,userRate);
    },
    updateTrendline(userPrice,userRate){
        
        this.trendPoints.dispatch('mouseout');
        this.trendline.data( () => {
            return this.data[userPrice][userRate];
        })
        .classed('trendline', true)
        .transition().duration(500)
        .attr('d',  (d) => {
           return this.valueline(d.trend);
        });
        
    },
    updateTrendPoints(userPrice, userRate){
        
        this.trendPoints.data( () => {
            return this.data[userPrice][userRate][0].trend;
            })
            .transition().duration(500)
            .attr('r',' 1.25')
            .attr('cx', (d) => {
                return this.x(d.date);
            })
            .attr('cy', (d) => {
                return this.y(d.value);
            })
            .on('end', (cur, i, array) => {
               
                if ( i === array.length - 1 ){
                    d3.select( this.trendPoints.nodes()[4] ).dispatch('mouseover');
                    this.hasBeenUpdated = true;                    

                }
            });
    },
    updateTrendlineLabel(userPrice,userRate){
        
        
        this.trendlineLabel.data( () => {
                return [this.data[userPrice][userRate][0].trend[5]];
            })
            .classed('no-display', false)
            .transition().duration(500)
            .attr('transform',  (d) => {
                return 'translate(' + this.x(d.date) + ',' + ( this.y(d.value) + this.labelOffset ) + ')';
            });
    }


};

carbonLineCharts.push( 
    new CarbonLineChart(
        {
            margin: { // percentages
                top: 6,
                right: 5,
                bottom: 10,
                left: 11
            },
            heightToWidth: 0.66,
            dataPath:'/data/emissions.csv',
            container:'#container',
            trendLabelPosition: 'below', 
            baselineTooltip(d){
               
                return '<b>WITHOUT CARBON TAX</b><br /><b>Year:</b> ' + d.date.getFullYear() + '<br /><br /><b>Emissions:</b> ' + d.value + ' ' + d.units + '<br />(' +  Math.round(( d.value / 6 ) * 100 ) +'% of 2005 levels)';
            },
            trendlineTooltip(d){
                 return '<b>WITH CARBON TAX</b><br />($' + d.price + '</b> at ' + d.growth_rate * 100 + '% growth rate)<br /><b>Year:</b> ' + d.date.getFullYear() + '<br /><b>Price:</b> $' + d3.format(",.2f")( globalPrice * Math.pow(1 + ( +globalRate ), ( +d.date.getFullYear() ) - 2018) ) + ' per ton<br /><br /><b>Emissions:</b> ' + d.value + ' ' + d.units + '<br />(' +  Math.round(( d.value / 6 ) * 100 ) +'% of 2005 levels)';
                
            },
            yAxisCount: null,
            yMax: null

        }
    )
);

carbonLineCharts.push( 
    new CarbonLineChart(
        {
            margin: { //percentages
                top: 6,
                right: 5,
                bottom: 10,
                left: 11
            },
            heightToWidth: 0.66,
            dataPath:'/data/revenue.csv',
            container:'#container-2',
            trendLabelPosition: 'above', 
            baselineTooltip(d){
               return '<b>WITHOUT CARBON TAX</b><br /><b>Year:</b> ' + d.date.getFullYear() + '<br /><br /><b>Revenue:</b> $0'; 
            },
            trendlineTooltip(d){
                return '<b>WITH CARBON TAX</b><br />($' + d.price + '</b> at ' + d.growth_rate * 100 + '% growth rate)<br /><b>Year:</b> ' + d.date.getFullYear() + '<br /><b>Price:</b> $' + d3.format(",.2f")( globalPrice * Math.pow(1 + ( +globalRate ), ( +d.date.getFullYear() ) - 2018) ) + ' per ton<br /><br /><b>Revenue:</b> $' + d3.format(".3n")(d.value) + ' billion'; 
            },
            yAxisCount: 6,
            yMax: 300

        }
    )
);
}()); // end IIFE
