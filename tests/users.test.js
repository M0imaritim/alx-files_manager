import chai from 'chai';
import chaiHttp from 'chai-http';
import { describe, it } from 'mocha';
import app from '../server';
import dbClient from '../utils/db';

chai.use(chaiHttp);
const { expect } = chai;

describe('usersController', () => {
  const testEmail = `test-${Date.now()}@example.com`;

  let token = '';

  it('should create a new user', () => new Promise((done) => {
    chai
      .request(app)
      .post('/users')
      .send({ email: testEmail, password: '123456' })
      .end((err, res) => {
        expect(res).to.have.status(201);
        expect(res.body.email).to.equal(testEmail);
        done();
      });
  }));

  it('should login and return token', () => new Promise((done) => {
    const auth = Buffer.from(`${testEmail}:123456`).toString('base64');

    chai
      .request(app)
      .get('/connect')
      .set('Authorization', `Basic ${auth}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('token');
        token = res.body.token;
        done();
      });
  }));

  it('should return user profile with token', () => new Promise((done) => {
    chai
      .request(app)
      .get('/users/me')
      .set('X-Token', token)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.email).to.equal(testEmail);
        done();
      });
  }));

  it('should logout user', () => new Promise((done) => {
    chai
      .request(app)
      .get('/disconnect')
      .set('X-Token', token)
      .end((err, res) => {
        expect(res).to.have.status(204);
        done();
      });
  }));
});
