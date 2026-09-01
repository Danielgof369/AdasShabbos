"use client";

import { useEffect, useMemo, useState } from "react";
import { cleanSlug, saturdaysFrom, suggestSlug } from "@/lib/platform";

const inputCls =
  "w-full rounded-lg border border-parchment bg-white px-4 py-3 outline-none focus:border-gold";
const labelCls = "block text-sm font-medium text-navy mb-1";
const hintCls = "text-xs text-ink-soft mt-1";

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-parchment shadow-sm p-6 sm:p-7">
      <h2 className="font-display text-xl text-navy mb-5 flex items-center gap-3">
        <span className="size-8 rounded-full bg-gold text-navy-deep text-sm font-bold flex items-center justify-center">
          {n}
        </span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Toggle({
  checked, onChange, label, hint,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-5 accent-[#c19a3d]"
      />
      <span>
        <span className="font-medium text-navy">{label}</span>
        {hint && <span className="block text-xs text-ink-soft">{hint}</span>}
      </span>
    </label>
  );
}

function nextSundayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

export default function StartForm({
  rootDomain,
  timezones,
  initialSlug,
  defaultSeason,
  defaultCampaignName,
}: {
  rootDomain: string;
  timezones: { value: string; label: string }[];
  initialSlug: string;
  defaultSeason: string;
  defaultCampaignName: string;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [slug, setSlug] = useState(cleanSlug(initialSlug));
  const [slugTouched, setSlugTouched] = useState(!!initialSlug);
  const [slugStatus, setSlugStatus] = useState<{ ok: boolean; reason: string | null } | null>(null);
  const [partnerName, setPartnerName] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [campaignName, setCampaignName] = useState(defaultCampaignName);
  const [seasonLabel, setSeasonLabel] = useState(defaultSeason);
  const [startDate, setStartDate] = useState(nextSundayIso());
  const [weeks, setWeeks] = useState(4);
  const [dates, setDates] = useState<string[]>(() => saturdaysFrom(nextSundayIso(), 4));
  const [datesTouched, setDatesTouched] = useState(false);
  const [timezone, setTimezone] = useState("America/New_York");

  const [pledgeEnabled, setPledgeEnabled] = useState(true);
  const [pledgePerSignup, setPledgePerSignup] = useState(5);
  const [charityName, setCharityName] = useState("Tomchei Shabbos");
  const [raffleEnabled, setRaffleEnabled] = useState(true);
  const [rafflePrize, setRafflePrize] = useState("pizza party");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ url: string; adminUrl: string } | null>(null);

  // Slug follows the name until the user edits it.
  useEffect(() => {
    if (!slugTouched) setSlug(suggestSlug(name));
  }, [name, slugTouched]);

  // Dates follow start date + weeks until the user edits a date by hand.
  useEffect(() => {
    if (!datesTouched && startDate) setDates(saturdaysFrom(startDate, weeks));
  }, [startDate, weeks, datesTouched]);

  // Live availability check.
  useEffect(() => {
    if (!slug) {
      setSlugStatus(null);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/start/slug?slug=${encodeURIComponent(slug)}`, { signal: ctl.signal });
        const data = await res.json();
        setSlugStatus({ ok: data.ok, reason: data.reason });
      } catch {}
    }, 350);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [slug]);

  const previewHost = useMemo(() => `${slug || "yourshul"}.${rootDomain}`, [slug, rootDomain]);

  function setDateAt(i: number, v: string) {
    setDatesTouched(true);
    setDates((d) => d.map((x, j) => (j === i ? v : x)));
  }
  function removeDate(i: number) {
    setDatesTouched(true);
    setDates((d) => d.filter((_, j) => j !== i));
  }
  function addDate() {
    setDatesTouched(true);
    setDates((d) => {
      const last = d[d.length - 1];
      const next = last ? saturdaysFrom(last, 2)[1] : saturdaysFrom(startDate, 1)[0];
      return [...d, next];
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, city, state, slug, partnerName,
          contactName, contactEmail, password,
          campaignName, seasonLabel, dates, timezone,
          pledgeEnabled, pledgePerSignup, charityName, raffleEnabled, rafflePrize,
          website: (document.getElementById("website") as HTMLInputElement | null)?.value ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setDone({ url: data.url, adminUrl: data.adminUrl });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (done) {
    const blast = [
      `🕯️ *${name} — ${campaignName}*`,
      ``,
      `This ${seasonLabel}, every man, woman and child takes on one small thing for Shabbos — and holds it for ${dates.length} ${dates.length === 1 ? "Shabbos" : "Shabbosos"}.`,
      ``,
      `Sign up your whole family in 30 seconds:`,
      done.url,
    ].join("\n");
    return (
      <div className="bg-white rounded-2xl border border-parchment shadow-sm p-7 sm:p-9">
        <div className="text-5xl mb-4 text-center">🎉</div>
        <h2 className="font-display text-2xl sm:text-3xl text-navy mb-2 text-center">
          {name} is live!
        </h2>
        <p className="text-ink-soft text-center mb-8">
          We emailed these links to {contactEmail}. Save this page too.
        </p>
        <div className="space-y-3 mb-8">
          <a
            href={done.url}
            className="block bg-gold text-navy-deep font-bold rounded-lg px-6 py-4 text-center text-lg hover:bg-gold-soft transition-colors"
          >
            Open your site → {done.url.replace(/^https?:\/\//, "")}
          </a>
          <a
            href={done.adminUrl}
            className="block bg-navy text-cream font-semibold rounded-lg px-6 py-3.5 text-center hover:bg-navy-soft transition-colors"
          >
            Open your admin page (password: the one you chose)
          </a>
        </div>
        <h3 className="font-semibold text-navy mb-2">What to do next</h3>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-ink-soft mb-8">
          <li>Open the admin page and look over the commitment list. Hide anything that doesn&rsquo;t fit; add your own.</li>
          <li>Ask the rav to announce it, then paste the message below into the shul WhatsApp.</li>
          <li>Reminders run themselves: Thursday before Shabbos, Sunday and Tuesday after. The admin page has each week&rsquo;s WhatsApp texts ready to paste.</li>
          <li>Reply to the welcome email with your logo (PNG) and we&rsquo;ll put it on your site.</li>
        </ol>
        <p className="text-xs font-medium text-navy mb-1">Announcement for your WhatsApp group:</p>
        <textarea
          readOnly
          rows={7}
          className="w-full rounded-lg border border-parchment bg-cream px-3 py-2 text-sm"
          defaultValue={blast}
        />
      </div>
    );
  }

  const pwOk = password.length >= 8 && password === password2;
  const canSubmit =
    !busy && name && city && slug && slugStatus?.ok && contactName && contactEmail && pwOk && dates.length > 0;

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section n="1" title="Your shul">
        <div>
          <label className={labelCls}>Shul name</label>
          <input name="name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Young Israel of Example" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>City</label>
            <input name="city" className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Chicago" required />
          </div>
          <div>
            <label className={labelCls}>State</label>
            <input name="state" className={inputCls} value={state} onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))} placeholder="IL" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Your web address</label>
          <div className="flex items-center rounded-lg border border-parchment bg-white focus-within:border-gold overflow-hidden">
            <input
              name="slug"
              className="flex-1 min-w-0 px-4 py-3 outline-none bg-transparent"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(cleanSlug(e.target.value));
              }}
              placeholder="yourshul"
            />
            <span className="px-3 py-3 text-sm text-ink-soft bg-parchment/50 whitespace-nowrap">.{rootDomain}</span>
          </div>
          <p className={hintCls}>
            {slugStatus === null ? (
              <>Families will visit <strong>{previewHost}</strong></>
            ) : slugStatus.ok ? (
              <span className="text-green-700">✓ {previewHost} is yours</span>
            ) : (
              <span className="text-red-700">{slugStatus.reason}</span>
            )}
            {" "}· Have your own domain? Set it up after — it takes one email.
          </p>
        </div>
        <div>
          <label className={labelCls}>Partner community shown next to your name (optional)</label>
          <input name="partnerName" className={inputCls} value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="e.g. a kollel or a second shul running it with you" />
        </div>
      </Section>

      <Section n="2" title="You">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Your name</label>
            <input name="contactName" autoComplete="name" className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Your email</label>
            <input name="contactEmail" type="email" autoComplete="email" className={inputCls} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Admin password</label>
            <input name="password" type="password" autoComplete="new-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            <p className={hintCls}>8+ characters. Opens your admin page; share it only with whoever runs the campaign.</p>
          </div>
          <div>
            <label className={labelCls}>Repeat password</label>
            <input name="password2" type="password" autoComplete="new-password" className={inputCls} value={password2} onChange={(e) => setPassword2(e.target.value)} required />
            {password2 && password !== password2 && <p className="text-xs text-red-700 mt-1">Doesn&rsquo;t match yet.</p>}
          </div>
        </div>
        {/* honeypot */}
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      </Section>

      <Section n="3" title="Your campaign">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Campaign name</label>
            <input name="campaignName" className={inputCls} value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
            <p className={hintCls}>Shown in the site header. Some shuls use &ldquo;The Elul Shabbos Project&rdquo;.</p>
          </div>
          <div>
            <label className={labelCls}>Season</label>
            <input name="seasonLabel" className={inputCls} value={seasonLabel} onChange={(e) => setSeasonLabel(e.target.value)} placeholder="Elul 5786" />
            <p className={hintCls}>Small label on the homepage, e.g. &ldquo;Elul 5786&rdquo; or &ldquo;Shovavim 5787&rdquo;.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>First week starts</label>
            <input name="startDate" type="date" className={inputCls} value={startDate} onChange={(e) => { setDatesTouched(false); setStartDate(e.target.value); }} />
            <p className={hintCls}>Any day that week — we pick the Shabbosos.</p>
          </div>
          <div>
            <label className={labelCls}>How many weeks</label>
            <select name="weeks" className={inputCls} value={weeks} onChange={(e) => { setDatesTouched(false); setWeeks(Number(e.target.value)); }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Your Shabbosos</label>
          <div className="flex flex-wrap gap-2">
            {dates.map((d, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-parchment bg-cream pl-2 pr-1 py-1 text-sm">
                <input
                  type="date"
                  value={d}
                  onChange={(e) => setDateAt(i, e.target.value)}
                  className="bg-transparent outline-none text-sm"
                />
                {dates.length > 1 && (
                  <button type="button" onClick={() => removeDate(i)} className="text-ink-soft hover:text-red-700 px-1" aria-label="Remove">
                    ✕
                  </button>
                )}
              </span>
            ))}
            {dates.length < 12 && (
              <button type="button" onClick={addDate} className="text-sm text-navy underline underline-offset-2 px-1">
                + add a Shabbos
              </button>
            )}
          </div>
          <p className={hintCls}>Skip a week (a Yom Tov, say) by removing it. Each date must be a Saturday.</p>
        </div>
        <div>
          <label className={labelCls}>Timezone</label>
          <select name="timezone" className={inputCls} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {timezones.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </Section>

      <Section n="4" title="Extras (both optional)">
        <Toggle
          checked={pledgeEnabled}
          onChange={setPledgeEnabled}
          label="Tzedakah pledge per family"
          hint="A sponsor gives a fixed amount for every family that signs up. The running total shows on your homepage."
        />
        {pledgeEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-8">
            <div>
              <label className={labelCls}>$ per family</label>
              <input name="pledgePerSignup" type="number" min={1} max={1000} className={inputCls} value={pledgePerSignup} onChange={(e) => setPledgePerSignup(Number(e.target.value))} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Goes to</label>
              <input name="charityName" className={inputCls} value={charityName} onChange={(e) => setCharityName(e.target.value)} />
            </div>
          </div>
        )}
        <Toggle
          checked={raffleEnabled}
          onChange={setRaffleEnabled}
          label="Weekly family raffle"
          hint="Every family where everyone checked in is entered. You draw the winner from your admin page."
        />
        {raffleEnabled && (
          <div className="pl-8">
            <label className={labelCls}>Prize</label>
            <input name="rafflePrize" className={inputCls} value={rafflePrize} onChange={(e) => setRafflePrize(e.target.value)} placeholder="pizza party" />
            <p className={hintCls}>Shows as &ldquo;entered to win a {rafflePrize || "…"}&rdquo;.</p>
          </div>
        )}
      </Section>

      {error && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</p>
      )}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-gold text-navy-deep font-bold rounded-lg py-4 text-lg hover:bg-gold-soft transition-colors disabled:opacity-50"
      >
        {busy ? "Setting up your shul…" : "Create my shul's campaign"}
      </button>
      <p className="text-xs text-ink-soft text-center">
        Free, no strings. By continuing you agree we may email you about your campaign.
      </p>
    </form>
  );
}
