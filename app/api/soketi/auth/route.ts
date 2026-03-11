import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { soketiServer } from '@/lib/soketi/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.formData();
    const socketId = body.get('socket_id') as string;
    const channelName = body.get('channel_name') as string;

    // Verify the channel matches the user's ID
    const expectedChannel = `private-user-${user.id}`;
    if (channelName !== expectedChannel) {
      return NextResponse.json(
        { error: 'Forbidden: channel mismatch', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const authResponse = soketiServer.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Soketi auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
