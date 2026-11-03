// Content registries. Files in js/data/ call registerRoadmap({...}); files in
// js/visuals/ call registerDiagram({...}); js/widgets.js calls registerWidget(...).
// See CONTRIBUTING.md for the schemas.
'use strict';
var ROADMAPS = [];
var DIAGRAMS = [];
var WIDGETS = {};
function registerRoadmap(roadmap) {
  if (!roadmap || !roadmap.id || ROADMAPS.some(function (r) { return r.id === roadmap.id; })) {
    console.error('registerRoadmap: missing or duplicate id', roadmap && roadmap.id);
    return;
  }
  ROADMAPS.push(roadmap);
}
function registerDiagram(diagram) {
  if (!diagram || !diagram.id || DIAGRAMS.some(function (d) { return d.id === diagram.id; })) {
    console.error('registerDiagram: missing or duplicate id', diagram && diagram.id);
    return;
  }
  DIAGRAMS.push(diagram);
}
function registerWidget(name, impl) {
  WIDGETS[name] = impl;
}
