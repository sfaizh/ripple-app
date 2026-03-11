import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function enqueue<T>(
  queue: string,
  payload: T,
  delaySeconds = 0
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc('pgmq_send', {
    queue_name: queue,
    msg: payload,
    sleep_seconds: delaySeconds,
  });

  if (error) {
    throw new Error(`Failed to enqueue to ${queue}: ${error.message}`);
  }
}

export async function dequeue<T>(
  queue: string,
  visibilitySeconds = 30,
  batchSize = 5
): Promise<Array<{ msg_id: number; message: T }>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('pgmq_read', {
    queue_name: queue,
    vt: visibilitySeconds,
    qty: batchSize,
  });

  if (error) {
    throw new Error(`Failed to dequeue from ${queue}: ${error.message}`);
  }

  return (data ?? []) as Array<{ msg_id: number; message: T }>;
}

export async function ack(queue: string, msgId: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.rpc('pgmq_archive', { queue_name: queue, msg_id: msgId });
}

export async function nack(queue: string, msgId: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.rpc('pgmq_set_vt', {
    queue_name: queue,
    msg_id: msgId,
    vt: 0,
  });
}
