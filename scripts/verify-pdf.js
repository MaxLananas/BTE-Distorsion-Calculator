import {readFileSync} from 'node:fs';
import {loadGrid} from '../src/projection.js';
import {chambordReport} from '../src/chambord.js';
const bytes=readFileSync(new URL('../public/conformal.bin',import.meta.url));
loadGrid(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
console.log(JSON.stringify(chambordReport(),null,2));
