import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const service = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ensureSingleSettings = async () => {
  const { data, error } = await service.from('settings').select('id').limit(1).maybeSingle();
  if (error) throw error;
  if (data?.id) return data.id as string;
  const { data: created, error: insErr } = await service.from('settings').insert({}).select('id').single();
  if (insErr) throw insErr;
  return created.id as string;
};

export async function GET() {
  const { data: settings, error } = await service
    .from('settings')
    .select('id, company_name, street, zip, city, phone, email, uid, tax_number, register_number, logo_path, bank_name, iban, bic')
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!settings) return NextResponse.json(null);

  const [{ data: contacts }, { data: tax }, { data: hours }] = await Promise.all([
    service.from('settings_contacts').select('*').eq('settings_id', settings.id),
    service.from('settings_tax_contacts').select('*').eq('settings_id', settings.id),
    service.from('settings_office_hours').select('*').eq('settings_id', settings.id),
  ]);

  return NextResponse.json({ settings, contacts: contacts ?? [], taxContacts: tax ?? [], officeHours: hours ?? [] });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const settingsId = (body.settings?.id as string | undefined) || (await ensureSingleSettings());

    const { error: upErr, data: saved } = await service
      .from('settings')
      .update({
        company_name: body.settings?.company_name ?? null,
        street: body.settings?.street ?? null,
        zip: body.settings?.zip ?? null,
        city: body.settings?.city ?? null,
        phone: body.settings?.phone ?? null,
        email: body.settings?.email ?? null,
        uid: body.settings?.uid ?? null,
        tax_number: body.settings?.tax_number ?? null,
        register_number: body.settings?.register_number ?? null,
        logo_path: body.settings?.logo_path ?? null,
        bank_name: body.settings?.bank_name ?? null,
        iban: body.settings?.iban ?? null,
        bic: body.settings?.bic ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settingsId)
      .select('*')
      .single();

    if (upErr) throw upErr;

    // replace child tables
    await service.from('settings_contacts').delete().eq('settings_id', settingsId);
    if (Array.isArray(body.contacts) && body.contacts.length) {
      await service.from('settings_contacts').insert(
        body.contacts.map((c: any) => ({
          settings_id: settingsId,
          name: c.name ?? null,
          role: c.role ?? null,
          phone: c.phone ?? null,
          email: c.email ?? null,
        }))
      );
    }

    await service.from('settings_tax_contacts').delete().eq('settings_id', settingsId);
    if (Array.isArray(body.taxContacts) && body.taxContacts.length) {
      await service.from('settings_tax_contacts').insert(
        body.taxContacts.map((c: any) => ({
          settings_id: settingsId,
          firm: c.firm ?? null,
          name: c.name ?? null,
          role: c.role ?? null,
          phone: c.phone ?? null,
          email: c.email ?? null,
        }))
      );
    }

    await service.from('settings_office_hours').delete().eq('settings_id', settingsId);
    if (Array.isArray(body.officeHours) && body.officeHours.length) {
      await service.from('settings_office_hours').insert(
        body.officeHours.map((o: any) => ({
          settings_id: settingsId,
          weekday: o.weekday || o.day || null,
          enabled: !!o.enabled,
          time_from: o.time_from || o.from || null,
          time_to: o.time_to || o.to || null,
        }))
      );
    }

    return NextResponse.json({ ok: true, settings: saved });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Fehler beim Speichern' }, { status: 400 });
  }
}
