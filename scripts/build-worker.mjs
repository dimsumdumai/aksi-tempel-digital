import {cp, mkdir} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai/drizzle',{recursive:true});
await cp('worker/index.js','dist/server/index.js');
await cp('.openai/hosting.json','dist/.openai/hosting.json');
await cp('drizzle/0000_initial.sql','dist/.openai/drizzle/0000_initial.sql');
