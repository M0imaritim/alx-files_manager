import dbClient from '../utils/db';

describe('DBClient', () => {
  it('should be alive', async () => {
    expect(dbClient.isAlive()).toBe(true);
  });

  it('should return the number of users', async () => {
    const count = await dbClient.nbUsers();
    expect(typeof count).toBe('number');
  });

  it('should return the number of files', async () => {
    const count = await dbClient.nbFiles();
    expect(typeof count).toBe('number');
  });
});
