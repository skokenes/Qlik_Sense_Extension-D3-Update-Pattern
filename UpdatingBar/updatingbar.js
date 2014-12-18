define(["jquery", "text!./updatingbar.css","./d3.min"], function($, cssContent) {'use strict';
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
				// removed the empty function since the chart will now update
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

				// Get the div
				var div = d3.select("#" +ext_id);

				// If the svg exists, update it's dimensions and select it and the plot
				if(document.getElementById(ext_id + "_svg")) {
					// update svg dimensions
					var svg = div.select("svg")
						.attr("width",ext_width)
						.attr("height",ext_height);
					var plot = svg.select("#" + ext_id +"_svg_g");
					
				}
				else {
					// if the svg doesn't exist, create it, the plot area, and the axes containers
					var svg = div.append("svg")
								.attr("width",ext_width)
								.attr("height",ext_height)
								.attr("id",ext_id + "_svg");

					var plot = svg
								.append("g")
								.attr("id",ext_id+"_svg_g");

					plot.append("g")
						.attr("class","y axis")
						.attr("id",ext_id + "_y_g")
						.attr("transform","translate(0," + 0 + ")");

					plot.append("g")
						.attr("class","x axis")
						.attr("id",ext_id + "_x_g")
						.attr("transform","translate(0," + plot_height + ")");
				}

				// Create the scales and axes functions
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

				// Get the bar height from the y scale range band
				var bar_height = y.rangeBand();
	
				// Transition duration for update animations
				var dur = 750;

				// Add the data first, with a key
				var bars = plot.selectAll(".updatingbar") 
							.data(data,function(d) {return d.Dim});
			
				// Update logic 
				var updatedBars = bars
									.transition()
									.duration(dur)
									.delay(!bars.exit().empty() * dur) // if there are no exiting bars, update immediately. otherwise, wait the duration before updating
									.attr("y",function(d) {return y(d.Dim)})
									.attr("width",function(d) {return x(d.Value)})
									.attr("height",bar_height)
									.attr("opacity",1);
				
				// Enter logic
				bars
					.enter()
					.append("rect")
					.attr("class","updatingbar")
					.attr("x",0)
					.attr("y",function(d) {return y(d.Dim)})
					.attr("opacity",0)
					.attr("height",bar_height)
					.attr("width",function(d) {return x(d.Value)})
					.on("click",function(d) {self.backendApi.selectValues(0,[d.Dim_key],true);})
					.transition()
					.duration(dur)
					.delay((!bars.exit().empty() + !updatedBars.empty()) * dur) // if there are no exiting bars and no updating bars, enter new bars immediately. otherwise, wait for the other animations to finish
					.attr("opacity",1);

				// Exit logic
				bars
					.exit()
					.transition()
					.duration(dur) // exit immediately
					.attr("opacity",0)
					.remove();

				// Adjust the plot area for the labels
				plot
					.transition()
					.duration(dur)
					.delay(!bars.exit().empty() * dur) // if there are no bars updating, transition the plot immediately
					.attr("transform","translate(" + margin.left + "," + margin.top + ")");

				// update y axis
				plot.selectAll(".y.axis")
					.transition()
					.duration(dur)
					.delay(!bars.exit().empty() * dur)
					.call(yAxis);

				// translate x axis and update
				plot.select("#" + ext_id + "_x_g")
					.attr("transform","translate(0," + plot_height + ")");
				plot.selectAll(".x.axis")
					.transition()
					.duration(dur)
					.delay(!bars.exit().empty() * dur)
					.call(xAxis);

				// Add a click function to the y axis
				plot.selectAll(".y.axis .tick")
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
