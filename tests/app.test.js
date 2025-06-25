import chai from 'chai';
import chaiHttp from 'chai-http';
import { describe, it } from 'mocha';
import app from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('appController', () => {
  describe('gET /status', () => {
    it('should return status: ok', () => new Promise((done) => {
      chai.request(app)
        .get('/status')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.deep.equal({ redis: true, db: true });
          done();
        });
    }));
  });

  describe('gET /stats', () => {
    it('should return stats with users and files count', () => new Promise((done) => {
      chai.request(app)
        .get('/stats')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.keys('users', 'files');
          done();
        });
    }));
  });
});
