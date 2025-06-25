import redisClient from '../utils/redis';

describe('RedisClient', () => {
  it('should be alive', () => {
    expect(redisClient.isAlive()).toBe(true);
  });

  it('should set and get a value', async () => {
    await redisClient.set('test_key', 'value', 10);
    const value = await redisClient.get('test_key');
    expect(value).toBe('value');
  });

  it('should delete a value', async () => {
    await redisClient.set('to_delete', 'value', 10);
    await redisClient.del('to_delete');
    const value = await redisClient.get('to_delete');
    expect(value).toBe(null);
  });
});
