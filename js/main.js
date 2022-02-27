(function(){

var attrArray = ["czname", "rent_twobed2015", "med_hhinc2016", "frac_coll_plus2010", "poor_share2010", "share_black2010", "share_hisp2010", "share_asian2010", "share_white2000", "singleparent_share2010", "2019", "2020"];
var evicArray = ["2019", "2020"];
var expressed = evicArray[0];

window.onload = setMap();

function setMap(){

  var width = window.innerWidth * 0.45,
      height = 700;

  var map = d3.select(".map-container")
    .append("svg")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height)
    .call(d3.zoom().on("zoom", function(){
      map.attr("transform", d3.event.transform)
    }))
    .append("g");

  var projection = d3.geoAlbers()
    .rotate([94, 0, 0])
    .center([0, 46.4])
    .scale(6500)
    .translate([width / 2, height / 2]);

  var path = d3.geoPath()
    .projection(projection);

  var promises = [];
  promises.push(d3.csv("data/MN_Census_Data.csv"));
  promises.push(d3.json("data/evictions_2019.topojson"));
  promises.push(d3.json("data/US_States.topojson"));
  promises.push(d3.json("data/canadaprov.topojson"));
  Promise.all(promises).then(callback);

  // console.log(promises[0]);
  // console.log(promises[1]);
  // console.log(promises[2]);
  // console.log(promises[3]);

  function callback(data){

    [csvData, mn, usa, canada] = data;

    var graticule = d3.geoGraticule()
    //create graticule background for lake Superior
    var gratBackground = map.append("path")
      .datum(graticule.outline()) //bind graticule background
      .attr("class", "gratBackground") //assign class for styling
      .attr("d", path) //project graticule
      .attr('opacity', '.25')

    var usStates = topojson.feature(usa, usa.objects.cb_2018_us_state_20m),
      prov = topojson.feature(canada, canada.objects.canadaprov),
      evictions = topojson.feature(mn, mn.objects.evictions_2019).features;

    var usStates = map.append("path")
      .datum(usStates)
      .attr("class", "states")
      .attr("d", path);

    var tracts = map.selectAll(".tracts")
      .data(evictions)
      .enter()
      .append("path")
      .attr("class", function(d){
        return d.properties.code;
      })
      .attr("d", path);

    var caProvinces = map.append("path")
      .datum(prov)
      .attr("class", "provinces")
      .attr("d", path);

    // join data to geoJson enumeration units
    evictions = joinData(evictions, csvData);

    var colorScale = makeColorScale(csvData);

    setEnumerationUnits(evictions, map, path, colorScale);

    // setChart(csvData, colorScale);

    linkAccordion(map);

  }; // end of callback()
}; // end of setMap()

// join census tracts with csv data
function joinData(evictions, csvData) {

  for (var i=0; i<csvData.length; i++){
    var csvTract = csvData[i];  // gets current tract in loop
    var csvKey = csvTract.code;

    for (var a=0; a<evictions.length; a++){

      var geojsonProps = evictions[a].properties;
      var geojsonKey = geojsonProps.code;

      if (geojsonKey == csvKey){

        attrArray.forEach(function(attr){
          var val = parseFloat(csvTract[attr]);
          if (!isNaN(csvTract[attr])){
            val = parseFloat(csvTract[attr]);
          }
          geojsonProps[attr] = val;
        });
      };
    };
  };
  return evictions;
}; // end of joinData()

// create color scale for enumeration units
function makeColorScale(data){
  var colorClasses = [
    "#ffffb2",
    "#fecc5c",
    "#fd8d3c",
    "#f03b20",
    "#bd0026"
  ];

  var colorScale = d3.scaleThreshold()
    // .domain([0, 124])
    .range(colorClasses);

  var domainArray = [];
  for (var i=0; i<data.length; i++){
    var val = parseFloat(data[i][expressed]);
    domainArray.push(val);
  };

  var clusters = ss.ckmeans(domainArray, 5);

  domainArray = clusters.map(function(d){
    return d3.min(d);
  });

  domainArray.shift();
  colorScale.domain(domainArray);
  return colorScale;
};

function choropleth(props, colorScale){

  var val = parseFloat(props[expressed]);

  if (typeof val == 'number' && !isNaN(val)){
    return colorScale(val);
  }else{
    return "#CCC";
  };
};

function setEnumerationUnits(evictions, map, path, colorScale){

  var tracts = map.selectAll(".tracts")
    .data(evictions)
    .enter()
    .append("path")
    .attr("class", function(d){
      return "tracts " + d.properties.code;
    })
    .attr("d", path)
    .style("fill", function(d){
      return colorScale(d.properties[expressed]);
    })
    .style("opacity", "0.85")
    .on("mouseover", function(d){
      // console.log(d.properties);
      highlight(d.properties);
    })
    .on("mouseout", function(d){
      dehighlight(d.properties);
    });

    var desc = tracts.append("desc")
      .text('{"stroke": "#000", "stroke-width": "0.05px"}');
};

function highlight(props){

  var selected = d3.selectAll("." + props.code)
  .style("stroke", "#00FFFF")
  .style("stroke-width", "1");
  // .attr("opacity", "1");

  setLabel(props);
};

function dehighlight(props){
  var selected = d3.selectAll("." + props.code)
    .style("stroke-width", "0.15px")
    .style("stroke", "#393e46");

    defaultPanel();
}; // end of dehighlight()

function linkAccordion(map){
  var buttons = $(":button");

    buttons[0].addEventListener('click', function(){
      changeAttribute("2019", csvData);
    });
    buttons[1].addEventListener('click', function(){
      changeAttribute("2020", csvData);
    });
};

function changeAttribute(attribute, csvData){
  expressed = attribute;

  var colorScale = makeColorScale(csvData);

  var tracts = d3.selectAll(".tracts")
    .transition()
    .delay(function(d,i){
      return i / csvData.length * 1000;
    })
    .duration(1000)
    .style("fill", function(d){
      return choropleth(d.properties, colorScale);
    });
};

function round(value, decimals) {
	return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
};

//create a dynamic label to display feature properties
function setLabel(props){

  //Update retrieve panel inner HTML with hover
  var textBox = String(props.code) +"<br/>";
  if (expressed == "2019"){
    textBox+="Evictions in 2019: " + props[expressed] + "<br/>";
  } else {
    textBox+="Evictions in 2020: " + props[expressed] + "<br/>";
  }
  if (isNaN(props["rent_twobed2015"])) {
    textBox+= "Median rent for 2BR apartment in 2015: (data not available)<br/>";
  } else {
    textBox+= "Median monthly rent for 2BR apartment in 2015: $" + props["rent_twobed2015"] + "<br/>";
  };
  textBox+="Median Household Income, 2016: $" + props["med_hhinc2016"] + "<br/>";
  textBox+= "Percentage of adult population with bachelor's degree or higher: " + round(100*props["frac_coll_plus2010"], 2) + "%<br/>";
  textBox+= "Percent population below poverty line: " + round(100*props["poor_share2010"], 2) + "%<br/>";
  textBox+= "Percent population Black: " + round(100*props["share_black2010"], 2) + "%<br/>";
  textBox+= "Percent population Hispanic/Latino: " + round(100*props["share_hisp2010"], 2) + "%<br/>";
  textBox+= "Percent population Asian: " + round(100*props["share_asian2010"], 2) + "%<br/>";
  textBox+= "Percent population White: " + round(100*props["share_white2000"], 2) + "%<br/>";
  textBox+= "Percentage single parent households: " + round(100*props["singleparent_share2010"], 2) + "%<br/>";

  document.getElementById("retrieveTitle").innerHTML=textBox;
  d3.select("#retrieveTitle")
    .style("size", "14pt")
    .style("color", "white"); //retrieve text color
};

function defaultPanel(){
  document.getElementById("retrieveTitle").innerHTML="Hover over a census tract:";
};

})(); // end of global wrapper fcn
