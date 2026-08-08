const cors = require('cors');

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:4200', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:8090', 'https://customer-demo-e-commerce.vercel.app'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);

    const isAllowedExplicit = allowedOrigins.includes(origin);
    const isVercelDomain = /\.vercel\.app$/.test(origin);
    const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);

    if (isAllowedExplicit || isVercelDomain || isLocalhost) {
      callback(null, true);
    } else {
      callback(new Error('Access denied by CORS security policy'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = cors(corsOptions);
