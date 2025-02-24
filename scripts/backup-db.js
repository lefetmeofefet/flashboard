import {closeConnection, queryNeo4j} from "../backend/db.js";
import fs from "fs";

let result = await queryNeo4j(
    `
    MATCH (n)
    WITH collect({properties: properties(n), labels: labels(n)}) AS nodes
    MATCH ()-[r]->()
    RETURN collect({type: type(r), properties: properties(r), start: STARTNODE(r).id, end: ENDNODE(r).id}) AS relationships,
           nodes
    `,
)
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filename = `backups/flashboard-neo4j-backup-${timestamp}.json`;

// Write the data to a JSON file
fs.writeFileSync(filename, JSON.stringify(result[0], null, 2), 'utf8');
console.log(`Backup saved to ${filename}`);
await closeConnection()