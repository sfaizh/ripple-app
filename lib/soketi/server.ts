import * as dotenv from 'dotenv';
import Pusher from 'pusher';

dotenv.config({ path: '.env.local' });

export const soketiServer = new Pusher({
  appId: process.env.SOKETI_APP_ID!,
  key: process.env.NEXT_PUBLIC_SOKETI_KEY!,
  secret: process.env.SOKETI_SECRET!,
  host: process.env.SOKETI_HOST!,
  port: process.env.SOKETI_PORT || '443',
  useTLS: true,
});
