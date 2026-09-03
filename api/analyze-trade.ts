import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './gemini/analyze-trade';

export default async function (req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
