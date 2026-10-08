const assert=require('node:assert/strict');
const {isDay,solarElevation,setMode,status}=require('./daylight');
for(const day of ['2026-01-15','2026-06-21','2026-10-07']){
 assert(isDay(new Date(day+'T11:00:00Z')),day+' noon is daylight');
 assert(!isDay(new Date(day+'T23:00:00Z')),day+' midnight is night');
}
assert(isDay(new Date('2026-06-21T04:00:00Z')),'summer early morning is day');
assert(!isDay(new Date('2026-01-15T04:00:00Z')),'winter early morning is night');
assert(isDay(new Date('2026-10-07T12:00:00+02:00'))===isDay(new Date('2026-10-07T10:00:00Z')),'timezone representation does not change daylight');
assert(Number.isFinite(solarElevation(new Date('2028-02-29T12:00:00Z'))),'leap year works');
setMode('day');assert.equal(status(),'Day · preview');setMode('night');assert.equal(status(),'Night · preview');setMode('auto');assert(status().endsWith('Berlin auto'));
console.log('Berlin solar daylight, seasonal sunrise, timezone, leap year, and manual previews passed.');
