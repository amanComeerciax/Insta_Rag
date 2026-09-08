import { MongoClient, Db, Collection } from 'mongodb';
import { SavedPost, SyncLog } from '@/types';

const DEFAULT_MONGO_URI = 'mongodb+srv://daisyymodi_db_user:Ti2E8SDEpujzQmJt@cluster0.htv65hv.mongodb.net/instasaved?retryWrites=true&w=majority';
const uri = process.env.MONGODB_URI || DEFAULT_MONGO_URI;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (uri) {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, {});
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = Promise.resolve() as any;
}

export default clientPromise;

export function isMongoConfigured(): boolean {
  const uriStr = process.env.MONGODB_URI || DEFAULT_MONGO_URI;
  return Boolean(
    uriStr &&
    !uriStr.includes('<username>') &&
    !uriStr.includes('placeholder')
  );
}

export async function getDatabase(): Promise<Db> {
  if (!isMongoConfigured()) {
    throw new Error('MONGODB_URI is not configured in environment variables');
  }
  const client = await clientPromise;
  return client.db('instasaved');
}

export async function getPostsCollection(): Promise<Collection<SavedPost>> {
  const db = await getDatabase();
  const collection = db.collection<SavedPost>('saved_posts');
  
  // Ensure unique compound index on user_id + instagram_post_id
  try {
    await collection.createIndex({ user_id: 1, instagram_post_id: 1 }, { unique: true });
    await collection.createIndex({ user_id: 1, category: 1 });
    await collection.createIndex({ user_id: 1, saved_at: -1 });
  } catch {}

  return collection;
}

export async function getSyncLogsCollection(): Promise<Collection<SyncLog>> {
  const db = await getDatabase();
  const collection = db.collection<SyncLog>('sync_logs');
  try {
    await collection.createIndex({ user_id: 1, created_at: -1 });
  } catch {}
  return collection;
}
