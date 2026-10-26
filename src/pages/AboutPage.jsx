import React from 'react';
import { ShieldCheck, Handshake, Sparkles } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ABOUT_STORY, VALUES as VALUE_TEXT } from '../content/siteContent';

// The words live in src/content/siteContent.js (the build writes them into this page's HTML); the icons are added here.
const ICONS = { Reliability: ShieldCheck, Trust: Handshake, Excellence: Sparkles };
const VALUES = VALUE_TEXT.map((v) => ({ ...v, icon: ICONS[v.title] }));

/** Company story and values (docs/requirements.md PUB-04). */
export default function AboutPage() {
  return (
    <>
      <PageWrapper>
        <PageTitle title="About Us" />
        <div className="flex flex-col gap-12">
          <div className="flex flex-col items-center text-center gap-2">
            <span className="text-brand-gold-deep text-xs font-semibold tracking-widest uppercase">About Ramellian</span>
            <h1 className="font-heading text-ink text-3xl sm:text-4xl font-bold">Our Story</h1>
          </div>

          <Card className="max-w-3xl mx-auto w-full p-6 sm:p-8 flex flex-col gap-4 text-ink/80 text-sm sm:text-base leading-relaxed">
            {ABOUT_STORY.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </Card>

          <div>
            <h2 className="font-heading text-ink text-2xl font-bold text-center mb-6">What We Value</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {VALUES.map((value) => (
                <Card key={value.title} className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
                    <value.icon size={20} className="text-accent" aria-hidden="true" />
                  </div>
                  <h3 className="font-heading text-ink font-semibold">{value.title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{value.description}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-3">
            <p className="text-muted text-sm">Ready to travel with us?</p>
            <Button
              to="/vehicles"
            >
              Browse Our Fleet
            </Button>
          </div>
        </div>
      </PageWrapper>
    </>
  );
}
