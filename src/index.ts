/**
 * This example showcases sigma's reducers, which aim to facilitate dynamically
 * changing the appearance of nodes and edges, without actually changing the
 * main graphology data.
 */

import Sigma from "sigma";
import { Coordinates, EdgeDisplayData, NodeDisplayData } from "sigma/types";
import Graph from "graphology";
import { parse } from "graphology-gexf/browser";
 
 //import data from "./data.json";
 
 // Retrieve some useful DOM elements:
 //const container = document.getElementById("sigma-container") as HTMLElement;
function componentToHex(c: Number) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r: string, g: string, b: string) {
  return "#" + componentToHex(Number(r)) + componentToHex(Number(g)) + componentToHex(Number(b));
}

function getRGB(str: string) {
  var match = str.match(
    /rgba?\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3})\)?(?:, ?(\d(?:\.\d?))\))?/
  );
  const m = match
    ? {
        red: match[1],
        green: match[2],
        blue: match[3]
      }
    : {
      red: '0',
      green: '0',
      blue: '0'
    };

  return rgbToHex(m['red'], m['green'], m['blue']);
}
 

fetch("https://raw.githubusercontent.com/riccardomerlo/xw2v_graph/main/src/public/adj_lightweight_kamada.gexf") //http://127.0.0.1:5500/src/public/adj_lightweight.gexf
 .then((res) => res.text())
 .then((gexf) => {
   // Parse GEXF string:
   const graph = parse(Graph, gexf);

   // Retrieve some useful DOM elements:
   const container = document.getElementById("sigma-container") as HTMLElement;
   const zoomInBtn = document.getElementById("zoom-in") as HTMLButtonElement;
   const zoomOutBtn = document.getElementById("zoom-out") as HTMLButtonElement;
   const zoomResetBtn = document.getElementById("zoom-reset") as HTMLButtonElement;
   const labelsThresholdRange = document.getElementById("labels-threshold") as HTMLInputElement;
   const searchInput = document.getElementById("search-input") as HTMLInputElement;
   const searchSuggestions = document.getElementById("suggestions") as HTMLDataListElement;

   const reset = document.getElementById("reset") as HTMLButtonElement;

   // Instanciate sigma:
   const renderer = new Sigma(graph, container, {
     minCameraRatio: 0.01,
     maxCameraRatio: 10,
   });
   const camera = renderer.getCamera();

   // Bind zoom manipulation buttons
   zoomInBtn.addEventListener("click", () => {
     camera.animatedZoom({ duration: 600 });
   });
   zoomOutBtn.addEventListener("click", () => {
     camera.animatedUnzoom({ duration: 600 });
   });
   zoomResetBtn.addEventListener("click", () => {
     camera.animatedReset({ duration: 600 });
   });

   // reset selected node
   reset.addEventListener("click", () => {
    setHoveredNode(undefined);
  });

   // Bind labels threshold to range input
   labelsThresholdRange.addEventListener("input", () => {
     renderer.setSetting("labelRenderedSizeThreshold", +labelsThresholdRange.value);
   });

   // Set proper range initial value:
   labelsThresholdRange.value = renderer.getSetting("labelRenderedSizeThreshold") + "";

   // Type and declare internal state:
 interface State {
    hoveredNode?: string;
    searchQuery: string;
  
    // State derived from query:
    selectedNode?: string;
    suggestions?: Set<string>;
  
    // State derived from hovered node:
    hoveredNeighbors?: Set<string>;
  }
  const state: State = { searchQuery: "" };

  // set of all colors
  const colorsSet = new Set<string>();
  graph.nodes().forEach((element) => {
    colorsSet.add(graph.getNodeAttribute(element, "color"));
  });

  // map index to color rgb
  const colorsObj = Array.from(colorsSet).reduce( (a: any,c: any, i: number) => { a[i]=c; return a; }, {});
  

  const btnColors = document.getElementById("btn-group") as HTMLButtonElement;

  btnColors.innerHTML = [...colorsSet]
    .map(
      (elem, i) => `<button class="Button" value = ${i} style="background-color: ${getRGB(elem as string)}" id=${i} >${i}</button>`
    )
    .join("\n");
    //

  btnColors.addEventListener("click", ({target})=>{
    const id = (target as any).value
    const neighbours = new Set<string>()
    graph.nodes().forEach((element)=>{

      if (graph.getNodeAttribute(element, "color") === colorsObj[id]){
        neighbours.add(element)
      }
      
    })
    state.hoveredNeighbors = neighbours;
    // Refresh rendering:
    renderer.refresh();
  })


  console.log(colorsSet);
  
  // Feed the datalist autocomplete values:
  searchSuggestions.innerHTML = graph
    .nodes()
    .map((node) => `<option value="${graph.getNodeAttribute(node, "label")}"></option>`)
    .join("\n");
  
  // Actions:

  function setHoveredNode(node?: string) {
    if (node) {
      state.hoveredNode = node;
      state.hoveredNeighbors = new Set(graph.neighbors(node));
    } else {
      state.hoveredNode = undefined;
      state.hoveredNeighbors = undefined;
    }
  
    // Refresh rendering:
    renderer.refresh();
  }
  function setSearchQuery(query: string) {
    state.searchQuery = query;
  
    if (searchInput.value !== query) searchInput.value = query;
  
    if (query) {
      const lcQuery = query.toLowerCase();
      const suggestions = graph
        .nodes()
        .map((n) => ({ id: n, label: graph.getNodeAttribute(n, "label") as string }))
        .filter(({ label }) => label.toLowerCase().includes(lcQuery));
  
      // If we have a single perfect match, them we remove the suggestions, and
      // we consider the user has selected a node through the datalist
      // autocomplete:
      if (suggestions.length === 1 && suggestions[0].label === query) {
        state.selectedNode = suggestions[0].id;
        state.suggestions = undefined;
  
        // Move the camera to center it on the selected node:
        const nodePosition = renderer.getNodeDisplayData(state.selectedNode) as Coordinates;
        renderer.getCamera().animate(nodePosition, {
          duration: 500,
        });

        setHoveredNode(state.selectedNode);
      }
      // Else, we display the suggestions list:
      else {
        state.selectedNode = undefined;
        state.suggestions = new Set(suggestions.map(({ id }) => id));
        setHoveredNode(undefined);
      }
    }
    // If the query is empty, then we reset the selectedNode / suggestions state:
    else {
      state.selectedNode = undefined;
      state.suggestions = undefined;
      setHoveredNode(undefined);
    }
  
    // Refresh rendering:
    renderer.refresh();
  }
 
  
  // Bind search input interactions:
  searchInput.addEventListener("input", () => {
    setSearchQuery(searchInput.value || "");
  });
  // searchInput.addEventListener("blur", () => {
  //   //setSearchQuery("");
  // });
  
  // Bind graph interactions:
  renderer.on("enterNode", ({ node }) => {
    //setHoveredNode(node);
  });
  renderer.on("leaveNode", () => {
    //setHoveredNode(undefined);
  });

  renderer.on("clickNode", ({ node }) => {
    //console.log(node);
    setHoveredNode(node);
  });
  
  renderer.on("doubleClickNode", ({ node }) => {
    //console.log(node);
    setHoveredNode(undefined);
  });
  
  // Render nodes accordingly to the internal state:
  // 1. If a node is selected, it is highlighted
  // 2. If there is query, all non-matching nodes are greyed
  // 3. If there is a hovered node, all non-neighbor nodes are greyed
  renderer.setSetting("nodeReducer", (node, data) => {
    const res: Partial<NodeDisplayData> = { ...data };
  
    if (state.hoveredNeighbors && !state.hoveredNeighbors.has(node) && state.hoveredNode !== node) {
      // res.label = "";
      // res.color = "#f6f6f61a";
      // res.zIndex= -1;
      res.hidden = true;
    }
  
    if (state.selectedNode === node) {
      res.highlighted = true;
    } else if (state.suggestions && !state.suggestions.has(node)) {
      // res.label = "";
      // res.color = "#f6f6f61a";
      // res.zIndex= -1;
      res.hidden = true;
    }
  
    return res;
  });
  
  // Render edges accordingly to the internal state:
  // 1. If a node is hovered, the edge is hidden if it is not connected to the
  //    node
  // 2. If there is a query, the edge is only visible if it connects two
  //    suggestions
  renderer.setSetting("edgeReducer", (edge, data) => {
    const res: Partial<EdgeDisplayData> = { ...data };
  
    if (state.hoveredNode && !graph.hasExtremity(edge, state.hoveredNode)) {
      res.hidden = true;
    }
  
    if (state.suggestions && (!state.suggestions.has(graph.source(edge)) || !state.suggestions.has(graph.target(edge)))) {
      res.hidden = true;
    }
  
    return res;
  });


});

 
 
 