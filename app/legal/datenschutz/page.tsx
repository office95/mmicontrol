export const metadata = {
  title: 'Datenschutz (DSGVO)',
  description: 'Datenschutzhinweise für Music Mission Control',
};

export default function DatenschutzPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-6 text-slate-100">
      <h1 className="text-3xl font-bold text-white">Datenschutzerklärung (DSGVO, Österreich)</h1>
      <p className="text-sm text-white/70">Stand: {new Date().toLocaleDateString('de-AT')}</p>

      <Section title="1. Verantwortlicher">
        <p>
          Unternehmen: <strong>[Firmenname, Rechtsform]</strong><br />
          Anschrift: <strong>[Straße, PLZ Ort, Österreich]</strong><br />
          E-Mail: <strong>[datenschutz@…]</strong> · Telefon: <strong>[…]</strong>
        </p>
      </Section>

      <Section title="2. Datenschutzbeauftragter (falls bestellt)">
        <p>
          Name/Firma: <strong>[DSB]</strong><br />
          Kontakt: <strong>[E-Mail/Telefon]</strong>
        </p>
      </Section>

      <Section title="3. Zwecke & Rechtsgrundlagen">
        <ul className="list-disc pl-5 space-y-1">
          <li>Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO): Registrierung, Kursbuchung, Kursunterlagen, Quizzes/Tests, Support.</li>
          <li>Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO): Systemsicherheit, Missbrauchsprävention, aggregierte Auswertungen.</li>
          <li>Rechtspflicht (Art. 6 Abs. 1 lit. c DSGVO iVm BAO/UGB/UStG): Aufbewahrung von Rechnungs-/Buchungsdaten.</li>
          <li>Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 165 TKG 2003): nur bei optionalem Marketing/Analytics.</li>
        </ul>
      </Section>

      <Section title="4. Datenkategorien">
        <ul className="list-disc pl-5 space-y-1">
          <li>Kursteilnehmer: Name, E-Mail, optional Anschrift/Telefon, Buchungs-/Zahlungsdaten (Beträge, Status, Belege), Kurs-/Terminzuordnung, Quiz-/Lernergebnisse, Support-Tickets.</li>
          <li>Dozenten: Name, E-Mail, Partner-/Kurszuordnung, Kursmaterialien, Support-Tickets.</li>
          <li>Technische Daten: Login-/Fehllogin-Protokolle, Browser-/Device-Infos, Zeitstempel.</li>
          <li>Uploads: Kursunterlagen, Belege (private Storage-Buckets).</li>
        </ul>
      </Section>

      <Section title="5. Empfänger / Auftragsverarbeiter">
        <p>Mit AVV: Supabase (DB/Storage/Auth, EU-Region), E-Mail-/Push-Dienstleister, CDN/Hosting, Zahlungsdienstleister (falls eingesetzt). Drittlandtransfer nur mit SCC + TIA.</p>
      </Section>

      <Section title="6. Speicherdauer">
        <ul className="list-disc pl-5 space-y-1">
          <li>Buchungs-/Rechnungsdaten: 7 Jahre (§ 132 BAO; ggf. 10 Jahre je nach Steuer-/Handelsrecht festlegen).</li>
          <li>Support-Tickets: 2 Jahre nach Abschluss (sofern keine längeren Pflichten).</li>
          <li>Quiz-/Lernfortschritt: bis Kursende + 12 Monate oder bei Löschanfrage.</li>
          <li>Logs: max. 90 Tage.</li>
        </ul>
      </Section>

      <Section title="7. Cookies/Tracking (§ 165 TKG 2003)">
        <p>Nur technisch notwendige Cookies (Session). Weitere Cookies/Analytics nur nach Einwilligung (Consent-Banner, Widerruf jederzeit).</p>
      </Section>

      <Section title="8. Betroffenenrechte">
        <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch (Art. 15–21 DSGVO), Widerruf von Einwilligungen. Beschwerde an die österreichische Datenschutzbehörde, Barichgasse 40-42, 1030 Wien, dsb@dsb.gv.at.</p>
      </Section>

      <Section title="9. Bereitstellungspflicht">
        <p>Für Kursbuchung/Teilnahme sind Stammdaten und Login erforderlich; ohne diese ist die Nutzung nicht möglich.</p>
      </Section>

      <Section title="10. Automatisierte Entscheidungen">
        <p>Keine automatisierte Entscheidungsfindung/Profiling im Sinne von Art. 22 DSGVO.</p>
      </Section>

      <Section title="11. Sicherheit (TOMs – Kurzfassung)">
        <ul className="list-disc pl-5 space-y-1">
          <li>Rollen-/RLS-Zugriff, Least Privilege, private Buckets.</li>
          <li>TLS, Verschlüsselung at rest (Supabase), 2FA für Admin/Dozenten empfohlen.</li>
          <li>Backups & Restore-Tests, Monitoring, Incident-Response (72h-Meldepflicht Art. 33 DSGVO).</li>
        </ul>
      </Section>

      <Section title="12. Kontakt">
        <p>E-Mail: <strong>[datenschutz@…]</strong> · wir antworten i.d.R. binnen 1 Monat.</p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="text-sm text-white/80 space-y-1">{children}</div>
    </section>
  );
}
