// Logic regression checks only. ScriptUI rendering and AE integration require the manual checklist.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'Effect AB.jsx'), 'utf8').replace(/^#target[^\r\n]*/m, '');
const mock = String.raw`
var checks = 0;
function assert(value, message) { checks++; if (!value) throw new Error(message); }
function Control(type, label) {
    this.type = type; this.text = label || ''; this.label = label; this.children = [];
    this.enabled = true; this.visible = true; this.size = {width:320,height:460};
    this.minimumSize = {}; this.maximumSize = {}; this.preferredSize = {};
    this.layout = {layout:function(){},resize:function(){}};
    this.graphics = {font:{name:'Arial'},BrushType:{SOLID_COLOR:1},PenType:{SOLID_COLOR:1},newBrush:function(){},newPen:function(){}};
}
Control.prototype.add = function(type, bounds, value) {
    var c = new Control(type, value); this.children.push(c);
    if (type === 'dropdownlist') {
        c.items = value;
        Object.defineProperty(c, 'selection', {get:function(){return this._selection;},set:function(v){this._selection=typeof v==='number'?{index:v,text:this.items[v]}:v;}});
    }
    return c;
};
Control.prototype.addEventListener = Control.prototype.notify = Control.prototype.center = Control.prototype.show = function(){};
function Panel() {}
var ui;
function Window() { ui = new Control('palette'); return ui; }
var ScriptUI = {newFont:function(name,style,size){return {name:name,style:style,size:size};}};
var PropertyValueType = {OneD:1,TwoD:2,ThreeD:3,TwoD_SPATIAL:4,ThreeD_SPATIAL:5,COLOR:6,CUSTOM_VALUE:7,LAYER_INDEX:8};
var PropertyType = {PROPERTY:1,INDEXED_GROUP:2};
function isValid(o) { return !!o && o.valid !== false; }
function Property(name, value, type) {
    this.matchName = name; this.value = value; this.propertyValueType = type || PropertyValueType.OneD;
    this.propertyType = PropertyType.PROPERTY; this.numKeys = 0; this.expressionEnabled = false;
}
Property.prototype.setValue = function(value) {
    if (this.rejectNext) { this.rejectNext = false; throw new Error('Simulated write failure'); }
    if (this.numKeys || this.expressionEnabled) throw new Error('Animated write attempted');
    this.value = value;
};
function Group(name, children, effect) {
    this.matchName = name; this.children = children; this.propertyType = PropertyType.INDEXED_GROUP;
    this.isEffect = !!effect; this.enabled = true; this.canSetEnabled = true;
    this.numProperties = children.length; this.valid = true;
    for (var i=0;i<children.length;i++) { children[i].parentProperty=this; children[i].propertyIndex=i+1; }
}
// AE host lookups need not return the same JavaScript wrapper each time.
Group.prototype.property = function(i) {
    var child = this.children[i-1];
    return child ? new Proxy(child, {}) : child;
};
function Layer(effects) {
    this.name='Adjustment Layer 1'; this.valid=true; this.locked=false;
    this.fx=new Group('ADBE Effect Parade',effects); this.selectedProperties=[];
}
Layer.prototype.property=function(name){return name==='ADBE Effect Parade'?this.fx:null;};
function CompItem(layer) { this.name='Main Comp'; this.valid=true; this.selectedLayers=[layer]; layer.containingComp=this; }
var numeric = new Property('amount',10), color = new Property('color',[1,0.3,0.2,1],PropertyValueType.COLOR);
var keyed = new Property('keyed',20); keyed.numKeys=2;
var expressed = new Property('expressed',30); expressed.expressionEnabled=true;
var custom = new Property('custom',{},PropertyValueType.CUSTOM_VALUE);
var checkbox = new Property('checkbox',1), dropdown = new Property('menu',2);
var fx1 = new Group('Effect 1',[numeric,color,keyed,expressed,custom],true);
var nested = new Group('nested',[checkbox,dropdown]);
var fx2 = new Group('Effect 2',[nested],true);
var layer = new Layer([fx1,fx2]), comp = new CompItem(layer);
var otherValue = new Property('other',99), otherLayer = new Layer([new Group('Other',[otherValue],true)]), otherComp = new CompItem(otherLayer);
var undoNames=[], undoDepth=0, scheduled, canceled=false;
var app = {
    project:{activeItem:comp},
    beginUndoGroup:function(name){undoNames.push(name);undoDepth++;},
    endUndoGroup:function(){undoDepth--;},
    scheduleTask:function(code){scheduled=code;return 1;},cancelTask:function(){canceled=true;}
};
var $ = {global:{}};
function control(label) {
    function find(c) { if(c.label===label)return c;for(var i=0;i<c.children.length;i++){var f=find(c.children[i]);if(f)return f;} }
    return find(ui);
}
function click(label) { var c=control(label); assert(c.enabled,'Control disabled: '+label); c.onClick(); }
function tick(){eval(scheduled);}
function status(){ return ui.children[9].helpTip; }
function feedback(){return ui.children[9].helpTip;}
`;
const tests = String.raw`
assert(!control('A\nEmpty').enabled && !control('Restore Original').enabled, 'Empty actions disabled');
click('Use Selected Layer');
assert(control('Capture A').enabled, 'Attach enables capture');
assert(!ui.children[9].visible && ui.children[9].text==='', 'Routine summary line is hidden');
assert(control('Use Selected Layer').text===layer.name, 'Attach button displays target layer name');
assert(control('A\nEmpty').maximumSize.height===44, 'A/B cards stay compact');
assert(!findEdit(ui), 'No feedback text box');
function findEdit(c){if(c.type==='edittext')return true;for(var i=0;i<c.children.length;i++){if(findEdit(c.children[i]))return true;}return false;}
// Exercise custom painters; logic-only tests previously never invoked onDraw.
var drawn=[], painter=control('A\nEmpty'), gfx=painter.graphics;
['newPath','rectPath','moveTo','lineTo','closePath','fillPath','strokePath'].forEach(function(name){gfx[name]=function(){};});
gfx.measureString=function(label,font){assert(!font || font===this.font,'Measurement uses the current graphics font');return [label.length*7,label.length===1?18:11];};
gfx.drawString=function(label,pen,x,y){drawn.push({label:label,x:x,y:y,font:this.font});};
painter.size={width:120,height:44}; painter.onDraw();
assert(drawn[0].x===56.5 && drawn[0].y===7, 'A label is centered using measured text bounds');
assert(drawn[1].x===42.5 && drawn[1].y===26, 'State label shares centered text stack');
assert(drawn[0].font.size===16 && drawn[1].font.size===9, 'Each line is drawn with its measured font');
var roundedLabels=['Use Selected Layer','Replace Session','Cancel','Capture A','Capture B','Restore Original','Refresh'];
roundedLabels.forEach(function(label){var c=control(label);c.graphics=gfx;c.onDraw();});
var scopePainter=ui.children[5].children[1];
scopePainter.graphics=gfx;scopePainter.onDraw();
assert(drawn.length===10, 'All rounded control painters render without errors');
click('Capture A');
assert(feedback().indexOf('2 animated skipped; 1 unsupported skipped')>=0,'Capture skip counts');
assert(control('A\nEmpty').stateLabel==='ACTIVE','A active after capture');
numeric.value=45; color.value=[0,1,0,1]; checkbox.value=0; dropdown.value=3; fx1.enabled=false;
tick(); assert(status().indexOf('Modified')>=0,'Manual edit refresh');
click('Capture B');
assert(numeric.value===45 && !fx1.enabled,'Capture never applies');
app.project.activeItem=otherComp;
click('A\nEmpty');
assert(numeric.value===10 && fx1.enabled && checkbox.value===1 && dropdown.value===2,'A values and switches');
assert(otherValue.value===99,'Fixed target ignores new selection');
assert(color.value[0]===1 && keyed.value===20 && expressed.value===30,'Colors restored, animation untouched');
click('B\nEmpty'); assert(numeric.value===45 && !fx1.enabled,'B values and switches');
click('Restore Original'); assert(numeric.value===10 && fx1.enabled,'Original restored');
assert(control('A\nEmpty').enabled && control('B\nEmpty').enabled,'Original retains A/B');
assert(undoNames.length===3 && undoDepth===0,'One undo group per application, none for capture');
numeric.value=88; color.rejectNext=true; click('B\nEmpty');
assert(numeric.value===88 && fx1.enabled && undoDepth===0,'Failed apply rolls back and closes undo group');
assert(feedback().indexOf('Previous values restored')>=0,'Failure reported inline');
numeric.numKeys=1; click('B\nEmpty');
assert(numeric.value===88 && feedback().indexOf('newly animated')>=0,'New keyframes preserved');
numeric.numKeys=0; numeric.expressionEnabled=true; click('A\nEmpty');
assert(numeric.value===88,'New expression preserved'); numeric.expressionEnabled=false;
layer.locked=true; tick(); assert(!control('A\nEmpty').enabled && control('Capture A').enabled,'Locked layer cannot apply'); layer.locked=false;
app.project.activeItem=comp;
click('Use Selected Layer'); assert(control('Replace Session').visible!==false,'Replacement confirmation');
assert(!control('A\nEmpty').enabled,'Pending replacement blocks apply');
click('Cancel'); assert(control('A\nEmpty').enabled,'Cancel keeps session');
click('Use Selected Layer'); click('Replace Session');
assert(!control('A\nEmpty').enabled && !control('B\nEmpty').enabled,'New session clears A/B');
var chooser;
function findType(c,t){if(c.type===t)return c;for(var i=0;i<c.children.length;i++){var r=findType(c.children[i],t);if(r)return r;}}
chooser=findType(ui,'dropdownlist');
chooser.selection=1; chooser.onChange(); assert(chooser.selection.index===0 && chooser.enabled,'Empty selected scope rejected');
layer.selectedProperties=[numeric]; chooser.selection=1; chooser.onChange(); assert(!chooser.enabled,'Selected scope fixed immediately');
click('Capture A'); numeric.value=77; checkbox.value=0; click('Capture B');
click('Restore Original'); assert(numeric.value===88 && checkbox.value===0,'Scoped Original uses attach time and leaves other effect untouched');
click('A\nEmpty'); assert(checkbox.value===0,'Selected scope ignores other effect');
fx1.propertyIndex=2; fx2.propertyIndex=1; layer.fx.children=[fx2,fx1]; tick();
assert(!control('A\nEmpty').enabled && feedback().indexOf('reordered')>=0,'Effect reorder blocks apply');
fx1.propertyIndex=1; fx2.propertyIndex=2; layer.fx.children=[fx1,fx2];
tick(); assert(!control('A\nEmpty').enabled,'Structural invalidation stays latched until reset');
comp.selectedLayers=[layer]; click('Use Selected Layer'); click('Replace Session'); click('Capture A');
layer.fx.children.push(new Group('Effect 3',[],true)); layer.fx.numProperties=3; tick();
assert(feedback().indexOf('added or removed')>=0,'Effect addition blocks apply');
layer.fx.children.pop(); layer.fx.numProperties=2;
click('Use Selected Layer'); click('Replace Session'); click('Capture A');
var replacement=new Group('Effect 1',fx1.children,true); replacement.propertyIndex=1;
fx1.valid=false; layer.fx.children[0]=replacement; tick();
assert(!control('A\nEmpty').enabled && feedback().indexOf('Effects changed')>=0,'Same-type replacement blocks apply');
fx1.valid=true; layer.fx.children[0]=fx1;
click('Use Selected Layer'); click('Replace Session'); click('Capture A');
layer.valid=false; tick(); assert(!control('Restore Original').enabled && feedback().indexOf('deleted')>=0,'Deleted layer handled');
layer.valid=true; comp.valid=false; tick(); assert(feedback().indexOf('composition is unavailable')>=0,'Removed composition handled');
comp.valid=true; tick();
comp.selectedLayers=[]; click('Use Selected Layer'); assert(feedback().indexOf('exactly one')>=0,'Missing selection rejected');
comp.selectedLayers=[layer,otherLayer]; click('Use Selected Layer'); assert(feedback().indexOf('exactly one')>=0,'Multiple layers rejected');
ui.onClose(); assert(canceled && Object.keys($.global.__effectABPanels).length===0,'Timer cleaned up on close');
console.log('PASS: '+checks+' assertions. AE UI, rendering, and real undo still require manual testing.');
`;
vm.runInNewContext(mock + '\n' + source + '\n' + tests, {console}, {timeout:5000});
