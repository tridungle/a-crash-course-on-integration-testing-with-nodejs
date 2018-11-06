/* eslint-env mocha */

const expect = require('chai').expect
const request = require('chai').request
const {
  getApp,
  clearDB,
  getModel
} = require('../helpers')

const app = getApp()
const User = getModel('User')

const testUser = {
  name: 'superAdmin',
  email: 'admin@example.com',
  password: 'superSecret'
}
const wrongPasswordUser = {
  name: 'superAdmin',
  email: 'admin@example.com',
  password: 'wrongpassword'
}

function registerUser () {
  return request(app)
    .post('/api/auth/register')
    .send(testUser)
}
function loginUser () {
  return request(app)
    .post('/api/auth/login')
    .send(testUser)
}
function loginUserWithWrongPassword () {
  return request(app)
    .post('/api/auth/login')
    .send(wrongPasswordUser)
}
function logoutUser () {
  return request(app)
    .get('/api/auth/logout')
    .send(testUser)
}
function me (token) {
  return request(app)
    .get('/api/auth/me')
    .set('x-access-token', token)
}

describe('auth', function () {
  beforeEach(() => clearDB())
  afterEach(() => clearDB())

  describe('.controller', function () {
    describe('.register', async () => {
      let registerRes
      before(async () => {
        registerRes = await registerUser()
      })
      it('should return status 200', async () => {
        expect(registerRes).to.have.status(200)
      })
      it('should return body with \'token\' property', async () => {
        expect(registerRes.body).to.have.property('token')
      })
      it('should return body with \'auth\' property', async () => {
        expect(registerRes.body).to.have.property('auth')
      })
      it('should return body.auth property with value \'true\'', async () => {
        expect(registerRes.body.auth).to.be.equal(true)
      })
    })

    describe('.login', () => {
      describe('when no user found', () => {
        let loginRes
        before(async () => {
          loginRes = await loginUser()
        })
        it('should return status 404', () => {
          expect(loginRes).to.have.status(404)
        })
        it('should return message \'No user found.\'', () => {
          expect(loginRes.error.text).to.be.equal('No user found.')
        })
      })
      describe('when user found', () => {
        let loginRes
        before(async () => {
          await registerUser()
          loginRes = await loginUser()
        })
        it('should return status 200', () => {
          expect(loginRes).to.have.status(200)
        })
        it('should return body.auth property with value \'true\'', () => {
          expect(loginRes.body.auth).to.be.equal(true)
        })
      })
      describe('when wrong password', () => {
        let loginRes
        before(async () => {
          await registerUser()
          loginRes = await loginUserWithWrongPassword()
        })
        it('should return status 401', () => {
          expect(loginRes).to.have.status(401)
        })
        it('should return body.auth property with value \'false\'', () => {
          expect(loginRes.body.auth).to.be.equal(false)
        })
      })
    })

    describe('.me', () => {
      let loginRes,
        meResSuccess,
        meResNoToken,
        meResBadToken,
        userFromAPI,
        userFromDB
      before(async () => {
        await registerUser()
        loginRes = await loginUser()
        meResSuccess = await me(loginRes.body.token)
        meResNoToken = await me('')
        meResBadToken = await me('somerandomtoken')
        userFromAPI = meResSuccess.body
        userFromDB = await User.findById(userFromAPI._id, { _id: 1, name: 1, email: 1 })
      })
      it('should return status 200', () => {
        expect(meResSuccess).to.have.status(200)
      })
      it('should return the authenticated user', () => {
        expect(userFromAPI._id).to.equal(userFromDB._id.toString())
        expect(userFromAPI.name).to.equal(userFromDB.name)
        expect(userFromAPI.email).to.equal(userFromDB.email)
      })
      it('should return status 403 if \'no token provided\'', async () => {
        expect(meResNoToken).to.have.status(403)
      })
      it('should return message: \'No token provided.\' if it fails with 403', async () => {
        expect(meResNoToken.body.message).to.be.eql('No token provided.')
      })
      it('should return status 500 if \'failed to authenticate token\'', async () => {
        expect(meResBadToken).to.have.status(500)
      })
      it('should return message: \'Failed to authenticate token.\' if it fails with 500', async () => {
        expect(meResBadToken.body.message).to.be.eql('Failed to authenticate token.')
      })
    })

    describe('.logout`', () => {
      let logoutRes
      before(async () => {
        logoutRes = await logoutUser()
      })
      it('should return status 200', () => {
        expect(logoutRes).to.have.status(200)
      })
      it('should set the \'token\' property to null', () => {
        expect(logoutRes.body.token).to.be.equal(null)
      })
      it('should set the \'auth\' property to false', () => {
        expect(logoutRes.body.auth).to.be.equal(false)
      })
    })
  })
})