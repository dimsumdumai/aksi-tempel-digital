import {rm} from 'node:fs/promises';

// The operational Excel database must never be included in a public build.
await rm('dist/database-gaspoll.xlsx',{force:true});
