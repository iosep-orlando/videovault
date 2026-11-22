import { MongoClient, type Db } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Un único cliente por proceso. En desarrollo se guarda en globalThis porque
// la recarga en caliente vuelve a ejecutar los módulos y abriría una conexión
// nueva en cada cambio.
function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Falta la variable de entorno "MONGODB_URI"');
  global._mongoClientPromise ??= new MongoClient(uri).connect();
  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB ?? "videovault");
}
