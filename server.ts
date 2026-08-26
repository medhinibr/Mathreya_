import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Mathreya Women Health Platform' });
});

// AI Chat Endpoint for Puberty Assistant, Prenatal/Postnatal AI Psychiatrist, and Virtual Mother
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { persona } = req.body;

    let replyText = 'I am right here with you, my dear. Take a warm cup of herbal tea and rest comfortably. Everything will be well.';
    if (persona === 'puberty_assistant') {
      replyText = 'Cramps and mood changes are completely natural as your body grows. Drink warm water, keep a hot pouch on your lower belly, and give yourself gentleness today.';
    } else if (persona === 'ai_psychiatrist') {
      replyText = 'It is completely normal to feel overwhelmed during this journey. Take 3 deep breaths: inhale peace, exhale tension. You are doing wonderfully.';
    }

    return res.json({ text: replyText });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('AI Chat Error:', message);
    return res.status(500).json({
      text: 'My dear, I am right here. Take a deep breath and rest your mind.',
      error: message,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n==================================================');
    console.log('🌸 MATHREYA WOMEN\'S HEALTH PLATFORM ONLINE 🌸');
    console.log('==================================================');
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://127.0.0.1:${PORT}/`);
    console.log(`  ➜  Health:  http://localhost:${PORT}/api/health`);
    console.log('==================================================\n');
  });

  server.on('error', (err: unknown) => {
    const errObj = err as { code?: string };
    if (errObj.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${PORT} is in use. Please close the previous process or restart.`);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
