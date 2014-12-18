define(["jquery", "text!./simplebar.css","./d3.min"], function($, cssContent) {'use strict';
	$("<style>").html(cssContent).appendTo("head");
	
	return {
		initialProperties : {
			version: 1.0,
			qHyperCubeDef : {
				qDimensions : [],
				qMeasures : [],
				qInitialDataFetch : [{
					qWidth : 2,
					qHeight : 1000
				}]
			}
		},
		definition : {
			type : "items",
			component : "accordion",
			items : {
				dimensions : {
					uses : "dimensions",
					min : 1,
					max:1
				},
				measures : {
					uses : "measures",
					min : 1,
					max:1
				},
				sorting : {
					uses : "sorting"
				},
				settings : {
					uses : "settings"			
				}
			}
		},
		snapshot : {
			canTakeSnapshot : true
		},
		paint : function($element,layout) {
			// Create a reference to the app, which will be used later to make selections
			var self = this;

			// Get the data
			var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
			var data = qMatrix.map(function(d) {
				return {
					"Dim":d[0].qText,
					"Dim_key":d[0].qElemNumber,
					"Value":d[1].qNum
				}
			});

			// Get the extension container properties
			var ext_height = $element.height(), // height
				ext_width = $element.width(),   // width
				ext_id = "ext_" + layout.qInfo.qId; // chart id

			// Create or empty the chart container
			if(document.getElementById(ext_id)) {
				// If the element already exists, empty it out so we can start from scratch
				$("#" + ext_id).empty();
			}
			else {
				// If the element doesn't exist, create it
				$element.append($("<div />").attr("id",ext_id).width(ext_width).height(ext_height));
			}

			// Call the visualization function
			viz();

			function viz() {
				// define margins
				var margin = {
					top:10,
					left:30,
					right:10,
					bottom:20
				};

				// Plot dimensions
				var plot_width = ext_width - margin.left - margin.right,
					plot_height = ext_height - margin.top - margin.bottom;

				var svg = d3.select("#" + ext_id).append("svg")
							.attr("width",ext_width)
							.attr("height",ext_height)
							.attr("id",ext_id + "_svg");

				var plot = svg
							.append("g")
							.attr("id",ext_id+"_svg_g");

				// Scales
				var x = d3.scale.linear()
							.domain([0,d3.max(data,function(d) {return d.Value})])
							.range([0,plot_width]),
					y = d3.scale.ordinal()
							.domain(data.map(function(d) {return d.Dim}))
							.rangeRoundBands([0, plot_height], .25),
					xAxis = d3.svg.axis()
								.scale(x)
								.tickSize(5)
								.tickFormat(d3.format(",.0f")),
					yAxis = d3.svg.axis()
							.scale(y)
							.orient("left");

				// Create a temporary yAxis to get the width needed for labels and add to the margin
				svg.append("g")
					.attr("class","y axis temp")
					.attr("transform","translate(0," + 0 + ")")
					.call(yAxis);

				// Get the temp axis max label width
				var label_width = d3.max(svg.selectAll(".y.axis.temp text")[0], function(d) {return d.clientWidth});

				// Remove the temp axis
				svg.selectAll(".y.axis.temp").remove();

				// Update the margins, plot width, and x scale range based on the label size
				margin.left = margin.left + label_width;
				plot_width = ext_width - margin.left - margin.right;
				x.range([0,plot_width]);

				// Adjust the plot area for the labels
				plot
					.attr("transform","translate(" + margin.left + "," + margin.top + ")");
				
				// Get the bar height from the y scale range band
				var bar_height = y.rangeBand();
				
				// Add the bars to the plot area
				var bars = plot.selectAll("#" + ext_id + " .simplebar")
							.data(data)
							.enter()
							.append("rect")
							.attr("class","simplebar")
							.attr("x",0)
							.attr("y",function(d) {return y(d.Dim)})
							.attr("height",bar_height)
							.attr("width",function(d) {return x(d.Value)})
							.on("click",function(d) {self.backendApi.selectValues(0,[d.Dim_key],true);});

				// Add the axes
				plot.append("g")
					.attr("class","x axis")
					.attr("transform","translate(0," + plot_height + ")")
					.call(xAxis);

				plot.append("g")
					.attr("class","y axis")
					.attr("transform","translate(0," + 0 + ")")
					.call(yAxis);

				// Add a click function to the y axis
				plot.selectAll("#" + ext_id + " .y.axis .tick")
					.on("click",function(d) {self.backendApi.selectValues(0,[getProp(data,"Dim",d,"Dim_key")],true);})
			}
		}
	};
});

// Helper functions
function getProp(array,source_prop,source_val,target_prop) {
	var output;
	for (var i =0; i<=array.length;i++) {
		if(array[i][source_prop]==source_val) {
			output = array[i][target_prop];
			break;
		}
	}
	return output;
}