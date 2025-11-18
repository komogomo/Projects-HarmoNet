const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const secret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const now = Math.floor(Date.now()/1000);
const exp = now + 60*60*24*365*10; // 10年

const anon = jwt.sign({ role: 'anon', iat: now, exp }, secret);
const service = jwt.sign({ role: 'service_role', iat: now, exp }, secret);

console.log('---- COPY THESE INTO YOUR .env (server-only) ----');
console.log('JWT_SECRET=' + secret);
console.log('ANON_KEY=' + anon);
console.log('SERVICE_ROLE_KEY=' + service);
console.log('---- END ----');
