import redis from 'redis';

class RedisClient {
  constructor() {
    this.client = redis.createClient();

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
    });

    this.client.on('connect', () => {
      this.connected = true;
    });
  }

  isAlive() {
    return this.client.connected === true;
  }

  get(key) {
    return new Promise((resolve) => {
      this.client.get(key, (err, value) => {
        if (err) {
          console.error('Redis GET Error:', err.message);
          resolve(null);
        } else {
          resolve(value);
        }
      });
    });
  }

  set(key, value, duration) {
    return new Promise((resolve) => {
      this.client.setex(key, duration, value, (err) => {
        if (err) {
          console.error('Redis SET Error:', err.message);
        }
        resolve();
      });
    });
  }

  del(key) {
    return new Promise((resolve) => {
      this.client.del(key, (err) => {
        if (err) {
          console.error('Redis DEL Error:', err.message);
        }
        resolve();
      });
    });
  }
}

const redisClient = new RedisClient();
export default redisClient;
