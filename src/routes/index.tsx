import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
import { ContactSection } from "@/components/contact-section";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "react-i18next";
import { SiteFooter } from "@/components/site-footer";
import { BrandLogo } from "@/components/brand-logo";
import {
  Sparkles,
  Target,
  FileDown,
  Moon,
  Receipt,
  PieChart,
  ArrowRight,
  Star,
  Plus,
  Shuffle,
  LineChart,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HisabApp — Take Control of Your Money with the 6 Jar Method" },
      { name: "description", content: "HisabApp turns the proven 6 Jar Money Method into a beautiful app. Auto-split income, track expenses, and grow real wealth on autopilot." },
      { property: "og:title", content: "HisabApp — Take Control of Your Money with the 6 Jar Method" },
      { property: "og:description", content: "Auto-split income across 6 purpose-driven jars, track spending, and grow wealth on autopilot." },
    ],
  }),
  component: Index,
});

const jars = [
  { emoji: "🏠", name: "Necessities", pct: 55, color: "text-emerald-500", bg: "bg-emerald-500/10", bar: "bg-emerald-500", purpose: "Rent, food, bills & daily essentials." },
  { emoji: "💰", name: "Financial Freedom", pct: 10, color: "text-red-500", bg: "bg-red-500/10", bar: "bg-red-500", purpose: "Investments that build passive income." },
  { emoji: "📚", name: "Education", pct: 10, color: "text-violet-500", bg: "bg-violet-500/10", bar: "bg-violet-500", purpose: "Courses, books & skill upgrades." },
  { emoji: "🎯", name: "Long-term Saving", pct: 10, color: "text-blue-500", bg: "bg-blue-500/10", bar: "bg-blue-500", purpose: "Big goals — house, car, travel." },
  { emoji: "🎮", name: "Play", pct: 10, color: "text-amber-500", bg: "bg-amber-500/10", bar: "bg-amber-500", purpose: "Guilt-free fun & entertainment." },
  { emoji: "🤝", name: "Give", pct: 5, color: "text-pink-500", bg: "bg-pink-500/10", bar: "bg-pink-500", purpose: "Charity, gifts & giving back." },
];

const features = [
  { icon: Shuffle, title: "Auto Jar Split", body: "Every income entry distributes across your 6 jars automatically — no math required." },
  { icon: Receipt, title: "Expense Tracking", body: "Log expenses against any jar with category, notes, and instant balance updates." },
  { icon: PieChart, title: "Visual Analytics", body: "Beautiful charts show where your money goes and how each jar grows." },
  { icon: Target, title: "Custom Goals", body: "Tune jar percentages to match your life — savings sprint or freedom focus." },
  { icon: FileDown, title: "Reports Export", body: "Export your monthly reports as PDF or CSV in a single click." },
  { icon: Moon, title: "Dark Mode", body: "Switch between light and dark themes — easy on the eyes, day or night." },
];

const steps = [
  { icon: Plus, title: "Add Income", body: "Log salary, freelance or any earning — once, in seconds." },
  { icon: Shuffle, title: "Auto Split", body: "HisabApp allocates funds across your 6 jars by percentage." },
  { icon: LineChart, title: "Track & Grow", body: "Spend mindfully and watch your savings climb every month." },
];

const testimonials = [
  { name: "Ayesha Rahman", role: "Freelance Designer", quote: "HisabApp made budgeting feel effortless. I finally saved for my first trip abroad without stress." },
  { name: "Tanvir Hasan", role: "Software Engineer", quote: "The auto-split is genius. My Financial Freedom jar grows every month without me thinking about it." },
  { name: "Mehnaz Karim", role: "Small Business Owner", quote: "Clean, fast, and beautiful. The reports alone are worth it — I share them with my accountant." },
];

function Index() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/">
            <BrandLogo />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">{t("nav.features")}</a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">{t("nav.howItWorks")}</a>
            <a href="#jars" className="text-sm text-muted-foreground hover:text-foreground">The 6 Jars</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground">Reviews</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground">{t("nav.contact")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/login">{t("common.login")}</Link></Button>
            <Button asChild><Link to="/register">{t("nav.getStarted")}</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-10%] h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute right-[10%] top-[20%] h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-3xl" />
        </div>
        <div className="container mx-auto px-6 pt-20 pb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs">
              <Sparkles className="h-3 w-3 text-primary" /> The proven 6 Jar Money Method
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              {t("landing.headline")}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
              {t("landing.subheadline")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/register">{t("landing.getStartedFree")} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#features">{t("landing.seeHowItWorks")}</a>
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              {Array.from({ length: 5 }).map((_, k) => (
                <Star key={k} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-2">Loved by 10,000+ mindful spenders</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-6 py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Everything you need to master your money</h2>
          <p className="mt-3 text-muted-foreground">Powerful features wrapped in a beautifully simple interface.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="group rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y bg-muted/30">
        <div className="container mx-auto px-6 py-24">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">How it works</h2>
            <p className="mt-3 text-muted-foreground">Three simple steps to financial clarity.</p>
          </div>
          <div className="relative grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className="relative rounded-2xl border bg-card p-8 text-center shadow-sm"
              >
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-emerald-500 text-primary-foreground">
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Step {i + 1}</div>
                <h3 className="mt-2 text-xl font-medium">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                {i < steps.length - 1 && (
                  <ArrowRight className="absolute right-[-20px] top-1/2 hidden h-6 w-6 -translate-y-1/2 text-muted-foreground/40 md:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 Jars */}
      <section id="jars" className="container mx-auto px-6 py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Meet your 6 jars</h2>
          <p className="mt-3 text-muted-foreground">Every taka gets a job — the moment it lands.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {jars.map((j, i) => (
            <motion.div
              key={j.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className={`grid h-12 w-12 place-items-center rounded-xl ${j.bg} text-2xl`}>{j.emoji}</div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${j.bg} ${j.color}`}>{j.pct}%</span>
              </div>
              <div className="mt-5 text-lg font-medium">{j.name}</div>
              <p className="mt-1 text-sm text-muted-foreground">{j.purpose}</p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className={`h-full rounded-full ${j.bar}`} style={{ width: `${j.pct}%` }} />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="border-y bg-muted/30">
        <div className="container mx-auto px-6 py-24">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Loved by mindful spenders</h2>
            <p className="mt-3 text-muted-foreground">Real stories from people taking control of their money.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className="rounded-2xl border bg-card p-6 shadow-sm"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-emerald-500 text-sm font-semibold text-primary-foreground">
                    {t.name.split(" ").map((s) => s[0]).join("")}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <ContactSection />

      {/* CTA */}
      <section className="container mx-auto px-6 py-24">
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-emerald-500/10 p-10 text-center md:p-16">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Ready to give every taka a purpose?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Join thousands building better money habits with HisabApp. Free forever for personal use.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2"><Link to="/register">Get Started Free <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/login">Log in</Link></Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}