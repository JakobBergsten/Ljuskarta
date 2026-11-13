import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCandle,validOrigin} from '../lib/candle-validation.mjs';

const candle={person:' Farmor ',place:' En plats ',date:'2024-02-29',message:'Ett minne.',authorName:'Familjemedlem',latitude:-33.9,longitude:151.2};
test('keeps international coordinates and trims fields',()=>{assert.deepEqual(validateCandle(candle),{...candle,person:'Farmor',place:'En plats'});});
test('rejects invalid dates, missing people and out-of-range coordinates',()=>{for(const change of [{date:'2025-02-29'},{date:'2024-13-01'},{person:' '},{latitude:91},{longitude:-181},{latitude:NaN},{latitude:'59.3'},{message:'x'.repeat(2001)}])assert.throws(()=>validateCandle({...candle,...change}));});
test('does not accept a client-selected owner or record ID',()=>{const result=validateCandle({...candle,authorId:'another-user',id:'chosen'});assert.equal('authorId'in result,false);assert.equal('id'in result,false)});
test('same-origin writes only',()=>{assert.equal(validOrigin(new Request('https://example.org/api/candles',{headers:{origin:'https://example.org'}})),true);assert.equal(validOrigin(new Request('https://example.org/api/candles',{headers:{origin:'https://evil.example'}})),false);assert.equal(validOrigin(new Request('https://example.org/api/candles')),false)});
test('retains untrusted text as plain data',()=>{const text='<img src=x onerror=alert(1)>';assert.equal(validateCandle({...candle,message:text}).message,text)});
