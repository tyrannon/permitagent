import { Router } from 'express';

const router = Router();

router.post('/extract', (_req, res) => {
  res.json({ message: 'AI extraction endpoint' });
});

export default router;