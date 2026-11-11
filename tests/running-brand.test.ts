import{it,expect}from'vitest';
// @ts-expect-error Private browser module.
import{workingLabel,phaseLabel}from'../src/running-brand.mjs';
it('shows only known stages and does not invent a percentage or expose errors',()=>{expect(phaseLabel({stage:'waiting-model'})).toBe('等待模型');expect(phaseLabel({stage:'waiting-tool'})).toBe('等待工具结果');expect(phaseLabel({stage:'failed',failureCode:'secret'})).toBe('');expect(phaseLabel({stage:'untrusted text'})).toBe('');});
it.each([['深度探索中，用时 8秒…','Working for 8s'],['深度探索中，用时 2分3秒','Working for 2m 3s'],['Deep diving for 1h 2m 3s','Working for 1h 2m 3s'],['深度探索中…','Working…']])('preserves the official elapsed time: %s',(source,result)=>expect(workingLabel(source)).toBe(result));
