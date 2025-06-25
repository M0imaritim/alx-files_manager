import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.dbName = database;
    this.db = null;
    this.connected = false;

    this.connect();
  }

  async connect() {
    try {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.connected = true;
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('MongoDB connection error:', err);
      this.connected = false;
      this.db = null;
    }
  }

  /**
   * Checks if the connection to MongoDB is alive
   * @returns {boolean} true if connected, false otherwise
   */
  isAlive() {
    return (
      this.connected
      && this.client
      && this.client.topology
      && this.client.topology.isConnected()
    );
  }

  /**
   * Returns the number of documents in the users collection
   * @returns {Promise<number>} number of users
   */
  async nbUsers() {
    if (!this.db) {
      await this.connect();
    }
    if (!this.db) {
      return 0;
    }
    return this.db.collection('users').countDocuments();
  }

  /**
   * Returns the number of documents in the files collection
   * @returns {Promise<number>} number of files
   */
  async nbFiles() {
    if (!this.db) {
      await this.connect();
    }
    if (!this.db) {
      return 0;
    }
    return this.db.collection('files').countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
