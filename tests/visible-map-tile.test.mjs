import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasLoadedTileAt} from '../lib/visible-map-tile.mjs';
const tile=(overrides={})=>({complete:true,naturalWidth:256,src:'https://tile.openstreetmap.org/14/9051/4976.png',getBoundingClientRect:()=>({left:100,top:100,right:356,bottom:356}),...overrides});
test('accepts only a visible, loaded OSM tile at the current zoom',()=>{
  assert.equal(hasLoadedTileAt([tile()],14,200,200),true);
  assert.equal(hasLoadedTileAt([tile()],13,200,200),false);
  assert.equal(hasLoadedTileAt([tile({naturalWidth:0})],14,200,200),false);
  assert.equal(hasLoadedTileAt([tile()],14,400,200),false);
  assert.equal(hasLoadedTileAt([tile({src:'https://untrusted.example/14/9051/4976.png'})],14,200,200),false);
});
