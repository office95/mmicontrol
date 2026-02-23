export const metadata = {
  title: 'DSGVO · Music Mission Control',
  description: 'Datenschutzerklärung für Music Mission Control (Österreich)',
};

export default function DatenschutzPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-slate-100">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.28em] text-pink-200">Datenschutzerklärung</p>
        <h1 className="text-3xl font-bold text-slate-200">für „Music Mission Control“</h1>
        <p className="text-sm text-slate-300">Stand: März 2026</p>
      </header>

      <Section title="1. Verantwortlicher">
        <p className="leading-relaxed">
          Music Mission GmbH<br />
          Akazienweg 6<br />
          9131 Grafenstein<br />
          Österreich<br />
          E-Mail: <a className="text-pink-200 hover:text-pink-100" href="mailto:office@musicmission.at">office@musicmission.at</a><br />
          Firmenbuchnummer: FN627518 x · UID: ATU80644028
        </p>
      </Section>

      <Section title="2. Datenschutzbeauftragter">
        <p>Keine gesetzliche Pflicht zur Bestellung; derzeit kein DSB benannt.</p>
      </Section>

      <Section title="3. Zwecke der Verarbeitung und Rechtsgrundlagen">
        <h3 className="font-semibold text-white">3.1 Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO)</h3>
        <ul className="list-disc pl-5 space-y-1 text-white/80">
          <li>Registrierung und Benutzerkonto, Kursverwaltung/Teilnahme, Kursunterlagen</li>
          <li>Quiz/Tests, Lernfortschritt, Support-Anfragen</li>
          <li>Ohne diese Daten ist die Nutzung der Plattform nicht möglich.</li>
        </ul>
        <h3 className="font-semibold text-white mt-3">3.2 Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)</h3>
        <ul className="list-disc pl-5 space-y-1 text-white/80">
          <li>IT- und Systemsicherheit, Missbrauchs-/Betrugsprävention, Fehleranalyse</li>
          <li>Interne statistische Auswertungen (aggregiert/anonymisiert)</li>
        </ul>
        <p className="text-white/80 mt-1">
          Unser Interesse: sicherer, stabiler, wirtschaftlicher Betrieb. Widerspruchsrecht nach Art. 21 DSGVO aus besonderen Gründen möglich.
        </p>
        <h3 className="font-semibold text-white mt-3">3.3 Rechtliche Verpflichtungen (Art. 6 Abs. 1 lit. c DSGVO)</h3>
        <p className="text-white/80">Erfüllung gesetzlicher Aufbewahrungspflichten (z. B. § 132 BAO, UGB).</p>
      </Section>

      <Section title="4. Kategorien verarbeiteter Daten">
        <h3 className="font-semibold text-white">4.1 Kursteilnehmer</h3>
        <p className="text-white/80">Name, E-Mail, optional Telefon; Kurszuordnung; Lernfortschritt; Quiz-/Testergebnisse; Support; Login-Daten (Zeitpunkt, gekürzte IP).</p>
        <h3 className="font-semibold text-white mt-2">4.2 Dozenten</h3>
        <p className="text-white/80">Name, E-Mail, Kurszuordnung, hochgeladene Kursmaterialien, Support-Kommunikation.</p>
        <h3 className="font-semibold text-white mt-2">4.3 Technische Daten</h3>
        <p className="text-white/80">IP (gekürzt/hostabhängig), Geräte-/Browserinfos, Zeitstempel, Logfiles.</p>
        <h3 className="font-semibold text-white mt-2">4.4 Uploads</h3>
        <p className="text-white/80">Kursunterlagen, sonstige Uploads (nicht öffentlich, private Storage-Buckets).</p>
      </Section>

      <Section title="5. Auftragsverarbeiter">
        <ul className="list-disc pl-5 space-y-1 text-white/80">
          <li>Hosting/Frontend: Vercel Inc., USA (Server EU/USA) – Webhosting</li>
          <li>Datenbank/Auth/Storage: Supabase Inc., USA (Server EU)</li>
          <li>E-Mail: Google Ireland Ltd. (Google Workspace/Gmail)</li>
        </ul>
        <p className="text-white/80">AVV mit allen Anbietern; Drittlandübermittlung auf Basis EU-Standardvertragsklauseln (SCC) inkl. TIA.</p>
      </Section>

      <Section title="6. Drittlandübermittlung">
        <p className="text-white/80">Bei US-Dienstleistern auf Basis SCC + ergänzende Maßnahmen (Verschlüsselung, Zugriffsbeschränkungen). Restrisiko behördlicher Zugriffe kann nicht vollständig ausgeschlossen werden.</p>
      </Section>

      <Section title="7. Speicherdauer">
        <ul className="list-disc pl-5 space-y-1 text-white/80">
          <li>Account-Daten: Dauer der Registrierung</li>
          <li>Kurs-/Lernfortschritt: bis Beendigung des Accounts</li>
          <li>Support: 2 Jahre nach Abschluss</li>
          <li>Logs: max. 90 Tage</li>
          <li>Gesetzliche Aufbewahrung (Rechnungen): 7 Jahre (§ 132 BAO)</li>
          <li>Backups nach internem Rotationsplan</li>
        </ul>
      </Section>

      <Section title="8. Cookies">
        <p className="text-white/80">Nur technisch notwendige Cookies (Session). Keine Marketing-/Tracking-Cookies ohne Einwilligung (§ 165 TKG 2021, Art. 6 Abs. 1 lit. f DSGVO).</p>
      </Section>

      <Section title="9. Betroffenenrechte">
        <p className="text-white/80">Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch, Widerruf von Einwilligungen. Kontakt: <a className="text-pink-200 hover:text-pink-100" href="mailto:office@musicmission.at">office@musicmission.at</a>. Antwort i.d.R. binnen 1 Monat.</p>
      </Section>

      <Section title="10. Beschwerderecht">
        <p className="text-white/80">
          Österreichische Datenschutzbehörde, Barichgasse 40–42, 1030 Wien · <a className="text-pink-200 hover:text-pink-100" href="mailto:dsb@dsb.gv.at">dsb@dsb.gv.at</a> · <a className="text-pink-200 hover:text-pink-100" href="https://www.dsb.gv.at" target="_blank" rel="noreferrer">www.dsb.gv.at</a>
        </p>
      </Section>

      <Section title="11. Bereitstellungspflicht">
        <p className="text-white/80">Für Registrierung/Kursnutzung sind Stammdaten und Login erforderlich; ohne diese keine Teilnahme möglich.</p>
      </Section>

      <Section title="12. Automatisierte Entscheidungsfindung">
        <p className="text-white/80">Keine automatisierte Entscheidungsfindung/Profiling i.S.d. Art. 22 DSGVO. Lernfortschritt dient nur der Darstellung.</p>
      </Section>

      <Section title="13. Datensicherheit">
        <ul className="list-disc pl-5 space-y-1 text-white/80">
          <li>Rollen-/Berechtigungskonzept, RLS, Least Privilege</li>
          <li>TLS, Verschlüsselung gespeicherter Daten, private Buckets</li>
          <li>2FA für Administratoren</li>
          <li>Backup/Wiederherstellung, Monitoring, Incident-Response (Meldung binnen 72h gem. Art. 33 DSGVO)</li>
        </ul>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-lg backdrop-blur">
      <h2 className="text-xl font-semibold text-slate-200">{title}</h2>
      <div className="text-sm text-white/85 space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}
