import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  /**
   * GET /status
   * Returns the status of Redis and DB connections
   */
  static getStatus(req, res) {
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };

    res.status(200).json(status);
  }

  /**
   * GET /stats
   * Returns the number of users and files in the database
   */
  static async getStats(req, res) {
    try {
      const users = await dbClient.nbUsers();
      const files = await dbClient.nbFiles();

      const stats = {
        users,
        files,
      };

      res.status(200).json(stats);
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default AppController;
