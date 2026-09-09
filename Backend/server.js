const express = require('express');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const apiRoutes = require('./src/routes');
const { initDb } = require('./src/config/db');
const { seedRootAdmin } = require('./src/services/admin.service');

const app = express();
const PORT = process.env.PORT || 5000;

const ALLOWED_ORIGINS = [
  /^http:\/\/localhost:\d+$/,
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = ALLOWED_ORIGINS.some((o) =>
    typeof o === 'string' ? o === origin : o.test(origin)
  );

  if (origin && allowed) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

app.use(cookieParser());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/init-db', async (req, res) => {
  try {
    await initDb();
    await seedRootAdmin();
    res.status(200).json({ status: 'ok', message: 'DB initialized' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.use('/api', apiRoutes);

// Vercel: export app (serverless)
// Local: call listen directly
if (require.main === module) {
  const startServer = async () => {
    try {
      await initDb();
      await seedRootAdmin();
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error.message);
      process.exit(1);
    }
  };
  startServer();
} else {
  // Running on Vercel — init DB on cold start
  initDb()
    .then(() => seedRootAdmin())
    .catch((err) => console.error('Init error:', err.message));
}

module.exports = app;
