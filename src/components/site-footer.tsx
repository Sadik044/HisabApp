import { Link } from "@tanstack/react-router";
import { Wallet, Facebook, Send, MessageCircle, Phone } from "lucide-react";

const socials = [
  { icon: Facebook, href: "https://www.facebook.com/Sadik044", label: "Facebook" },
  { icon: Send, href: "https://t.me/Sadik044", label: "Telegram" },
  { icon: MessageCircle, href: "https://wa.me/8801650211825", label: "WhatsApp" },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-card/30">
      <div className="container mx-auto px-6 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Wallet className="h-5 w-5" />
              </div>
              <span className="font-semibold tracking-tight">JarWise</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Smart money management using the 6 Jar Method
            </p>
          </div>

          <div>
            <div className="text-sm font-medium">Quick Links</div>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <li><Link to="/" className="transition-colors hover:text-foreground">Home</Link></li>
              <li><Link to="/" hash="features" className="transition-colors hover:text-foreground">Features</Link></li>
              <li><Link to="/" hash="jars" className="transition-colors hover:text-foreground">About</Link></li>
              <li><Link to="/contact" className="transition-colors hover:text-foreground">Contact</Link></li>
              <li><Link to="/login" className="transition-colors hover:text-foreground">Login</Link></li>
              <li><Link to="/register" className="transition-colors hover:text-foreground">Register</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-medium">Connect</div>
            <div className="mt-3 flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="grid h-10 w-10 place-items-center rounded-xl border bg-card text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary hover:text-primary-foreground hover:shadow-md"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            <a
              href="tel:+8801924997029"
              className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Phone className="h-4 w-4" /> 01924997029
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>© 2025 JarWise. Built by Sadik Shah. All rights reserved.</span>
          <a href="tel:+8801924997029" className="transition-colors hover:text-foreground">
            Phone: 01924997029
          </a>
        </div>
      </div>
    </footer>
  );
}