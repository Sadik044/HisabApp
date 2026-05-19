import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "framer-motion";
import {
  Home as HomeIcon,
  PiggyBank,
  GraduationCap,
  PartyPopper,
  TrendingUp,
  Heart,
  Wallet,
  ShieldCheck,
  BarChart3,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JarWise — Personal Finance with the 6 Jar Method" },
      { name: "description", content: "Take control of your money with JarWise. Allocate every dollar across 6 purpose-driven jars and build wealth on autopilot." },
    ],
  }),
  component: Index,
});

const jars = [
  { key: "NEC", name: "Necessities", pct: 55, icon: HomeIcon, color: "text-emerald-500" },
  { key: "LTSS", name: "Long-Term Savings", pct: 10, icon: PiggyBank, color: "text-blue-500" },
  { key: "EDU", name: "Education", pct: 10, icon: GraduationCap, color: "text-violet-500" },
  { key: "PLAY", name: "Play", pct: 10, icon: PartyPopper, color: "text-amber-500" },
  { key: "FFA", name: "Financial Freedom", pct: 10, icon: TrendingUp, color: "text-red-500" },
  { key: "GIVE", name: "Give", pct: 5, icon: Heart, color: "text-pink-500" },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="font-semibold tracking-tight">JarWise</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</a>
          <a href="#jars" className="text-sm text-muted-foreground hover:text-foreground">The 6 Jars</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost"><Link to="/login">Log in</Link></Button>
          <Button asChild><Link to="/register">Get started</Link></Button>
        </div>
      </header>

      <section className="container mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs">
            <Sparkles className="h-3 w-3 text-primary" /> The proven 6 Jar Money Method
          </div>
          <h1 className="text-balance text-5xl font-semibold tracking-tight md:text-6xl">
            Every dollar with a <span className="text-primary">purpose</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
            JarWise turns T. Harv Eker&apos;s 6 Jar system into a beautifully simple app — track income, expenses, and watch your jars grow.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg"><Link to="/register">Start free</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/login">I have an account</Link></Button>
          </div>
        </motion.div>
      </section>

      <section id="jars" className="container mx-auto px-6 pb-20">
        <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight">Your money, six jars</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jars.map((j, i) => (
            <motion.div
              key={j.key}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="rounded-2xl border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <j.icon className={`h-6 w-6 ${j.color}`} />
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{j.pct}%</span>
              </div>
              <div className="mt-4 text-lg font-medium">{j.name}</div>
              <div className="text-sm text-muted-foreground">{j.key}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="features" className="container mx-auto px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Wallet, title: "Auto-distribute income", body: "Every income entry splits across your 6 jars automatically." },
            { icon: BarChart3, title: "Advanced reports", body: "Trends, breakdowns, and CSV/PDF export." },
            { icon: ShieldCheck, title: "Private & secure", body: "Your data, your account. Encrypted and isolated." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="container mx-auto flex items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} JarWise</span>
          <span>Built on the 6 Jar Money Method</span>
        </div>
      </footer>
    </div>
  );
}
