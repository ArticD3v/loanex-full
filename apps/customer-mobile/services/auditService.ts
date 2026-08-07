import { supabase } from '../lib/supabase';

export async function logAction(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  changes: any
): Promise<void> {
  const { error } = await supabase.from('audit_log').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes,
  });
  if (error) throw error;
}
