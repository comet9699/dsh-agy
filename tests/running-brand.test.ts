import{it,expect}from'vitest';
// @ts-expect-error Private browser module.
import{workingLabel}from'../src/running-brand.mjs';
it.each([['深度探索中，用时 8秒…','Working for 8s'],['深度探索中，用时 2分3秒','Working for 2m 3s'],['Deep diving for 1h 2m 3s','Working for 1h 2m 3s'],['深度探索中…','Working…']])('preserves the official elapsed time: %s',(source,result)=>expect(workingLabel(source)).toBe(result));
