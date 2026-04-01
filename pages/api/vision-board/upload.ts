import type { NextApiRequest, NextApiResponse } from 'next'
import visionBoardHandler from './index'

/**
 * Alias for POST /api/vision-board — some clients or older builds called /upload.
 * Same JSON body and behavior as the index route.
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return visionBoardHandler(req, res)
}
